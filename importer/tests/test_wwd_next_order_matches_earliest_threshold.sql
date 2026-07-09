/* The WWD schedule must start at the earliest eligible layer SKU threshold, not the earliest current buy flag. */

WITH expected AS (
    SELECT MIN(reorder_by_date) AS next_order_date
    FROM {{ ref('mart_inventory_reorder_recommendations') }}
    WHERE policy_bucket != 'NO_ACTION_OR_ARCHIVE'
      AND preferred_vendor = 'WWD'
      AND requires_manual_review = FALSE
      AND COALESCE(six_pack_units_per_layer, 0) > 0
      AND reorder_by_date IS NOT NULL
      AND actionable_forecast_daily_profile IS NOT NULL
),

actual AS (
    SELECT MIN(next_order_date) AS next_order_date
    FROM {{ ref('mart_wwd_pallet_order_plan') }}
)

SELECT
    expected.next_order_date AS expected_next_order_date,
    actual.next_order_date AS actual_next_order_date
FROM expected
CROSS JOIN actual
WHERE expected.next_order_date IS DISTINCT FROM actual.next_order_date
