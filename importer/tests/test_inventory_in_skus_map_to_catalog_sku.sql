/*
ABOUTME: Ensures vendor/inbound .IN inventory SKUs normalize to real catalog SKUs.
ABOUTME: Prevents inventory planning from emitting synthetic base SKUs that product pages cannot resolve.
*/

WITH inbound_inventory_skus AS (
    SELECT DISTINCT
        item_name AS inbound_sku,
        {{ normalize_inventory_sku('item_name') }} AS planning_sku
    FROM {{ ref('stg_quickbooks__items') }}
    WHERE item_type = 'Inventory'
      AND (
        UPPER(TRIM(item_name::TEXT)) LIKE '%.IN'
        OR UPPER(TRIM(item_name::TEXT)) LIKE '% IN'
      )
),

catalog_inventory_skus AS (
    SELECT DISTINCT
        item_name AS catalog_sku
    FROM {{ ref('stg_quickbooks__items') }}
    WHERE item_type = 'Inventory'
)

SELECT
    inbound.inbound_sku,
    inbound.planning_sku
FROM inbound_inventory_skus inbound
LEFT JOIN catalog_inventory_skus catalog
    ON inbound.planning_sku = catalog.catalog_sku
WHERE catalog.catalog_sku IS NULL
