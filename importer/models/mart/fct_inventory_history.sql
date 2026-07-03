/*
ABOUTME: Daily inventory estimate using QuickBooks quantity_on_hand as occasional anchors.
ABOUTME: Between anchors, inventory moves from normalized sales, receipts, adjustments, and builds.
*/

{{ config(
    materialized = 'table',
    post_hook = ["analyze {{ this }}"],
    tags = ['inventory', 'quickbooks', 'sales_based']
) }}

WITH inventory_movements AS (
    SELECT
        sku,
        movement_date,
        movement_type,
        movement_quantity,
        quantity_in,
        quantity_out,
        source_transaction_key,
        is_future_committed_demand
    FROM {{ ref('int_quickbooks__inventory_movements') }}
),

future_dated_receipts AS (
    SELECT
        sku,
        movement_date AS receipt_date,
        SUM(movement_quantity) AS receipt_qty,
        COUNT(*) AS receipt_line_count
    FROM inventory_movements
    WHERE movement_type = 'receipt'
      AND movement_quantity > 0
    GROUP BY sku, movement_date
),

raw_anchors AS (
    SELECT
        CASE
            WHEN item_name = '82-6002 IN' THEN '82-6002'
            ELSE item_name
        END AS sku,
        CAST(load_date AS DATE) AS anchor_date,
        quantity_on_hand AS quickbooks_quantity_on_hand,
        GREATEST(
            quantity_on_hand - COALESCE(future_receipts.future_receipt_qty_after_anchor, 0),
            0
        ) AS anchor_quantity_on_hand,
        COALESCE(future_receipts.future_receipt_qty_after_anchor, 0) AS future_receipt_qty_after_anchor,
        COALESCE(future_receipts.future_receipt_line_count_after_anchor, 0) AS future_receipt_line_count_after_anchor,
        COALESCE(quantity_on_order, 0) AS quantity_on_order,
        COALESCE(quantity_on_sales_order, 0) AS quantity_on_sales_order,
        ROW_NUMBER() OVER (
            PARTITION BY
                CASE
                    WHEN item_name = '82-6002 IN' THEN '82-6002'
                    ELSE item_name
                END,
                CAST(load_date AS DATE)
            ORDER BY load_date DESC
        ) AS anchor_rank
    FROM {{ ref('stg_quickbooks__items') }}
    LEFT JOIN LATERAL (
        SELECT
            SUM(fdr.receipt_qty) AS future_receipt_qty_after_anchor,
            SUM(fdr.receipt_line_count) AS future_receipt_line_count_after_anchor
        FROM future_dated_receipts fdr
        WHERE fdr.sku = CASE
                WHEN item_name = '82-6002 IN' THEN '82-6002'
                ELSE item_name
            END
          AND fdr.receipt_date > CAST(load_date AS DATE)
    ) future_receipts ON TRUE
    WHERE item_name IS NOT NULL
      AND TRIM(item_name) != ''
      AND quantity_on_hand IS NOT NULL
      AND load_date IS NOT NULL
      AND TRIM(load_date) != ''
      AND load_date ~ '^\d{4}-\d{2}-\d{2}$'
),

anchors AS (
    SELECT
        sku,
        anchor_date,
        quickbooks_quantity_on_hand,
        anchor_quantity_on_hand,
        future_receipt_qty_after_anchor,
        future_receipt_line_count_after_anchor,
        quantity_on_order,
        quantity_on_sales_order
    FROM raw_anchors
    WHERE anchor_rank = 1
),

inventory_skus AS (
    SELECT DISTINCT sku
    FROM anchors
),

product_details AS (
    SELECT
        CASE
            WHEN item_name = '82-6002 IN' THEN '82-6002'
            ELSE item_name
        END AS sku,
        sales_description,
        product_family,
        material_type,
        is_kit,
        item_type,
        item_subtype,
        packaging_type,
        units_per_sku,
        unit_of_measure,
        sales_price,
        purchase_cost,
        status AS item_status
    FROM {{ ref('int_quickbooks__items_enriched') }}
    WHERE item_name != '82-6002 IN'
),

daily_movements AS (
    SELECT
        sku,
        movement_date,
        SUM(CASE WHEN movement_type = 'sale' THEN quantity_out ELSE 0 END) AS sales_qty,
        SUM(CASE WHEN movement_type = 'receipt' THEN quantity_in - quantity_out ELSE 0 END) AS receipt_qty,
        SUM(CASE WHEN movement_type IN ('adjustment', 'fba_transfer_in', 'fba_transfer_out') THEN movement_quantity ELSE 0 END) AS adjustment_qty,
        COUNT(DISTINCT CASE WHEN movement_type = 'sale' THEN source_transaction_key END) AS order_count,
        COUNT(CASE WHEN movement_type = 'sale' THEN 1 END) AS line_item_count,
        COUNT(CASE WHEN movement_type = 'receipt' THEN 1 END) AS receipt_line_count,
        COUNT(CASE WHEN movement_type IN ('adjustment', 'fba_transfer_in', 'fba_transfer_out') THEN 1 END) AS adjustment_line_count,
        BOOL_OR(is_future_committed_demand) AS includes_future_dated_orders,
        SUM(movement_quantity) AS net_inventory_movement
    FROM inventory_movements
    WHERE movement_date <= CURRENT_DATE
      AND COALESCE(is_future_committed_demand, FALSE) = FALSE
    GROUP BY sku, movement_date
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

purchase_order_lines AS (
    SELECT
        CASE
            WHEN product = '82-6002 IN' THEN '82-6002'
            ELSE product
        END AS sku,
        vendor,
        purchase_order_no,
        TO_DATE(date, 'MM-DD-YYYY') AS po_date,
        CASE
            WHEN expected_date IS NOT NULL
             AND TRIM(expected_date) != ''
             AND expected_date ~ '^\d{2}-\d{2}-\d{4}$'
            THEN TO_DATE(expected_date, 'MM-DD-YYYY')
            ELSE NULL
        END AS expected_date_parsed,
        product_quantity,
        product_rate,
        product_amount,
        fully_received,
        manually_closed,
        transxx,
        quick_books_internal_id
    FROM latest_purchase_order_rows
    WHERE product IS NOT NULL
      AND TRIM(product) != ''
      AND product_quantity IS NOT NULL
      AND date IS NOT NULL
      AND TRIM(date) != ''
      AND date ~ '^\d{2}-\d{2}-\d{4}$'
),

receipt_lines AS (
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
        FROM purchase_order_lines po
        INNER JOIN receipt_lines rl
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

open_purchase_orders AS (
    SELECT
        po.sku,
        SUM(product_quantity) AS open_po_quantity,
        COUNT(*) AS open_po_line_count,
        MIN(
            CASE
                WHEN po.expected_date_parsed IS NOT NULL
                 AND po.expected_date_parsed > po.po_date
                THEN po.expected_date_parsed
                ELSE po.po_date + CEIL(COALESCE(
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
            END
        ) AS next_open_po_date
    FROM purchase_order_lines po
    LEFT JOIN observed_sku_vendor_lead_times osvl
        ON po.sku = osvl.sku
       AND po.vendor = osvl.vendor
    LEFT JOIN observed_vendor_lead_times ovl
        ON po.vendor = ovl.vendor
    WHERE COALESCE(po.fully_received, FALSE) = FALSE
      AND COALESCE(po.manually_closed, FALSE) = FALSE
    GROUP BY po.sku
),

sku_bounds AS (
    SELECT
        i.sku,
        LEAST(
            COALESCE(MIN(a.anchor_date), CURRENT_DATE),
            COALESCE(MIN(dm.movement_date), CURRENT_DATE)
        ) AS start_date,
        CURRENT_DATE AS end_date
    FROM inventory_skus i
    LEFT JOIN anchors a
        ON i.sku = a.sku
    LEFT JOIN daily_movements dm
        ON i.sku = dm.sku
    GROUP BY i.sku
),

date_spine AS (
    SELECT
        sku_bounds.sku,
        generated_date::date AS inventory_date
    FROM sku_bounds
    CROSS JOIN LATERAL generate_series(
        sku_bounds.start_date,
        sku_bounds.end_date,
        INTERVAL '1 day'
    ) AS generated_date
),

dated_inventory AS (
    SELECT
        ds.sku,
        ds.inventory_date,
        COALESCE(dm.sales_qty, 0) AS sales_qty,
        COALESCE(dm.receipt_qty, 0) AS receipt_qty,
        COALESCE(dm.adjustment_qty, 0) AS adjustment_qty,
        COALESCE(dm.net_inventory_movement, 0) AS net_inventory_movement,
        COALESCE(dm.order_count, 0) AS order_count,
        COALESCE(dm.line_item_count, 0) AS line_item_count,
        COALESCE(dm.receipt_line_count, 0) AS receipt_line_count,
        COALESCE(dm.adjustment_line_count, 0) AS adjustment_line_count,
        COALESCE(dm.includes_future_dated_orders, FALSE) AS includes_future_dated_orders,
        chosen_anchor.anchor_date,
        chosen_anchor.quickbooks_quantity_on_hand,
        chosen_anchor.anchor_quantity_on_hand,
        chosen_anchor.future_receipt_qty_after_anchor,
        chosen_anchor.future_receipt_line_count_after_anchor,
        chosen_anchor.quantity_on_order,
        chosen_anchor.quantity_on_sales_order,
        COALESCE(opo.open_po_quantity, 0) AS open_po_quantity,
        COALESCE(opo.open_po_line_count, 0) AS open_po_line_count,
        opo.next_open_po_date,
        exact_anchor.anchor_date IS NOT NULL AS is_anchor_day
    FROM date_spine ds
    LEFT JOIN daily_movements dm
        ON ds.sku = dm.sku
       AND ds.inventory_date = dm.movement_date
    LEFT JOIN open_purchase_orders opo
        ON ds.sku = opo.sku
    LEFT JOIN LATERAL (
        SELECT
            a.anchor_date,
            a.quickbooks_quantity_on_hand,
            a.anchor_quantity_on_hand,
            a.future_receipt_qty_after_anchor,
            a.future_receipt_line_count_after_anchor,
            a.quantity_on_order,
            a.quantity_on_sales_order
        FROM anchors a
        WHERE a.sku = ds.sku
          AND a.anchor_date <= ds.inventory_date
        ORDER BY a.anchor_date DESC
        LIMIT 1
    ) prior_anchor ON TRUE
    LEFT JOIN LATERAL (
        SELECT
            a.anchor_date,
            a.quickbooks_quantity_on_hand,
            a.anchor_quantity_on_hand,
            a.future_receipt_qty_after_anchor,
            a.future_receipt_line_count_after_anchor,
            a.quantity_on_order,
            a.quantity_on_sales_order
        FROM anchors a
        WHERE a.sku = ds.sku
          AND a.anchor_date > ds.inventory_date
        ORDER BY a.anchor_date ASC
        LIMIT 1
    ) next_anchor ON prior_anchor.anchor_date IS NULL
    LEFT JOIN LATERAL (
        SELECT
            COALESCE(prior_anchor.anchor_date, next_anchor.anchor_date) AS anchor_date,
            COALESCE(prior_anchor.quickbooks_quantity_on_hand, next_anchor.quickbooks_quantity_on_hand) AS quickbooks_quantity_on_hand,
            COALESCE(prior_anchor.anchor_quantity_on_hand, next_anchor.anchor_quantity_on_hand) AS anchor_quantity_on_hand,
            COALESCE(prior_anchor.future_receipt_qty_after_anchor, next_anchor.future_receipt_qty_after_anchor, 0) AS future_receipt_qty_after_anchor,
            COALESCE(prior_anchor.future_receipt_line_count_after_anchor, next_anchor.future_receipt_line_count_after_anchor, 0) AS future_receipt_line_count_after_anchor,
            COALESCE(prior_anchor.quantity_on_order, next_anchor.quantity_on_order) AS quantity_on_order,
            COALESCE(prior_anchor.quantity_on_sales_order, next_anchor.quantity_on_sales_order) AS quantity_on_sales_order
    ) chosen_anchor ON TRUE
    LEFT JOIN anchors exact_anchor
        ON ds.sku = exact_anchor.sku
       AND ds.inventory_date = exact_anchor.anchor_date
),

running_inventory AS (
    SELECT
        di.*,
        SUM(di.net_inventory_movement) OVER (
            PARTITION BY di.sku
            ORDER BY di.inventory_date
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cumulative_net_inventory_movement
    FROM dated_inventory di
),

anchor_running_totals AS (
    SELECT
        sku,
        inventory_date AS anchor_date,
        cumulative_net_inventory_movement AS anchor_cumulative_net_inventory_movement
    FROM running_inventory
    WHERE is_anchor_day
),

estimated_levels AS (
    SELECT
        ri.*,
        ri.anchor_quantity_on_hand
            + ri.cumulative_net_inventory_movement
            - COALESCE(
                art.anchor_cumulative_net_inventory_movement,
                ri.cumulative_net_inventory_movement
            ) AS estimated_ending_inventory
    FROM running_inventory ri
    LEFT JOIN anchor_running_totals art
        ON ri.sku = art.sku
       AND ri.anchor_date = art.anchor_date
),

velocity AS (
    SELECT
        *,
        AVG(CASE WHEN inventory_date >= CURRENT_DATE - INTERVAL '30 days' THEN sales_qty END) OVER (
            PARTITION BY sku
        ) AS avg_daily_sales_30d,
        AVG(CASE WHEN inventory_date >= CURRENT_DATE - INTERVAL '90 days' THEN sales_qty END) OVER (
            PARTITION BY sku
        ) AS avg_daily_sales_90d,
        AVG(CASE WHEN inventory_date >= CURRENT_DATE - INTERVAL '365 days' THEN sales_qty END) OVER (
            PARTITION BY sku
        ) AS avg_daily_sales_365d
    FROM estimated_levels
),

final AS (
    SELECT
        v.sku,
        v.inventory_date,
        v.sales_qty,
        v.receipt_qty,
        v.adjustment_qty,
        v.net_inventory_movement,
        v.order_count,
        v.line_item_count,
        v.receipt_line_count,
        v.adjustment_line_count,
        v.includes_future_dated_orders,

        COALESCE(
            LAG(v.estimated_ending_inventory) OVER (
                PARTITION BY v.sku
                ORDER BY v.inventory_date
            ),
            v.estimated_ending_inventory
        ) AS estimated_beginning_inventory,
        v.estimated_ending_inventory,
        v.estimated_ending_inventory - LAG(v.estimated_ending_inventory) OVER (
            PARTITION BY v.sku
            ORDER BY v.inventory_date
        ) AS inventory_change,

        v.anchor_date,
        v.quickbooks_quantity_on_hand,
        v.anchor_quantity_on_hand,
        v.future_receipt_qty_after_anchor,
        v.future_receipt_line_count_after_anchor,
        v.is_anchor_day,
        v.inventory_date >= CURRENT_DATE AS is_projected_day,
        GREATEST(0, v.inventory_date - v.anchor_date) AS days_since_anchor,
        'quickbooks_anchor_plus_normalized_inventory_movements' AS inventory_basis,

        v.quantity_on_order,
        v.quantity_on_sales_order,
        v.open_po_quantity,
        v.open_po_line_count,
        v.next_open_po_date,
        v.open_po_quantity > 0 AS has_open_po_inbound,
        v.estimated_ending_inventory - v.quantity_on_sales_order AS estimated_available_quantity,
        v.estimated_ending_inventory + GREATEST(v.quantity_on_order, v.open_po_quantity) AS estimated_total_visibility,

        v.avg_daily_sales_30d,
        v.avg_daily_sales_90d,
        v.avg_daily_sales_365d,
        CASE
            WHEN v.avg_daily_sales_90d > 0
            THEN v.estimated_ending_inventory / v.avg_daily_sales_90d
            ELSE NULL
        END AS days_remaining_90d_velocity,
        CASE
            WHEN v.estimated_ending_inventory <= 0 THEN v.inventory_date
            WHEN v.avg_daily_sales_90d > 0 THEN v.inventory_date + CEIL(v.estimated_ending_inventory / v.avg_daily_sales_90d)::int
            ELSE NULL
        END AS estimated_stockout_date,
        CASE
            WHEN v.avg_daily_sales_90d IS NULL OR v.avg_daily_sales_90d = 0 THEN 'NO_RECENT_SALES'
            WHEN v.estimated_ending_inventory <= 0 THEN 'NEGATIVE_OR_ZERO'
            WHEN v.estimated_ending_inventory / v.avg_daily_sales_90d <= 30 THEN 'CRITICAL'
            WHEN v.estimated_ending_inventory / v.avg_daily_sales_90d <= 60 THEN 'LOW'
            WHEN v.estimated_ending_inventory / v.avg_daily_sales_90d <= 120 THEN 'MODERATE'
            ELSE 'SUFFICIENT'
        END AS inventory_status,

        pd.sales_description,
        pd.product_family,
        pd.material_type,
        pd.is_kit,
        pd.item_type,
        pd.item_subtype,
        pd.packaging_type,
        pd.units_per_sku,
        pd.unit_of_measure,
        pd.sales_price,
        pd.purchase_cost,
        v.estimated_ending_inventory * pd.purchase_cost AS inventory_value_at_cost,
        v.estimated_ending_inventory * pd.sales_price AS inventory_value_at_sales_price,
        pd.item_status
    FROM velocity v
    LEFT JOIN product_details pd
        ON v.sku = pd.sku
)

SELECT *
FROM final
ORDER BY sku, inventory_date
