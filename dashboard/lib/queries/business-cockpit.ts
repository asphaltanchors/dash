// ABOUTME: Dense business cockpit queries backed by dbt summary marts
// ABOUTME: Keeps dashboard first-viewport metrics current-safe and read-only
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getProductGrowthQuality, type ProductGrowthQualityItem } from './growth-quality';

export interface BusinessCockpitSummary {
  asOfDate: string | null;
  ytdRevenue: string;
  ytdOrders: number;
  priorYtdRevenue: string;
  priorYtdOrders: number;
  ytdRevenueGrowthPct: string | null;
  ytdOrderGrowthPct: string | null;
  trailing365dRevenue: string;
  trailing365dOrders: number;
  priorTrailing365dRevenue: string;
  priorTrailing365dOrders: number;
  trailing365dRevenueGrowthPct: string | null;
  openInvoiceCount: number;
  openArAmount: string;
  overdueInvoiceCount: number;
  overdueArAmount: string;
  inventoryAsOfDate: string | null;
  reorderSkuCount: number;
  suggestedBuyCost: string;
  manualReviewSkuCount: number;
  futureOrderCount: number;
  futureOrderAmount: string;
  latestFutureOrderDate: string | null;
  attributionOrderCoveragePct: string;
  attributionRevenueCoveragePct: string;
  top10CorporateRevenueSharePct: string;
  top50CorporateRevenueSharePct: string;
}

export interface DataQualityFlag {
  flagKey: string;
  severity: 'ok' | 'warn' | 'critical';
  flagValue: string | null;
  flagLabel: string;
  details: string;
}

export interface BusinessCockpitData {
  summary: BusinessCockpitSummary | null;
  dataQualityFlags: DataQualityFlag[];
  productQuality: ProductGrowthQualityItem[];
}

export async function getBusinessCockpitData(): Promise<BusinessCockpitData> {
  const [summaryRows, flagRows, productQuality] = await Promise.all([
    db.execute(sql`
      SELECT *
      FROM analytics_mart.mart_business_cockpit_summary
      ORDER BY as_of_date DESC
      LIMIT 1
    `),
    db.execute(sql`
      SELECT flag_key, severity, flag_value, flag_label, details
      FROM analytics_mart.mart_data_quality_flags
      ORDER BY
        CASE severity WHEN 'critical' THEN 1 WHEN 'warn' THEN 2 ELSE 3 END,
        flag_key
    `),
    getProductGrowthQuality(8),
  ]);

  const summaryResult = summaryRows as unknown as Array<Record<string, string | number | null>>;
  const flagResult = flagRows as unknown as Array<{
    flag_key: string;
    severity: 'ok' | 'warn' | 'critical';
    flag_value: string | null;
    flag_label: string;
    details: string;
  }>;
  const summary = summaryResult[0];

  return {
    summary: summary ? {
      asOfDate: summary.as_of_date == null ? null : String(summary.as_of_date),
      ytdRevenue: Number(summary.ytd_revenue || 0).toFixed(2),
      ytdOrders: Number(summary.ytd_orders || 0),
      priorYtdRevenue: Number(summary.prior_ytd_revenue || 0).toFixed(2),
      priorYtdOrders: Number(summary.prior_ytd_orders || 0),
      ytdRevenueGrowthPct: summary.ytd_revenue_growth_pct == null ? null : Number(summary.ytd_revenue_growth_pct).toFixed(1),
      ytdOrderGrowthPct: summary.ytd_order_growth_pct == null ? null : Number(summary.ytd_order_growth_pct).toFixed(1),
      trailing365dRevenue: Number(summary.trailing_365d_revenue || 0).toFixed(2),
      trailing365dOrders: Number(summary.trailing_365d_orders || 0),
      priorTrailing365dRevenue: Number(summary.prior_trailing_365d_revenue || 0).toFixed(2),
      priorTrailing365dOrders: Number(summary.prior_trailing_365d_orders || 0),
      trailing365dRevenueGrowthPct: summary.trailing_365d_revenue_growth_pct == null ? null : Number(summary.trailing_365d_revenue_growth_pct).toFixed(1),
      openInvoiceCount: Number(summary.open_invoice_count || 0),
      openArAmount: Number(summary.open_ar_amount || 0).toFixed(2),
      overdueInvoiceCount: Number(summary.overdue_invoice_count || 0),
      overdueArAmount: Number(summary.overdue_ar_amount || 0).toFixed(2),
      inventoryAsOfDate: summary.inventory_as_of_date == null ? null : String(summary.inventory_as_of_date),
      reorderSkuCount: Number(summary.reorder_sku_count || 0),
      suggestedBuyCost: Number(summary.suggested_buy_cost || 0).toFixed(2),
      manualReviewSkuCount: Number(summary.manual_review_sku_count || 0),
      futureOrderCount: Number(summary.future_order_count || 0),
      futureOrderAmount: Number(summary.future_order_amount || 0).toFixed(2),
      latestFutureOrderDate: summary.latest_future_order_date == null ? null : String(summary.latest_future_order_date),
      attributionOrderCoveragePct: Number(summary.attribution_order_coverage_pct || 0).toFixed(1),
      attributionRevenueCoveragePct: Number(summary.attribution_revenue_coverage_pct || 0).toFixed(1),
      top10CorporateRevenueSharePct: Number(summary.top_10_corporate_revenue_share_pct || 0).toFixed(1),
      top50CorporateRevenueSharePct: Number(summary.top_50_corporate_revenue_share_pct || 0).toFixed(1),
    } : null,
    dataQualityFlags: flagResult.map((row) => ({
      flagKey: row.flag_key,
      severity: row.severity,
      flagValue: row.flag_value == null ? null : Number(row.flag_value).toFixed(1),
      flagLabel: row.flag_label,
      details: row.details,
    })),
    productQuality,
  };
}
