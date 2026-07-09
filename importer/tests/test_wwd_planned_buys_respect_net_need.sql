/* Pallet lines may round to a layer, but they must have real need and cannot exceed their calculated layer headroom. */

SELECT
    sku,
    order_role,
    planned_net_need_qty,
    max_candidate_layer_count,
    planned_layer_count
FROM {{ ref('mart_wwd_pallet_order_plan') }}
WHERE planned_net_need_qty <= 0
   OR planned_layer_count <= 0
   OR planned_layer_count > max_candidate_layer_count
