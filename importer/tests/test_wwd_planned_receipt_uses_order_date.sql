/* Future WWD quantities must use a receipt date derived from the proposed order date, not the inventory snapshot date. */

SELECT
    p.sku,
    p.next_order_date,
    p.planned_expected_receipt_date,
    r.assumed_lead_time_days
FROM {{ ref('mart_wwd_pallet_order_plan') }} p
INNER JOIN {{ ref('mart_inventory_reorder_recommendations') }} r
    ON p.sku = r.sku
WHERE p.planned_expected_receipt_date
      IS DISTINCT FROM p.next_order_date + r.assumed_lead_time_days
