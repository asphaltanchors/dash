// ABOUTME: Inventory planning queries for the inventory management page.
// ABOUTME: Presents operational stock, inbound, forecast, and buy recommendation fields.
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

function formatDate(value: string | Date | null): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value.split('T')[0] : value.toISOString().split('T')[0];
}

function formatNumber(value: string | number | null | undefined, decimals = 0): string {
  return Number(value || 0).toFixed(decimals);
}

type InventoryAction = 'OUT_OF_STOCK' | 'BUY' | 'REVIEW' | 'WATCH' | 'OK';

export interface InventoryPlanningSummary {
  inventoryAsOfDate: string;
  currentOnHandValueAtCost: string;
  totalSkus: number;
  outOfStockCount: number;
  buyCount: number;
  reviewCount: number;
  wwdSkuCount: number;
  wwdBuyCount: number;
  wwdSuggestedBuyQty: string;
  wwdSuggestedBuyCost: string;
  suggestedBuyQty: string;
  suggestedBuyCost: string;
  inboundQty: string;
  futureReceiptQty: string;
  inboundDocumentCount: number;
  openPoDocumentCount: number;
  futureReceiptDocumentCount: number;
}

export interface WwdPalletPlanItem {
  sku: string;
  salesDescription: string;
  productFamily: string;
  reorderByDate: string | null;
  shouldReorder: boolean;
  currentLayerCount: string;
  plannedLayerCount: string;
  plannedBuyQty: string;
  purchaseCost: string;
  plannedBuyCost: string;
  isRideAlong: boolean;
}

export interface WwdPalletPlan {
  layersPerPallet: number;
  targetPallets: number;
  targetLayerCount: number;
  nextOrderDate: string | null;
  cumulativeLayerCount: string;
  plannedBuyQty: string;
  plannedBuyCost: string;
  urgentLayerCount: string;
  urgentSkuCount: number;
  rideAlongSkuCount: number;
  rideAlongItems: WwdPalletPlanItem[];
  orderItems: WwdPalletPlanItem[];
}

export interface InventoryPlanningItem {
  sku: string;
  preferredVendor: string;
  salesDescription: string;
  productFamily: string;
  materialType: string;
  action: InventoryAction;
  shouldReorder: boolean;
  requiresManualReview: boolean;
  policyBucket: string;
  policyAssignmentReason: string;
  policyValidationStatus: string;
  policyReviewFlags: string;
  forecastMethod: string;
  forecastModelDetail: string;
  confidenceLevel: string;
  inventoryStatus: string;
  onHandQty: string;
  inboundOpenPoQty: string;
  openPoLineCount: number;
  nextOpenPoDate: string | null;
  futureReceiptQty: string;
  futureReceiptLineCount: number;
  availablePositionQty: string;
  forecastDailyQty: string;
  forecastMonthlyQty: string;
  baselineForecastDailyQty: string;
  baselineForecastMonthlyQty: string;
  recentVelocityForecastDailyQty: string;
  recentVelocityForecastMonthlyQty: string;
  recentToBaselineVelocityRatio: string;
  demandSpikeRiskLevel: string;
  demandSpikeReason: string;
  recentSalesQty90dActual: string;
  largestRecentSalesLineQty90d: string;
  recentSalesLineCount90d: number;
  recentOrderCount90d: number;
  recentCustomerCount90d: number;
  recentSalesMonthCount90d: number;
  largestRecentCustomerSalesQty90d: string;
  largestRecentSalesLineShare90d: string;
  largestRecentCustomerSalesShare90d: string;
  skuBaselineMonthlyQty: string;
  appliedSeasonalityIndex: string;
  appliedGrowthFactor: string;
  cappedReductionQty12m: string;
  avgDailySales30d: string;
  avgDailySales90d: string;
  avgDailySales365d: string;
  onHandDays: string;
  positionDays: string;
  stockoutDate: string | null;
  reorderByDate: string | null;
  suggestedBuyQty: string;
  layerRoundedBuyQty: string;
  growthCaseReorderQty: string;
  conservativeReorderQty: string;
  reorderLayerCount: string;
  layerRoundingExtraQty: string;
  sixPackUnitsPerLayer: number | null;
  suggestedBuyCost: string;
  purchaseCost: string;
  safetyStockQty: string;
  reorderPointQty: string;
  targetCoverageDays: number;
  assumedLeadTimeDays: number;
  recommendationReason: string;
}

export interface ProductReorderPlanningDetail extends InventoryPlanningItem {
  inventoryAsOfDate: string;
  expectedReceiptDate: string | null;
  leadTimeSource: string;
  planningOverrideReason: string;
  configuredLeadTimeDays: string;
  observedSkuVendorLeadTimeDays: string;
  observedSkuVendorLeadTimeCount: number;
  observedVendorLeadTimeDays: string;
  observedVendorLeadTimeCount: number;
  defaultPolicyLeadTimeDays: number;
  defaultTargetCoverageDays: number;
  committedDemandQty: string;
  committedDemandBeforeExpectedReceiptQty: string;
  committedOrderCount: number;
  firstCommittedDemandDate: string | null;
  lastCommittedDemandDate: string | null;
  inboundQtyByExpectedReceiptDate: string;
  quickbooksQuantityOnOrder: string;
  forecastLeadTimeQty: string;
  projectedPositionAtExpectedReceiptQty: string;
  uncoveredLeadTimeDemandQty: string;
  stockoutGapQty: string;
  rawReorderQty: string;
  conservativeRawReorderQty: string;
  spikeAdjustedRawReorderQty: string;
  growthCaseReorderQty: string;
  conservativeReorderQty: string;
  baselineForecastLeadTimeQty: string;
  safetyStockSource: string;
  demandVariabilitySource: string;
  policySafetyStockQty: string;
  percentileSafetyStockQty: string;
  variabilitySampleWindows: number;
  variabilityWindowsWithDemand: number;
  avgHistoricalLeadTimeDemandQty: string;
  p50HistoricalLeadTimeDemandQty: string;
  p75HistoricalLeadTimeDemandQty: string;
  p90HistoricalLeadTimeDemandQty: string;
  p95HistoricalLeadTimeDemandQty: string;
  stddevDailySales90d: string;
  p80DailySales90d: string;
  totalSalesQty90d: string;
  daysWithSales90d: number;
  avgMonthlySales36m: string;
  trailing3mAvgMonthlySales: string;
  trailing12mAvgMonthlySales: string;
  prior12mAvgMonthlySales: string;
  cappedSalesQty12m: string;
  uncappedSalesQty12m: string;
  hasLargeOrderOutlier2025: boolean;
}

export interface ProductInboundLine {
  inboundLineId: string;
  inventoryAsOfDate: string;
  sku: string;
  inboundType: 'OPEN_PO' | 'FUTURE_RECEIPT';
  documentNumber: string;
  vendor: string;
  documentDate: string | null;
  expectedOrReceiptDate: string | null;
  quantity: string;
  rate: string;
  amount: string;
  status: string;
  sourceTransactionKey: string;
  quickbooksInternalId: string;
  sourceTransactionId: string;
  inboundNote: string;
}

export interface PriorityBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export interface StockoutTimelineItem {
  stockoutDate: string;
  skuCount: number;
  totalValue: string;
  skus: string[];
}

interface InventoryPlanningRow {
  sku: string | null;
  preferred_vendor: string | null;
  inventory_as_of_date: string | Date | null;
  policy_bucket: string | null;
  policy_assignment_reason: string | null;
  policy_validation_status: string | null;
  policy_review_flags: string | null;
  forecast_method: string | null;
  forecast_model_detail: string | null;
  confidence_level: string | null;
  requires_manual_review: boolean | null;
  should_reorder: boolean | null;
  inventory_status: string | null;
  current_on_hand_qty: string | number | null;
  inbound_open_po_qty: string | number | null;
  open_po_line_count: number | null;
  next_open_po_date: string | Date | null;
  future_receipt_qty_after_anchor: string | number | null;
  future_receipt_line_count_after_anchor: number | null;
  available_position_qty: string | number | null;
  forecast_daily_qty: string | number | null;
  forecast_monthly_qty: string | number | null;
  baseline_forecast_daily_qty: string | number | null;
  baseline_forecast_monthly_qty: string | number | null;
  recent_velocity_forecast_daily_qty: string | number | null;
  recent_velocity_forecast_monthly_qty: string | number | null;
  recent_to_baseline_velocity_ratio: string | number | null;
  demand_spike_risk_level: string | null;
  demand_spike_reason: string | null;
  recent_sales_qty_90d_actual: string | number | null;
  largest_recent_sales_line_qty_90d: string | number | null;
  recent_sales_line_count_90d: number | null;
  recent_order_count_90d: number | null;
  recent_customer_count_90d: number | null;
  recent_sales_month_count_90d: number | null;
  largest_recent_customer_sales_qty_90d: string | number | null;
  largest_recent_sales_line_share_90d: string | number | null;
  largest_recent_customer_sales_share_90d: string | number | null;
  sku_baseline_monthly_qty: string | number | null;
  applied_seasonality_index: string | number | null;
  applied_growth_factor: string | number | null;
  capped_reduction_qty_12m: string | number | null;
  avg_daily_sales_30d: string | number | null;
  avg_daily_sales_90d: string | number | null;
  avg_daily_sales_365d: string | number | null;
  reorder_qty: string | number | null;
  layer_rounded_reorder_qty: string | number | null;
  growth_case_reorder_qty: string | number | null;
  conservative_reorder_qty: string | number | null;
  reorder_layer_count: string | number | null;
  layer_rounding_extra_qty: string | number | null;
  six_pack_units_per_layer: number | null;
  reorder_value_at_cost: string | number | null;
  projected_stockout_or_safety_date: string | Date | null;
  reorder_by_date: string | Date | null;
  assumed_lead_time_days: number | null;
  target_coverage_days: number | null;
  safety_stock_qty: string | number | null;
  reorder_point_qty: string | number | null;
  purchase_cost: string | number | null;
  sales_description: string | null;
  product_family: string | null;
  material_type: string | null;
  recommendation_reason: string | null;
}

interface ProductReorderPlanningRow extends InventoryPlanningRow {
  expected_receipt_date: string | Date | null;
  lead_time_source: string | null;
  planning_override_reason: string | null;
  configured_lead_time_days: string | number | null;
  observed_sku_vendor_lead_time_days: string | number | null;
  observed_sku_vendor_lead_time_count: number | null;
  observed_vendor_lead_time_days: string | number | null;
  observed_vendor_lead_time_count: number | null;
  default_policy_lead_time_days: number | null;
  default_target_coverage_days: number | null;
  committed_demand_qty: string | number | null;
  committed_demand_before_expected_receipt_qty: string | number | null;
  committed_order_count: number | null;
  first_committed_demand_date: string | Date | null;
  last_committed_demand_date: string | Date | null;
  inbound_qty_by_expected_receipt_date: string | number | null;
  quickbooks_quantity_on_order: string | number | null;
  forecast_lead_time_qty: string | number | null;
  baseline_forecast_lead_time_qty: string | number | null;
  projected_position_at_expected_receipt_qty: string | number | null;
  uncovered_lead_time_demand_qty: string | number | null;
  stockout_gap_qty: string | number | null;
  raw_reorder_qty: string | number | null;
  conservative_raw_reorder_qty: string | number | null;
  spike_adjusted_raw_reorder_qty: string | number | null;
  safety_stock_source: string | null;
  demand_variability_source: string | null;
  policy_safety_stock_qty: string | number | null;
  percentile_safety_stock_qty: string | number | null;
  variability_sample_windows: number | null;
  variability_windows_with_demand: number | null;
  avg_historical_lead_time_demand_qty: string | number | null;
  p50_historical_lead_time_demand_qty: string | number | null;
  p75_historical_lead_time_demand_qty: string | number | null;
  p90_historical_lead_time_demand_qty: string | number | null;
  p95_historical_lead_time_demand_qty: string | number | null;
  stddev_daily_sales_90d: string | number | null;
  p80_daily_sales_90d: string | number | null;
  total_sales_qty_90d: string | number | null;
  days_with_sales_90d: number | null;
  avg_monthly_sales_36m: string | number | null;
  trailing_3m_avg_monthly_sales: string | number | null;
  trailing_12m_avg_monthly_sales: string | number | null;
  prior_12m_avg_monthly_sales: string | number | null;
  capped_sales_qty_12m: string | number | null;
  uncapped_sales_qty_12m: string | number | null;
  has_large_order_outlier_2025: boolean | null;
}

interface ProductInboundLineRow {
  inbound_line_id: string | null;
  inventory_as_of_date: string | Date | null;
  sku: string | null;
  inbound_type: 'OPEN_PO' | 'FUTURE_RECEIPT' | null;
  document_number: string | null;
  vendor: string | null;
  document_date: string | Date | null;
  expected_or_receipt_date: string | Date | null;
  quantity: string | number | null;
  rate: string | number | null;
  amount: string | number | null;
  status: string | null;
  source_transaction_key: string | null;
  quickbooks_internal_id: string | null;
  source_transaction_id: string | null;
  inbound_note: string | null;
}

interface WwdPalletPlanRow {
  sku: string | null;
  sales_description: string | null;
  product_family: string | null;
  reorder_by_date: string | Date | null;
  should_reorder: boolean | null;
  reorder_layer_count: string | number | null;
  planned_layer_count: string | number | null;
  planned_buy_qty: string | number | null;
  purchase_cost: string | number | null;
  planned_buy_cost: string | number | null;
  is_ride_along: boolean | null;
  next_order_date: string | Date | null;
  layers_per_pallet: number | null;
  target_pallets: number | null;
  target_layer_count: number | null;
  total_planned_layer_count: string | number | null;
  total_planned_buy_qty: string | number | null;
  total_planned_buy_cost: string | number | null;
  trigger_layer_count: string | number | null;
  trigger_sku_count: number | null;
  ride_along_sku_count: number | null;
  order_sequence: number | null;
}

interface InventoryValueRow {
  inventory_date: string | Date | null;
  current_on_hand_value_at_cost: string | number | null;
}

interface InboundDocumentSummaryRow {
  inbound_document_count: string | number | null;
  open_po_document_count: string | number | null;
  future_receipt_document_count: string | number | null;
}

function getInventoryAction(row: InventoryPlanningRow): InventoryAction {
  const onHandQty = Number(row.current_on_hand_qty || 0);

  if (onHandQty <= 0) return 'OUT_OF_STOCK';
  if (row.policy_validation_status === 'review') return 'REVIEW';
  if (row.requires_manual_review) return 'REVIEW';
  if (row.should_reorder) return 'BUY';
  if (['CRITICAL', 'LOW', 'MODERATE'].includes(row.inventory_status || '')) return 'WATCH';
  return 'OK';
}

function calculateDays(numerator: string | number | null, forecastDailyQty: string | number | null): string {
  const qty = Number(numerator || 0);
  const forecast = Number(forecastDailyQty || 0);

  if (qty <= 0) return '0';
  if (forecast <= 0) return '';
  return Math.floor(qty / forecast).toFixed(0);
}

function mapWwdPalletPlanRow(row: WwdPalletPlanRow): WwdPalletPlanItem {
  return {
    sku: row.sku || '',
    salesDescription: row.sales_description || '',
    productFamily: row.product_family || 'Uncategorized',
    reorderByDate: formatDate(row.reorder_by_date),
    shouldReorder: Boolean(row.should_reorder),
    currentLayerCount: formatNumber(row.reorder_layer_count),
    plannedLayerCount: formatNumber(row.planned_layer_count),
    plannedBuyQty: formatNumber(row.planned_buy_qty),
    purchaseCost: formatNumber(row.purchase_cost, 2),
    plannedBuyCost: formatNumber(row.planned_buy_cost, 2),
    isRideAlong: Boolean(row.is_ride_along),
  };
}

function mapWwdPalletPlan(rows: WwdPalletPlanRow[]): WwdPalletPlan {
  const orderItems = rows.map(mapWwdPalletPlanRow);
  const rideAlongItems = orderItems.filter((item) => item.isRideAlong);
  const firstRow = rows[0];

  return {
    layersPerPallet: Number(firstRow?.layers_per_pallet || 7),
    targetPallets: Number(firstRow?.target_pallets || 2),
    targetLayerCount: Number(firstRow?.target_layer_count || 14),
    nextOrderDate: formatDate(firstRow?.next_order_date || null),
    cumulativeLayerCount: formatNumber(firstRow?.total_planned_layer_count),
    plannedBuyQty: formatNumber(firstRow?.total_planned_buy_qty),
    plannedBuyCost: formatNumber(firstRow?.total_planned_buy_cost, 2),
    urgentLayerCount: formatNumber(firstRow?.trigger_layer_count),
    urgentSkuCount: Number(firstRow?.trigger_sku_count || 0),
    rideAlongSkuCount: Number(firstRow?.ride_along_sku_count || rideAlongItems.length),
    rideAlongItems,
    orderItems,
  };
}

function mapPlanningRow(row: InventoryPlanningRow): InventoryPlanningItem {
  const action = getInventoryAction(row);

  return {
    sku: row.sku || '',
    preferredVendor: row.preferred_vendor || 'Unassigned',
    salesDescription: row.sales_description || '',
    productFamily: row.product_family || 'Uncategorized',
    materialType: row.material_type || 'Uncategorized',
    action,
    shouldReorder: Boolean(row.should_reorder),
    requiresManualReview: Boolean(row.requires_manual_review),
    policyBucket: row.policy_bucket || 'UNKNOWN',
    policyAssignmentReason: row.policy_assignment_reason || '',
    policyValidationStatus: row.policy_validation_status || 'ok',
    policyReviewFlags: row.policy_review_flags || '',
    forecastMethod: row.forecast_method || 'unknown',
    forecastModelDetail: row.forecast_model_detail || 'unknown',
    confidenceLevel: row.confidence_level || 'unknown',
    inventoryStatus: row.inventory_status || 'UNKNOWN',
    onHandQty: formatNumber(row.current_on_hand_qty),
    inboundOpenPoQty: formatNumber(row.inbound_open_po_qty),
    openPoLineCount: Number(row.open_po_line_count || 0),
    nextOpenPoDate: formatDate(row.next_open_po_date),
    futureReceiptQty: formatNumber(row.future_receipt_qty_after_anchor),
    futureReceiptLineCount: Number(row.future_receipt_line_count_after_anchor || 0),
    availablePositionQty: formatNumber(row.available_position_qty),
    forecastDailyQty: formatNumber(row.forecast_daily_qty, 1),
    forecastMonthlyQty: formatNumber(row.forecast_monthly_qty),
    baselineForecastDailyQty: formatNumber(row.baseline_forecast_daily_qty, 1),
    baselineForecastMonthlyQty: formatNumber(row.baseline_forecast_monthly_qty),
    recentVelocityForecastDailyQty: formatNumber(row.recent_velocity_forecast_daily_qty, 1),
    recentVelocityForecastMonthlyQty: formatNumber(row.recent_velocity_forecast_monthly_qty),
    recentToBaselineVelocityRatio: formatNumber(row.recent_to_baseline_velocity_ratio, 2),
    demandSpikeRiskLevel: row.demand_spike_risk_level || 'none',
    demandSpikeReason: row.demand_spike_reason || '',
    recentSalesQty90dActual: formatNumber(row.recent_sales_qty_90d_actual),
    largestRecentSalesLineQty90d: formatNumber(row.largest_recent_sales_line_qty_90d),
    recentSalesLineCount90d: Number(row.recent_sales_line_count_90d || 0),
    recentOrderCount90d: Number(row.recent_order_count_90d || 0),
    recentCustomerCount90d: Number(row.recent_customer_count_90d || 0),
    recentSalesMonthCount90d: Number(row.recent_sales_month_count_90d || 0),
    largestRecentCustomerSalesQty90d: formatNumber(row.largest_recent_customer_sales_qty_90d),
    largestRecentSalesLineShare90d: formatNumber(Number(row.largest_recent_sales_line_share_90d || 0) * 100),
    largestRecentCustomerSalesShare90d: formatNumber(Number(row.largest_recent_customer_sales_share_90d || 0) * 100),
    skuBaselineMonthlyQty: formatNumber(row.sku_baseline_monthly_qty),
    appliedSeasonalityIndex: formatNumber(row.applied_seasonality_index, 2),
    appliedGrowthFactor: formatNumber(row.applied_growth_factor, 2),
    cappedReductionQty12m: formatNumber(row.capped_reduction_qty_12m),
    avgDailySales30d: formatNumber(row.avg_daily_sales_30d, 1),
    avgDailySales90d: formatNumber(row.avg_daily_sales_90d, 1),
    avgDailySales365d: formatNumber(row.avg_daily_sales_365d, 1),
    onHandDays: calculateDays(row.current_on_hand_qty, row.forecast_daily_qty),
    positionDays: calculateDays(row.available_position_qty, row.forecast_daily_qty),
    stockoutDate: formatDate(row.projected_stockout_or_safety_date),
    reorderByDate: formatDate(row.reorder_by_date),
    suggestedBuyQty: formatNumber(row.reorder_qty),
    layerRoundedBuyQty: formatNumber(row.layer_rounded_reorder_qty),
    growthCaseReorderQty: formatNumber(row.growth_case_reorder_qty),
    conservativeReorderQty: formatNumber(row.conservative_reorder_qty),
    reorderLayerCount: formatNumber(row.reorder_layer_count),
    layerRoundingExtraQty: formatNumber(row.layer_rounding_extra_qty),
    sixPackUnitsPerLayer: row.six_pack_units_per_layer == null ? null : Number(row.six_pack_units_per_layer),
    suggestedBuyCost: formatNumber(row.reorder_value_at_cost, 2),
    purchaseCost: formatNumber(row.purchase_cost, 2),
    safetyStockQty: formatNumber(row.safety_stock_qty),
    reorderPointQty: formatNumber(row.reorder_point_qty),
    targetCoverageDays: Number(row.target_coverage_days || 0),
    assumedLeadTimeDays: Number(row.assumed_lead_time_days || 0),
    recommendationReason: row.recommendation_reason || '',
  };
}

export async function getInventoryPlanningPageData(): Promise<{
  summary: InventoryPlanningSummary;
  items: InventoryPlanningItem[];
  families: string[];
  wwdPalletPlan: WwdPalletPlan;
}> {
  const [rows, wwdPlanRows, inventoryValueRows, inboundDocumentRows] = await Promise.all([
    db.execute(sql`
      select *
      from analytics_mart.mart_inventory_reorder_recommendations
      where policy_bucket != 'NO_ACTION_OR_ARCHIVE'
      order by
        case
          when current_on_hand_qty <= 0 then 0
          else 1
        end,
        reorder_value_at_cost desc nulls last,
        reorder_qty desc nulls last,
        sku
    `) as unknown as Promise<InventoryPlanningRow[]>,
    db.execute(sql`
      select *
      from analytics_mart.mart_wwd_pallet_order_plan
      order by order_sequence
    `) as unknown as Promise<WwdPalletPlanRow[]>,
    db.execute(sql`
      select
        inventory_date,
        coalesce(sum(inventory_value_at_cost::numeric), 0) as current_on_hand_value_at_cost
      from analytics_mart.fct_inventory_history
      where inventory_date = (
        select max(inventory_date)
        from analytics_mart.fct_inventory_history
      )
      group by inventory_date
    `) as unknown as Promise<InventoryValueRow[]>,
    db.execute(sql`
      with latest as (
        select max(inventory_as_of_date) as inventory_as_of_date
        from analytics_mart.mart_inventory_inbound_lines
      ),
      inbound_documents as (
        select distinct
          inbound_type,
          coalesce(
            source_transaction_key,
            inbound_type || ':' || coalesce(document_number, '') || ':' || coalesce(vendor, '')
          ) as document_key
        from analytics_mart.mart_inventory_inbound_lines
        where inventory_as_of_date = (select inventory_as_of_date from latest)
      )
      select
        count(*) as inbound_document_count,
        count(*) filter (where inbound_type = 'OPEN_PO') as open_po_document_count,
        count(*) filter (where inbound_type = 'FUTURE_RECEIPT') as future_receipt_document_count
      from inbound_documents
    `) as unknown as Promise<InboundDocumentSummaryRow[]>,
  ]);

  const items = rows.map(mapPlanningRow);
  const inventoryValue = inventoryValueRows[0];
  const inboundDocuments = inboundDocumentRows[0];

  const total = items.length;
  const outOfStock = items.filter((item) => item.action === 'OUT_OF_STOCK');
  const buyItems = items.filter((item) => item.shouldReorder);
  const reviewItems = items.filter((item) => item.requiresManualReview);
  const wwdItems = items.filter((item) => item.preferredVendor === 'WWD');
  const wwdBuyItems = wwdItems.filter((item) => item.shouldReorder);
  const families = Array.from(new Set(items.map((item) => item.productFamily).filter((family) => family !== 'Uncategorized'))).sort();
  const wwdPalletPlan = mapWwdPalletPlan(wwdPlanRows);

  return {
    summary: {
      inventoryAsOfDate: formatDate(inventoryValue?.inventory_date || rows[0]?.inventory_as_of_date) || '',
      currentOnHandValueAtCost: formatNumber(inventoryValue?.current_on_hand_value_at_cost, 2),
      totalSkus: total,
      outOfStockCount: outOfStock.length,
      buyCount: buyItems.length,
      reviewCount: reviewItems.length,
      wwdSkuCount: wwdItems.length,
      wwdBuyCount: wwdBuyItems.length,
      wwdSuggestedBuyQty: wwdBuyItems.reduce((sum, item) => sum + Number(item.suggestedBuyQty), 0).toFixed(0),
      wwdSuggestedBuyCost: wwdBuyItems.reduce((sum, item) => sum + Number(item.suggestedBuyCost), 0).toFixed(2),
      suggestedBuyQty: buyItems.reduce((sum, item) => sum + Number(item.suggestedBuyQty), 0).toFixed(0),
      suggestedBuyCost: buyItems.reduce((sum, item) => sum + Number(item.suggestedBuyCost), 0).toFixed(2),
      inboundQty: items.reduce((sum, item) => sum + Number(item.inboundOpenPoQty), 0).toFixed(0),
      futureReceiptQty: items.reduce((sum, item) => sum + Number(item.futureReceiptQty), 0).toFixed(0),
      inboundDocumentCount: Number(inboundDocuments?.inbound_document_count || 0),
      openPoDocumentCount: Number(inboundDocuments?.open_po_document_count || 0),
      futureReceiptDocumentCount: Number(inboundDocuments?.future_receipt_document_count || 0),
    },
    items,
    families,
    wwdPalletPlan,
  };
}

export async function getProductFamiliesForReorder(): Promise<string[]> {
  const data = await getInventoryPlanningPageData();
  return data.families;
}

export async function getReorderPlanningData(): Promise<InventoryPlanningItem[]> {
  const data = await getInventoryPlanningPageData();
  return data.items;
}

export async function getProductReorderPlanningDetail(sku: string): Promise<ProductReorderPlanningDetail | null> {
  const rows = await db.execute(sql`
    select *
    from analytics_mart.mart_inventory_reorder_recommendations
    where sku = ${sku}
    limit 1
  `) as unknown as ProductReorderPlanningRow[];

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    ...mapPlanningRow(row),
    inventoryAsOfDate: formatDate(row.inventory_as_of_date) || '',
    expectedReceiptDate: formatDate(row.expected_receipt_date),
    leadTimeSource: row.lead_time_source || 'unknown',
    planningOverrideReason: row.planning_override_reason || '',
    configuredLeadTimeDays: formatNumber(row.configured_lead_time_days),
    observedSkuVendorLeadTimeDays: formatNumber(row.observed_sku_vendor_lead_time_days),
    observedSkuVendorLeadTimeCount: Number(row.observed_sku_vendor_lead_time_count || 0),
    observedVendorLeadTimeDays: formatNumber(row.observed_vendor_lead_time_days),
    observedVendorLeadTimeCount: Number(row.observed_vendor_lead_time_count || 0),
    defaultPolicyLeadTimeDays: Number(row.default_policy_lead_time_days || 0),
    defaultTargetCoverageDays: Number(row.default_target_coverage_days || 0),
    committedDemandQty: formatNumber(row.committed_demand_qty),
    committedDemandBeforeExpectedReceiptQty: formatNumber(row.committed_demand_before_expected_receipt_qty),
    committedOrderCount: Number(row.committed_order_count || 0),
    firstCommittedDemandDate: formatDate(row.first_committed_demand_date),
    lastCommittedDemandDate: formatDate(row.last_committed_demand_date),
    inboundQtyByExpectedReceiptDate: formatNumber(row.inbound_qty_by_expected_receipt_date),
    quickbooksQuantityOnOrder: formatNumber(row.quickbooks_quantity_on_order),
    forecastLeadTimeQty: formatNumber(row.forecast_lead_time_qty),
    baselineForecastLeadTimeQty: formatNumber(row.baseline_forecast_lead_time_qty),
    projectedPositionAtExpectedReceiptQty: formatNumber(row.projected_position_at_expected_receipt_qty),
    uncoveredLeadTimeDemandQty: formatNumber(row.uncovered_lead_time_demand_qty),
    stockoutGapQty: formatNumber(row.stockout_gap_qty),
    rawReorderQty: formatNumber(row.raw_reorder_qty),
    conservativeRawReorderQty: formatNumber(row.conservative_raw_reorder_qty),
    spikeAdjustedRawReorderQty: formatNumber(row.spike_adjusted_raw_reorder_qty),
    growthCaseReorderQty: formatNumber(row.growth_case_reorder_qty),
    conservativeReorderQty: formatNumber(row.conservative_reorder_qty),
    safetyStockSource: row.safety_stock_source || 'unknown',
    demandVariabilitySource: row.demand_variability_source || 'unknown',
    policySafetyStockQty: formatNumber(row.policy_safety_stock_qty),
    percentileSafetyStockQty: formatNumber(row.percentile_safety_stock_qty),
    variabilitySampleWindows: Number(row.variability_sample_windows || 0),
    variabilityWindowsWithDemand: Number(row.variability_windows_with_demand || 0),
    avgHistoricalLeadTimeDemandQty: formatNumber(row.avg_historical_lead_time_demand_qty),
    p50HistoricalLeadTimeDemandQty: formatNumber(row.p50_historical_lead_time_demand_qty),
    p75HistoricalLeadTimeDemandQty: formatNumber(row.p75_historical_lead_time_demand_qty),
    p90HistoricalLeadTimeDemandQty: formatNumber(row.p90_historical_lead_time_demand_qty),
    p95HistoricalLeadTimeDemandQty: formatNumber(row.p95_historical_lead_time_demand_qty),
    stddevDailySales90d: formatNumber(row.stddev_daily_sales_90d, 1),
    p80DailySales90d: formatNumber(row.p80_daily_sales_90d, 1),
    totalSalesQty90d: formatNumber(row.total_sales_qty_90d),
    daysWithSales90d: Number(row.days_with_sales_90d || 0),
    avgMonthlySales36m: formatNumber(row.avg_monthly_sales_36m),
    trailing3mAvgMonthlySales: formatNumber(row.trailing_3m_avg_monthly_sales),
    trailing12mAvgMonthlySales: formatNumber(row.trailing_12m_avg_monthly_sales),
    prior12mAvgMonthlySales: formatNumber(row.prior_12m_avg_monthly_sales),
    cappedSalesQty12m: formatNumber(row.capped_sales_qty_12m),
    uncappedSalesQty12m: formatNumber(row.uncapped_sales_qty_12m),
    hasLargeOrderOutlier2025: Boolean(row.has_large_order_outlier_2025),
  };
}

export async function getProductInboundLines(sku: string): Promise<ProductInboundLine[]> {
  const rows = await db.execute(sql`
    select *
    from analytics_mart.mart_inventory_inbound_lines
    where sku = ${sku}
    order by expected_or_receipt_date nulls last, inbound_type, document_number
  `) as unknown as ProductInboundLineRow[];

  return rows.map((row) => ({
    inboundLineId: row.inbound_line_id || '',
    inventoryAsOfDate: formatDate(row.inventory_as_of_date) || '',
    sku: row.sku || '',
    inboundType: row.inbound_type || 'OPEN_PO',
    documentNumber: row.document_number || '',
    vendor: row.vendor || '',
    documentDate: formatDate(row.document_date),
    expectedOrReceiptDate: formatDate(row.expected_or_receipt_date),
    quantity: formatNumber(row.quantity),
    rate: formatNumber(row.rate, 2),
    amount: formatNumber(row.amount, 2),
    status: row.status || '',
    sourceTransactionKey: row.source_transaction_key || '',
    quickbooksInternalId: row.quickbooks_internal_id || '',
    sourceTransactionId: row.source_transaction_id || '',
    inboundNote: row.inbound_note || '',
  }));
}
