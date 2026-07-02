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
  sku_baseline_monthly_qty: string | number | null;
  applied_seasonality_index: string | number | null;
  applied_growth_factor: string | number | null;
  capped_reduction_qty_12m: string | number | null;
  avg_daily_sales_30d: string | number | null;
  avg_daily_sales_90d: string | number | null;
  avg_daily_sales_365d: string | number | null;
  reorder_qty: string | number | null;
  layer_rounded_reorder_qty: string | number | null;
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

export async function getInventoryPlanningPageData(): Promise<{
  summary: InventoryPlanningSummary;
  items: InventoryPlanningItem[];
  families: string[];
}> {
  const rows = await db.execute(sql`
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
  `) as unknown as InventoryPlanningRow[];

  const items = rows.map((row) => {
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
  });

  const total = items.length;
  const outOfStock = items.filter((item) => item.action === 'OUT_OF_STOCK');
  const buyItems = items.filter((item) => item.shouldReorder);
  const reviewItems = items.filter((item) => item.requiresManualReview);
  const wwdItems = items.filter((item) => item.preferredVendor === 'WWD');
  const wwdBuyItems = wwdItems.filter((item) => item.shouldReorder);
  const families = Array.from(new Set(items.map((item) => item.productFamily).filter((family) => family !== 'Uncategorized'))).sort();

  return {
    summary: {
      inventoryAsOfDate: formatDate(rows[0]?.inventory_as_of_date) || '',
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
    },
    items,
    families,
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
