/*
ABOUTME: Recent high-value order signal for the business cockpit.
ABOUTME: Benchmarks the last 45 days of current-safe orders against trailing-year order size.
*/

{{ config(
    materialized = 'table',
    tags = ['dashboard', 'cockpit', 'orders', 'current']
) }}

WITH stats AS (
    SELECT
        AVG(total_amount) AS average_amount,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY total_amount) AS p90_amount
    FROM {{ ref('base_fct_orders_current') }}
    WHERE total_amount IS NOT NULL
        AND order_date >= CURRENT_DATE - INTERVAL '365 days'
),

recent_orders AS (
    SELECT
        o.order_key,
        o.order_number,
        o.customer,
        o.order_date,
        o.total_amount,
        o.status,
        o.is_paid,
        b.company_domain_key,
        COALESCE(b.is_individual_customer, FALSE) AS is_individual_customer,
        GREATEST(COALESCE(s.p90_amount, 0), COALESCE(s.average_amount, 0) * 2) AS benchmark_amount,
        CASE
            WHEN COALESCE(s.average_amount, 0) > 0 THEN o.total_amount / s.average_amount
            ELSE 0
        END AS multiple_of_average
    FROM {{ ref('base_fct_orders_current') }} o
    CROSS JOIN stats s
    LEFT JOIN {{ ref('bridge_customer_company') }} b
        ON o.customer = b.customer_name
    WHERE o.total_amount IS NOT NULL
        AND o.order_date >= CURRENT_DATE - INTERVAL '45 days'
)

SELECT
    order_key,
    order_number,
    customer,
    order_date,
    total_amount,
    status,
    is_paid,
    company_domain_key,
    is_individual_customer,
    benchmark_amount,
    multiple_of_average,
    total_amount >= benchmark_amount AS is_unusually_large,
    CURRENT_TIMESTAMP AS created_at
FROM recent_orders
