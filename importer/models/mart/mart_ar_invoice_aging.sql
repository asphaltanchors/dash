/*
ABOUTME: Invoice-grain current accounts receivable aging mart.
ABOUTME: One row per open current invoice; future invoices stay in fct_orders for committed demand.
*/

{{ config(
    materialized = 'table',
    tags = ['finance', 'cash_flow', 'ar', 'current']
) }}

WITH open_invoices AS (
    SELECT
        order_key,
        order_number,
        customer,
        customer_segment,
        order_date,
        due_date,
        total_amount,
        terms,
        GREATEST(0, CURRENT_DATE - order_date) AS days_outstanding,
        CASE
            WHEN due_date IS NOT NULL AND CURRENT_DATE > due_date
            THEN GREATEST(0, CURRENT_DATE - due_date)
            ELSE 0
        END AS days_past_due
    FROM {{ ref('base_fct_orders_current') }}
    WHERE sales_channel = 'Invoice'
        AND status = 'OPEN'
        AND order_date IS NOT NULL
        AND total_amount IS NOT NULL
),

classified AS (
    SELECT
        *,
        CASE
            WHEN days_outstanding <= 30 THEN 'Current (0-30 days)'
            WHEN days_outstanding <= 60 THEN 'Past Due (31-60 days)'
            WHEN days_outstanding <= 90 THEN 'Overdue (61-90 days)'
            ELSE 'Severely Overdue (90+ days)'
        END AS aging_bucket,
        CASE
            WHEN days_outstanding <= 30 THEN 'Low Risk'
            WHEN days_outstanding <= 60 THEN 'Medium Risk'
            WHEN days_outstanding <= 90 THEN 'High Risk'
            ELSE 'Critical Risk'
        END AS collection_risk
    FROM open_invoices
)

SELECT
    order_key,
    order_number,
    customer,
    customer_segment,
    order_date,
    due_date,
    total_amount,
    terms,
    days_outstanding,
    days_past_due,
    aging_bucket,
    collection_risk,
    CURRENT_TIMESTAMP AS created_at
FROM classified
