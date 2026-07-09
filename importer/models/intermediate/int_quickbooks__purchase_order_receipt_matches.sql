/*
ABOUTME: Matches QuickBooks purchase order lines to vendor bill receipt lines for observed lead times.
ABOUTME: Uses PO opened date to receipt date and rejects postdated bill matches that predate the PO.
*/

{{ config(
    materialized = 'view',
    tags = ['inventory', 'reorder_planning', 'lead_time']
) }}

WITH latest_purchase_order_rows AS (
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

purchase_order_lines_parsed AS (
    SELECT
        MD5(CONCAT_WS(
            '|',
            'purchase_order',
            COALESCE(quick_books_internal_id, 'missing_qb_id'),
            COALESCE(transxx::TEXT, 'missing_transaction_id'),
            COALESCE(s_no::TEXT, 'missing_row_number'),
            COALESCE(purchase_order_no, ''),
            COALESCE(vendor, ''),
            COALESCE(product, ''),
            COALESCE(product_quantity::TEXT, ''),
            COALESCE(product_amount::TEXT, '')
        )) AS po_line_key,
        {{ normalize_inventory_sku('product') }} AS sku,
        vendor,
        purchase_order_no,
        CASE
            WHEN date IS NOT NULL
             AND TRIM(date) != ''
             AND date ~ '^\d{2}-\d{2}-\d{4}$'
            THEN TO_DATE(date, 'MM-DD-YYYY')
            ELSE NULL
        END AS po_document_date,
        CASE
            WHEN created_date IS NOT NULL
             AND TRIM(created_date) != ''
             AND created_date ~ '^\d{2}-\d{2}-\d{4}$'
            THEN TO_DATE(created_date, 'MM-DD-YYYY')
            ELSE NULL
        END AS po_created_date,
        CASE
            WHEN modified_date IS NOT NULL
             AND TRIM(modified_date) != ''
             AND modified_date ~ '^\d{2}-\d{2}-\d{4}$'
            THEN TO_DATE(modified_date, 'MM-DD-YYYY')
            ELSE NULL
        END AS po_modified_date,
        product_quantity::NUMERIC AS po_qty,
        product_rate::NUMERIC AS po_rate,
        product_amount::NUMERIC AS po_amount,
        fully_received,
        manually_closed,
        transxx::TEXT AS po_transaction_id,
        quick_books_internal_id::TEXT AS po_quickbooks_internal_id
    FROM latest_purchase_order_rows
    WHERE product IS NOT NULL
      AND TRIM(product) != ''
      AND product_quantity IS NOT NULL
      AND vendor IS NOT NULL
      AND TRIM(vendor) != ''
),

purchase_order_lines AS (
    SELECT
        *,
        LEAST(
            COALESCE(po_document_date, po_created_date),
            COALESCE(po_created_date, po_document_date)
        ) AS po_opened_date
    FROM purchase_order_lines_parsed
    WHERE COALESCE(po_document_date, po_created_date) IS NOT NULL
),

receipt_lines AS (
    SELECT DISTINCT
        MD5(CONCAT_WS(
            '|',
            'bill',
            COALESCE(quick_books_internal_id, 'missing_qb_id'),
            COALESCE(transxx::TEXT, 'missing_transaction_id'),
            COALESCE(bill_no, ''),
            COALESCE(vendor, ''),
            COALESCE(product_service, ''),
            COALESCE(product_service_quantity, ''),
            COALESCE(product_service_amount, '')
        )) AS receipt_line_key,
        {{ normalize_inventory_sku('product_service') }} AS sku,
        vendor,
        TO_DATE(date, 'MM-DD-YYYY') AS receipt_date,
        CASE
            WHEN created_date IS NOT NULL
             AND TRIM(created_date) != ''
             AND created_date ~ '^\d{2}-\d{2}-\d{4}$'
            THEN TO_DATE(created_date, 'MM-DD-YYYY')
            ELSE NULL
        END AS bill_created_date,
        CASE
            WHEN modified_date IS NOT NULL
             AND TRIM(modified_date) != ''
             AND modified_date ~ '^\d{2}-\d{2}-\d{4}$'
            THEN TO_DATE(modified_date, 'MM-DD-YYYY')
            ELSE NULL
        END AS bill_modified_date,
        bill_no,
        NULLIF(product_service_quantity, '')::NUMERIC AS receipt_qty,
        CASE
            WHEN product_service_amount IS NOT NULL
             AND TRIM(product_service_amount) != ''
            THEN product_service_amount::NUMERIC
            ELSE NULL
        END AS receipt_amount,
        transxx::TEXT AS bill_transaction_id,
        quick_books_internal_id::TEXT AS bill_quickbooks_internal_id
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
      AND TO_DATE(date, 'MM-DD-YYYY') <= CURRENT_DATE
      AND COALESCE(vendor, '') != 'DPC Transfer Inventory'
),

candidate_matches AS (
    SELECT
        po.po_line_key,
        rl.receipt_line_key,
        po.sku,
        po.vendor,
        po.purchase_order_no,
        po.po_opened_date,
        po.po_document_date,
        po.po_created_date,
        po.po_modified_date,
        po.po_qty,
        po.po_rate,
        po.po_amount,
        po.fully_received,
        po.manually_closed,
        po.po_transaction_id,
        po.po_quickbooks_internal_id,
        rl.bill_no,
        rl.receipt_date,
        rl.bill_created_date,
        rl.bill_modified_date,
        rl.receipt_qty,
        rl.receipt_amount,
        rl.bill_transaction_id,
        rl.bill_quickbooks_internal_id,
        rl.receipt_date - po.po_opened_date AS lead_time_days,
        rl.receipt_date - po.po_document_date AS po_document_to_receipt_days,
        ABS(po.po_qty - rl.receipt_qty) AS quantity_abs_diff,
        CASE
            WHEN ABS(po.po_qty - rl.receipt_qty) < 0.0001 THEN 0
            WHEN rl.receipt_qty <= po.po_qty THEN 1
            ELSE 2
        END AS quantity_match_rank,
        CASE
            WHEN rl.bill_created_date IS NULL THEN 'bill_created_date_missing'
            WHEN rl.bill_created_date >= po.po_opened_date THEN 'bill_created_on_or_after_po_opened'
            ELSE 'bill_created_within_entry_tolerance'
        END AS date_match_quality
    FROM purchase_order_lines po
    INNER JOIN receipt_lines rl
        ON po.sku = rl.sku
       AND po.vendor = rl.vendor
       AND rl.receipt_date >= po.po_opened_date
       AND rl.receipt_date - po.po_opened_date BETWEEN 1 AND 365
       -- Bills are often created and postdated before arrival. A bill created
       -- weeks before a PO opened is not a credible receipt for that PO.
       AND (
            rl.bill_created_date IS NULL
            OR rl.bill_created_date >= po.po_opened_date - 7
       )
),

scored_matches AS (
    SELECT
        *,
        COUNT(*) OVER (
            PARTITION BY vendor, purchase_order_no, bill_no
        ) AS document_overlap_line_count,
        COUNT(*) FILTER (WHERE quantity_match_rank = 0) OVER (
            PARTITION BY vendor, purchase_order_no, bill_no
        ) AS exact_document_overlap_line_count
    FROM candidate_matches
),

ranked_matches AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY po_line_key
            ORDER BY
                quantity_match_rank,
                exact_document_overlap_line_count DESC,
                document_overlap_line_count DESC,
                quantity_abs_diff,
                receipt_date,
                bill_created_date NULLS LAST,
                bill_no
        ) AS po_match_rank,
        ROW_NUMBER() OVER (
            PARTITION BY receipt_line_key
            ORDER BY
                quantity_match_rank,
                exact_document_overlap_line_count DESC,
                document_overlap_line_count DESC,
                quantity_abs_diff,
                po_opened_date DESC,
                purchase_order_no
        ) AS receipt_match_rank
    FROM scored_matches
),

final AS (
    SELECT
        MD5(CONCAT_WS('|', po_line_key, receipt_line_key)) AS lead_time_match_id,
        po_line_key,
        receipt_line_key,
        sku,
        vendor,
        purchase_order_no,
        po_opened_date,
        po_document_date,
        po_created_date,
        po_modified_date,
        bill_no,
        receipt_date,
        bill_created_date,
        bill_modified_date,
        po_qty,
        receipt_qty,
        po_rate,
        po_amount,
        receipt_amount,
        lead_time_days,
        po_document_to_receipt_days,
        quantity_abs_diff,
        document_overlap_line_count,
        exact_document_overlap_line_count,
        CASE
            WHEN quantity_match_rank = 0 THEN 'exact_quantity'
            WHEN quantity_match_rank = 1 THEN 'partial_or_under_received_quantity'
            ELSE 'nearest_future_receipt_quantity'
        END AS quantity_match_quality,
        date_match_quality,
        fully_received,
        manually_closed,
        po_transaction_id,
        bill_transaction_id,
        po_quickbooks_internal_id,
        bill_quickbooks_internal_id,
        CURRENT_TIMESTAMP AS created_at
    FROM ranked_matches
    WHERE po_match_rank = 1
      AND receipt_match_rank = 1
)

SELECT *
FROM final
