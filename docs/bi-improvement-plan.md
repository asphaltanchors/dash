# BI Improvement Plan

Created: 2026-07-03

This plan tracks improvements to the BI pipeline and dashboard. The system should remain a read-only view over business data. It should support automation and growth decisions, but it should not become an outreach, marketing execution, or operational write-back tool.

## Business Goals

1. Automate the business as much as possible by surfacing reliable operational decisions, especially inventory, replenishment, cash flow, and data quality.
2. Drive growth by making the best accounts, products, channels, and follow-up opportunities visible from existing data.

## Data-Backed Findings

- Current/past orders: 16,066 orders and $9.01M revenue.
- Inventory is fresh as of 2026-07-03.
- 2026 YTD revenue is $1.02M versus $819K for the same 2025 period, with slightly fewer orders. Growth is driven by AOV and order mix, not order count.
- `analytics_mart.fct_orders` includes two future McCue invoices worth $59.3K through 2026-08-28.
- `analytics_mart.base_fct_orders_current` already excludes future orders, but most dashboard queries still hit `fct_orders` directly.
- Top 10 corporate accounts represent 43.7% of corporate revenue; top 50 represent 71.0%.
- Trailing-year marketing attribution covers about 32% of orders, so attribution views need explicit coverage and unknown handling.
- Inventory planning currently has 23 reorder SKUs and about $59.7K suggested buy cost.
- Product revenue is concentrated in SP58, SP10, SP12, and SP18.
- Product and account economics need quantity-weighted margin and discount logic. `actual_margin_amount` and `price_discount_amount` are unit-level fields, not extended totals.
- Sales Performance has hardcoded summary values.
- Drizzle schema includes obsolete inventory tables not present in live Postgres.

## Workstream 1: Current Data Contract

Goal: prevent future-dated orders and mixed-grain tables from contaminating current business metrics.

- [ ] Use `base_fct_orders_current` for current revenue, order, AR, company health, and dashboard metrics.
- [ ] Create `base_fct_order_line_items_current` for current-safe line-item and margin analysis.
- [ ] Keep future-dated orders visible only in backlog, committed demand, and inventory planning contexts.
- [ ] Split AR aging into separate marts for invoice, customer, and bucket grains.
- [ ] Add dbt tests for no future rows in current marts.
- [ ] Add dbt tests for no negative recency or aging fields in current marts.
- [ ] Add dbt tests for stable `order_key` uniqueness at the intended grain.
- [ ] Document which margin and discount fields are unit-level versus extended values.

Acceptance checks:

- Current dashboard totals match `base_fct_orders_current`, not raw `fct_orders`.
- McCue future invoices do not appear in current revenue, AR aging, current DSO, recent orders, or company recency.
- Future invoices still remain visible where they are intentionally useful for committed demand and inventory.

## Workstream 2: Dense Business Cockpit

Goal: replace sparse KPI-card views with a high-density overview that supports discovery.

- [ ] Redesign the home dashboard around compact grids, small multiples, heatmaps, sparklines, and dense tables.
- [ ] Show revenue quality, channel and segment mix, account risk and opportunity, product economics, inventory buys, AR, and data freshness on the first screen.
- [ ] Add a top-level data quality strip for stale marts, future-order count, attribution coverage, and current inventory date.
- [ ] Replace oversized headings and `p-6` card-heavy sections with tighter operational layouts.
- [ ] Standardize numeric alignment, compact table rows, sticky filters, and icon tooltips.
- [ ] Replace emoji markers with lucide icons and accessible tooltips.
- [ ] Remove hardcoded Sales Performance summary values and back them with live queries.

Acceptance checks:

- Desktop first viewport shows more than just KPI cards and one chart.
- Key account, product, inventory, AR, and data freshness signals are visible without drilling into five pages.
- Mobile remains usable through stacked summaries and horizontally scrollable dense tables.

## Workstream 3: Account Attention Queue

Goal: convert existing company health and contact data into a prioritized read-only view of where attention should go.

- [ ] Create `mart_account_attention_queue`.
- [ ] Include high-value at-risk companies.
- [ ] Include growing companies and new large accounts.
- [ ] Include dormant high-value companies.
- [ ] Include declining but still-active accounts.
- [ ] Add the best available contact, with flags for billing, invoice, generic, internal, and likely human contacts.
- [ ] Add reason codes so each row explains why it is in the queue.
- [ ] Add a dense dashboard view with filters for risk, opportunity, recency, revenue tier, and segment.

Useful source tables:

- `dim_company_health`
- `fct_companies`
- `mart_company_period_metrics`
- `fct_company_orders_time_series`
- `dim_customer_contacts`

Acceptance checks:

- Top corporate account concentration is visible.
- At-risk high-value accounts are sortable by lifetime revenue, recent revenue, days since order, and health score.
- Growth opportunity accounts show the reason they are flagged.
- Contact data is shown as read-only support, not as an email-sending workflow.

## Workstream 4: Product Economics and Growth Quality

Goal: expose profitable growth, discount leakage, and product mix, not just revenue.

- [ ] Create `mart_product_growth_quality`.
- [ ] Use quantity-weighted extended margin and discount calculations.
- [ ] Separate merchandise products from shipping, deposits, subtotal lines, and pricing artifacts.
- [ ] Add product family economics: revenue, margin, margin percentage, units, orders, customer count, and inventory exposure.
- [ ] Add SKU-level growth and margin rank.
- [ ] Add customer concentration by SKU and family.
- [ ] Add discount leakage by customer, product, and segment.
- [ ] Update Products page to prioritize economics, inventory posture, and trend quality.

Acceptance checks:

- SP58, SP10, SP12, SP18, Adhesives, AM625, Accessories, and Uncategorized can be compared by revenue and margin.
- Non-product lines no longer distort product rankings.
- Margin values reconcile to quantity-weighted calculations from line items.
- Products can be sorted by revenue, margin dollars, margin percentage, inventory risk, and discount leakage.

## Workstream 5: Inventory Automation Support

Goal: build on the recent inventory work and make reorder decisions auditable.

- [ ] Keep Inventory as a planning cockpit, not a generic product page.
- [ ] Add reorder confidence and policy validation summaries.
- [ ] Surface manual-review flags and why each SKU needs review.
- [ ] Add vendor lead-time reliability and source of lead time.
- [ ] Add inbound PO and future receipt visibility by SKU and vendor.
- [ ] Add stockout timeline and reorder-by timeline.
- [ ] Separate WWD, FBA, adhesives, packaging, accessories, and other vendor work.
- [ ] Add inventory data quality checks for obsolete SKUs, suppressed SKUs, future receipts, and outlier-driven demand.

Acceptance checks:

- The user can answer what to buy, why, how confident the model is, and what needs manual review.
- Suggested buy cost and WWD layer-adjusted quantities are visible.
- Inventory freshness is always visible.

## Workstream 6: Marketing and Growth Readout

Goal: help evaluate growth channels and repeat-purchase opportunities without turning the repo into a marketing tool.

- [ ] Add attribution coverage as a first-class metric.
- [ ] Show attributed versus unattributed revenue and orders.
- [ ] Use `mart_marketing_performance` where possible instead of repeated runtime aggregation.
- [ ] Show channel, campaign, landing page, and referrer performance.
- [ ] Add subscriber and Shopify customer status readouts from `fct_customer_marketing`.
- [ ] Add high-LTV, at-risk, and churned Shopify customer segments as read-only lists.
- [ ] Make unknown attribution explicit rather than hiding it.

Acceptance checks:

- The Marketing Attribution page states what share of orders and revenue are attributed.
- Unknown and missing attribution are visible.
- Campaign and channel tables reconcile to `fct_order_attribution` and `mart_marketing_performance`.

## Workstream 7: Cash Flow and Collections

Goal: make AR reliable and avoid double-counting mixed-grain summary rows.

- [ ] Split AR invoice, customer, and bucket summary marts.
- [ ] Exclude future invoices from current AR and DSO.
- [ ] Add a separate committed/future invoice section.
- [ ] Show largest open balances, overdue balances, and collection risk.
- [ ] Add DSO trend over 30, 60, and 90 day periods.
- [ ] Add customer-segment AR breakdown without mixing summary and invoice rows.

Acceptance checks:

- AR summaries do not double-count invoice and summary rows.
- Current DSO does not include future invoices.
- Problem accounts table shows only invoice-grain records.

## Workstream 8: Schema, Query, and UI Hygiene

Goal: reduce drift between dbt, Postgres, Drizzle, and the dashboard.

- [ ] Regenerate Drizzle schema from live Postgres.
- [ ] Remove obsolete `fct_inventory_simulation` and `fct_inventory_forecast` types unless the tables are restored.
- [ ] Replace raw `fct_orders` dashboard query paths with current-safe models where appropriate.
- [ ] Add query modules for `business-cockpit.ts`, `account-attention.ts`, and `growth-quality.ts`.
- [ ] Replace hardcoded page summaries with query-backed values.
- [ ] Add clear comments only where grain or unit math is non-obvious.
- [ ] Keep app logic read-only.

Acceptance checks:

- `npm run lint` passes.
- `npm run build` passes.
- Dashboard totals reconcile with SQL spot checks.
- No current dashboard query accidentally includes future-dated orders unless explicitly labeled.

## Proposed dbt Models

- [ ] `base_fct_order_line_items_current`
- [ ] `mart_business_cockpit_summary`
- [ ] `mart_account_attention_queue`
- [ ] `mart_product_growth_quality`
- [ ] `mart_ar_invoice_aging`
- [ ] `mart_ar_customer_summary`
- [ ] `mart_ar_bucket_summary`
- [ ] `mart_data_quality_flags`

## Proposed Dashboard Query Modules

- [ ] `dashboard/lib/queries/business-cockpit.ts`
- [ ] `dashboard/lib/queries/account-attention.ts`
- [ ] `dashboard/lib/queries/growth-quality.ts`

## Validation Plan

- [ ] Run targeted `dbt build` for changed marts and their parents.
- [ ] Add dbt tests for current-date filtering, AR grain separation, uniqueness, accepted values, and no negative recency or aging fields.
- [ ] Reconcile dashboard totals against SQL checks for YTD, trailing 365, AR, inventory, channel, product family, and account concentration.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Verify dense layouts with desktop and mobile screenshots.
- [ ] Confirm no overlapping text, no stale hardcoded metrics, and no hidden future-data leakage.

## Implementation Order

1. Fix current-data contract and AR grain problems.
2. Replace hardcoded and future-leaking dashboard queries.
3. Build the dense business cockpit on current-safe marts.
4. Build account attention queue.
5. Build product growth quality view.
6. Expand inventory cockpit and marketing readouts.
7. Regenerate schema, validate, and document final metric definitions.

## Assumptions

- The dashboard remains read-only.
- Current business metrics exclude future-dated orders.
- Future-dated orders remain available for backlog, committed demand, and inventory planning.
- Desktop density is prioritized, while mobile remains usable.
- dbt remains the source of truth for reusable business logic.
