/*
ABOUTME: Normalized inventory-affecting movements from QuickBooks sales, receipts, adjustments, and builds.
ABOUTME: Uses signed quantities so downstream inventory models can reconstruct balances and explain movement sources.
*/

{{ config(
    materialized = 'table',
    tags = ['inventory', 'quickbooks', 'reorder_planning']
) }}

WITH typed_order_items AS (
    SELECT
        *,
        CONCAT_WS(
            ':',
            source_type,
            COALESCE(NULLIF(quickbooks_internal_id, ''), 'missing_qb_id'),
            COALESCE(transaction_id::TEXT, 'missing_transaction_id')
        ) AS order_key
    FROM {{ ref('int_quickbooks__order_items_typed') }}
),

inventory_items AS (
    SELECT DISTINCT
        CASE
            WHEN item_name = '82-6002 IN' THEN '82-6002'
            ELSE item_name
        END AS sku
    FROM {{ ref('int_quickbooks__items_enriched') }}
    WHERE item_name IS NOT NULL
      AND TRIM(item_name) != ''
      AND item_type = 'Inventory'
      AND COALESCE(item_subtype, '') NOT IN ('ItemGroup', 'ItemSubtotal')
),

latest_typed_order_items AS (
    SELECT *
    FROM (
        SELECT
            *,
            DENSE_RANK() OVER (
                PARTITION BY order_key
                ORDER BY
                    CASE
                        WHEN _dlt_load_id ~ '^[0-9]+(\.[0-9]+)?$' THEN _dlt_load_id::NUMERIC
                        ELSE NULL
                    END DESC NULLS LAST
            ) AS load_rank
        FROM typed_order_items
    ) ranked
    WHERE load_rank = 1
),

sales_movements AS (
    SELECT
        'sales_order_line' AS movement_source,
        'sale' AS movement_type,
        CASE
            WHEN product_service = '82-6002 IN' THEN '82-6002'
            ELSE product_service
        END AS sku,
        CAST(order_date AS DATE) AS movement_date,
        -1 * product_service_quantity AS movement_quantity,
        GREATEST(-1 * product_service_quantity, 0) AS quantity_in,
        GREATEST(product_service_quantity, 0) AS quantity_out,
        product_service_amount AS movement_amount,
        order_key AS source_transaction_key,
        order_number AS source_document_number,
        customer AS source_party,
        transaction_id::TEXT AS source_transaction_id,
        quickbooks_internal_id,
        _dlt_id AS source_line_id,
        source_type,
        NULL::TEXT AS related_sku,
        CAST(order_date AS DATE) > CURRENT_DATE AS is_future_committed_demand,
        FALSE AS is_fba_transfer_signal,
        'Order line quantity reduces sellable inventory; negative order quantities increase inventory.' AS movement_note
    FROM latest_typed_order_items
    WHERE product_service IS NOT NULL
      AND TRIM(product_service) != ''
      AND order_date IS NOT NULL
      AND product_service_quantity IS NOT NULL
      AND product_service_quantity != 0
      AND product_service_amount IS NOT NULL
),

receipt_movements AS (
    SELECT
        'vendor_bill' AS movement_source,
        'receipt' AS movement_type,
        product_service AS sku,
        movement_date,
        qty AS movement_quantity,
        GREATEST(qty, 0) AS quantity_in,
        GREATEST(-1 * qty, 0) AS quantity_out,
        amount AS movement_amount,
        CONCAT_WS(':', 'bill', COALESCE(quick_books_internal_id, 'missing_qb_id'), COALESCE(transxx::TEXT, 'missing_transaction_id')) AS source_transaction_key,
        bill_no AS source_document_number,
        vendor AS source_party,
        transxx::TEXT AS source_transaction_id,
        quick_books_internal_id AS quickbooks_internal_id,
        NULL::TEXT AS source_line_id,
        'bill' AS source_type,
        NULL::TEXT AS related_sku,
        FALSE AS is_future_committed_demand,
        FALSE AS is_fba_transfer_signal,
        'Vendor bill quantity increases purchased inventory. DPC transfer rows are excluded.' AS movement_note
    FROM (
        SELECT DISTINCT
            bill_no,
            vendor,
            CASE
                WHEN product_service = '82-6002 IN' THEN '82-6002'
                ELSE product_service
            END AS product_service,
            TO_DATE(date, 'MM-DD-YYYY') AS movement_date,
            NULLIF(product_service_quantity, '')::NUMERIC AS qty,
            CASE
                WHEN product_service_amount IS NOT NULL AND TRIM(product_service_amount) != ''
                THEN product_service_amount::NUMERIC
                ELSE NULL
            END AS amount,
            transxx,
            quick_books_internal_id
        FROM {{ source('raw_data', 'xlsx_bill') }}
        WHERE product_service IS NOT NULL
          AND TRIM(product_service) != ''
          AND product_service_quantity IS NOT NULL
          AND TRIM(product_service_quantity) != ''
          AND product_service_quantity ~ '^-?[0-9]+(\.[0-9]+)?$'
          AND COALESCE(vendor, '') != 'DPC Transfer Inventory'
          AND date IS NOT NULL
          AND TRIM(date) != ''
          AND date ~ '^\d{2}-\d{2}-\d{4}$'
    ) deduped_bills
    WHERE qty IS NOT NULL
),

adjustment_movements AS (
    SELECT
        'inventory_adjustment' AS movement_source,
        CASE
            WHEN item ILIKE '%FBA%' AND qty > 0 THEN 'fba_transfer_in'
            WHEN item ILIKE '%FBA%' AND qty < 0 THEN 'fba_transfer_out'
            ELSE 'adjustment'
        END AS movement_type,
        item AS sku,
        movement_date,
        qty AS movement_quantity,
        GREATEST(qty, 0) AS quantity_in,
        GREATEST(-1 * qty, 0) AS quantity_out,
        value_difference AS movement_amount,
        CONCAT_WS(':', 'adjustment', COALESCE(quick_books_internal_id, 'missing_qb_id'), COALESCE(transxx::TEXT, 'missing_transaction_id')) AS source_transaction_key,
        reference_no AS source_document_number,
        adjustment_account AS source_party,
        transxx::TEXT AS source_transaction_id,
        quick_books_internal_id AS quickbooks_internal_id,
        NULL::TEXT AS source_line_id,
        'inventory_adjustment' AS source_type,
        NULL::TEXT AS related_sku,
        FALSE AS is_future_committed_demand,
        (
            item ILIKE '%FBA%'
            OR COALESCE(memo, '') ILIKE '%FBA%'
            OR COALESCE(memo, '') ILIKE '%Amazon%'
            OR COALESCE(class, '') ILIKE '%Amazon%'
        ) AS is_fba_transfer_signal,
        'QuickBooks inventory adjustment. FBA-like items or memos are flagged for transfer analysis.' AS movement_note
    FROM (
        SELECT DISTINCT
            reference_no,
            CASE
                WHEN item = '82-6002 IN' THEN '82-6002'
                ELSE item
            END AS item,
            TO_DATE(adjustment_date, 'MM-DD-YYYY') AS movement_date,
            quantity_difference::NUMERIC AS qty,
            value_difference::NUMERIC AS value_difference,
            adjustment_account,
            memo,
            class,
            transxx,
            quick_books_internal_id
        FROM {{ source('raw_data', 'xlsx_inventory_adjustment') }}
        WHERE item IS NOT NULL
          AND TRIM(item) != ''
          AND quantity_difference IS NOT NULL
          AND adjustment_date IS NOT NULL
          AND TRIM(adjustment_date) != ''
          AND adjustment_date ~ '^\d{2}-\d{2}-\d{4}$'
    ) deduped_adjustments
),

build_production_movements AS (
    SELECT
        'build_assembly_header' AS movement_source,
        'build_production' AS movement_type,
        assembly_sku AS sku,
        movement_date,
        quantity_to_build::NUMERIC AS movement_quantity,
        GREATEST(quantity_to_build::NUMERIC, 0) AS quantity_in,
        GREATEST(-1 * quantity_to_build::NUMERIC, 0) AS quantity_out,
        NULL::NUMERIC AS movement_amount,
        CONCAT_WS(':', 'build', COALESCE(quick_books_internal_id, 'missing_qb_id'), COALESCE(transxx::TEXT, 'missing_transaction_id')) AS source_transaction_key,
        build_assembly_no::TEXT AS source_document_number,
        NULL::TEXT AS source_party,
        transxx::TEXT AS source_transaction_id,
        quick_books_internal_id AS quickbooks_internal_id,
        NULL::TEXT AS source_line_id,
        'build_assembly' AS source_type,
        NULL::TEXT AS related_sku,
        FALSE AS is_future_committed_demand,
        FALSE AS is_fba_transfer_signal,
        'Build assembly output increases the finished assembly SKU.' AS movement_note
    FROM (
        SELECT DISTINCT
            build_assembly_no,
            TO_DATE(date, 'MM-DD-YYYY') AS movement_date,
            CASE
                WHEN inventory_assembly_item = '82-6002 IN' THEN '82-6002'
                ELSE inventory_assembly_item
            END AS assembly_sku,
            quantity_to_build,
            transxx,
            quick_books_internal_id
        FROM {{ source('raw_data', 'xlsx_build_assembly') }}
        WHERE COALESCE(is_pending, FALSE) = FALSE
          AND date IS NOT NULL
          AND TRIM(date) != ''
          AND date ~ '^\d{2}-\d{2}-\d{4}$'
          AND inventory_assembly_item IS NOT NULL
          AND TRIM(inventory_assembly_item) != ''
          AND quantity_to_build IS NOT NULL
    ) deduped_build_headers
),

build_component_movements AS (
    SELECT
        'build_assembly_component' AS movement_source,
        'build_component_consumption' AS movement_type,
        component_sku AS sku,
        movement_date,
        -1 * line_item_quantity_needed::NUMERIC AS movement_quantity,
        GREATEST(-1 * line_item_quantity_needed::NUMERIC, 0) AS quantity_in,
        GREATEST(line_item_quantity_needed::NUMERIC, 0) AS quantity_out,
        NULL::NUMERIC AS movement_amount,
        CONCAT_WS(':', 'build_component', COALESCE(quick_books_internal_id, 'missing_qb_id'), COALESCE(transxx::TEXT, 'missing_transaction_id'), component_sku) AS source_transaction_key,
        build_assembly_no::TEXT AS source_document_number,
        NULL::TEXT AS source_party,
        transxx::TEXT AS source_transaction_id,
        quick_books_internal_id AS quickbooks_internal_id,
        NULL::TEXT AS source_line_id,
        'build_assembly' AS source_type,
        assembly_sku AS related_sku,
        FALSE AS is_future_committed_demand,
        FALSE AS is_fba_transfer_signal,
        'Build assembly component row decreases component inventory and links to the finished assembly SKU.' AS movement_note
    FROM (
        SELECT DISTINCT
            build_assembly_no,
            TO_DATE(date, 'MM-DD-YYYY') AS movement_date,
            CASE
                WHEN inventory_assembly_item = '82-6002 IN' THEN '82-6002'
                ELSE inventory_assembly_item
            END AS assembly_sku,
            CASE
                WHEN assembly_line_item = '82-6002 IN' THEN '82-6002'
                ELSE assembly_line_item
            END AS component_sku,
            line_item_quantity_needed,
            transxx,
            quick_books_internal_id
        FROM {{ source('raw_data', 'xlsx_build_assembly') }}
        WHERE COALESCE(is_pending, FALSE) = FALSE
          AND date IS NOT NULL
          AND TRIM(date) != ''
          AND date ~ '^\d{2}-\d{2}-\d{4}$'
          AND assembly_line_item IS NOT NULL
          AND TRIM(assembly_line_item) != ''
          AND line_item_quantity_needed IS NOT NULL
    ) deduped_build_components
),

unioned_movements AS (
    SELECT * FROM sales_movements
    UNION ALL
    SELECT * FROM receipt_movements
    UNION ALL
    SELECT * FROM adjustment_movements
    UNION ALL
    SELECT * FROM build_production_movements
    UNION ALL
    SELECT * FROM build_component_movements
),

hashed_movements AS (
    SELECT
        MD5(CONCAT_WS(
            '|',
            movement_source,
            movement_type,
            sku,
            movement_date::TEXT,
            COALESCE(source_transaction_key, ''),
            COALESCE(source_document_number, ''),
            COALESCE(source_line_id, ''),
            movement_quantity::TEXT,
            COALESCE(related_sku, '')
        )) AS movement_id,
        movement_source,
        movement_type,
        sku,
        movement_date,
        movement_quantity,
        quantity_in,
        quantity_out,
        movement_amount,
        source_transaction_key,
        source_document_number,
        source_party,
        source_transaction_id,
        quickbooks_internal_id,
        source_line_id,
        source_type,
        related_sku,
        is_future_committed_demand,
        is_fba_transfer_signal,
        movement_note,
        CURRENT_TIMESTAMP AS created_at
    FROM unioned_movements
    WHERE sku IS NOT NULL
      AND TRIM(sku) != ''
      AND movement_date IS NOT NULL
      AND movement_quantity IS NOT NULL
      AND movement_quantity != 0
      AND sku IN (SELECT sku FROM inventory_items)
),

final AS (
    SELECT
        movement_id,
        movement_source,
        movement_type,
        sku,
        movement_date,
        movement_quantity,
        quantity_in,
        quantity_out,
        movement_amount,
        source_transaction_key,
        source_document_number,
        source_party,
        source_transaction_id,
        quickbooks_internal_id,
        source_line_id,
        source_type,
        related_sku,
        is_future_committed_demand,
        is_fba_transfer_signal,
        movement_note,
        created_at
    FROM (
        SELECT
            *,
            ROW_NUMBER() OVER (
                PARTITION BY movement_id
                ORDER BY source_transaction_key, source_document_number, COALESCE(source_line_id, '')
            ) AS movement_rank
        FROM hashed_movements
    ) ranked
    WHERE movement_rank = 1
)

SELECT *
FROM final
