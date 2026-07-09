/*
ABOUTME: Auditable reorder recommendations from trusted stock, policy, seasonally integrated demand, inbound, and committed demand.
ABOUTME: Separates orders due now from future thresholds and exposes growth, conservative, and spike-adjusted planning paths.
*/

{{ config(
    materialized = 'table',
    tags = ['inventory', 'reorder_planning', 'forecasting']
) }}

WITH policy AS (
    SELECT *
    FROM {{ ref('mart_inventory_sku_policy') }}
),

latest_snapshot AS (
    SELECT MAX(inventory_as_of_date) AS inventory_as_of_date
    FROM policy
),

future_committed_demand_lines AS (
    SELECT
        m.sku,
        m.movement_date,
        m.quantity_out,
        m.source_transaction_key
    FROM {{ ref('int_quickbooks__inventory_movements') }} m
    INNER JOIN latest_snapshot ls
        ON m.movement_date > ls.inventory_as_of_date
    WHERE m.movement_type = 'sale'
      AND m.quantity_out > 0
),

future_committed_demand AS (
    SELECT
        sku,
        SUM(quantity_out) AS committed_demand_qty,
        COUNT(DISTINCT source_transaction_key) AS committed_order_count,
        MIN(movement_date) AS first_committed_demand_date,
        MAX(movement_date) AS last_committed_demand_date
    FROM future_committed_demand_lines
    GROUP BY sku
),

future_receipt_lines AS (
    SELECT
        m.sku,
        m.movement_date AS expected_receipt_date,
        SUM(m.quantity_in) AS future_receipt_qty
    FROM {{ ref('int_quickbooks__inventory_movements') }} m
    INNER JOIN latest_snapshot ls
        ON m.movement_date > ls.inventory_as_of_date
    WHERE m.movement_type = 'receipt'
      AND m.quantity_in > 0
    GROUP BY m.sku, m.movement_date
),

raw_sales_lines AS (
    SELECT
        p.sku,
        p.product_family,
        p.material_type,
        m.movement_date,
        DATE_TRUNC('month', m.movement_date)::DATE AS month_start,
        m.quantity_out,
        m.source_transaction_key,
        m.source_document_number,
        m.source_party,
        'direct_sale'::TEXT AS demand_source
    FROM policy p
    INNER JOIN {{ ref('int_quickbooks__inventory_movements') }} m
        ON p.sku = m.sku
    INNER JOIN latest_snapshot ls
        ON m.movement_date <= ls.inventory_as_of_date
    WHERE m.movement_type = 'sale'
      AND m.is_future_committed_demand = FALSE
      AND m.quantity_out > 0
),

kit_component_demand_rules AS (
    SELECT *
    FROM (
        VALUES
            ('01-7010', '01-6310.72L', 4::NUMERIC, 72::NUMERIC, 'ak4_kit_anchor_component'),
            ('01-7010-FBA', '01-6310.72L', 4::NUMERIC, 72::NUMERIC, 'ak4_fba_kit_anchor_component'),
            ('01-7013', '01-6310.72L', 4::NUMERIC, 72::NUMERIC, 'eak4_kit_anchor_component'),
            ('01-7013.FBA', '01-6310.72L', 4::NUMERIC, 72::NUMERIC, 'eak4_fba_kit_anchor_component')
    ) AS rules(kit_sku, component_sku, component_units_per_kit, component_units_per_sku, component_demand_rule)
),

component_equivalent_sales_lines AS (
    SELECT
        p.sku,
        p.product_family,
        p.material_type,
        m.movement_date,
        DATE_TRUNC('month', m.movement_date)::DATE AS month_start,
        (m.quantity_out * rules.component_units_per_kit / rules.component_units_per_sku) AS quantity_out,
        m.source_transaction_key,
        m.source_document_number,
        m.source_party,
        rules.component_demand_rule AS demand_source
    FROM kit_component_demand_rules rules
    INNER JOIN policy p
        ON rules.component_sku = p.sku
    INNER JOIN {{ ref('int_quickbooks__inventory_movements') }} m
        ON rules.kit_sku = m.sku
    INNER JOIN latest_snapshot ls
        ON m.movement_date <= ls.inventory_as_of_date
    WHERE m.movement_type = 'sale'
      AND m.is_future_committed_demand = FALSE
      AND m.quantity_out > 0
),

sales_lines AS (
    SELECT * FROM raw_sales_lines
    UNION ALL
    SELECT * FROM component_equivalent_sales_lines
),

sales_line_caps AS (
    SELECT
        sku,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY quantity_out) AS sales_line_cap_qty,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY quantity_out) AS recurring_sales_line_cap_qty,
        COUNT(*) AS sales_line_count_all_time
    FROM sales_lines
    GROUP BY sku
),

sales_customer_history AS (
    SELECT
        sl.sku,
        COALESCE(NULLIF(TRIM(sl.source_party), ''), 'Unknown') AS source_party,
        COUNT(DISTINCT sl.source_transaction_key) FILTER (
            WHERE sl.movement_date > ls.inventory_as_of_date - INTERVAL '36 months'
        ) AS customer_order_count_36m,
        COUNT(DISTINCT sl.month_start) FILTER (
            WHERE sl.movement_date > ls.inventory_as_of_date - INTERVAL '36 months'
        ) AS customer_sales_month_count_36m,
        COALESCE(NULLIF(TRIM(sl.source_party), ''), 'Unknown') != 'Unknown'
          AND COUNT(DISTINCT sl.source_transaction_key) FILTER (
                WHERE sl.movement_date > ls.inventory_as_of_date - INTERVAL '36 months'
              ) >= 3
          AND COUNT(DISTINCT sl.month_start) FILTER (
                WHERE sl.movement_date > ls.inventory_as_of_date - INTERVAL '36 months'
              ) >= 2 AS is_recurring_customer
    FROM sales_lines sl
    CROSS JOIN latest_snapshot ls
    GROUP BY sl.sku, COALESCE(NULLIF(TRIM(sl.source_party), ''), 'Unknown')
),

capped_sales_lines AS (
    SELECT
        sl.sku,
        sl.product_family,
        sl.material_type,
        sl.movement_date,
        sl.month_start,
        sl.quantity_out,
        sl.source_transaction_key,
        sl.source_document_number,
        sl.source_party,
        sl.demand_source,
        CASE
            WHEN slc.sales_line_count_all_time >= 20
            THEN LEAST(
                sl.quantity_out,
                CASE
                    WHEN COALESCE(sch.is_recurring_customer, FALSE)
                        THEN slc.recurring_sales_line_cap_qty
                    ELSE slc.sales_line_cap_qty
                END
            )
            ELSE sl.quantity_out
        END AS capped_quantity_out,
        CASE
            WHEN slc.sales_line_count_all_time >= 20
             AND sl.quantity_out > CASE
                    WHEN COALESCE(sch.is_recurring_customer, FALSE)
                        THEN slc.recurring_sales_line_cap_qty
                    ELSE slc.sales_line_cap_qty
                 END THEN TRUE
            ELSE FALSE
        END AS was_capped,
        slc.sales_line_cap_qty,
        CASE
            WHEN COALESCE(sch.is_recurring_customer, FALSE)
                THEN slc.recurring_sales_line_cap_qty
            ELSE slc.sales_line_cap_qty
        END AS applied_sales_line_cap_qty,
        COALESCE(sch.is_recurring_customer, FALSE) AS is_recurring_customer
    FROM sales_lines sl
    LEFT JOIN sales_line_caps slc
        ON sl.sku = slc.sku
    LEFT JOIN sales_customer_history sch
        ON sl.sku = sch.sku
       AND COALESCE(NULLIF(TRIM(sl.source_party), ''), 'Unknown') = sch.source_party
),

component_consumption_lines AS (
    SELECT
        p.sku,
        m.movement_date,
        m.quantity_out
    FROM policy p
    INNER JOIN {{ ref('int_quickbooks__inventory_movements') }} m
        ON p.sku = m.sku
    INNER JOIN latest_snapshot ls
        ON m.movement_date <= ls.inventory_as_of_date
    WHERE m.movement_type = 'build_component_consumption'
      AND m.quantity_out > 0
),

recent_spike_sales_lines AS (
    SELECT
        csl.*
    FROM capped_sales_lines csl
    CROSS JOIN latest_snapshot ls
    WHERE csl.movement_date > ls.inventory_as_of_date - INTERVAL '90 days'
      AND csl.movement_date <= ls.inventory_as_of_date
),

recent_customer_sales AS (
    SELECT
        sku,
        COALESCE(NULLIF(TRIM(source_party), ''), 'Unknown') AS source_party,
        SUM(quantity_out) AS recent_customer_sales_qty
    FROM recent_spike_sales_lines
    GROUP BY sku, COALESCE(NULLIF(TRIM(source_party), ''), 'Unknown')
),

recent_spike_line_stats AS (
    SELECT
        rsl.sku,
        SUM(rsl.quantity_out) AS recent_sales_qty_90d_actual,
        MAX(rsl.quantity_out) AS largest_recent_sales_line_qty_90d,
        COUNT(*) AS recent_sales_line_count_90d,
        COUNT(DISTINCT rsl.source_transaction_key) AS recent_order_count_90d,
        COUNT(DISTINCT COALESCE(NULLIF(TRIM(rsl.source_party), ''), 'Unknown')) AS recent_customer_count_90d,
        COUNT(DISTINCT rsl.month_start) AS recent_sales_month_count_90d
    FROM recent_spike_sales_lines rsl
    GROUP BY rsl.sku
),

recent_spike_customer_stats AS (
    SELECT
        sku,
        MAX(recent_customer_sales_qty) AS largest_recent_customer_sales_qty_90d
    FROM recent_customer_sales
    GROUP BY sku
),

recent_spike_stats AS (
    SELECT
        rsls.*,
        COALESCE(rscs.largest_recent_customer_sales_qty_90d, 0) AS largest_recent_customer_sales_qty_90d
    FROM recent_spike_line_stats rsls
    LEFT JOIN recent_spike_customer_stats rscs
        ON rsls.sku = rscs.sku
),

recent_daily_sales AS (
    SELECT
        p.sku,
        ds.generated_date::DATE AS demand_date,
        COALESCE(SUM(csl.capped_quantity_out), 0) AS sales_qty
    FROM policy p
    CROSS JOIN latest_snapshot ls
    CROSS JOIN LATERAL GENERATE_SERIES(
        ls.inventory_as_of_date - INTERVAL '365 days',
        ls.inventory_as_of_date,
        INTERVAL '1 day'
    ) AS ds(generated_date)
    LEFT JOIN capped_sales_lines csl
        ON p.sku = csl.sku
       AND ds.generated_date::DATE = csl.movement_date
    GROUP BY p.sku, ds.generated_date::DATE
),

monthly_spine AS (
    SELECT
        p.sku,
        p.product_family,
        p.material_type,
        generated_month::DATE AS month_start
    FROM policy p
    CROSS JOIN latest_snapshot ls
    CROSS JOIN LATERAL GENERATE_SERIES(
        DATE_TRUNC('month', ls.inventory_as_of_date)::DATE - INTERVAL '35 months',
        DATE_TRUNC('month', ls.inventory_as_of_date)::DATE - INTERVAL '1 month',
        INTERVAL '1 month'
    ) AS generated_month
),

sku_monthly_demand AS (
    SELECT
        ms.sku,
        ms.product_family,
        ms.material_type,
        ms.month_start,
        EXTRACT(MONTH FROM ms.month_start)::INT AS month_number,
        COALESCE(SUM(csl.capped_quantity_out), 0) AS capped_monthly_qty,
        COALESCE(SUM(csl.quantity_out), 0) AS uncapped_monthly_qty,
        COALESCE(SUM(CASE WHEN csl.was_capped THEN csl.quantity_out - csl.capped_quantity_out ELSE 0 END), 0) AS capped_reduction_qty
    FROM monthly_spine ms
    LEFT JOIN capped_sales_lines csl
        ON ms.sku = csl.sku
       AND ms.month_start = csl.month_start
    GROUP BY ms.sku, ms.product_family, ms.material_type, ms.month_start
),

demand_stats AS (
    SELECT
        sku,
        AVG(CASE WHEN demand_date >= (SELECT inventory_as_of_date FROM latest_snapshot) - INTERVAL '30 days' THEN sales_qty END) AS avg_daily_sales_30d,
        AVG(CASE WHEN demand_date >= (SELECT inventory_as_of_date FROM latest_snapshot) - INTERVAL '90 days' THEN sales_qty END) AS avg_daily_sales_90d,
        AVG(sales_qty) AS avg_daily_sales_365d,
        SUM(sales_qty)
            / NULLIF(
                (SELECT inventory_as_of_date FROM latest_snapshot)
                  - MIN(demand_date) FILTER (WHERE sales_qty > 0)
                  + 1,
                0
            ) AS avg_daily_sales_since_first_sale_365d,
        STDDEV_SAMP(CASE WHEN demand_date >= (SELECT inventory_as_of_date FROM latest_snapshot) - INTERVAL '90 days' THEN sales_qty END) AS stddev_daily_sales_90d,
        PERCENTILE_CONT(0.8) WITHIN GROUP (
            ORDER BY CASE WHEN demand_date >= (SELECT inventory_as_of_date FROM latest_snapshot) - INTERVAL '90 days' THEN sales_qty END
        ) AS p80_daily_sales_90d,
        SUM(CASE WHEN demand_date >= (SELECT inventory_as_of_date FROM latest_snapshot) - INTERVAL '90 days' THEN sales_qty ELSE 0 END) AS total_sales_qty_90d,
        COUNT(*) FILTER (
            WHERE demand_date >= (SELECT inventory_as_of_date FROM latest_snapshot) - INTERVAL '90 days'
              AND sales_qty > 0
        ) AS days_with_sales_90d
    FROM recent_daily_sales
    GROUP BY sku
),

sku_monthly_stats AS (
    SELECT
        sku,
        AVG(capped_monthly_qty) AS avg_monthly_sales_36m,
        AVG(capped_monthly_qty) FILTER (WHERE month_start >= (SELECT DATE_TRUNC('month', inventory_as_of_date)::DATE FROM latest_snapshot) - INTERVAL '3 months') AS trailing_3m_avg_monthly_sales,
        AVG(capped_monthly_qty) FILTER (WHERE month_start >= (SELECT DATE_TRUNC('month', inventory_as_of_date)::DATE FROM latest_snapshot) - INTERVAL '12 months') AS trailing_12m_avg_monthly_sales,
        AVG(capped_monthly_qty) FILTER (
            WHERE month_start >= (SELECT DATE_TRUNC('month', inventory_as_of_date)::DATE FROM latest_snapshot) - INTERVAL '24 months'
              AND month_start < (SELECT DATE_TRUNC('month', inventory_as_of_date)::DATE FROM latest_snapshot) - INTERVAL '12 months'
        ) AS prior_12m_avg_monthly_sales,
        SUM(capped_monthly_qty) FILTER (WHERE month_start >= (SELECT DATE_TRUNC('month', inventory_as_of_date)::DATE FROM latest_snapshot) - INTERVAL '12 months') AS capped_sales_qty_12m,
        SUM(uncapped_monthly_qty) FILTER (WHERE month_start >= (SELECT DATE_TRUNC('month', inventory_as_of_date)::DATE FROM latest_snapshot) - INTERVAL '12 months') AS uncapped_sales_qty_12m,
        SUM(capped_reduction_qty) FILTER (WHERE month_start >= (SELECT DATE_TRUNC('month', inventory_as_of_date)::DATE FROM latest_snapshot) - INTERVAL '12 months') AS capped_reduction_qty_12m,
        COUNT(*) FILTER (WHERE capped_monthly_qty > 0) AS months_with_capped_sales_36m
    FROM sku_monthly_demand
    GROUP BY sku
),

sku_seasonality AS (
    SELECT
        sku,
        month_number,
        AVG(capped_monthly_qty) / NULLIF(AVG(AVG(capped_monthly_qty)) OVER (PARTITION BY sku), 0) AS sku_seasonality_index,
        COUNT(*) FILTER (WHERE capped_monthly_qty > 0) AS sku_seasonality_demand_months
    FROM sku_monthly_demand
    GROUP BY sku, month_number
),

family_material_monthly_demand AS (
    SELECT
        product_family,
        material_type,
        month_start,
        EXTRACT(MONTH FROM month_start)::INT AS month_number,
        SUM(capped_monthly_qty) AS capped_monthly_qty
    FROM sku_monthly_demand
    WHERE product_family IS NOT NULL
      AND material_type IS NOT NULL
    GROUP BY product_family, material_type, month_start
),

family_material_stats AS (
    SELECT
        product_family,
        material_type,
        AVG(capped_monthly_qty) FILTER (WHERE month_start >= (SELECT DATE_TRUNC('month', inventory_as_of_date)::DATE FROM latest_snapshot) - INTERVAL '12 months') AS family_material_trailing_12m_avg_monthly_sales,
        AVG(capped_monthly_qty) FILTER (
            WHERE month_start >= (SELECT DATE_TRUNC('month', inventory_as_of_date)::DATE FROM latest_snapshot) - INTERVAL '24 months'
              AND month_start < (SELECT DATE_TRUNC('month', inventory_as_of_date)::DATE FROM latest_snapshot) - INTERVAL '12 months'
        ) AS family_material_prior_12m_avg_monthly_sales
    FROM family_material_monthly_demand
    GROUP BY product_family, material_type
),

family_material_seasonality AS (
    SELECT
        product_family,
        material_type,
        month_number,
        AVG(capped_monthly_qty) / NULLIF(AVG(AVG(capped_monthly_qty)) OVER (PARTITION BY product_family, material_type), 0) AS family_material_seasonality_index,
        COUNT(*) FILTER (WHERE capped_monthly_qty > 0) AS family_material_demand_months
    FROM family_material_monthly_demand
    GROUP BY product_family, material_type, month_number
),

purchase_order_lines AS (
    SELECT
        sku,
        vendor,
        po_opened_date,
        purchase_order_no,
        po_qty
    FROM (
        SELECT
            {{ normalize_inventory_sku('product') }} AS sku,
            vendor,
            LEAST(
                COALESCE(
                    CASE
                        WHEN date IS NOT NULL
                         AND TRIM(date) != ''
                         AND date ~ '^\d{2}-\d{2}-\d{4}$'
                        THEN TO_DATE(date, 'MM-DD-YYYY')
                    END,
                    CASE
                        WHEN created_date IS NOT NULL
                         AND TRIM(created_date) != ''
                         AND created_date ~ '^\d{2}-\d{2}-\d{4}$'
                        THEN TO_DATE(created_date, 'MM-DD-YYYY')
                    END
                ),
                COALESCE(
                    CASE
                        WHEN created_date IS NOT NULL
                         AND TRIM(created_date) != ''
                         AND created_date ~ '^\d{2}-\d{2}-\d{4}$'
                        THEN TO_DATE(created_date, 'MM-DD-YYYY')
                    END,
                    CASE
                        WHEN date IS NOT NULL
                         AND TRIM(date) != ''
                         AND date ~ '^\d{2}-\d{2}-\d{4}$'
                        THEN TO_DATE(date, 'MM-DD-YYYY')
                    END
                )
            ) AS po_opened_date,
            purchase_order_no,
            CASE
                WHEN product_quantity IS NOT NULL
                 AND TRIM(product_quantity::TEXT) != ''
                THEN product_quantity::NUMERIC
                ELSE NULL
            END AS po_qty,
            DENSE_RANK() OVER (
                PARTITION BY COALESCE(NULLIF(quick_books_internal_id, ''), CONCAT_WS(':', purchase_order_no, vendor))
                ORDER BY
                    CASE
                        WHEN _dlt_load_id ~ '^[0-9]+(\.[0-9]+)?$' THEN _dlt_load_id::NUMERIC
                        ELSE NULL
                    END DESC NULLS LAST
            ) AS load_rank
        FROM {{ source('raw_data', 'xlsx_purchase_order') }}
        WHERE product IS NOT NULL
          AND TRIM(product) != ''
          AND vendor IS NOT NULL
          AND TRIM(vendor) != ''
    ) ranked
    WHERE load_rank = 1
      AND po_opened_date IS NOT NULL
),

purchase_order_batches AS (
    SELECT
        sku,
        vendor,
        po_opened_date,
        purchase_order_no,
        SUM(po_qty) AS po_qty
    FROM purchase_order_lines
    WHERE po_qty > 0
    GROUP BY sku, vendor, po_opened_date, purchase_order_no
),

purchase_order_batches_with_lag AS (
    SELECT
        *,
        LAG(po_opened_date) OVER (
            PARTITION BY sku, vendor
            ORDER BY po_opened_date, purchase_order_no
        ) AS previous_po_opened_date
    FROM purchase_order_batches
),

purchase_order_documents AS (
    SELECT
        vendor,
        po_opened_date,
        purchase_order_no
    FROM purchase_order_batches
    GROUP BY vendor, po_opened_date, purchase_order_no
),

purchase_order_documents_with_lag AS (
    SELECT
        *,
        LAG(po_opened_date) OVER (
            PARTITION BY vendor
            ORDER BY po_opened_date, purchase_order_no
        ) AS previous_po_opened_date
    FROM purchase_order_documents
),

observed_vendor_order_cycles AS (
    SELECT
        vendor,
        COUNT(*) FILTER (WHERE previous_po_opened_date IS NOT NULL) AS observed_vendor_order_cycle_count,
        PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY po_opened_date - previous_po_opened_date
        ) FILTER (WHERE previous_po_opened_date IS NOT NULL) AS observed_vendor_median_order_cycle_days,
        PERCENTILE_CONT(0.75) WITHIN GROUP (
            ORDER BY po_opened_date - previous_po_opened_date
        ) FILTER (WHERE previous_po_opened_date IS NOT NULL) AS observed_vendor_order_cycle_days
    FROM purchase_order_documents_with_lag
    GROUP BY vendor
),

observed_sku_vendor_order_cycles AS (
    SELECT
        sku,
        vendor,
        COUNT(*) FILTER (WHERE previous_po_opened_date IS NOT NULL) AS observed_sku_vendor_order_cycle_count,
        PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY po_opened_date - previous_po_opened_date
        ) FILTER (WHERE previous_po_opened_date IS NOT NULL) AS observed_sku_vendor_median_order_cycle_days,
        PERCENTILE_CONT(0.75) WITHIN GROUP (
            ORDER BY po_opened_date - previous_po_opened_date
        ) FILTER (WHERE previous_po_opened_date IS NOT NULL) AS observed_sku_vendor_order_cycle_days
    FROM purchase_order_batches_with_lag
    GROUP BY sku, vendor
),

receipt_lines AS (
    SELECT DISTINCT
        {{ normalize_inventory_sku('product_service') }} AS sku,
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

observed_sku_vendor_lead_times AS (
    SELECT
        sku,
        vendor,
        COUNT(*) AS observed_sku_vendor_lead_time_count,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lead_time_days) AS observed_sku_vendor_lead_time_days
    FROM {{ ref('int_quickbooks__purchase_order_receipt_matches') }}
    GROUP BY sku, vendor
),

observed_vendor_lead_times AS (
    SELECT
        vendor,
        COUNT(*) AS observed_vendor_lead_time_count,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lead_time_days) AS observed_vendor_lead_time_days
    FROM {{ ref('int_quickbooks__purchase_order_receipt_matches') }}
    GROUP BY vendor
),

latest_sku_vendor AS (
    SELECT
        sku,
        vendor,
        ROW_NUMBER() OVER (
            PARTITION BY sku
            ORDER BY latest_vendor_activity_date DESC, vendor
        ) AS vendor_rank
    FROM (
        SELECT sku, vendor, MAX(po_opened_date) AS latest_vendor_activity_date
        FROM purchase_order_lines
        GROUP BY sku, vendor

        UNION ALL

        SELECT sku, vendor, MAX(receipt_date) AS latest_vendor_activity_date
        FROM receipt_lines
        GROUP BY sku, vendor
    ) sku_vendor_activity
),

planning_overrides AS (
    SELECT *
    FROM (
        VALUES
            ('01-6358.58K', 'WWD', 93::NUMERIC, NULL::NUMERIC, 'configured_sku_vendor_observed_wwd_timing'),
            ('01-7014', 'In-house assembly', NULL::NUMERIC, NULL::NUMERIC, 'configured_in_house_kit_not_wwd_order')
    ) AS overrides(sku, preferred_vendor, configured_lead_time_days, configured_target_coverage_days, planning_override_reason)
),

layer_pack_overrides AS (
    SELECT *
    FROM (
        VALUES
            ('01-6310.38K', 135::INT),
            ('01-6310.3SK', 135::INT),
            ('01-6310.72L', 15::INT),
            ('01-6315.38K', 81::INT),
            ('01-6315.3SK', 81::INT),
            ('01-6315.3SK-2', 81::INT),
            ('01-6318.71K', 81::INT),
            ('01-6318.7SK', 81::INT),
            ('01-6358.58K', 48::INT),
            ('01-6358.5SK', 48::INT)
    ) AS overrides(sku, six_pack_units_per_layer)
),

planning_inputs AS (
    SELECT
        p.*,
        COALESCE(po.preferred_vendor, lsv.vendor) AS preferred_vendor,
        po.configured_lead_time_days,
        po.configured_target_coverage_days,
        lpo.six_pack_units_per_layer,
        osvl.observed_sku_vendor_lead_time_days,
        osvl.observed_sku_vendor_lead_time_count,
        ovl.observed_vendor_lead_time_days,
        ovl.observed_vendor_lead_time_count,
        CASE
            WHEN policy_bucket = 'FBA_REPLENISHMENT_MODEL' THEN 21
            WHEN policy_bucket = 'COMPONENT_PACKAGING_MODEL' THEN 60
            WHEN policy_bucket = 'STOCKED_NO_RECENT_DEMAND_REVIEW' THEN 60
            ELSE 45
        END AS default_policy_lead_time_days,
        CASE
            WHEN po.configured_lead_time_days IS NOT NULL THEN CEIL(po.configured_lead_time_days)::INT
            WHEN osvl.observed_sku_vendor_lead_time_count >= 3 THEN CEIL(osvl.observed_sku_vendor_lead_time_days)::INT
            WHEN ovl.observed_vendor_lead_time_count >= 10 THEN CEIL(ovl.observed_vendor_lead_time_days)::INT
            WHEN policy_bucket = 'FBA_REPLENISHMENT_MODEL' THEN 21
            WHEN policy_bucket = 'COMPONENT_PACKAGING_MODEL' THEN 60
            WHEN policy_bucket = 'STOCKED_NO_RECENT_DEMAND_REVIEW' THEN 60
            ELSE 45
        END AS assumed_lead_time_days,
        CASE
            WHEN po.configured_lead_time_days IS NOT NULL THEN 'configured_sku_vendor'
            WHEN osvl.observed_sku_vendor_lead_time_count >= 3 THEN 'observed_sku_vendor_median'
            WHEN ovl.observed_vendor_lead_time_count >= 10 THEN 'observed_vendor_median'
            ELSE 'policy_bucket_default'
        END AS lead_time_source,
        po.planning_override_reason
    FROM policy p
    LEFT JOIN planning_overrides po
        ON p.sku = po.sku
    LEFT JOIN layer_pack_overrides lpo
        ON p.sku = lpo.sku
    LEFT JOIN latest_sku_vendor lsv
        ON p.sku = lsv.sku
       AND lsv.vendor_rank = 1
    LEFT JOIN observed_sku_vendor_lead_times osvl
        ON p.sku = osvl.sku
       AND COALESCE(po.preferred_vendor, lsv.vendor) = osvl.vendor
    LEFT JOIN observed_vendor_lead_times ovl
        ON COALESCE(po.preferred_vendor, lsv.vendor) = ovl.vendor
),

committed_demand_before_expected_receipt AS (
    SELECT
        pi.sku,
        SUM(fcdl.quantity_out) AS committed_demand_before_expected_receipt_qty
    FROM planning_inputs pi
    INNER JOIN future_committed_demand_lines fcdl
        ON pi.sku = fcdl.sku
       AND fcdl.movement_date <= pi.inventory_as_of_date + pi.assumed_lead_time_days
    GROUP BY pi.sku
),

forecast_inputs AS (
    SELECT
        pi.*,
        COALESCE(fcd.committed_demand_qty, 0) AS committed_demand_qty,
        COALESCE(fcd.committed_order_count, 0) AS committed_order_count,
        fcd.first_committed_demand_date,
        fcd.last_committed_demand_date,
        COALESCE(cdber.committed_demand_before_expected_receipt_qty, 0) AS committed_demand_before_expected_receipt_qty,
        COALESCE(ds.avg_daily_sales_30d, 0) AS calc_avg_daily_sales_30d,
        COALESCE(ds.avg_daily_sales_90d, 0) AS calc_avg_daily_sales_90d,
        COALESCE(ds.avg_daily_sales_365d, 0) AS calc_avg_daily_sales_365d,
        COALESCE(ds.avg_daily_sales_since_first_sale_365d, 0) AS avg_daily_sales_since_first_sale_365d,
        COALESCE(ds.stddev_daily_sales_90d, 0) AS stddev_daily_sales_90d,
        COALESCE(ds.p80_daily_sales_90d, 0) AS p80_daily_sales_90d,
        COALESCE(ds.total_sales_qty_90d, 0) AS total_sales_qty_90d,
        COALESCE(ds.days_with_sales_90d, 0) AS days_with_sales_90d,
        COALESCE(sms.avg_monthly_sales_36m, 0) AS avg_monthly_sales_36m,
        COALESCE(sms.trailing_3m_avg_monthly_sales, 0) AS trailing_3m_avg_monthly_sales,
        COALESCE(sms.trailing_12m_avg_monthly_sales, 0) AS trailing_12m_avg_monthly_sales,
        COALESCE(sms.prior_12m_avg_monthly_sales, 0) AS prior_12m_avg_monthly_sales,
        COALESCE(sms.capped_sales_qty_12m, 0) AS capped_sales_qty_12m,
        COALESCE(sms.uncapped_sales_qty_12m, 0) AS uncapped_sales_qty_12m,
        COALESCE(sms.capped_reduction_qty_12m, 0) AS capped_reduction_qty_12m,
        COALESCE(sms.months_with_capped_sales_36m, 0) AS months_with_capped_sales_36m,
        COALESCE(sse.sku_seasonality_index, 1) AS sku_seasonality_index,
        COALESCE(sse.sku_seasonality_demand_months, 0) AS sku_seasonality_demand_months,
        COALESCE(fms.family_material_seasonality_index, 1) AS family_material_seasonality_index,
        COALESCE(fms.family_material_demand_months, 0) AS family_material_demand_months,
        COALESCE(fmst.family_material_trailing_12m_avg_monthly_sales, 0) AS family_material_trailing_12m_avg_monthly_sales,
        COALESCE(fmst.family_material_prior_12m_avg_monthly_sales, 0) AS family_material_prior_12m_avg_monthly_sales,
        COALESCE(rss.recent_sales_qty_90d_actual, 0) AS recent_sales_qty_90d_actual,
        COALESCE(rss.largest_recent_sales_line_qty_90d, 0) AS largest_recent_sales_line_qty_90d,
        COALESCE(rss.recent_sales_line_count_90d, 0) AS recent_sales_line_count_90d,
        COALESCE(rss.recent_order_count_90d, 0) AS recent_order_count_90d,
        COALESCE(rss.recent_customer_count_90d, 0) AS recent_customer_count_90d,
        COALESCE(rss.recent_sales_month_count_90d, 0) AS recent_sales_month_count_90d,
        COALESCE(rss.largest_recent_customer_sales_qty_90d, 0) AS largest_recent_customer_sales_qty_90d,
        CASE
            WHEN COALESCE(rss.recent_sales_qty_90d_actual, 0) > 0
            THEN rss.largest_recent_sales_line_qty_90d / rss.recent_sales_qty_90d_actual
            ELSE NULL
        END AS largest_recent_sales_line_share_90d,
        CASE
            WHEN COALESCE(rss.recent_sales_qty_90d_actual, 0) > 0
            THEN rss.largest_recent_customer_sales_qty_90d / rss.recent_sales_qty_90d_actual
            ELSE NULL
        END AS largest_recent_customer_sales_share_90d,
        CASE
            WHEN COALESCE(sms.prior_12m_avg_monthly_sales, 0) > 0
            THEN LEAST(1.75, GREATEST(0.60, sms.trailing_12m_avg_monthly_sales / sms.prior_12m_avg_monthly_sales))
            WHEN COALESCE(fmst.family_material_prior_12m_avg_monthly_sales, 0) > 0
            THEN LEAST(1.50, GREATEST(0.70, fmst.family_material_trailing_12m_avg_monthly_sales / fmst.family_material_prior_12m_avg_monthly_sales))
            ELSE 1.00
        END AS demand_growth_factor,
        pi.inventory_as_of_date + pi.assumed_lead_time_days AS expected_receipt_date,
        EXTRACT(MONTH FROM pi.inventory_as_of_date + pi.assumed_lead_time_days)::INT AS forecast_month_number
    FROM planning_inputs pi
    LEFT JOIN future_committed_demand fcd
        ON pi.sku = fcd.sku
    LEFT JOIN committed_demand_before_expected_receipt cdber
        ON pi.sku = cdber.sku
    LEFT JOIN demand_stats ds
        ON pi.sku = ds.sku
    LEFT JOIN sku_monthly_stats sms
        ON pi.sku = sms.sku
    LEFT JOIN sku_seasonality sse
        ON pi.sku = sse.sku
       AND EXTRACT(MONTH FROM pi.inventory_as_of_date + pi.assumed_lead_time_days)::INT = sse.month_number
    LEFT JOIN family_material_seasonality fms
        ON pi.product_family = fms.product_family
       AND pi.material_type = fms.material_type
       AND EXTRACT(MONTH FROM pi.inventory_as_of_date + pi.assumed_lead_time_days)::INT = fms.month_number
    LEFT JOIN family_material_stats fmst
        ON pi.product_family = fmst.product_family
       AND pi.material_type = fmst.material_type
    LEFT JOIN recent_spike_stats rss
        ON pi.sku = rss.sku
),

future_receipts_before_expected_receipt AS (
    SELECT
        fi.sku,
        SUM(frl.future_receipt_qty) AS future_receipt_qty_by_expected_receipt_date
    FROM forecast_inputs fi
    INNER JOIN future_receipt_lines frl
        ON fi.sku = frl.sku
       AND frl.expected_receipt_date <= fi.expected_receipt_date
    GROUP BY fi.sku
),

target_coverage_inputs AS (
    SELECT
        fi.*,
        COALESCE(frber.future_receipt_qty_by_expected_receipt_date, 0) AS future_receipt_qty_by_expected_receipt_date,
        osvoc.observed_sku_vendor_order_cycle_days,
        osvoc.observed_sku_vendor_median_order_cycle_days,
        COALESCE(osvoc.observed_sku_vendor_order_cycle_count, 0) AS observed_sku_vendor_order_cycle_count,
        ovoc.observed_vendor_order_cycle_days,
        ovoc.observed_vendor_median_order_cycle_days,
        COALESCE(ovoc.observed_vendor_order_cycle_count, 0) AS observed_vendor_order_cycle_count,
        CASE
            WHEN fi.policy_bucket = 'FBA_REPLENISHMENT_MODEL' THEN 45
            WHEN fi.policy_bucket IN ('SKU_SEASONAL_TREND_MODEL', 'ASSEMBLY_FINISHED_GOOD_MODEL') THEN 120
            WHEN fi.policy_bucket = 'SKU_BASELINE_VARIANT_SEASONAL_MODEL' THEN 90
            WHEN fi.policy_bucket = 'SPARSE_OR_NEW_SKU_BASELINE_MODEL' THEN 60
            WHEN fi.policy_bucket = 'COMPONENT_PACKAGING_MODEL' THEN 120
            ELSE 0
        END AS default_target_coverage_days,
        CASE
            WHEN fi.preferred_vendor = 'WWD'
             AND COALESCE(ovoc.observed_vendor_order_cycle_count, 0) >= 5
                THEN ovoc.observed_vendor_order_cycle_days
            WHEN fi.policy_bucket = 'SKU_SEASONAL_TREND_MODEL'
             AND COALESCE(osvoc.observed_sku_vendor_order_cycle_count, 0) >= 5
                THEN osvoc.observed_sku_vendor_order_cycle_days
            ELSE NULL
        END AS dynamic_target_coverage_candidate_days,
        CASE
            WHEN fi.preferred_vendor = 'WWD'
             AND COALESCE(ovoc.observed_vendor_order_cycle_count, 0) >= 5
                THEN 'observed_vendor_po_cycle'
            WHEN fi.policy_bucket = 'SKU_SEASONAL_TREND_MODEL'
             AND COALESCE(osvoc.observed_sku_vendor_order_cycle_count, 0) >= 5
                THEN 'observed_sku_vendor_po_cycle'
            ELSE NULL
        END AS dynamic_target_coverage_source
    FROM forecast_inputs fi
    LEFT JOIN future_receipts_before_expected_receipt frber
        ON fi.sku = frber.sku
    LEFT JOIN observed_sku_vendor_order_cycles osvoc
        ON fi.sku = osvoc.sku
       AND fi.preferred_vendor = osvoc.vendor
    LEFT JOIN observed_vendor_order_cycles ovoc
        ON fi.preferred_vendor = ovoc.vendor
),

parameters AS (
    SELECT
        *,
        COALESCE(fi.configured_target_coverage_days, CASE
            WHEN dynamic_target_coverage_candidate_days IS NOT NULL
                THEN CEIL(GREATEST(
                    60::NUMERIC,
                    LEAST(
                        CASE WHEN dynamic_target_coverage_source = 'observed_vendor_po_cycle' THEN 120::NUMERIC ELSE 180::NUMERIC END,
                        dynamic_target_coverage_candidate_days
                    )
                ))::INT
            ELSE default_target_coverage_days
        END)::INT AS target_coverage_days,
        CASE
            WHEN configured_target_coverage_days IS NOT NULL THEN 'configured_sku_vendor'
            WHEN dynamic_target_coverage_candidate_days IS NOT NULL THEN dynamic_target_coverage_source
            ELSE 'policy_bucket_default'
        END AS target_coverage_source,
        CASE
            WHEN policy_bucket = 'SKU_SEASONAL_TREND_MODEL' THEN 0.25
            WHEN policy_bucket IN ('SKU_BASELINE_VARIANT_SEASONAL_MODEL', 'ASSEMBLY_FINISHED_GOOD_MODEL', 'FBA_REPLENISHMENT_MODEL') THEN 0.35
            WHEN policy_bucket IN ('SPARSE_OR_NEW_SKU_BASELINE_MODEL', 'COMPONENT_PACKAGING_MODEL') THEN 0.50
            ELSE 0.00
        END AS safety_stock_multiplier
    FROM target_coverage_inputs fi
),

forecast_base AS (
    SELECT
        *,
        CASE
            WHEN policy_bucket = 'SKU_SEASONAL_TREND_MODEL'
             AND months_with_capped_sales_36m >= 18
             AND sku_seasonality_demand_months >= 2
                THEN 'sku_seasonality_with_growth'
            WHEN policy_bucket IN ('SKU_BASELINE_VARIANT_SEASONAL_MODEL', 'ASSEMBLY_FINISHED_GOOD_MODEL', 'FBA_REPLENISHMENT_MODEL')
             AND family_material_demand_months >= 2
                THEN 'family_material_seasonality_with_growth'
            WHEN policy_bucket IN ('SKU_SEASONAL_TREND_MODEL', 'SKU_BASELINE_VARIANT_SEASONAL_MODEL', 'ASSEMBLY_FINISHED_GOOD_MODEL', 'FBA_REPLENISHMENT_MODEL')
                THEN 'capped_trailing_sku_baseline'
            WHEN policy_bucket = 'SPARSE_OR_NEW_SKU_BASELINE_MODEL'
                THEN 'sparse_or_new_observed_velocity'
            WHEN sku = '01-6310.72L'
                THEN 'direct_and_kit_sales_component_equivalent'
            WHEN policy_bucket = 'COMPONENT_PACKAGING_MODEL'
                THEN 'component_consumption_since_2024'
            ELSE 'no_automatic_forecast'
        END AS forecast_model_detail,
        GREATEST(
            COALESCE(trailing_12m_avg_monthly_sales, 0),
            COALESCE(trailing_3m_avg_monthly_sales, 0) * 0.75,
            COALESCE(avg_monthly_sales_36m, 0) * 0.80
        ) AS sku_baseline_monthly_qty,
        CASE
            WHEN COALESCE(family_material_prior_12m_avg_monthly_sales, 0) > 0
            THEN LEAST(1.50, GREATEST(0.70, family_material_trailing_12m_avg_monthly_sales / family_material_prior_12m_avg_monthly_sales))
            ELSE 1.00
        END AS family_material_growth_factor,
        CASE
            WHEN policy_bucket = 'SKU_SEASONAL_TREND_MODEL'
             AND months_with_capped_sales_36m >= 18
             AND sku_seasonality_demand_months >= 2
                THEN LEAST(1.75, GREATEST(0.50, sku_seasonality_index))
            WHEN policy_bucket IN ('SKU_BASELINE_VARIANT_SEASONAL_MODEL', 'ASSEMBLY_FINISHED_GOOD_MODEL', 'FBA_REPLENISHMENT_MODEL')
             AND family_material_demand_months >= 2
                THEN LEAST(1.60, GREATEST(0.60, family_material_seasonality_index))
            ELSE 1.00
        END AS applied_seasonality_index,
        CASE
            WHEN policy_bucket = 'SKU_SEASONAL_TREND_MODEL'
             AND months_with_capped_sales_36m >= 18
             AND sku_seasonality_demand_months >= 2
                THEN demand_growth_factor
            WHEN policy_bucket IN ('SKU_BASELINE_VARIANT_SEASONAL_MODEL', 'ASSEMBLY_FINISHED_GOOD_MODEL', 'FBA_REPLENISHMENT_MODEL')
             AND family_material_demand_months >= 2
                THEN CASE
                    WHEN COALESCE(family_material_prior_12m_avg_monthly_sales, 0) > 0
                    THEN LEAST(1.50, GREATEST(0.70, family_material_trailing_12m_avg_monthly_sales / family_material_prior_12m_avg_monthly_sales))
                    ELSE demand_growth_factor
                END
            ELSE 1.00
        END AS applied_growth_factor
    FROM parameters
),

forecast AS (
    SELECT
        *,
        CASE
            WHEN forecast_model_detail = 'sku_seasonality_with_growth' THEN
                (sku_baseline_monthly_qty * applied_seasonality_index * applied_growth_factor) / 30.4375
            WHEN forecast_model_detail = 'family_material_seasonality_with_growth' THEN
                (sku_baseline_monthly_qty * applied_seasonality_index * applied_growth_factor) / 30.4375
            WHEN forecast_model_detail = 'capped_trailing_sku_baseline' THEN
                sku_baseline_monthly_qty / 30.4375
            WHEN policy_bucket = 'SPARSE_OR_NEW_SKU_BASELINE_MODEL' THEN GREATEST(
                calc_avg_daily_sales_30d,
                calc_avg_daily_sales_90d,
                COALESCE(avg_daily_sales_since_first_sale_365d, 0)
            )
            WHEN forecast_model_detail = 'direct_and_kit_sales_component_equivalent' THEN GREATEST(
                sku_baseline_monthly_qty / 30.4375,
                calc_avg_daily_sales_90d,
                COALESCE(avg_daily_sales_since_first_sale_365d, 0)
            )
            WHEN policy_bucket = 'COMPONENT_PACKAGING_MODEL' THEN GREATEST(
                component_consumed_qty_since_2024 / NULLIF((inventory_as_of_date - DATE '2024-01-01')::NUMERIC, 0),
                0
            )
            ELSE 0
        END AS forecast_daily_qty
    FROM forecast_base
),

forecast_with_spike_risk AS (
    SELECT
        *,
        GREATEST(
            COALESCE(trailing_12m_avg_monthly_sales, 0) / 30.4375,
            COALESCE(avg_monthly_sales_36m, 0) * 0.80 / 30.4375,
            COALESCE(prior_12m_avg_monthly_sales, 0) * 1.25 / 30.4375
        ) AS baseline_forecast_daily_qty,
        GREATEST(
            COALESCE(calc_avg_daily_sales_30d, 0),
            COALESCE(calc_avg_daily_sales_90d, 0)
        ) AS recent_velocity_forecast_daily_qty,
        CASE
            WHEN GREATEST(
                COALESCE(trailing_12m_avg_monthly_sales, 0) / 30.4375,
                COALESCE(avg_monthly_sales_36m, 0) * 0.80 / 30.4375,
                COALESCE(prior_12m_avg_monthly_sales, 0) * 1.25 / 30.4375
            ) > 0
            THEN GREATEST(
                COALESCE(calc_avg_daily_sales_30d, 0),
                COALESCE(calc_avg_daily_sales_90d, 0)
            ) / GREATEST(
                COALESCE(trailing_12m_avg_monthly_sales, 0) / 30.4375,
                COALESCE(avg_monthly_sales_36m, 0) * 0.80 / 30.4375,
                COALESCE(prior_12m_avg_monthly_sales, 0) * 1.25 / 30.4375
            )
            ELSE NULL
        END AS recent_to_baseline_velocity_ratio,
        CASE
            WHEN policy_bucket IN ('NO_ACTION_OR_ARCHIVE', 'STOCKED_NO_RECENT_DEMAND_REVIEW', 'COMPONENT_PACKAGING_MODEL')
                THEN 'none'
            WHEN COALESCE(recent_sales_qty_90d_actual, 0) < 12
                THEN 'none'
            WHEN GREATEST(
                    COALESCE(trailing_12m_avg_monthly_sales, 0) / 30.4375,
                    COALESCE(avg_monthly_sales_36m, 0) * 0.80 / 30.4375,
                    COALESCE(prior_12m_avg_monthly_sales, 0) * 1.25 / 30.4375
                ) <= 0
                THEN 'none'
            WHEN GREATEST(
                    COALESCE(calc_avg_daily_sales_30d, 0),
                    COALESCE(calc_avg_daily_sales_90d, 0)
                ) >= GREATEST(
                    COALESCE(trailing_12m_avg_monthly_sales, 0) / 30.4375,
                    COALESCE(avg_monthly_sales_36m, 0) * 0.80 / 30.4375,
                    COALESCE(prior_12m_avg_monthly_sales, 0) * 1.25 / 30.4375
                ) * 2.50
             AND (
                    COALESCE(largest_recent_customer_sales_share_90d, 0) >= 0.45
                 OR COALESCE(largest_recent_sales_line_share_90d, 0) >= 0.35
                 OR COALESCE(recent_sales_month_count_90d, 0) <= 1
                )
                THEN 'high'
            WHEN GREATEST(
                    COALESCE(calc_avg_daily_sales_30d, 0),
                    COALESCE(calc_avg_daily_sales_90d, 0)
                ) >= GREATEST(
                    COALESCE(trailing_12m_avg_monthly_sales, 0) / 30.4375,
                    COALESCE(avg_monthly_sales_36m, 0) * 0.80 / 30.4375,
                    COALESCE(prior_12m_avg_monthly_sales, 0) * 1.25 / 30.4375
                ) * 1.75
                THEN 'medium'
            ELSE 'none'
        END AS demand_spike_risk_level,
        NULLIF(CONCAT_WS(
            '; ',
            CASE
                WHEN COALESCE(recent_sales_qty_90d_actual, 0) >= 12
                 AND GREATEST(
                        COALESCE(trailing_12m_avg_monthly_sales, 0) / 30.4375,
                        COALESCE(avg_monthly_sales_36m, 0) * 0.80 / 30.4375,
                        COALESCE(prior_12m_avg_monthly_sales, 0) * 1.25 / 30.4375
                    ) > 0
                 AND GREATEST(
                        COALESCE(calc_avg_daily_sales_30d, 0),
                        COALESCE(calc_avg_daily_sales_90d, 0)
                    ) >= GREATEST(
                        COALESCE(trailing_12m_avg_monthly_sales, 0) / 30.4375,
                        COALESCE(avg_monthly_sales_36m, 0) * 0.80 / 30.4375,
                        COALESCE(prior_12m_avg_monthly_sales, 0) * 1.25 / 30.4375
                    ) * 1.75
                THEN 'recent_velocity_above_baseline'
            END,
            CASE
                WHEN COALESCE(largest_recent_customer_sales_share_90d, 0) >= 0.45
                THEN 'customer_concentration'
            END,
            CASE
                WHEN COALESCE(largest_recent_sales_line_share_90d, 0) >= 0.35
                THEN 'large_recent_line'
            END,
            CASE
                WHEN COALESCE(recent_sales_month_count_90d, 0) <= 1
                 AND COALESCE(recent_sales_qty_90d_actual, 0) >= 12
                THEN 'single_month_spike'
            END
        ), '') AS demand_spike_reason
    FROM forecast
),

forecast_monthly_profile_base AS (
    SELECT
        f.sku,
        months.month_number,
        CASE
            WHEN f.forecast_model_detail = 'sku_seasonality_with_growth' THEN
                (
                    f.sku_baseline_monthly_qty
                    * LEAST(1.75, GREATEST(0.50, COALESCE(sse.sku_seasonality_index, 1)))
                    * f.applied_growth_factor
                ) / 30.4375
            WHEN f.forecast_model_detail = 'family_material_seasonality_with_growth' THEN
                (
                    f.sku_baseline_monthly_qty
                    * LEAST(1.60, GREATEST(0.60, COALESCE(fms.family_material_seasonality_index, 1)))
                    * f.applied_growth_factor
                ) / 30.4375
            ELSE f.forecast_daily_qty
        END AS growth_forecast_daily_qty,
        f.baseline_forecast_daily_qty
    FROM forecast_with_spike_risk f
    CROSS JOIN GENERATE_SERIES(1, 12) AS months(month_number)
    LEFT JOIN sku_seasonality sse
        ON f.sku = sse.sku
       AND months.month_number = sse.month_number
    LEFT JOIN family_material_seasonality fms
        ON f.product_family = fms.product_family
       AND f.material_type = fms.material_type
       AND months.month_number = fms.month_number
),

forecast_monthly_profiles AS (
    SELECT
        fpb.sku,
        fpb.month_number,
        fpb.growth_forecast_daily_qty,
        fpb.baseline_forecast_daily_qty,
        CASE
            WHEN f.demand_spike_risk_level = 'high'
                THEN fpb.baseline_forecast_daily_qty
            WHEN f.demand_spike_risk_level = 'medium'
                THEN LEAST(
                    fpb.growth_forecast_daily_qty,
                    fpb.baseline_forecast_daily_qty
                      + ((fpb.growth_forecast_daily_qty - fpb.baseline_forecast_daily_qty) * 0.50)
                )
            ELSE fpb.growth_forecast_daily_qty
        END AS actionable_forecast_daily_qty
    FROM forecast_monthly_profile_base fpb
    INNER JOIN forecast_with_spike_risk f
        ON fpb.sku = f.sku
),

forecast_profile_json AS (
    SELECT
        sku,
        JSONB_OBJECT_AGG(month_number::TEXT, actionable_forecast_daily_qty ORDER BY month_number) AS actionable_forecast_daily_profile
    FROM forecast_monthly_profiles
    GROUP BY sku
),

current_forecast_horizon_days AS (
    SELECT
        f.sku,
        demand_date::DATE AS demand_date,
        f.expected_receipt_date,
        f.target_coverage_days,
        p.growth_forecast_daily_qty,
        p.baseline_forecast_daily_qty,
        p.actionable_forecast_daily_qty
    FROM forecast_with_spike_risk f
    CROSS JOIN LATERAL GENERATE_SERIES(
        f.inventory_as_of_date + 1,
        f.expected_receipt_date + f.target_coverage_days,
        INTERVAL '1 day'
    ) AS dates(demand_date)
    INNER JOIN forecast_monthly_profiles p
        ON f.sku = p.sku
       AND EXTRACT(MONTH FROM dates.demand_date)::INT = p.month_number
),

current_forecast_horizons AS (
    SELECT
        sku,
        SUM(growth_forecast_daily_qty) FILTER (
            WHERE demand_date <= expected_receipt_date
        ) AS forecast_lead_time_qty,
        SUM(baseline_forecast_daily_qty) FILTER (
            WHERE demand_date <= expected_receipt_date
        ) AS baseline_forecast_lead_time_qty,
        SUM(actionable_forecast_daily_qty) FILTER (
            WHERE demand_date <= expected_receipt_date
        ) AS actionable_forecast_lead_time_qty,
        SUM(growth_forecast_daily_qty) FILTER (
            WHERE demand_date > expected_receipt_date
        ) AS forecast_target_coverage_qty,
        SUM(baseline_forecast_daily_qty) FILTER (
            WHERE demand_date > expected_receipt_date
        ) AS baseline_forecast_target_coverage_qty,
        SUM(actionable_forecast_daily_qty) FILTER (
            WHERE demand_date > expected_receipt_date
        ) AS actionable_forecast_target_coverage_qty
    FROM current_forecast_horizon_days
    GROUP BY sku
),

variability_demand_events AS (
    SELECT
        f.sku,
        'capped_sales' AS demand_variability_source,
        csl.movement_date,
        csl.capped_quantity_out AS demand_qty
    FROM forecast_with_spike_risk f
    INNER JOIN capped_sales_lines csl
        ON f.sku = csl.sku
       AND csl.movement_date <= f.inventory_as_of_date
       AND csl.movement_date >= f.inventory_as_of_date - INTERVAL '365 days'
    WHERE f.policy_bucket != 'COMPONENT_PACKAGING_MODEL'
       OR f.forecast_model_detail = 'direct_and_kit_sales_component_equivalent'

    UNION ALL

    SELECT
        f.sku,
        'component_consumption' AS demand_variability_source,
        ccl.movement_date,
        ccl.quantity_out AS demand_qty
    FROM forecast_with_spike_risk f
    INNER JOIN component_consumption_lines ccl
        ON f.sku = ccl.sku
       AND ccl.movement_date <= f.inventory_as_of_date
       AND ccl.movement_date >= f.inventory_as_of_date - INTERVAL '365 days'
    WHERE f.policy_bucket = 'COMPONENT_PACKAGING_MODEL'
      AND f.forecast_model_detail != 'direct_and_kit_sales_component_equivalent'
),

variability_window_starts AS (
    SELECT
        f.sku,
        f.policy_bucket,
        f.assumed_lead_time_days,
        f.forecast_daily_qty,
        f.inventory_as_of_date,
        ds.window_start::DATE AS window_start
    FROM forecast_with_spike_risk f
    CROSS JOIN LATERAL GENERATE_SERIES(
        f.inventory_as_of_date - INTERVAL '365 days',
        f.inventory_as_of_date - (f.assumed_lead_time_days * INTERVAL '1 day'),
        INTERVAL '1 day'
    ) AS ds(window_start)
    WHERE f.forecast_daily_qty > 0
      AND f.assumed_lead_time_days BETWEEN 1 AND 365
),

rolling_lead_time_demand AS (
    SELECT
        vws.sku,
        vws.window_start,
        COALESCE(SUM(vde.demand_qty), 0) AS lead_time_demand_qty
    FROM variability_window_starts vws
    LEFT JOIN variability_demand_events vde
        ON vws.sku = vde.sku
       AND vde.movement_date >= vws.window_start
       AND vde.movement_date < vws.window_start + (vws.assumed_lead_time_days * INTERVAL '1 day')
    GROUP BY vws.sku, vws.window_start
),

lead_time_demand_variability AS (
    SELECT
        sku,
        COUNT(*) AS variability_sample_windows,
        COUNT(*) FILTER (WHERE lead_time_demand_qty > 0) AS variability_windows_with_demand,
        AVG(lead_time_demand_qty) AS avg_historical_lead_time_demand_qty,
        STDDEV_SAMP(lead_time_demand_qty) AS stddev_historical_lead_time_demand_qty,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lead_time_demand_qty) AS p50_historical_lead_time_demand_qty,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lead_time_demand_qty) AS p75_historical_lead_time_demand_qty,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY lead_time_demand_qty) AS p90_historical_lead_time_demand_qty,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY lead_time_demand_qty) AS p95_historical_lead_time_demand_qty
    FROM rolling_lead_time_demand
    GROUP BY sku
),

forecast_with_variability_inputs AS (
    SELECT
        f.*,
        ap.actionable_forecast_daily_qty,
        fpj.actionable_forecast_daily_profile,
        cfh.forecast_lead_time_qty,
        cfh.baseline_forecast_lead_time_qty,
        cfh.actionable_forecast_lead_time_qty,
        cfh.forecast_target_coverage_qty,
        cfh.baseline_forecast_target_coverage_qty,
        cfh.actionable_forecast_target_coverage_qty,
        CASE
            WHEN f.policy_bucket = 'COMPONENT_PACKAGING_MODEL'
             AND f.forecast_model_detail != 'direct_and_kit_sales_component_equivalent' THEN 'component_consumption'
            ELSE 'capped_sales'
        END AS demand_variability_source,
        COALESCE(ltdv.variability_sample_windows, 0) AS variability_sample_windows,
        COALESCE(ltdv.variability_windows_with_demand, 0) AS variability_windows_with_demand,
        ltdv.avg_historical_lead_time_demand_qty,
        ltdv.stddev_historical_lead_time_demand_qty,
        ltdv.p50_historical_lead_time_demand_qty,
        ltdv.p75_historical_lead_time_demand_qty,
        ltdv.p90_historical_lead_time_demand_qty,
        ltdv.p95_historical_lead_time_demand_qty,
        GREATEST(
            cfh.actionable_forecast_lead_time_qty * f.safety_stock_multiplier,
            f.stddev_daily_sales_90d * SQRT(f.assumed_lead_time_days) * f.safety_stock_multiplier
        ) AS policy_safety_stock_qty,
        GREATEST(
            0,
            COALESCE(ltdv.p90_historical_lead_time_demand_qty, 0)
              - cfh.actionable_forecast_lead_time_qty
        ) AS percentile_safety_stock_qty
    FROM forecast_with_spike_risk f
    INNER JOIN current_forecast_horizons cfh
        ON f.sku = cfh.sku
    INNER JOIN forecast_monthly_profiles ap
        ON f.sku = ap.sku
       AND f.forecast_month_number = ap.month_number
    INNER JOIN forecast_profile_json fpj
        ON f.sku = fpj.sku
    LEFT JOIN lead_time_demand_variability ltdv
        ON f.sku = ltdv.sku
),

forecast_with_variability AS (
    SELECT
        *,
        CASE
            WHEN variability_sample_windows >= 90
             AND variability_windows_with_demand >= 5
                THEN 'rolling_lead_time_demand_p90'
            ELSE 'policy_multiplier_fallback'
        END AS safety_stock_source,
        CASE
            WHEN variability_sample_windows >= 90
             AND variability_windows_with_demand >= 5
                THEN GREATEST(
                    percentile_safety_stock_qty,
                    stddev_daily_sales_90d * SQRT(assumed_lead_time_days) * safety_stock_multiplier
                )
            ELSE policy_safety_stock_qty
        END AS safety_stock_qty
    FROM forecast_with_variability_inputs
),

calculation_inputs AS (
    SELECT
        *,
        GREATEST(COALESCE(open_po_quantity, 0), COALESCE(quantity_on_order, 0)) AS open_po_position_qty,
        CASE
            WHEN next_open_po_date IS NOT NULL
             AND next_open_po_date <= expected_receipt_date
            THEN GREATEST(COALESCE(open_po_quantity, 0), COALESCE(quantity_on_order, 0))
            ELSE 0
        END AS open_po_qty_by_expected_receipt_date,
        COALESCE(future_receipt_qty_after_anchor, 0) AS future_receipt_position_qty
    FROM forecast_with_variability
),

calculation_position_inputs AS (
    SELECT
        *,
        open_po_qty_by_expected_receipt_date
          + COALESCE(future_receipt_qty_by_expected_receipt_date, 0) AS inbound_qty_by_expected_receipt_date_calc
    FROM calculation_inputs
),

calculated AS (
    SELECT
        *,
        current_on_hand_qty + open_po_position_qty + future_receipt_position_qty - committed_demand_qty AS available_position_qty,
        inbound_qty_by_expected_receipt_date_calc AS inbound_qty_by_expected_receipt_date,
        current_on_hand_qty
          + inbound_qty_by_expected_receipt_date_calc
          - actionable_forecast_lead_time_qty
          - committed_demand_before_expected_receipt_qty AS projected_position_at_expected_receipt_qty,
        current_on_hand_qty
          + inbound_qty_by_expected_receipt_date_calc
          - forecast_lead_time_qty
          - committed_demand_before_expected_receipt_qty AS growth_projected_position_at_expected_receipt_qty,
        current_on_hand_qty
          + inbound_qty_by_expected_receipt_date_calc
          - baseline_forecast_lead_time_qty
          - committed_demand_before_expected_receipt_qty AS baseline_projected_position_at_expected_receipt_qty,
        GREATEST(
            0,
            actionable_forecast_lead_time_qty
              + committed_demand_before_expected_receipt_qty
              - (
                    current_on_hand_qty
                    + inbound_qty_by_expected_receipt_date_calc
                )
        ) AS uncovered_lead_time_demand_qty,
        GREATEST(
            0,
            actionable_forecast_lead_time_qty
              + committed_demand_before_expected_receipt_qty
              - (
                    current_on_hand_qty
                    + inbound_qty_by_expected_receipt_date_calc
                )
        ) AS stockout_gap_qty,
        GREATEST(
            0,
            forecast_target_coverage_qty
              + safety_stock_qty
              - GREATEST(0, (
                    current_on_hand_qty
                    + inbound_qty_by_expected_receipt_date_calc
                    - forecast_lead_time_qty
                    - committed_demand_before_expected_receipt_qty
                ))
        ) AS raw_reorder_qty,
        GREATEST(
            0,
            baseline_forecast_target_coverage_qty
              + safety_stock_qty
              - GREATEST(0, (
                    current_on_hand_qty
                    + inbound_qty_by_expected_receipt_date_calc
                    - baseline_forecast_lead_time_qty
                    - committed_demand_before_expected_receipt_qty
                ))
        ) AS conservative_raw_reorder_qty,
        GREATEST(
            0,
            actionable_forecast_target_coverage_qty
              + safety_stock_qty
              - GREATEST(0, (
                    current_on_hand_qty
                    + inbound_qty_by_expected_receipt_date_calc
                    - actionable_forecast_lead_time_qty
                    - committed_demand_before_expected_receipt_qty
                ))
        ) AS actionable_raw_reorder_qty,
        actionable_forecast_lead_time_qty + safety_stock_qty AS reorder_point_qty
    FROM calculation_position_inputs
),

planning_schedule_parameters AS (
    SELECT
        sku,
        GREATEST(
            3650,
            LEAST(
                7300,
                CEIL(
                    (GREATEST(available_position_qty, current_on_hand_qty, 0) + safety_stock_qty)
                    / NULLIF(actionable_forecast_daily_qty, 0)
                )::INT + assumed_lead_time_days
            )
        ) AS planning_horizon_days
    FROM calculated
),

planning_daily_forecast AS (
    SELECT
        c.sku,
        c.inventory_as_of_date,
        c.assumed_lead_time_days,
        forecast_date::DATE AS forecast_date,
        CASE
            WHEN forecast_date::DATE = c.inventory_as_of_date THEN 0
            ELSE p.actionable_forecast_daily_qty
        END AS actionable_forecast_daily_qty
    FROM calculated c
    INNER JOIN planning_schedule_parameters psp
        ON c.sku = psp.sku
    CROSS JOIN LATERAL GENERATE_SERIES(
        c.inventory_as_of_date,
        c.inventory_as_of_date + psp.planning_horizon_days + c.assumed_lead_time_days,
        INTERVAL '1 day'
    ) AS dates(forecast_date)
    INNER JOIN forecast_monthly_profiles p
        ON c.sku = p.sku
       AND EXTRACT(MONTH FROM dates.forecast_date)::INT = p.month_number
),

planning_cumulative_forecast AS (
    SELECT
        *,
        SUM(actionable_forecast_daily_qty) OVER (
            PARTITION BY sku
            ORDER BY forecast_date
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cumulative_actionable_forecast_qty
    FROM planning_daily_forecast
),

reorder_schedule AS (
    SELECT
        c.sku,
        MIN(candidate.forecast_date) FILTER (
            WHERE c.available_position_qty - candidate.cumulative_actionable_forecast_qty
                <= (
                    lead_end.cumulative_actionable_forecast_qty
                    - candidate.cumulative_actionable_forecast_qty
                    + c.safety_stock_qty
                )
        ) AS reorder_by_date,
        MIN(candidate.forecast_date) FILTER (
            WHERE c.current_on_hand_qty - candidate.cumulative_actionable_forecast_qty
                <= c.safety_stock_qty
        ) AS projected_stockout_or_safety_date
    FROM calculated c
    INNER JOIN planning_schedule_parameters psp
        ON c.sku = psp.sku
    INNER JOIN planning_cumulative_forecast candidate
        ON c.sku = candidate.sku
       AND candidate.forecast_date <= c.inventory_as_of_date + psp.planning_horizon_days
    INNER JOIN planning_cumulative_forecast lead_end
        ON c.sku = lead_end.sku
       AND lead_end.forecast_date = candidate.forecast_date + c.assumed_lead_time_days
    WHERE c.actionable_forecast_daily_qty > 0
    GROUP BY c.sku
),

recommendation_candidates AS (
    SELECT
        c.*,
        rs.reorder_by_date,
        rs.projected_stockout_or_safety_date,
        c.actionable_raw_reorder_qty AS spike_adjusted_raw_reorder_qty,
        CEIL(c.raw_reorder_qty) AS growth_case_reorder_qty,
        CEIL(c.conservative_raw_reorder_qty) AS conservative_reorder_qty,
        CASE
            WHEN c.policy_bucket IN ('NO_ACTION_OR_ARCHIVE', 'STOCKED_NO_RECENT_DEMAND_REVIEW') THEN 0
            WHEN c.requires_manual_review AND c.policy_bucket != 'COMPONENT_PACKAGING_MODEL' THEN 0
            ELSE CEIL(c.actionable_raw_reorder_qty)
        END AS candidate_reorder_qty
    FROM calculated c
    LEFT JOIN reorder_schedule rs
        ON c.sku = rs.sku
),

recommendations AS (
    SELECT
        *,
        CASE
            WHEN candidate_reorder_qty > 0
             AND reorder_by_date <= inventory_as_of_date
                THEN candidate_reorder_qty
            ELSE 0
        END AS reorder_qty
    FROM recommendation_candidates
),

final AS (
    SELECT
        sku,
        inventory_as_of_date,
        policy_bucket,
        policy_assignment_reason,
        policy_validation_status,
        policy_review_flags,
        forecast_method,
        forecast_model_detail,
        confidence_level,
        requires_manual_review,
        CASE
            WHEN policy_bucket IN ('NO_ACTION_OR_ARCHIVE', 'STOCKED_NO_RECENT_DEMAND_REVIEW') THEN FALSE
            WHEN requires_manual_review AND policy_bucket != 'COMPONENT_PACKAGING_MODEL' THEN FALSE
            ELSE reorder_qty > 0
        END AS should_reorder,
        reorder_qty,
        candidate_reorder_qty AS potential_reorder_qty_today,
        six_pack_units_per_layer,
        CASE
            WHEN six_pack_units_per_layer IS NOT NULL
             AND six_pack_units_per_layer > 0
             AND reorder_qty > 0
            THEN CEIL(reorder_qty / six_pack_units_per_layer) * six_pack_units_per_layer
            ELSE reorder_qty
        END AS layer_rounded_reorder_qty,
        CASE
            WHEN six_pack_units_per_layer IS NOT NULL
             AND six_pack_units_per_layer > 0
             AND reorder_qty > 0
            THEN CEIL(reorder_qty / six_pack_units_per_layer)
            ELSE NULL
        END AS reorder_layer_count,
        CASE
            WHEN six_pack_units_per_layer IS NOT NULL
             AND six_pack_units_per_layer > 0
             AND reorder_qty > 0
            THEN (CEIL(reorder_qty / six_pack_units_per_layer) * six_pack_units_per_layer) - reorder_qty
            ELSE 0
        END AS layer_rounding_extra_qty,
        reorder_qty * COALESCE(purchase_cost, 0) AS reorder_value_at_cost,
        reorder_by_date,
        projected_stockout_or_safety_date,
        expected_receipt_date,
        preferred_vendor,
        assumed_lead_time_days,
        lead_time_source,
        planning_override_reason,
        configured_lead_time_days,
        observed_sku_vendor_lead_time_days,
        observed_sku_vendor_lead_time_count,
        observed_vendor_lead_time_days,
        observed_vendor_lead_time_count,
        default_policy_lead_time_days,
        target_coverage_days,
        default_target_coverage_days,
        target_coverage_source,
        observed_sku_vendor_order_cycle_days,
        observed_sku_vendor_median_order_cycle_days,
        observed_sku_vendor_order_cycle_count,
        observed_vendor_order_cycle_days,
        observed_vendor_median_order_cycle_days,
        observed_vendor_order_cycle_count,
        current_on_hand_qty,
        committed_demand_qty,
        committed_demand_before_expected_receipt_qty,
        committed_order_count,
        first_committed_demand_date,
        last_committed_demand_date,
        COALESCE(open_po_quantity, 0) AS inbound_open_po_qty,
        inbound_qty_by_expected_receipt_date,
        COALESCE(open_po_line_count, 0) AS open_po_line_count,
        next_open_po_date,
        COALESCE(future_receipt_qty_after_anchor, 0) AS future_receipt_qty_after_anchor,
        COALESCE(future_receipt_line_count_after_anchor, 0) AS future_receipt_line_count_after_anchor,
        COALESCE(quantity_on_order, 0) AS quickbooks_quantity_on_order,
        available_position_qty,
        forecast_daily_qty,
        forecast_daily_qty * 30 AS forecast_monthly_qty,
        actionable_forecast_daily_qty,
        actionable_forecast_daily_qty * 30 AS actionable_forecast_monthly_qty,
        actionable_forecast_daily_profile,
        baseline_forecast_daily_qty,
        baseline_forecast_daily_qty * 30 AS baseline_forecast_monthly_qty,
        recent_velocity_forecast_daily_qty,
        recent_velocity_forecast_daily_qty * 30 AS recent_velocity_forecast_monthly_qty,
        recent_to_baseline_velocity_ratio,
        demand_spike_risk_level,
        demand_spike_reason,
        recent_sales_qty_90d_actual,
        largest_recent_sales_line_qty_90d,
        recent_sales_line_count_90d,
        recent_order_count_90d,
        recent_customer_count_90d,
        recent_sales_month_count_90d,
        largest_recent_customer_sales_qty_90d,
        largest_recent_sales_line_share_90d,
        largest_recent_customer_sales_share_90d,
        sku_baseline_monthly_qty,
        applied_seasonality_index,
        applied_growth_factor,
        forecast_lead_time_qty,
        baseline_forecast_lead_time_qty,
        actionable_forecast_lead_time_qty,
        forecast_target_coverage_qty,
        baseline_forecast_target_coverage_qty,
        actionable_forecast_target_coverage_qty,
        safety_stock_qty,
        safety_stock_source,
        demand_variability_source,
        policy_safety_stock_qty,
        percentile_safety_stock_qty,
        variability_sample_windows,
        variability_windows_with_demand,
        avg_historical_lead_time_demand_qty,
        stddev_historical_lead_time_demand_qty,
        p50_historical_lead_time_demand_qty,
        p75_historical_lead_time_demand_qty,
        p90_historical_lead_time_demand_qty,
        p95_historical_lead_time_demand_qty,
        reorder_point_qty,
        projected_position_at_expected_receipt_qty,
        growth_projected_position_at_expected_receipt_qty,
        baseline_projected_position_at_expected_receipt_qty,
        uncovered_lead_time_demand_qty,
        stockout_gap_qty,
        raw_reorder_qty,
        conservative_raw_reorder_qty,
        actionable_raw_reorder_qty,
        spike_adjusted_raw_reorder_qty,
        growth_case_reorder_qty,
        conservative_reorder_qty,
        calc_avg_daily_sales_30d AS avg_daily_sales_30d,
        calc_avg_daily_sales_90d AS avg_daily_sales_90d,
        calc_avg_daily_sales_365d AS avg_daily_sales_365d,
        stddev_daily_sales_90d,
        p80_daily_sales_90d,
        total_sales_qty_90d,
        days_with_sales_90d,
        avg_monthly_sales_36m,
        trailing_3m_avg_monthly_sales,
        trailing_12m_avg_monthly_sales,
        prior_12m_avg_monthly_sales,
        capped_sales_qty_12m,
        uncapped_sales_qty_12m,
        capped_reduction_qty_12m,
        months_with_capped_sales_36m,
        sku_seasonality_index,
        sku_seasonality_demand_months,
        family_material_seasonality_index,
        family_material_demand_months,
        demand_growth_factor,
        forecast_month_number,
        sales_qty_since_2024,
        sales_qty_since_2025,
        component_consumed_qty_since_2024,
        build_produced_qty_since_2024,
        fba_transfer_in_qty_since_2024,
        largest_sales_line_share_2025,
        has_large_order_outlier_2025,
        is_suppressed_from_inventory_planning,
        inventory_suppression_reason,
        sales_description,
        product_family,
        material_type,
        is_kit,
        item_type,
        item_subtype,
        packaging_type,
        units_per_sku,
        unit_of_measure,
        purchase_cost,
        sales_price,
        inventory_value_at_cost,
        inventory_status,
        CASE
            WHEN is_suppressed_from_inventory_planning THEN 'Excluded from inventory planning: ' || inventory_suppression_reason || '.'
            WHEN policy_bucket = 'NO_ACTION_OR_ARCHIVE' THEN 'Excluded: no stock and no usable demand signal.'
            WHEN policy_bucket = 'STOCKED_NO_RECENT_DEMAND_REVIEW' THEN 'Manual review: stocked SKU with no recent demand.'
            WHEN requires_manual_review AND policy_bucket != 'COMPONENT_PACKAGING_MODEL' THEN 'Manual review required before automatic reorder.'
            WHEN reorder_qty <= 0 AND reorder_by_date > inventory_as_of_date AND demand_spike_risk_level = 'high' THEN 'No order today; high recent-demand spike risk uses the conservative baseline profile, with the next projected threshold on ' || TO_CHAR(reorder_by_date, 'YYYY-MM-DD') || '.'
            WHEN reorder_qty <= 0 AND reorder_by_date > inventory_as_of_date AND demand_spike_risk_level = 'medium' THEN 'No order today; recent-demand spike risk uses a dampened profile, with the next projected threshold on ' || TO_CHAR(reorder_by_date, 'YYYY-MM-DD') || '.'
            WHEN reorder_qty <= 0 AND reorder_by_date > inventory_as_of_date THEN 'No order today; projected reorder threshold is ' || TO_CHAR(reorder_by_date, 'YYYY-MM-DD') || ' using the spike-adjusted seasonal demand profile.'
            WHEN demand_spike_risk_level = 'high' AND reorder_qty <= 0 AND growth_case_reorder_qty > 0 THEN 'No conservative reorder: full growth case is ' || growth_case_reorder_qty::TEXT || ' units, but recent demand spike risk is high (' || REPLACE(COALESCE(demand_spike_reason, 'spike risk'), '_', ' ') || ') and baseline demand is covered by current stock and inbound.'
            WHEN demand_spike_risk_level = 'medium' AND reorder_qty <= 0 AND growth_case_reorder_qty > 0 THEN 'No spike-adjusted reorder: full growth case is ' || growth_case_reorder_qty::TEXT || ' units, but recent demand is above baseline (' || REPLACE(COALESCE(demand_spike_reason, 'spike risk'), '_', ' ') || ') and adjusted demand is covered.'
            WHEN stockout_gap_qty > 0 THEN 'Reorder suggested; projected demand before replenishment may exceed available stock by ' || CEIL(stockout_gap_qty)::TEXT || ' units.'
            WHEN reorder_qty <= 0 AND available_position_qty >= reorder_point_qty THEN 'No reorder: available position covers lead-time demand and safety stock.'
            WHEN reorder_qty <= 0 THEN 'No reorder from current rule set.'
            WHEN demand_spike_risk_level = 'high' THEN 'Conservative reorder: recent demand spike risk is high (' || REPLACE(COALESCE(demand_spike_reason, 'spike risk'), '_', ' ') || '), so actionable quantity uses baseline demand instead of the full growth case.'
            WHEN demand_spike_risk_level = 'medium' THEN 'Spike-adjusted reorder: recent demand is above baseline (' || REPLACE(COALESCE(demand_spike_reason, 'spike risk'), '_', ' ') || '), so actionable quantity is dampened below the full growth case.'
            WHEN has_large_order_outlier_2025 THEN 'Reorder suggested, but 2025 demand includes a large outlier order.'
            WHEN committed_demand_qty > 0 THEN 'Reorder suggested after subtracting committed future demand.'
            ELSE 'Reorder suggested by ' || REPLACE(forecast_model_detail, '_', ' ') || ', lead-time demand, safety stock, and target coverage.'
        END AS recommendation_reason,
        CURRENT_TIMESTAMP AS created_at
    FROM recommendations
)

SELECT *
FROM final
