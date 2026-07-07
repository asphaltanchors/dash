# Inventory Forecasting and Reorder Planning

## Goal

Answer the business question: **when and how much do we need to reorder?**

The first useful version should be auditable rather than mathematically fancy. It should explain why a SKU is flagged, what demand signal was used, what inventory position it used, and how confident the recommendation is.

## Current Findings

- QuickBooks item imports provide a trusted current inventory snapshot, but not a multi-year observed inventory history.
- `fct_inventory_history` now reconstructs recent inventory from `int_quickbooks__inventory_movements`, using QuickBooks item snapshots as anchors. It includes sales, bill receipts, inventory adjustments, build assembly production, and build component consumption. This remains a reconstructed estimate, not observed historical stock.
- QuickBooks quantity-on-hand can include future-dated receipts. The mart now exposes both raw QuickBooks QOH and adjusted anchor QOH after removing future-dated receipt quantities.
- Dashboard-facing inventory planning uses the latest available inventory snapshot date rather than assuming `CURRENT_DATE`, because imports run roughly every two weeks.
- FBA inventory is a separate replenishment problem. FBA SKUs are represented as separate items and FBA transfers are visible in inventory adjustments as positive FBA SKU adjustments and negative source SKU adjustments.
- Broad family-level seasonality is too blunt. The first forecast refinement now falls back from SKU seasonality to family/material seasonality when SKU-level history is not strong enough.
- Outlier orders are real and should be marked separately so one-off enterprise/custom orders do not automatically become recurring forecast. The reorder mart now caps demand contribution at the sales-line level and exposes capped-vs-uncapped demand.
- SKU policy classification is now explicit and audited. Policy rows include assignment reasons, validation status, and review flags for suppressed active SKUs, outlier-driven SKUs, FBA transfer signals outside FBA buckets, and component/assembly mismatches.

## Modeling Principles

1. Use the latest QuickBooks item snapshot as the trusted current stock position.
2. Use sales history for demand forecasting, not reconstructed historical inventory.
3. Use reconstructed inventory only for recent sanity checks and for movement explainability.
4. Treat warehouse replenishment and FBA replenishment separately.
5. Classify SKUs into policy buckets before forecasting. Not every SKU should receive the same model.
6. Prefer SKU-level seasonality when history supports it; otherwise use variant-level fallback, then family/global fallback.
7. Include committed/future-dated orders as a separate demand component instead of silently reducing on-hand inventory.

## SKU Policy Buckets

| Bucket | Purpose | Forecast Source |
| --- | --- | --- |
| `SKU_SEASONAL_TREND_MODEL` | Mature active SKUs with enough monthly history | SKU-level trend and seasonality |
| `SKU_BASELINE_VARIANT_SEASONAL_MODEL` | Active SKUs with moderate history | SKU baseline plus family/material seasonality |
| `ASSEMBLY_FINISHED_GOOD_MODEL` | Kits and QuickBooks inventory assemblies | Finished-good sales plus build production |
| `FBA_REPLENISHMENT_MODEL` | Amazon FBA stock planning | Amazon-channel sales and FBA transfer history |
| `COMPONENT_PACKAGING_MODEL` | Components, labels, bags, cartons, packaging | Build assembly component consumption |
| `SPARSE_OR_NEW_SKU_BASELINE_MODEL` | New or sparse-demand SKUs with recent observed sales | Low-confidence recent velocity forecast |
| `STOCKED_NO_RECENT_DEMAND_REVIEW` | Inventory with little recent demand | Hold/review, do not auto-reorder |
| `NO_ACTION_OR_ARCHIVE` | No stock and no useful demand signal | Exclude from reorder planning |

## Target Mart Shape

Final reorder model grain: one row per reorder-relevant SKU per latest inventory snapshot.

| Column | Meaning |
| --- | --- |
| `sku` | QuickBooks item/SKU |
| `inventory_as_of_date` | Latest trusted snapshot date |
| `policy_bucket` | Forecast/reorder policy bucket |
| `forecast_method` | Human-readable method used for the SKU |
| `forecast_model_detail` | Specific forecast path used: SKU seasonality, family/material fallback, capped baseline, sparse review, component consumption, or no automatic forecast |
| `current_on_hand_qty` | Latest trusted QuickBooks quantity on hand |
| `committed_demand_qty` | Future-dated or open committed demand considered separately from on-hand |
| `inbound_qty` | Open PO/inbound quantity considered in stock position |
| `available_position_qty` | On-hand plus inbound minus committed demand |
| `forecast_daily_qty` | Baseline demand rate |
| `sku_baseline_monthly_qty` | Capped monthly SKU baseline before seasonality and growth |
| `applied_seasonality_index` | Seasonality multiplier used by the chosen forecast path |
| `applied_growth_factor` | Clamped growth multiplier used by the chosen forecast path |
| `capped_sales_qty_12m` | Last 12 complete months of demand after line-level outlier capping |
| `uncapped_sales_qty_12m` | Last 12 complete months of raw demand before capping |
| `capped_reduction_qty_12m` | Demand removed by the outlier cap |
| `forecast_lead_time_qty` | Demand expected over replenishment lead time |
| `expected_receipt_date` | Date replenishment is expected to arrive based on the selected SKU/vendor or policy lead time |
| `uncovered_lead_time_demand_qty` | Expected demand before receipt that current stock plus due-by-receipt inbound may not cover |
| `stockout_gap_qty` | Dashboard-friendly alias for uncovered lead-time demand: “we may miss X units before replenishment arrives” |
| `safety_stock_qty` | Buffer based on volatility/confidence |
| `reorder_point_qty` | Lead-time demand plus safety stock |
| `reorder_qty` | Quantity needed to reach target coverage |
| `reorder_by_date` | Latest date to place/trigger replenishment |
| `confidence_level` | High/medium/low/manual-review |
| `recommendation_reason` | Compact explanation for dashboard display |

## Implementation Phases

### Phase 1: Make Current State Reliable

- [x] Fix dashboard queries to use `max(inventory_date)` rather than `CURRENT_DATE`.
- [x] Add a reusable inventory movement model that unions sales, receipts, adjustments, build production, build component consumption, and FBA transfer signals.
- [x] Add a SKU policy classification model so future forecast logic can route SKUs deliberately.
- [x] Suppress non-actionable SKUs from automatic planning while preserving reason codes.

### Phase 2: Improve Inventory Reconstruction

- [x] Update `fct_inventory_history` to use `int_quickbooks__inventory_movements`.
- [x] Include build assembly production and component consumption.
- [x] Keep future committed demand separate from actual stock movement.
- [x] Remove future-dated receipts embedded in QuickBooks QOH from anchor stock.
- [ ] Add formal data tests for recent reconstructed history, especially from `2024-01-01` forward.
- [ ] Review negative reconstructed inventory cases by policy bucket and decide which are source-data issues vs model issues.

### Phase 3: First Reorder Mart

- [x] Build a first reorder recommendation mart using:
  - latest trusted stock,
  - policy bucket,
  - recent demand baseline,
  - seasonality-aware forecast baseline,
  - inbound POs,
  - committed demand,
  - conservative default lead times.
- [x] Start with auditable rules and measured confidence; avoid opaque forecasting until the basics are stable.
- [x] Add dashboard worklist visibility for policy bucket, forecast basis, inventory position, inbound quantity, and recommendation reason.
- [x] Add policy validation fields so suspicious classifications surface as review work.

### Phase 4: Seasonal Forecast Refinement

- [x] Add SKU-level monthly seasonal indices for mature SKUs.
- [x] Add family/material fallback seasonal indices.
- [x] Add outlier detection and capped demand contribution.
- [x] Add conservative growth trend adjustment from recent 12-month demand vs prior 12 months.
- [x] Add SKU-level rolling lead-time demand percentiles for variability-aware safety stock.
- [x] Expose forecast model detail, baseline, seasonality, growth, and capped-demand audit fields in the reorder mart and dashboard worklist.
- [ ] Add new-product/analog-SKU overrides where needed.
- [ ] Tune seasonality and growth clamps after reviewing SKU-level outputs with the business.
- [ ] Consider moving forecast inputs into a dedicated intermediate model if the reorder mart becomes too large to maintain cleanly.

### Phase 5: FBA Planning

- [x] Classify FBA SKUs into `FBA_REPLENISHMENT_MODEL`.
- [ ] Model FBA SKUs separately from warehouse SKUs.
- [ ] Forecast Amazon demand from Amazon/FBA sales.
- [ ] Recommend FBA transfer quantities.
- [ ] Feed FBA transfer demand back into warehouse stock planning for the source SKU.

### Phase 6: Planning Inputs and Order Constraints

- [x] Add first SKU/vendor planning inputs for lead time, including configured overrides and observed SKU/vendor or vendor medians where available.
- [x] Replace hard-coded forecast month with lead-time-aware expected receipt month.
- [x] Calculate reorder quantity against projected stock at expected receipt date rather than today’s stock position.
- [x] Surface uncovered lead-time demand / stockout gap for dashboard messaging.
- [x] Replace the mature seasonal SKU hard-coded 120-day target with an observed SKU/vendor PO-cycle target when enough order history exists.
- [ ] Add SKU/vendor planning inputs for MOQ, order multiple, case pack, and broader preferred vendor coverage.
- [x] Add simple WWD layer multiples for key 6-pack anchor SKUs and expose layer-rounded suggested buy quantities.
- [ ] Replace remaining hard-coded target coverage assumptions with SKU/family/vendor overrides.
- [ ] Apply order multiple and MOQ rounding to reorder quantities.
- [ ] Surface vendor and order constraint context in the worklist.

## Near-Term Validation

- Annual sales vs receipts vs adjustments should remain explainable by SKU group.
- Recent inventory reconstruction from `2024-01-01` should avoid unexplained negative inventory for mature SKUs, assemblies, and FBA SKUs.
- Policy bucket counts should be stable and reviewed by humans before auto-order logic is trusted.
- Dashboard should always show an explicit inventory "as of" date.
- Forecast model distribution should be reviewed after each major logic change:
  - mature SKUs should mostly use `sku_seasonality_with_growth`,
  - moderate SKUs, assemblies, and FBA SKUs should use family/material fallback when available,
  - component SKUs should use component consumption,
  - sparse and suppressed SKUs should not silently become automatic buys.
- Outlier capping should be audited with `capped_reduction_qty_12m` to make sure large real recurring customers are not under-forecast.

## Current Status

Phase 1 is complete for the current scope.

Phase 2 is mostly complete. The reconstruction layer now uses normalized movements and includes build/component activity. Remaining work is validation and cleanup around negative reconstructed balances.

Phase 3 is complete as an auditable first reorder mart and dashboard worklist.

Phase 4 has its first real implementation: capped demand, SKU seasonality, family/material fallback, and growth trend are now in the reorder mart. The next work is review and tuning, not more hidden math.

Phase 6 has started. The reorder mart now selects lead time from configured SKU/vendor overrides, observed SKU/vendor medians, observed vendor medians, or policy defaults. Forecast month and reorder sizing use the expected receipt date. Remaining Phase 6 work is MOQ, order multiple, case pack, fuller preferred-vendor coverage, and target coverage overrides.
