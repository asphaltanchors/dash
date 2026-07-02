/*
ABOUTME: SKU-level inventory planning policy classification for reorder forecasting.
ABOUTME: Routes each tracked SKU to the forecasting/replenishment method its history can support.
*/

{{ config(
    materialized = 'table',
    tags = ['inventory', 'reorder_planning', 'forecasting']
) }}

WITH latest_inventory_date AS (
    SELECT MAX(inventory_date) AS inventory_date
    FROM {{ ref('fct_inventory_history') }}
),

latest_inventory AS (
    SELECT
        ih.sku,
        ih.inventory_date AS inventory_as_of_date,
        ih.sales_description,
        ih.product_family,
        ih.material_type,
        ih.is_kit,
        ih.item_type,
        ih.item_subtype,
        ih.packaging_type,
        ih.units_per_sku,
        ih.unit_of_measure,
        ih.estimated_ending_inventory AS current_on_hand_qty,
        ih.estimated_available_quantity,
        ih.estimated_total_visibility,
        ih.quantity_on_order,
        ih.quantity_on_sales_order,
        ih.open_po_quantity,
        ih.open_po_line_count,
        ih.next_open_po_date,
        ih.future_receipt_qty_after_anchor,
        ih.future_receipt_line_count_after_anchor,
        ih.avg_daily_sales_30d,
        ih.avg_daily_sales_90d,
        ih.avg_daily_sales_365d,
        ih.inventory_status,
        ih.purchase_cost,
        ih.sales_price,
        ih.inventory_value_at_cost,
        ih.item_status
    FROM {{ ref('fct_inventory_history') }} ih
    INNER JOIN latest_inventory_date lid
        ON ih.inventory_date = lid.inventory_date
),

suppression_rules AS (
    SELECT
        li.sku,
        CASE
            WHEN li.sku = '01-6025' THEN 'obsolete_sku_not_sold'
            WHEN li.sku ILIKE 'HILLMAN PRICING%' THEN 'pricing_artifact_not_inventory'
            WHEN li.sku LIKE '%(W)' THEN 'china_ordering_artifact_not_inventory'
            WHEN li.sku = '01-7010.MCC' THEN 'customer_special_order_not_inventory'
            WHEN li.sku = '01-7014.wwd' THEN 'unused_wwd_artifact_not_inventory'
            WHEN li.sku = '01-6315.3SK-2' THEN 'customer_special_order_not_inventory'
            WHEN li.sku = '01-6358.5SK-2' THEN 'customer_special_order_not_inventory'
            WHEN li.sku IN ('01-8050', '46-4001', '53-0258.BK', '95-0010', '95-0101') THEN 'obsolete_sku_not_sold'
            WHEN li.sku = '82-5002.010' THEN 'obsolete_replaced_by_AHD_EPX2'
            WHEN li.sku = '82-5002.020' THEN 'obsolete_or_nonplanning_sku'
            ELSE NULL
        END AS inventory_suppression_reason
    FROM latest_inventory li
),

sales_monthly AS (
    SELECT
        sku,
        DATE_TRUNC('month', movement_date)::DATE AS month_start,
        SUM(quantity_out) AS sales_qty
    FROM {{ ref('int_quickbooks__inventory_movements') }}
    WHERE movement_type = 'sale'
      AND is_future_committed_demand = FALSE
      AND quantity_out > 0
    GROUP BY sku, DATE_TRUNC('month', movement_date)::DATE
),

sales_stats AS (
    SELECT
        sku,
        MIN(month_start) AS first_sale_month,
        MAX(month_start) AS last_sale_month,
        COUNT(*) AS months_with_sales_all_time,
        COUNT(*) FILTER (WHERE month_start >= DATE '2023-01-01') AS months_with_sales_since_2023,
        COUNT(*) FILTER (WHERE month_start >= DATE '2024-01-01') AS months_with_sales_since_2024,
        SUM(sales_qty) AS total_sales_qty_all_time,
        SUM(sales_qty) FILTER (WHERE month_start >= DATE '2024-01-01') AS sales_qty_since_2024,
        SUM(sales_qty) FILTER (WHERE month_start >= DATE '2025-01-01') AS sales_qty_since_2025
    FROM sales_monthly
    GROUP BY sku
),

component_stats AS (
    SELECT
        sku,
        SUM(quantity_out) AS component_consumed_qty_all_time,
        SUM(quantity_out) FILTER (WHERE movement_date >= DATE '2024-01-01') AS component_consumed_qty_since_2024,
        MAX(movement_date) AS latest_component_consumption_date,
        COUNT(DISTINCT related_sku) AS consumed_by_assembly_sku_count
    FROM {{ ref('int_quickbooks__inventory_movements') }}
    WHERE movement_type = 'build_component_consumption'
      AND quantity_out > 0
    GROUP BY sku
),

assembly_stats AS (
    SELECT
        sku,
        SUM(quantity_in) AS build_produced_qty_all_time,
        SUM(quantity_in) FILTER (WHERE movement_date >= DATE '2024-01-01') AS build_produced_qty_since_2024,
        MAX(movement_date) AS latest_build_date
    FROM {{ ref('int_quickbooks__inventory_movements') }}
    WHERE movement_type = 'build_production'
      AND quantity_in > 0
    GROUP BY sku
),

fba_stats AS (
    SELECT
        sku,
        SUM(quantity_in) FILTER (WHERE is_fba_transfer_signal) AS fba_transfer_in_qty_all_time,
        SUM(quantity_in) FILTER (
            WHERE is_fba_transfer_signal
              AND movement_date >= DATE '2024-01-01'
        ) AS fba_transfer_in_qty_since_2024,
        MAX(movement_date) FILTER (WHERE is_fba_transfer_signal) AS latest_fba_transfer_date
    FROM {{ ref('int_quickbooks__inventory_movements') }}
    GROUP BY sku
),

outlier_stats AS (
    SELECT
        sku,
        MAX(quantity_out) FILTER (
            WHERE movement_date >= DATE '2025-01-01'
              AND movement_date < DATE '2026-01-01'
        ) AS largest_sales_line_qty_2025,
        SUM(quantity_out) FILTER (
            WHERE movement_date >= DATE '2025-01-01'
              AND movement_date < DATE '2026-01-01'
        ) AS total_sales_qty_2025,
        COUNT(*) FILTER (
            WHERE movement_date >= DATE '2025-01-01'
              AND movement_date < DATE '2026-01-01'
        ) AS sales_line_count_2025
    FROM {{ ref('int_quickbooks__inventory_movements') }}
    WHERE movement_type = 'sale'
      AND is_future_committed_demand = FALSE
      AND quantity_out > 0
    GROUP BY sku
),

classified AS (
    SELECT
        li.*,
        sr.inventory_suppression_reason,
        sr.inventory_suppression_reason IS NOT NULL AS is_suppressed_from_inventory_planning,
        ss.first_sale_month,
        ss.last_sale_month,
        COALESCE(ss.months_with_sales_all_time, 0) AS months_with_sales_all_time,
        COALESCE(ss.months_with_sales_since_2023, 0) AS months_with_sales_since_2023,
        COALESCE(ss.months_with_sales_since_2024, 0) AS months_with_sales_since_2024,
        COALESCE(ss.total_sales_qty_all_time, 0) AS total_sales_qty_all_time,
        COALESCE(ss.sales_qty_since_2024, 0) AS sales_qty_since_2024,
        COALESCE(ss.sales_qty_since_2025, 0) AS sales_qty_since_2025,
        COALESCE(cs.component_consumed_qty_all_time, 0) AS component_consumed_qty_all_time,
        COALESCE(cs.component_consumed_qty_since_2024, 0) AS component_consumed_qty_since_2024,
        cs.latest_component_consumption_date,
        COALESCE(cs.consumed_by_assembly_sku_count, 0) AS consumed_by_assembly_sku_count,
        COALESCE(ast.build_produced_qty_all_time, 0) AS build_produced_qty_all_time,
        COALESCE(ast.build_produced_qty_since_2024, 0) AS build_produced_qty_since_2024,
        ast.latest_build_date,
        COALESCE(fs.fba_transfer_in_qty_all_time, 0) AS fba_transfer_in_qty_all_time,
        COALESCE(fs.fba_transfer_in_qty_since_2024, 0) AS fba_transfer_in_qty_since_2024,
        fs.latest_fba_transfer_date,
        COALESCE(os.largest_sales_line_qty_2025, 0) AS largest_sales_line_qty_2025,
        COALESCE(os.total_sales_qty_2025, 0) AS total_sales_qty_2025,
        COALESCE(os.sales_line_count_2025, 0) AS sales_line_count_2025,
        CASE
            WHEN COALESCE(os.total_sales_qty_2025, 0) > 0
            THEN os.largest_sales_line_qty_2025 / os.total_sales_qty_2025
            ELSE NULL
        END AS largest_sales_line_share_2025,
        CASE
            WHEN COALESCE(ss.sales_qty_since_2024, 0) > 0
            THEN COALESCE(cs.component_consumed_qty_since_2024, 0) / ss.sales_qty_since_2024
            ELSE NULL
        END AS component_to_sales_qty_ratio_since_2024
    FROM latest_inventory li
    LEFT JOIN suppression_rules sr
        ON li.sku = sr.sku
    LEFT JOIN sales_stats ss
        ON li.sku = ss.sku
    LEFT JOIN component_stats cs
        ON li.sku = cs.sku
    LEFT JOIN assembly_stats ast
        ON li.sku = ast.sku
    LEFT JOIN fba_stats fs
        ON li.sku = fs.sku
    LEFT JOIN outlier_stats os
        ON li.sku = os.sku
),

policy AS (
    SELECT
        *,
        CASE
            WHEN is_suppressed_from_inventory_planning THEN 'NO_ACTION_OR_ARCHIVE'
            WHEN sku ILIKE '%FBA%' THEN 'FBA_REPLENISHMENT_MODEL'
            WHEN COALESCE(is_kit, FALSE) = TRUE
              OR item_subtype = 'ItemInventoryAssembly'
              OR build_produced_qty_all_time > 0 THEN 'ASSEMBLY_FINISHED_GOOD_MODEL'
            WHEN component_consumed_qty_since_2024 > 0
             AND (
                sales_qty_since_2024 = 0
                OR component_consumed_qty_since_2024 >= sales_qty_since_2024
             ) THEN 'COMPONENT_PACKAGING_MODEL'
            WHEN months_with_sales_since_2023 >= 18 THEN 'SKU_SEASONAL_TREND_MODEL'
            WHEN months_with_sales_since_2023 >= 6 THEN 'SKU_BASELINE_VARIANT_SEASONAL_MODEL'
            WHEN sales_qty_since_2024 > 0 THEN 'SPARSE_OR_NEW_SKU_REVIEW'
            WHEN current_on_hand_qty > 0 THEN 'STOCKED_NO_RECENT_DEMAND_REVIEW'
            ELSE 'NO_ACTION_OR_ARCHIVE'
        END AS policy_bucket,
        CASE
            WHEN is_suppressed_from_inventory_planning THEN 'suppression_rule'
            WHEN sku ILIKE '%FBA%' THEN 'sku_identifies_fba_inventory'
            WHEN COALESCE(is_kit, FALSE) = TRUE
              OR item_subtype = 'ItemInventoryAssembly'
              OR build_produced_qty_all_time > 0 THEN 'assembly_item_or_build_history'
            WHEN component_consumed_qty_since_2024 > 0
             AND (
                sales_qty_since_2024 = 0
                OR component_consumed_qty_since_2024 >= sales_qty_since_2024
             ) THEN 'component_consumption_dominates_recent_sales'
            WHEN months_with_sales_since_2023 >= 18 THEN 'mature_sku_with_enough_monthly_sales_history'
            WHEN months_with_sales_since_2023 >= 6 THEN 'moderate_sku_sales_history'
            WHEN sales_qty_since_2024 > 0 THEN 'recent_sparse_sales_history'
            WHEN current_on_hand_qty > 0 THEN 'stocked_without_recent_demand'
            ELSE 'no_stock_or_usable_demand_signal'
        END AS policy_assignment_reason
    FROM classified
),

validated AS (
    SELECT
        *,
        NULLIF(CONCAT_WS(
            '; ',
            CASE
                WHEN is_suppressed_from_inventory_planning
                 AND (
                    sales_qty_since_2024 > 0
                    OR component_consumed_qty_since_2024 > 0
                    OR build_produced_qty_since_2024 > 0
                 )
                THEN 'suppressed_sku_has_recent_activity'
            END,
            CASE
                WHEN component_consumed_qty_since_2024 > 0
                 AND policy_bucket NOT IN ('COMPONENT_PACKAGING_MODEL', 'ASSEMBLY_FINISHED_GOOD_MODEL', 'NO_ACTION_OR_ARCHIVE')
                THEN 'component_consumption_in_sales_policy_bucket'
            END,
            CASE
                WHEN build_produced_qty_since_2024 > 0
                 AND policy_bucket NOT IN ('ASSEMBLY_FINISHED_GOOD_MODEL', 'NO_ACTION_OR_ARCHIVE')
                THEN 'build_production_outside_assembly_bucket'
            END,
            CASE
                WHEN fba_transfer_in_qty_since_2024 > 0
                 AND policy_bucket != 'FBA_REPLENISHMENT_MODEL'
                THEN 'fba_transfer_signal_outside_fba_bucket'
            END,
            CASE
                WHEN largest_sales_line_share_2025 >= 0.35
                 AND policy_bucket NOT IN ('NO_ACTION_OR_ARCHIVE', 'STOCKED_NO_RECENT_DEMAND_REVIEW')
                THEN 'large_order_outlier_2025'
            END,
            CASE
                WHEN current_on_hand_qty < 0 THEN 'negative_current_on_hand'
            END
        ), '') AS policy_review_flags
    FROM policy
),

final AS (
    SELECT
        sku,
        inventory_as_of_date,
        policy_bucket,
        policy_assignment_reason,
        CASE
            WHEN policy_review_flags IS NULL THEN 'ok'
            ELSE 'review'
        END AS policy_validation_status,
        policy_review_flags,
        CASE policy_bucket
            WHEN 'FBA_REPLENISHMENT_MODEL' THEN 'amazon_fba_sales_and_transfer_history'
            WHEN 'COMPONENT_PACKAGING_MODEL' THEN 'build_component_consumption'
            WHEN 'ASSEMBLY_FINISHED_GOOD_MODEL' THEN 'finished_good_sales_and_build_history'
            WHEN 'SKU_SEASONAL_TREND_MODEL' THEN 'sku_monthly_history_with_sku_seasonality'
            WHEN 'SKU_BASELINE_VARIANT_SEASONAL_MODEL' THEN 'sku_baseline_with_family_material_seasonality'
            WHEN 'SPARSE_OR_NEW_SKU_REVIEW' THEN 'manual_or_analog_sku_review'
            WHEN 'STOCKED_NO_RECENT_DEMAND_REVIEW' THEN 'hold_or_manual_review'
            ELSE 'exclude_until_active'
        END AS forecast_method,
        CASE
            WHEN policy_bucket = 'SKU_SEASONAL_TREND_MODEL' THEN 'high'
            WHEN policy_bucket IN ('SKU_BASELINE_VARIANT_SEASONAL_MODEL', 'ASSEMBLY_FINISHED_GOOD_MODEL', 'FBA_REPLENISHMENT_MODEL') THEN 'medium'
            WHEN policy_bucket IN ('COMPONENT_PACKAGING_MODEL', 'SPARSE_OR_NEW_SKU_REVIEW', 'STOCKED_NO_RECENT_DEMAND_REVIEW') THEN 'manual_review'
            ELSE 'exclude'
        END AS confidence_level,
        policy_bucket IN (
            'SPARSE_OR_NEW_SKU_REVIEW',
            'STOCKED_NO_RECENT_DEMAND_REVIEW',
            'NO_ACTION_OR_ARCHIVE',
            'COMPONENT_PACKAGING_MODEL'
        ) AS requires_manual_review,
        sales_description,
        product_family,
        material_type,
        is_kit,
        item_type,
        item_subtype,
        packaging_type,
        units_per_sku,
        unit_of_measure,
        current_on_hand_qty,
        estimated_available_quantity,
        estimated_total_visibility,
        quantity_on_order,
        quantity_on_sales_order,
        open_po_quantity,
        open_po_line_count,
        next_open_po_date,
        future_receipt_qty_after_anchor,
        future_receipt_line_count_after_anchor,
        avg_daily_sales_30d,
        avg_daily_sales_90d,
        avg_daily_sales_365d,
        inventory_status,
        purchase_cost,
        sales_price,
        inventory_value_at_cost,
        item_status,
        is_suppressed_from_inventory_planning,
        inventory_suppression_reason,
        first_sale_month,
        last_sale_month,
        months_with_sales_all_time,
        months_with_sales_since_2023,
        months_with_sales_since_2024,
        total_sales_qty_all_time,
        sales_qty_since_2024,
        sales_qty_since_2025,
        component_consumed_qty_all_time,
        component_consumed_qty_since_2024,
        latest_component_consumption_date,
        consumed_by_assembly_sku_count,
        build_produced_qty_all_time,
        build_produced_qty_since_2024,
        latest_build_date,
        fba_transfer_in_qty_all_time,
        fba_transfer_in_qty_since_2024,
        latest_fba_transfer_date,
        largest_sales_line_qty_2025,
        total_sales_qty_2025,
        sales_line_count_2025,
        largest_sales_line_share_2025,
        component_to_sales_qty_ratio_since_2024,
        largest_sales_line_share_2025 >= 0.35 AS has_large_order_outlier_2025,
        CURRENT_TIMESTAMP AS created_at
    FROM validated
)

SELECT *
FROM final
