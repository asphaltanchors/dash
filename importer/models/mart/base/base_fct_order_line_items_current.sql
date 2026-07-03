/*
ABOUTME: Current-safe line-item base for margin, product, and account analysis.
ABOUTME: Excludes line items belonging to future-dated orders while preserving line-item grain.
*/

{{ config(
    materialized='view',
    tags=['orders', 'line_items', 'base', 'current']
) }}

SELECT li.*
FROM {{ ref('fct_order_line_items') }} li
INNER JOIN {{ ref('base_fct_orders_current') }} o
    ON li.order_key = o.order_key
