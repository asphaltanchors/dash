/* Reorder actions must be executable now; future thresholds belong to the planning schedule. */

SELECT
    sku,
    inventory_as_of_date,
    reorder_by_date,
    reorder_qty
FROM {{ ref('mart_inventory_reorder_recommendations') }}
WHERE should_reorder
  AND (
        reorder_by_date IS NULL
        OR reorder_by_date > inventory_as_of_date
      )
