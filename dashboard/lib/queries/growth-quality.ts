// ABOUTME: Product growth quality queries backed by mart_product_growth_quality
// ABOUTME: Uses dbt-calculated extended margin, discount leakage, and inventory posture
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export interface ProductGrowthQualityItem {
  sku: string;
  productFamily: string;
  materialType: string;
  revenue: string;
  grossMarginAmount: string | null;
  grossMarginPercentage: string | null;
  discountLeakageAmount: string;
  unitsSold: string;
  orderCount: number;
  customerCount: number;
  yoyRevenueGrowthPct: string;
  inventoryStatus: string | null;
  estimatedAvailableQuantity: string | null;
  inventoryValueAtCost: string | null;
  shouldReorder: boolean;
  requiresManualReview: boolean;
  reorderValueAtCost: string | null;
  topCustomer: string | null;
  topCustomerRevenueSharePct: string | null;
  revenueRank: number;
  marginRank: number | null;
}

export async function getProductGrowthQuality(limit = 50): Promise<ProductGrowthQualityItem[]> {
  const rows = await db.execute(sql`
    SELECT
      sku,
      product_family,
      material_type,
      revenue,
      gross_margin_amount,
      gross_margin_percentage,
      discount_leakage_amount,
      units_sold,
      order_count,
      customer_count,
      yoy_revenue_growth_pct,
      inventory_status,
      estimated_available_quantity,
      inventory_value_at_cost,
      should_reorder,
      requires_manual_review,
      reorder_value_at_cost,
      top_customer,
      top_customer_revenue_share_pct,
      revenue_rank,
      margin_rank
    FROM analytics_mart.mart_product_growth_quality
    ORDER BY revenue DESC
    LIMIT ${limit}
  `);

  const results = rows as unknown as Array<{
    sku: string;
    product_family: string;
    material_type: string;
    revenue: string;
    gross_margin_amount: string | null;
    gross_margin_percentage: string | null;
    discount_leakage_amount: string;
    units_sold: string;
    order_count: number;
    customer_count: number;
    yoy_revenue_growth_pct: string;
    inventory_status: string | null;
    estimated_available_quantity: string | null;
    inventory_value_at_cost: string | null;
    should_reorder: boolean | null;
    requires_manual_review: boolean | null;
    reorder_value_at_cost: string | null;
    top_customer: string | null;
    top_customer_revenue_share_pct: string | null;
    revenue_rank: number;
    margin_rank: number | null;
  }>;

  return results.map((row) => ({
    sku: row.sku,
    productFamily: row.product_family || 'Uncategorized',
    materialType: row.material_type || 'Unknown',
    revenue: Number(row.revenue || 0).toFixed(2),
    grossMarginAmount: row.gross_margin_amount == null ? null : Number(row.gross_margin_amount).toFixed(2),
    grossMarginPercentage: row.gross_margin_percentage == null ? null : Number(row.gross_margin_percentage).toFixed(1),
    discountLeakageAmount: Number(row.discount_leakage_amount || 0).toFixed(2),
    unitsSold: Number(row.units_sold || 0).toFixed(0),
    orderCount: Number(row.order_count || 0),
    customerCount: Number(row.customer_count || 0),
    yoyRevenueGrowthPct: Number(row.yoy_revenue_growth_pct || 0).toFixed(1),
    inventoryStatus: row.inventory_status,
    estimatedAvailableQuantity: row.estimated_available_quantity == null ? null : Number(row.estimated_available_quantity).toFixed(0),
    inventoryValueAtCost: row.inventory_value_at_cost == null ? null : Number(row.inventory_value_at_cost).toFixed(2),
    shouldReorder: Boolean(row.should_reorder),
    requiresManualReview: Boolean(row.requires_manual_review),
    reorderValueAtCost: row.reorder_value_at_cost == null ? null : Number(row.reorder_value_at_cost).toFixed(2),
    topCustomer: row.top_customer,
    topCustomerRevenueSharePct: row.top_customer_revenue_share_pct == null ? null : Number(row.top_customer_revenue_share_pct).toFixed(1),
    revenueRank: Number(row.revenue_rank || 0),
    marginRank: row.margin_rank == null ? null : Number(row.margin_rank),
  }));
}
