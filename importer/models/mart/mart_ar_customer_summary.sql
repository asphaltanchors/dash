/*
ABOUTME: Customer-grain current accounts receivable summary.
ABOUTME: Keeps customer collection risk separate from invoice-grain rows to prevent double counting.
*/

{{ config(
    materialized = 'table',
    tags = ['finance', 'cash_flow', 'ar', 'current']
) }}

SELECT
    customer,
    MODE() WITHIN GROUP (ORDER BY customer_segment) AS customer_segment,
    COUNT(*) AS open_invoice_count,
    SUM(total_amount) AS total_ar_amount,
    AVG(total_amount) AS avg_invoice_amount,
    AVG(days_outstanding) AS avg_days_outstanding,
    MAX(days_outstanding) AS max_days_outstanding,
    SUM(CASE WHEN days_past_due > 0 THEN total_amount ELSE 0 END) AS overdue_ar_amount,
    COUNT(CASE WHEN days_past_due > 0 THEN 1 END) AS overdue_invoice_count,
    CASE
        WHEN AVG(days_outstanding) <= 35 THEN 'Good Payer'
        WHEN AVG(days_outstanding) <= 60 THEN 'Slow Payer'
        ELSE 'Problem Account'
    END AS payment_pattern,
    CASE
        WHEN MAX(days_outstanding) > 90 OR SUM(total_amount) >= 10000 THEN 'High'
        WHEN MAX(days_outstanding) > 60 OR SUM(total_amount) >= 2500 THEN 'Medium'
        ELSE 'Low'
    END AS collection_priority,
    CURRENT_TIMESTAMP AS created_at
FROM {{ ref('mart_ar_invoice_aging') }}
GROUP BY customer
