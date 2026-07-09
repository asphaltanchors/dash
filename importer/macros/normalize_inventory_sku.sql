{% macro normalize_inventory_sku(sku_expression) -%}
    CASE
        WHEN {{ sku_expression }} IS NULL THEN NULL
        WHEN UPPER(TRIM({{ sku_expression }}::TEXT)) = 'ADH-EPX2-TUB2P5LB.IN'
            THEN 'ADH-EPX2TUB2P5'
        WHEN UPPER(TRIM({{ sku_expression }}::TEXT)) LIKE '%.IN'
            THEN LEFT(TRIM({{ sku_expression }}::TEXT), LENGTH(TRIM({{ sku_expression }}::TEXT)) - 3)
        WHEN UPPER(TRIM({{ sku_expression }}::TEXT)) LIKE '% IN'
            THEN LEFT(TRIM({{ sku_expression }}::TEXT), LENGTH(TRIM({{ sku_expression }}::TEXT)) - 3)
        ELSE TRIM({{ sku_expression }}::TEXT)
    END
{%- endmacro %}
