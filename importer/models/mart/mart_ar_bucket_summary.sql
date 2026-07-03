/*
ABOUTME: Aging-bucket current accounts receivable summary.
ABOUTME: One row per aging bucket for dashboard totals without mixing invoice and customer grains.
*/

{{ config(
    materialized = 'table',
    tags = ['finance', 'cash_flow', 'ar', 'current']
) }}

SELECT
    aging_bucket,
    collection_risk,
    COUNT(*) AS invoice_count,
    SUM(total_amount) AS total_ar_amount,
    AVG(total_amount) AS avg_invoice_amount,
    AVG(days_outstanding) AS avg_days_outstanding,
    MIN(days_outstanding) AS min_days_outstanding,
    MAX(days_outstanding) AS max_days_outstanding,
    CURRENT_TIMESTAMP AS created_at
FROM {{ ref('mart_ar_invoice_aging') }}
GROUP BY aging_bucket, collection_risk
