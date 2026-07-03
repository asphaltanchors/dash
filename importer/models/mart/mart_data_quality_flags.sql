/*
ABOUTME: Dashboard-facing data quality flags for currentness, future data leakage, and attribution coverage.
ABOUTME: One row per monitored condition with severity and supporting metric value.
*/

{{ config(
    materialized = 'table',
    tags = ['dashboard', 'data_quality']
) }}

WITH signals AS (
    SELECT
        (SELECT COUNT(*) FROM {{ ref('fct_orders') }} WHERE order_date > CURRENT_DATE) AS future_order_count,
        (SELECT COUNT(*) FROM {{ ref('fct_order_line_items') }} WHERE order_date > CURRENT_DATE) AS future_line_item_count,
        (SELECT MAX(inventory_as_of_date) FROM {{ ref('mart_inventory_reorder_recommendations') }}) AS inventory_as_of_date,
        (
            SELECT
                CASE
                    WHEN COUNT(*) > 0
                    THEN COUNT(CASE WHEN acquisition_channel IS NOT NULL AND acquisition_channel <> 'Unknown' THEN 1 END) * 100.0 / COUNT(*)
                    ELSE 0
                END
            FROM {{ ref('fct_order_attribution') }}
            WHERE order_date >= CURRENT_DATE - INTERVAL '365 days'
                AND order_date <= CURRENT_DATE
        ) AS attribution_order_coverage_pct
)

SELECT
    'future_orders' AS flag_key,
    CASE WHEN future_order_count > 0 THEN 'warn' ELSE 'ok' END AS severity,
    future_order_count::NUMERIC AS flag_value,
    'Future orders in raw order mart' AS flag_label,
    'Current dashboard metrics should use base_fct_orders_current; future orders remain available for committed demand.' AS details,
    CURRENT_TIMESTAMP AS detected_at
FROM signals

UNION ALL

SELECT
    'future_line_items' AS flag_key,
    CASE WHEN future_line_item_count > 0 THEN 'warn' ELSE 'ok' END AS severity,
    future_line_item_count::NUMERIC AS flag_value,
    'Future line items in raw line-item mart' AS flag_label,
    'Current product and margin analysis should use base_fct_order_line_items_current.' AS details,
    CURRENT_TIMESTAMP AS detected_at
FROM signals

UNION ALL

SELECT
    'inventory_freshness' AS flag_key,
    CASE
        WHEN inventory_as_of_date IS NULL THEN 'critical'
        WHEN inventory_as_of_date < CURRENT_DATE - INTERVAL '2 days' THEN 'warn'
        ELSE 'ok'
    END AS severity,
    CASE WHEN inventory_as_of_date IS NULL THEN NULL ELSE CURRENT_DATE - inventory_as_of_date END::NUMERIC AS flag_value,
    'Inventory snapshot age in days' AS flag_label,
    'Inventory cockpit depends on the latest reorder recommendation snapshot.' AS details,
    CURRENT_TIMESTAMP AS detected_at
FROM signals

UNION ALL

SELECT
    'attribution_coverage' AS flag_key,
    CASE WHEN attribution_order_coverage_pct < 50 THEN 'warn' ELSE 'ok' END AS severity,
    ROUND(CAST(attribution_order_coverage_pct AS NUMERIC), 2) AS flag_value,
    'Trailing-year attribution coverage percent' AS flag_label,
    'Unknown and missing attribution should stay visible in marketing readouts.' AS details,
    CURRENT_TIMESTAMP AS detected_at
FROM signals
