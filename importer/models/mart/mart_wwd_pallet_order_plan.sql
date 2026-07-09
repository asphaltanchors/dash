/*
ABOUTME: Forward-scheduled regular WWD pallet order from the SKU reorder mart.
ABOUTME: Recalculates net SKU need at the shared trigger date, then fills only within real projected demand headroom.
*/

{{ config(
    materialized = 'table',
    tags = ['inventory', 'reorder_planning', 'wwd']
) }}

WITH parameters AS (
    SELECT
        7::INT AS layers_per_pallet,
        2::INT AS target_pallets,
        14::INT AS target_layer_count
),

eligible AS (
    SELECT
        r.*,
        p.layers_per_pallet,
        p.target_pallets,
        p.target_layer_count
    FROM {{ ref('mart_inventory_reorder_recommendations') }} r
    CROSS JOIN parameters p
    WHERE r.policy_bucket != 'NO_ACTION_OR_ARCHIVE'
      AND r.preferred_vendor = 'WWD'
      AND r.requires_manual_review = FALSE
      AND COALESCE(r.six_pack_units_per_layer, 0) > 0
      AND r.reorder_by_date IS NOT NULL
      AND r.actionable_forecast_daily_profile IS NOT NULL
),

next_trigger AS (
    SELECT
        reorder_by_date AS next_order_date,
        inventory_as_of_date,
        sku AS trigger_sku
    FROM eligible
    ORDER BY reorder_by_date, sku
    LIMIT 1
),

planning_horizon_days AS (
    SELECT
        e.sku,
        nt.next_order_date,
        planning_date::DATE AS planning_date,
        COALESCE(
            NULLIF(
                e.actionable_forecast_daily_profile
                  ->> EXTRACT(MONTH FROM planning_date)::INT::TEXT,
                ''
            )::NUMERIC,
            e.actionable_forecast_daily_qty,
            0
        ) AS actionable_forecast_qty
    FROM eligible e
    CROSS JOIN next_trigger nt
    CROSS JOIN LATERAL GENERATE_SERIES(
        e.inventory_as_of_date + 1,
        nt.next_order_date + e.assumed_lead_time_days + e.target_coverage_days,
        INTERVAL '1 day'
    ) AS dates(planning_date)
),

planned_horizons AS (
    SELECT
        e.sku,
        nt.next_order_date,
        nt.next_order_date + e.assumed_lead_time_days AS planned_expected_receipt_date,
        COALESCE(SUM(phd.actionable_forecast_qty) FILTER (
            WHERE phd.planning_date <= nt.next_order_date
        ), 0) AS forecast_qty_before_planned_order,
        COALESCE(SUM(phd.actionable_forecast_qty) FILTER (
            WHERE phd.planning_date > nt.next_order_date
              AND phd.planning_date <= nt.next_order_date + e.assumed_lead_time_days
        ), 0) AS forecast_qty_during_planned_lead_time,
        COALESCE(SUM(phd.actionable_forecast_qty) FILTER (
            WHERE phd.planning_date > nt.next_order_date + e.assumed_lead_time_days
        ), 0) AS forecast_qty_during_target_coverage
    FROM eligible e
    CROSS JOIN next_trigger nt
    LEFT JOIN planning_horizon_days phd
        ON e.sku = phd.sku
    GROUP BY e.sku, nt.next_order_date, e.assumed_lead_time_days
),

planned_positions AS (
    SELECT
        e.*,
        ph.next_order_date,
        ph.planned_expected_receipt_date,
        ph.forecast_qty_before_planned_order,
        ph.forecast_qty_during_planned_lead_time,
        ph.forecast_qty_during_target_coverage,
        e.available_position_qty
          - ph.forecast_qty_before_planned_order AS projected_position_at_planned_order_qty,
        e.available_position_qty
          - ph.forecast_qty_before_planned_order
          - ph.forecast_qty_during_planned_lead_time AS projected_position_at_planned_receipt_qty,
        GREATEST(
            0,
            ph.forecast_qty_during_target_coverage
              + e.safety_stock_qty
              - GREATEST(
                    0,
                    e.available_position_qty
                      - ph.forecast_qty_before_planned_order
                      - ph.forecast_qty_during_planned_lead_time
                )
        ) AS planned_net_need_qty
    FROM eligible e
    INNER JOIN planned_horizons ph
        ON e.sku = ph.sku
),

candidates AS (
    SELECT
        pp.*,
        CEIL(pp.planned_net_need_qty / pp.six_pack_units_per_layer) AS max_candidate_layer_count,
        pp.forecast_qty_during_target_coverage / pp.six_pack_units_per_layer AS ride_along_demand_score
    FROM planned_positions pp
    WHERE pp.planned_net_need_qty > 0
),

trigger_items AS (
    SELECT
        c.*,
        0 AS role_sort,
        'TRIGGER'::TEXT AS order_role,
        FALSE AS is_ride_along,
        c.max_candidate_layer_count AS planned_layer_count
    FROM candidates c
    WHERE c.reorder_by_date <= c.next_order_date
),

trigger_summary AS (
    SELECT
        COALESCE(SUM(planned_layer_count), 0) AS trigger_layer_count
    FROM trigger_items
),

remaining_need AS (
    SELECT
        GREATEST(0, p.target_layer_count - ts.trigger_layer_count) AS remaining_layer_count
    FROM parameters p
    CROSS JOIN trigger_summary ts
),

ride_along_candidates AS (
    SELECT
        c.*,
        SUM(c.max_candidate_layer_count) OVER (
            ORDER BY c.ride_along_demand_score DESC, c.reorder_by_date, c.sku
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS running_layer_capacity
    FROM candidates c
    WHERE NOT EXISTS (
        SELECT 1
        FROM trigger_items ti
        WHERE ti.sku = c.sku
    )
),

filler_pool AS (
    SELECT rac.*
    FROM ride_along_candidates rac
    CROSS JOIN remaining_need rn
    WHERE rn.remaining_layer_count > 0
      AND rac.running_layer_capacity - rac.max_candidate_layer_count < rn.remaining_layer_count
),

raw_allocations AS (
    SELECT
        fp.*,
        rn.remaining_layer_count,
        SUM(fp.ride_along_demand_score) OVER () AS total_demand_score,
        CASE
            WHEN SUM(fp.ride_along_demand_score) OVER () > 0
                THEN rn.remaining_layer_count * fp.ride_along_demand_score / SUM(fp.ride_along_demand_score) OVER ()
            ELSE rn.remaining_layer_count::NUMERIC / NULLIF(COUNT(*) OVER (), 0)
        END AS raw_layer_allocation
    FROM filler_pool fp
    CROSS JOIN remaining_need rn
),

floor_allocations AS (
    SELECT
        *,
        LEAST(max_candidate_layer_count, FLOOR(raw_layer_allocation)) AS floor_layer_allocation
    FROM raw_allocations
),

allocation_remainder AS (
    SELECT
        GREATEST(0, MAX(remaining_layer_count) - COALESCE(SUM(floor_layer_allocation), 0)) AS layers_left_to_assign
    FROM floor_allocations
),

remainder_ranked AS (
    SELECT
        fa.*,
        ROW_NUMBER() OVER (
            ORDER BY
                (fa.raw_layer_allocation - fa.floor_layer_allocation) DESC,
                fa.ride_along_demand_score DESC,
                fa.sku
        ) AS remainder_rank
    FROM floor_allocations fa
    WHERE fa.floor_layer_allocation < fa.max_candidate_layer_count
),

ride_along_allocations AS (
    SELECT
        fa.sku,
        fa.floor_layer_allocation
          + CASE
                WHEN rr.remainder_rank <= ar.layers_left_to_assign THEN 1
                ELSE 0
            END AS planned_layer_count
    FROM floor_allocations fa
    CROSS JOIN allocation_remainder ar
    LEFT JOIN remainder_ranked rr
        ON fa.sku = rr.sku
),

ride_along_items AS (
    SELECT
        c.*,
        1 AS role_sort,
        'RIDE_ALONG'::TEXT AS order_role,
        TRUE AS is_ride_along,
        ra.planned_layer_count
    FROM candidates c
    INNER JOIN ride_along_allocations ra
        ON c.sku = ra.sku
       AND ra.planned_layer_count > 0
),

order_items AS (
    SELECT * FROM trigger_items
    UNION ALL
    SELECT * FROM ride_along_items
),

final AS (
    SELECT
        MD5(next_order_date::TEXT || '|' || sku) AS wwd_pallet_order_plan_id,
        inventory_as_of_date,
        next_order_date,
        planned_expected_receipt_date,
        target_pallets,
        layers_per_pallet,
        target_layer_count,
        ROW_NUMBER() OVER (
            ORDER BY role_sort, ride_along_demand_score DESC, reorder_by_date, sku
        ) AS order_sequence,
        order_role,
        is_ride_along,
        sku,
        sales_description,
        product_family,
        material_type,
        reorder_by_date,
        should_reorder,
        current_on_hand_qty,
        available_position_qty,
        inbound_open_po_qty,
        future_receipt_qty_after_anchor,
        forecast_daily_qty,
        actionable_forecast_daily_qty,
        forecast_qty_before_planned_order,
        forecast_qty_during_planned_lead_time,
        forecast_qty_during_target_coverage,
        projected_position_at_planned_order_qty,
        projected_position_at_planned_receipt_qty,
        planned_net_need_qty,
        ride_along_demand_score,
        six_pack_units_per_layer,
        max_candidate_layer_count,
        planned_layer_count,
        planned_layer_count * six_pack_units_per_layer AS planned_buy_qty,
        purchase_cost,
        planned_layer_count * six_pack_units_per_layer * COALESCE(purchase_cost, 0) AS planned_buy_cost,
        SUM(planned_layer_count) OVER () AS total_planned_layer_count,
        SUM(planned_layer_count * six_pack_units_per_layer) OVER () AS total_planned_buy_qty,
        SUM(planned_layer_count * six_pack_units_per_layer * COALESCE(purchase_cost, 0)) OVER () AS total_planned_buy_cost,
        SUM(CASE WHEN is_ride_along THEN 0 ELSE planned_layer_count END) OVER () AS trigger_layer_count,
        COUNT(*) FILTER (WHERE is_ride_along = FALSE) OVER () AS trigger_sku_count,
        COUNT(*) FILTER (WHERE is_ride_along = TRUE) OVER () AS ride_along_sku_count,
        CURRENT_TIMESTAMP AS created_at
    FROM order_items
)

SELECT *
FROM final
