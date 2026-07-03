/*
ABOUTME: Line-level inbound inventory details for SKU planning drilldowns.
ABOUTME: Combines open purchase orders with future-dated bill receipts removed from QuickBooks on-hand anchors.
*/

{{ config(
    materialized = 'table',
    tags = ['inventory', 'reorder_planning', 'inbound']
) }}

WITH latest_inventory AS (
    SELECT MAX(inventory_date) AS inventory_as_of_date
    FROM {{ ref('fct_inventory_history') }}
),

latest_purchase_order_rows AS (
    SELECT *
    FROM (
        SELECT
            *,
            DENSE_RANK() OVER (
                PARTITION BY COALESCE(NULLIF(quick_books_internal_id, ''), CONCAT_WS(':', purchase_order_no, vendor))
                ORDER BY
                    CASE
                        WHEN _dlt_load_id ~ '^[0-9]+(\.[0-9]+)?$' THEN _dlt_load_id::NUMERIC
                        ELSE NULL
                    END DESC NULLS LAST
            ) AS load_rank
        FROM {{ source('raw_data', 'xlsx_purchase_order') }}
    ) ranked
    WHERE load_rank = 1
),

purchase_order_receipt_lines AS (
    SELECT DISTINCT
        CASE
            WHEN product_service = '82-6002 IN' THEN '82-6002'
            ELSE product_service
        END AS sku,
        vendor,
        TO_DATE(date, 'MM-DD-YYYY') AS receipt_date,
        bill_no,
        NULLIF(product_service_quantity, '')::NUMERIC AS receipt_qty
    FROM {{ source('raw_data', 'xlsx_bill') }}
    WHERE product_service IS NOT NULL
      AND TRIM(product_service) != ''
      AND vendor IS NOT NULL
      AND TRIM(vendor) != ''
      AND product_service_quantity IS NOT NULL
      AND TRIM(product_service_quantity) != ''
      AND product_service_quantity ~ '^-?[0-9]+(\.[0-9]+)?$'
      AND date IS NOT NULL
      AND TRIM(date) != ''
      AND date ~ '^\d{2}-\d{2}-\d{4}$'
      AND COALESCE(vendor, '') != 'DPC Transfer Inventory'
),

purchase_order_history AS (
    SELECT
        CASE
            WHEN product = '82-6002 IN' THEN '82-6002'
            ELSE product
        END AS sku,
        vendor,
        purchase_order_no,
        TO_DATE(date, 'MM-DD-YYYY') AS po_date
    FROM latest_purchase_order_rows
    WHERE product IS NOT NULL
      AND TRIM(product) != ''
      AND product_quantity IS NOT NULL
      AND vendor IS NOT NULL
      AND TRIM(vendor) != ''
      AND date IS NOT NULL
      AND TRIM(date) != ''
      AND date ~ '^\d{2}-\d{2}-\d{4}$'
),

po_to_next_receipt AS (
    SELECT
        sku,
        vendor,
        po_date,
        receipt_date,
        receipt_date - po_date AS lead_time_days
    FROM (
        SELECT
            po.sku,
            po.vendor,
            po.po_date,
            rl.receipt_date,
            ROW_NUMBER() OVER (
                PARTITION BY po.sku, po.vendor, po.po_date, po.purchase_order_no
                ORDER BY rl.receipt_date
            ) AS receipt_rank
        FROM purchase_order_history po
        INNER JOIN purchase_order_receipt_lines rl
            ON po.sku = rl.sku
           AND po.vendor = rl.vendor
           AND rl.receipt_date >= po.po_date
           AND rl.receipt_date - po.po_date BETWEEN 1 AND 365
    ) matched
    WHERE receipt_rank = 1
),

observed_sku_vendor_lead_times AS (
    SELECT
        sku,
        vendor,
        COUNT(*) AS observed_sku_vendor_lead_time_count,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lead_time_days) AS observed_sku_vendor_lead_time_days
    FROM po_to_next_receipt
    GROUP BY sku, vendor
),

observed_vendor_lead_times AS (
    SELECT
        vendor,
        COUNT(*) AS observed_vendor_lead_time_count,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lead_time_days) AS observed_vendor_lead_time_days
    FROM po_to_next_receipt
    GROUP BY vendor
),

open_po_lines AS (
    SELECT DISTINCT
        CASE
            WHEN product = '82-6002 IN' THEN '82-6002'
            ELSE product
        END AS sku,
        'OPEN_PO'::TEXT AS inbound_type,
        purchase_order_no::TEXT AS document_number,
        po.vendor::TEXT AS vendor,
        TO_DATE(date, 'MM-DD-YYYY') AS document_date,
        CASE
            WHEN expected_date IS NOT NULL
             AND TRIM(expected_date) != ''
             AND expected_date ~ '^\d{2}-\d{2}-\d{4}$'
             AND TO_DATE(expected_date, 'MM-DD-YYYY') > TO_DATE(date, 'MM-DD-YYYY')
            THEN TO_DATE(expected_date, 'MM-DD-YYYY')
            ELSE TO_DATE(date, 'MM-DD-YYYY') + CEIL(COALESCE(
                CASE
                    WHEN osvl.observed_sku_vendor_lead_time_count >= 3
                    THEN osvl.observed_sku_vendor_lead_time_days
                    ELSE NULL
                END,
                CASE
                    WHEN ovl.observed_vendor_lead_time_count >= 10
                    THEN ovl.observed_vendor_lead_time_days
                    ELSE NULL
                END,
                45
            ))::INT
        END AS expected_or_receipt_date,
        product_quantity::NUMERIC AS quantity,
        CASE
            WHEN product_rate IS NOT NULL
             AND TRIM(product_rate::TEXT) != ''
            THEN product_rate::NUMERIC
            ELSE NULL
        END AS rate,
        CASE
            WHEN product_amount IS NOT NULL
             AND TRIM(product_amount::TEXT) != ''
            THEN product_amount::NUMERIC
            ELSE NULL
        END AS amount,
        CASE
            WHEN COALESCE(fully_received, FALSE) THEN 'fully_received'
            WHEN COALESCE(manually_closed, FALSE) THEN 'manually_closed'
            ELSE 'open'
        END AS status,
        CONCAT_WS(':', 'purchase_order', COALESCE(quick_books_internal_id, 'missing_qb_id'), COALESCE(transxx::TEXT, 'missing_transaction_id')) AS source_transaction_key,
        quick_books_internal_id::TEXT AS quickbooks_internal_id,
        transxx::TEXT AS source_transaction_id,
        'Open, unreceived purchase order line.' AS inbound_note
    FROM latest_purchase_order_rows po
    LEFT JOIN observed_sku_vendor_lead_times osvl
        ON CASE
                WHEN po.product = '82-6002 IN' THEN '82-6002'
                ELSE po.product
            END = osvl.sku
       AND po.vendor = osvl.vendor
    LEFT JOIN observed_vendor_lead_times ovl
        ON po.vendor = ovl.vendor
    WHERE po.product IS NOT NULL
      AND TRIM(po.product) != ''
      AND po.product_quantity IS NOT NULL
      AND po.date IS NOT NULL
      AND TRIM(po.date) != ''
      AND po.date ~ '^\d{2}-\d{2}-\d{4}$'
      AND COALESCE(po.fully_received, FALSE) = FALSE
      AND COALESCE(po.manually_closed, FALSE) = FALSE
),

future_receipt_lines AS (
    SELECT
        m.sku,
        'FUTURE_RECEIPT'::TEXT AS inbound_type,
        m.source_document_number::TEXT AS document_number,
        m.source_party::TEXT AS vendor,
        m.movement_date AS document_date,
        m.movement_date AS expected_or_receipt_date,
        m.quantity_in::NUMERIC AS quantity,
        CASE
            WHEN m.quantity_in != 0
            THEN m.movement_amount / NULLIF(m.quantity_in, 0)
            ELSE NULL
        END AS rate,
        m.movement_amount AS amount,
        'future_dated_receipt'::TEXT AS status,
        m.source_transaction_key,
        m.quickbooks_internal_id::TEXT AS quickbooks_internal_id,
        m.source_transaction_id,
        'Future-dated vendor bill receipt removed from QuickBooks-reported quantity on hand until physical receipt date.' AS inbound_note
    FROM {{ ref('int_quickbooks__inventory_movements') }} m
    CROSS JOIN latest_inventory li
    WHERE m.movement_type = 'receipt'
      AND m.quantity_in > 0
      AND m.movement_date > li.inventory_as_of_date
),

unioned AS (
    SELECT * FROM open_po_lines
    UNION ALL
    SELECT * FROM future_receipt_lines
),

final AS (
    SELECT
        MD5(CONCAT_WS(
            '|',
            inbound_type,
            sku,
            COALESCE(document_number, ''),
            COALESCE(vendor, ''),
            COALESCE(document_date::TEXT, ''),
            COALESCE(expected_or_receipt_date::TEXT, ''),
            COALESCE(quantity::TEXT, ''),
            COALESCE(source_transaction_key, ''),
            COALESCE(source_transaction_id, '')
        )) AS inbound_line_id,
        li.inventory_as_of_date,
        u.sku,
        u.inbound_type,
        u.document_number,
        u.vendor,
        u.document_date,
        u.expected_or_receipt_date,
        u.quantity,
        u.rate,
        u.amount,
        u.status,
        u.source_transaction_key,
        u.quickbooks_internal_id,
        u.source_transaction_id,
        u.inbound_note,
        CURRENT_TIMESTAMP AS created_at
    FROM unioned u
    CROSS JOIN latest_inventory li
)

SELECT *
FROM final
ORDER BY sku, expected_or_receipt_date, inbound_type, document_number
