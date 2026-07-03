/*
ABOUTME: Days Sales Outstanding (DSO) and accounts receivable aging analysis
ABOUTME: Provides critical cash flow metrics and collection efficiency tracking
*/

{{ config(
    materialized = 'table',
    tags = ['finance', 'cash_flow', 'dso']
) }}

SELECT 
    'Individual Invoices' AS analysis_level,
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
    NULL::TEXT AS payment_pattern,
    NULL::INTEGER AS open_invoice_count,
    NULL::NUMERIC AS total_ar_amount,
    NULL::NUMERIC AS avg_days_outstanding,
    NULL::NUMERIC AS max_days_outstanding
FROM {{ ref('mart_ar_invoice_aging') }}

UNION ALL

SELECT 
    'Customer Summary' AS analysis_level,
    NULL AS order_number,
    customer,
    customer_segment,
    NULL AS order_date,
    NULL AS due_date,
    total_ar_amount AS total_amount,
    NULL AS terms,
    NULL AS days_outstanding,
    NULL AS days_past_due,
    NULL AS aging_bucket,
    NULL AS collection_risk,
    payment_pattern,
    open_invoice_count,
    total_ar_amount,
    avg_days_outstanding,
    max_days_outstanding
FROM {{ ref('mart_ar_customer_summary') }}

UNION ALL

SELECT 
    'Aging Summary' AS analysis_level,
    NULL AS order_number,
    aging_bucket AS customer,
    NULL AS customer_segment,
    NULL AS order_date,
    NULL AS due_date,
    total_ar_amount AS total_amount,
    NULL AS terms,
    NULL AS days_outstanding,
    NULL AS days_past_due,
    aging_bucket,
    collection_risk,
    NULL AS payment_pattern,
    invoice_count AS open_invoice_count,
    total_ar_amount,
    avg_days_outstanding,
    max_days_outstanding
FROM {{ ref('mart_ar_bucket_summary') }}

ORDER BY 
    analysis_level,
    days_outstanding DESC NULLS LAST,
    total_amount DESC NULLS LAST
