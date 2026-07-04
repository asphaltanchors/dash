/*
ABOUTME: Single-row operational cockpit summary for the dashboard first viewport.
ABOUTME: Combines current-safe revenue, AR, inventory, attribution, and data-quality signals.
*/

{{ config(
    materialized = 'table',
    tags = ['dashboard', 'cockpit', 'current']
) }}

WITH current_orders AS (
    SELECT *
    FROM {{ ref('base_fct_orders_current') }}
    WHERE total_amount IS NOT NULL
),

future_orders AS (
    SELECT
        COUNT(*) AS future_order_count,
        COALESCE(SUM(total_amount), 0) AS future_order_amount,
        MAX(order_date) AS latest_future_order_date
    FROM {{ ref('fct_orders') }}
    WHERE order_date > CURRENT_DATE
),

revenue_summary AS (
    SELECT
        COALESCE(SUM(CASE WHEN order_date >= DATE_TRUNC('year', CURRENT_DATE) THEN total_amount ELSE 0 END), 0) AS ytd_revenue,
        COUNT(CASE WHEN order_date >= DATE_TRUNC('year', CURRENT_DATE) THEN 1 END) AS ytd_orders,
        COALESCE(SUM(CASE
            WHEN order_date >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year'
                AND order_date < CURRENT_DATE - INTERVAL '1 year'
            THEN total_amount ELSE 0
        END), 0) AS prior_ytd_revenue,
        COUNT(CASE
            WHEN order_date >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year'
                AND order_date < CURRENT_DATE - INTERVAL '1 year'
            THEN 1
        END) AS prior_ytd_orders,
        COALESCE(SUM(CASE WHEN order_date >= CURRENT_DATE - INTERVAL '365 days' THEN total_amount ELSE 0 END), 0) AS trailing_365d_revenue,
        COUNT(CASE WHEN order_date >= CURRENT_DATE - INTERVAL '365 days' THEN 1 END) AS trailing_365d_orders,
        COALESCE(SUM(CASE
            WHEN order_date >= CURRENT_DATE - INTERVAL '730 days'
                AND order_date < CURRENT_DATE - INTERVAL '365 days'
            THEN total_amount ELSE 0
        END), 0) AS prior_trailing_365d_revenue,
        COUNT(CASE
            WHEN order_date >= CURRENT_DATE - INTERVAL '730 days'
                AND order_date < CURRENT_DATE - INTERVAL '365 days'
            THEN 1
        END) AS prior_trailing_365d_orders
    FROM current_orders
),

attribution_summary AS (
    SELECT
        COUNT(*) AS trailing_365d_orders,
        COUNT(CASE WHEN acquisition_channel IS NOT NULL AND acquisition_channel <> 'Unknown' THEN 1 END) AS attributed_orders,
        COALESCE(SUM(revenue), 0) AS trailing_365d_revenue,
        COALESCE(SUM(CASE WHEN acquisition_channel IS NOT NULL AND acquisition_channel <> 'Unknown' THEN revenue ELSE 0 END), 0) AS attributed_revenue
    FROM {{ ref('fct_order_attribution') }}
    WHERE order_date >= CURRENT_DATE - INTERVAL '365 days'
        AND order_date <= CURRENT_DATE
),

inventory_summary AS (
    SELECT
        MAX(inventory_as_of_date) AS inventory_as_of_date,
        COUNT(CASE WHEN should_reorder THEN 1 END) AS reorder_sku_count,
        COALESCE(SUM(CASE WHEN should_reorder THEN reorder_value_at_cost ELSE 0 END), 0) AS suggested_buy_cost,
        COUNT(CASE WHEN requires_manual_review THEN 1 END) AS manual_review_sku_count
    FROM {{ ref('mart_inventory_reorder_recommendations') }}
),

ar_summary AS (
    SELECT
        COUNT(*) AS open_invoice_count,
        COALESCE(SUM(total_amount), 0) AS open_ar_amount,
        COUNT(CASE WHEN days_past_due > 0 THEN 1 END) AS overdue_invoice_count,
        COALESCE(SUM(CASE WHEN days_past_due > 0 THEN total_amount ELSE 0 END), 0) AS overdue_ar_amount
    FROM {{ ref('mart_ar_invoice_aging') }}
),

account_concentration AS (
    SELECT
        SUM(total_revenue) AS corporate_revenue,
        SUM(CASE WHEN revenue_rank <= 10 THEN total_revenue ELSE 0 END) AS top_10_corporate_revenue,
        SUM(CASE WHEN revenue_rank <= 50 THEN total_revenue ELSE 0 END) AS top_50_corporate_revenue
    FROM (
        SELECT
            total_revenue,
            ROW_NUMBER() OVER (ORDER BY total_revenue DESC) AS revenue_rank
        FROM {{ ref('fct_companies') }}
        WHERE domain_type = 'corporate'
            AND total_revenue IS NOT NULL
    ) ranked
)

SELECT
    CURRENT_DATE AS as_of_date,
    rs.ytd_revenue,
    rs.ytd_orders,
    rs.prior_ytd_revenue,
    rs.prior_ytd_orders,
    CASE
        WHEN rs.prior_ytd_revenue > 0 THEN ROUND(CAST((rs.ytd_revenue - rs.prior_ytd_revenue) * 100.0 / rs.prior_ytd_revenue AS NUMERIC), 2)
        ELSE NULL
    END AS ytd_revenue_growth_pct,
    CASE
        WHEN rs.prior_ytd_orders > 0 THEN ROUND(CAST((rs.ytd_orders - rs.prior_ytd_orders) * 100.0 / rs.prior_ytd_orders AS NUMERIC), 2)
        ELSE NULL
    END AS ytd_order_growth_pct,
    rs.trailing_365d_revenue,
    rs.trailing_365d_orders,
    rs.prior_trailing_365d_revenue,
    rs.prior_trailing_365d_orders,
    CASE
        WHEN rs.prior_trailing_365d_revenue > 0 THEN ROUND(CAST((rs.trailing_365d_revenue - rs.prior_trailing_365d_revenue) * 100.0 / rs.prior_trailing_365d_revenue AS NUMERIC), 2)
        ELSE NULL
    END AS trailing_365d_revenue_growth_pct,
    ars.open_invoice_count,
    ars.open_ar_amount,
    ars.overdue_invoice_count,
    ars.overdue_ar_amount,
    inv.inventory_as_of_date,
    inv.reorder_sku_count,
    inv.suggested_buy_cost,
    inv.manual_review_sku_count,
    fo.future_order_count,
    fo.future_order_amount,
    fo.latest_future_order_date,
    CASE
        WHEN attr.trailing_365d_orders > 0 THEN ROUND(CAST(attr.attributed_orders * 100.0 / attr.trailing_365d_orders AS NUMERIC), 2)
        ELSE 0
    END AS attribution_order_coverage_pct,
    CASE
        WHEN attr.trailing_365d_revenue > 0 THEN ROUND(CAST(attr.attributed_revenue * 100.0 / attr.trailing_365d_revenue AS NUMERIC), 2)
        ELSE 0
    END AS attribution_revenue_coverage_pct,
    CASE
        WHEN ac.corporate_revenue > 0 THEN ROUND(CAST(ac.top_10_corporate_revenue * 100.0 / ac.corporate_revenue AS NUMERIC), 2)
        ELSE 0
    END AS top_10_corporate_revenue_share_pct,
    CASE
        WHEN ac.corporate_revenue > 0 THEN ROUND(CAST(ac.top_50_corporate_revenue * 100.0 / ac.corporate_revenue AS NUMERIC), 2)
        ELSE 0
    END AS top_50_corporate_revenue_share_pct,
    CURRENT_TIMESTAMP AS created_at
FROM revenue_summary rs
CROSS JOIN future_orders fo
CROSS JOIN attribution_summary attr
CROSS JOIN inventory_summary inv
CROSS JOIN ar_summary ars
CROSS JOIN account_concentration ac
