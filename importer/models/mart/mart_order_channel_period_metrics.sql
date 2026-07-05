/*
ABOUTME: Four trailing-year sales channel metrics for the orders dashboard.
ABOUTME: Provides one row per channel and rolling annual period for trend and share display.
*/

{{ config(
    materialized = 'table',
    tags = ['dashboard', 'orders', 'channels', 'current']
) }}

WITH periods AS (
    SELECT
        period_index,
        (CURRENT_DATE - (period_index || ' years')::INTERVAL)::DATE AS period_end,
        (
            CURRENT_DATE
            - (period_index || ' years')::INTERVAL
            - INTERVAL '1 year'
            + INTERVAL '1 day'
        )::DATE AS period_start
    FROM GENERATE_SERIES(0, 3) AS period_index
),

period_orders AS (
    SELECT
        p.period_index,
        p.period_start,
        p.period_end,
        o.sales_channel,
        SUM(o.total_amount) AS total_revenue,
        COUNT(*) AS order_count
    FROM periods p
    INNER JOIN {{ ref('base_fct_orders_current') }} o
        ON o.order_date >= p.period_start
        AND o.order_date <= p.period_end
    WHERE o.total_amount IS NOT NULL
        AND o.sales_channel IS NOT NULL
        AND o.sales_channel <> ''
        AND o.sales_channel NOT IN ('Contractor', 'EXPORT from WWD')
    GROUP BY
        p.period_index,
        p.period_start,
        p.period_end,
        o.sales_channel
)

SELECT
    sales_channel,
    period_index,
    period_start,
    period_end,
    EXTRACT(YEAR FROM period_start)::TEXT || '-' || EXTRACT(YEAR FROM period_end)::TEXT AS period_label,
    total_revenue,
    order_count,
    CURRENT_TIMESTAMP AS created_at
FROM period_orders
