/*
ABOUTME: SKU-level product economics and growth quality mart.
ABOUTME: Uses quantity-weighted extended margin and discount math, excluding non-merchandise lines.
*/

{{ config(
    materialized = 'table',
    tags = ['products', 'growth', 'margins', 'current']
) }}

WITH merchandise_lines AS (
    SELECT
        product_service AS sku,
        COALESCE(product_family, 'Uncategorized') AS product_family,
        COALESCE(material_type, 'Unknown') AS material_type,
        is_kit,
        item_type,
        order_key,
        order_number,
        order_date,
        customer,
        product_service_quantity AS quantity_sold,
        total_units_sold,
        product_service_amount AS line_revenue,
        actual_unit_price,
        standard_purchase_cost,
        standard_sales_price,
        CASE
            WHEN actual_margin_amount IS NOT NULL AND product_service_quantity IS NOT NULL
            THEN actual_margin_amount * product_service_quantity
            ELSE NULL
        END AS extended_margin_amount,
        CASE
            WHEN price_discount_amount IS NOT NULL AND product_service_quantity IS NOT NULL
            THEN GREATEST(price_discount_amount, 0) * product_service_quantity
            ELSE 0
        END AS extended_discount_amount
    FROM {{ ref('base_fct_order_line_items_current') }}
    WHERE product_service IS NOT NULL
        AND TRIM(product_service) <> ''
        AND order_date IS NOT NULL
        AND product_service_amount IS NOT NULL
        AND product_service_amount > 0
        AND actual_unit_price > 0
        AND COALESCE(item_type, '') = 'Inventory'
        AND COALESCE(item_subtype, '') <> 'ItemSubtotal'
),

sku_rollup AS (
    SELECT
        sku,
        product_family,
        material_type,
        is_kit,
        item_type,
        COUNT(DISTINCT order_key) AS order_count,
        COUNT(DISTINCT customer) AS customer_count,
        SUM(quantity_sold) AS units_sold,
        SUM(total_units_sold) AS component_units_sold,
        SUM(line_revenue) AS revenue,
        SUM(extended_margin_amount) AS gross_margin_amount,
        SUM(extended_discount_amount) AS discount_leakage_amount,
        SUM(CASE
            WHEN order_date >= DATE_TRUNC('year', CURRENT_DATE)
                AND order_date < CURRENT_DATE + INTERVAL '1 day'
            THEN line_revenue ELSE 0
        END) AS current_year_revenue,
        SUM(CASE
            WHEN order_date >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year'
                AND order_date < (CURRENT_DATE - INTERVAL '1 year') + INTERVAL '1 day'
            THEN line_revenue ELSE 0
        END) AS prior_year_same_period_revenue,
        MAX(order_date) AS latest_order_date,
        AVG(actual_unit_price) AS avg_actual_unit_price,
        AVG(standard_sales_price) AS avg_standard_sales_price,
        AVG(standard_purchase_cost) AS avg_purchase_cost
    FROM merchandise_lines
    GROUP BY sku, product_family, material_type, is_kit, item_type
),

top_customer AS (
    SELECT DISTINCT ON (sku)
        sku,
        customer AS top_customer,
        SUM(line_revenue) AS top_customer_revenue
    FROM merchandise_lines
    GROUP BY sku, customer
    ORDER BY sku, SUM(line_revenue) DESC
),

latest_inventory AS (
    SELECT DISTINCT ON (sku)
        sku,
        inventory_date,
        estimated_available_quantity,
        inventory_value_at_cost,
        inventory_status
    FROM {{ ref('fct_inventory_history') }}
    WHERE inventory_date = (
        SELECT MAX(inventory_date)
        FROM {{ ref('fct_inventory_history') }}
    )
    ORDER BY sku, inventory_date DESC
),

reorder_context AS (
    SELECT
        sku,
        preferred_vendor,
        should_reorder,
        requires_manual_review,
        reorder_value_at_cost
    FROM {{ ref('mart_inventory_reorder_recommendations') }}
),

ranked AS (
    SELECT
        sr.*,
        tc.top_customer,
        tc.top_customer_revenue,
        li.inventory_date,
        li.estimated_available_quantity,
        li.inventory_value_at_cost,
        li.inventory_status,
        rc.preferred_vendor,
        rc.should_reorder,
        rc.requires_manual_review,
        rc.reorder_value_at_cost,
        CASE
            WHEN sr.revenue > 0 AND sr.gross_margin_amount IS NOT NULL
            THEN ROUND(CAST(sr.gross_margin_amount * 100.0 / sr.revenue AS NUMERIC), 2)
            ELSE NULL
        END AS gross_margin_percentage,
        CASE
            WHEN sr.current_year_revenue > 0 AND sr.prior_year_same_period_revenue > 0
            THEN ROUND(CAST((sr.current_year_revenue - sr.prior_year_same_period_revenue) * 100.0 / sr.prior_year_same_period_revenue AS NUMERIC), 2)
            WHEN sr.current_year_revenue > 0 AND COALESCE(sr.prior_year_same_period_revenue, 0) = 0
            THEN 100.0
            ELSE 0.0
        END AS yoy_revenue_growth_pct,
        CASE
            WHEN sr.revenue > 0 AND tc.top_customer_revenue IS NOT NULL
            THEN ROUND(CAST(tc.top_customer_revenue * 100.0 / sr.revenue AS NUMERIC), 2)
            ELSE NULL
        END AS top_customer_revenue_share_pct,
        RANK() OVER (ORDER BY sr.revenue DESC) AS revenue_rank,
        RANK() OVER (ORDER BY sr.gross_margin_amount DESC NULLS LAST) AS margin_rank,
        RANK() OVER (PARTITION BY sr.product_family ORDER BY sr.revenue DESC) AS family_revenue_rank
    FROM sku_rollup sr
    LEFT JOIN top_customer tc
        ON sr.sku = tc.sku
    LEFT JOIN latest_inventory li
        ON sr.sku = li.sku
    LEFT JOIN reorder_context rc
        ON sr.sku = rc.sku
)

SELECT
    sku,
    product_family,
    material_type,
    is_kit,
    item_type,
    order_count,
    customer_count,
    units_sold,
    component_units_sold,
    revenue,
    gross_margin_amount,
    gross_margin_percentage,
    discount_leakage_amount,
    current_year_revenue,
    prior_year_same_period_revenue,
    yoy_revenue_growth_pct,
    avg_actual_unit_price,
    avg_standard_sales_price,
    avg_purchase_cost,
    latest_order_date,
    inventory_date,
    estimated_available_quantity,
    inventory_value_at_cost,
    inventory_status,
    preferred_vendor,
    should_reorder,
    requires_manual_review,
    reorder_value_at_cost,
    top_customer,
    top_customer_revenue,
    top_customer_revenue_share_pct,
    revenue_rank,
    margin_rank,
    family_revenue_rank,
    CURRENT_TIMESTAMP AS created_at
FROM ranked
ORDER BY revenue DESC
