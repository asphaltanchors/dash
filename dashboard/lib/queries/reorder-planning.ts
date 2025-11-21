// ABOUTME: Reorder planning queries for inventory replenishment decision-making
// ABOUTME: Provides forecasts, reorder quantities, and priority rankings for inventory management
import { db, fctInventoryForecastInAnalyticsMart } from '@/lib/db';
import { sql, asc, eq, and, isNotNull, gte, lte } from 'drizzle-orm';

export interface ReorderMetrics {
  totalSkusNeedingReorder: number;
  totalReorderUnits90d: string;
  totalReorderUnits180d: string;
  totalReorderValue90d: string;
  totalReorderValue180d: string;
  avgDaysUntilStockout: string;
  criticalCount: number;
  lowCount: number;
  moderateCount: number;
  sufficientCount: number;
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

export interface ReorderItem {
  sku: string;
  salesDescription: string;
  productFamily: string;
  materialType: string;
  quantityOnHand: string;
  availableQty: string;
  projectedQty: string;
  forecastDailyQty: string;
  forecastMonthlyQty: string;
  daysRemainingAvailable: string;
  estimatedStockoutDate: string | null;
  reorderQtyFor90DTarget: string;
  reorderQtyFor180DTarget: string;
  reorderValueFor90DTarget: string;
  reorderValueFor180DTarget: string;
  inventoryStatus: string;
  demandTrend: string;
  reorderPriorityRank: number;
  purchaseCost: string;
  salesPrice: string;
  inventoryValueAtCost: string;
  unitsPerSku: number;
  packagingType: string;
}

// Get summary metrics for reorder planning
export async function getReorderMetrics(): Promise<ReorderMetrics> {
  const metrics = await db
    .select({
      inventoryStatus: fctInventoryForecastInAnalyticsMart.inventoryStatus,
      count: sql<number>`count(*)::int`,
      totalReorderQty90d: sql<string>`sum(${fctInventoryForecastInAnalyticsMart.reorderQtyFor90DTarget})`,
      totalReorderQty180d: sql<string>`sum(${fctInventoryForecastInAnalyticsMart.reorderQtyFor180DTarget})`,
      totalReorderValue90d: sql<string>`sum(${fctInventoryForecastInAnalyticsMart.reorderQtyFor90DTarget} * ${fctInventoryForecastInAnalyticsMart.purchaseCost})`,
      totalReorderValue180d: sql<string>`sum(${fctInventoryForecastInAnalyticsMart.reorderQtyFor180DTarget} * ${fctInventoryForecastInAnalyticsMart.purchaseCost})`,
      avgDaysRemaining: sql<string>`avg(${fctInventoryForecastInAnalyticsMart.daysRemainingAvailable})`,
    })
    .from(fctInventoryForecastInAnalyticsMart)
    .where(eq(fctInventoryForecastInAnalyticsMart.hasRecentSales, true))
    .groupBy(fctInventoryForecastInAnalyticsMart.inventoryStatus);

  const statusMap = new Map(metrics.map(m => [m.inventoryStatus, m]));

  const critical = statusMap.get('CRITICAL');
  const low = statusMap.get('LOW');
  const moderate = statusMap.get('MODERATE');
  const sufficient = statusMap.get('SUFFICIENT');

  const totalReorderUnits90d = metrics.reduce((sum, m) => sum + Number(m.totalReorderQty90d || 0), 0);
  const totalReorderUnits180d = metrics.reduce((sum, m) => sum + Number(m.totalReorderQty180d || 0), 0);
  const totalReorderValue90d = metrics.reduce((sum, m) => sum + Number(m.totalReorderValue90d || 0), 0);
  const totalReorderValue180d = metrics.reduce((sum, m) => sum + Number(m.totalReorderValue180d || 0), 0);

  const needReorderCount = (critical?.count || 0) + (low?.count || 0);
  const avgDaysUntilStockout =
    critical && low
      ? ((Number(critical.avgDaysRemaining || 0) * critical.count + Number(low.avgDaysRemaining || 0) * low.count) / needReorderCount).toFixed(1)
      : critical
        ? Number(critical.avgDaysRemaining || 0).toFixed(1)
        : low
          ? Number(low.avgDaysRemaining || 0).toFixed(1)
          : '0.0';

  return {
    totalSkusNeedingReorder: needReorderCount,
    totalReorderUnits90d: totalReorderUnits90d.toFixed(0),
    totalReorderUnits180d: totalReorderUnits180d.toFixed(0),
    totalReorderValue90d: totalReorderValue90d.toFixed(2),
    totalReorderValue180d: totalReorderValue180d.toFixed(2),
    avgDaysUntilStockout,
    criticalCount: critical?.count || 0,
    lowCount: low?.count || 0,
    moderateCount: moderate?.count || 0,
    sufficientCount: sufficient?.count || 0,
  };
}

// Get priority breakdown for chart
export async function getPriorityBreakdown(): Promise<PriorityBreakdown[]> {
  const breakdown = await db
    .select({
      status: fctInventoryForecastInAnalyticsMart.inventoryStatus,
      count: sql<number>`count(*)::int`,
    })
    .from(fctInventoryForecastInAnalyticsMart)
    .where(eq(fctInventoryForecastInAnalyticsMart.hasRecentSales, true))
    .groupBy(fctInventoryForecastInAnalyticsMart.inventoryStatus);

  const total = breakdown.reduce((sum, item) => sum + item.count, 0);

  return breakdown.map(item => ({
    status: item.status || 'UNKNOWN',
    count: item.count,
    percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
  }));
}

// Get stockout timeline (next 90 days)
export async function getStockoutTimeline(): Promise<StockoutTimelineItem[]> {
  const timeline = await db
    .select({
      stockoutDate: fctInventoryForecastInAnalyticsMart.estimatedStockoutDate,
      sku: fctInventoryForecastInAnalyticsMart.sku,
      salesDescription: fctInventoryForecastInAnalyticsMart.salesDescription,
      inventoryValueAtCost: fctInventoryForecastInAnalyticsMart.inventoryValueAtCost,
    })
    .from(fctInventoryForecastInAnalyticsMart)
    .where(
      and(
        eq(fctInventoryForecastInAnalyticsMart.hasRecentSales, true),
        isNotNull(fctInventoryForecastInAnalyticsMart.estimatedStockoutDate),
        gte(fctInventoryForecastInAnalyticsMart.estimatedStockoutDate, sql`CURRENT_DATE`),
        lte(fctInventoryForecastInAnalyticsMart.estimatedStockoutDate, sql`CURRENT_DATE + INTERVAL '90 days'`)
      )
    )
    .orderBy(asc(fctInventoryForecastInAnalyticsMart.estimatedStockoutDate));

  // Group by date
  const grouped = new Map<string, { skus: string[], totalValue: number }>();

  timeline.forEach(item => {
    if (!item.stockoutDate) return;

    // Date fields from Drizzle can be Date objects or strings depending on the driver
    const dateStr = typeof item.stockoutDate === 'string'
      ? item.stockoutDate.split('T')[0]
      : (item.stockoutDate as Date).toISOString().split('T')[0];

    if (!grouped.has(dateStr)) {
      grouped.set(dateStr, { skus: [], totalValue: 0 });
    }
    const group = grouped.get(dateStr)!;
    group.skus.push(item.sku || '');
    group.totalValue += Number(item.inventoryValueAtCost || 0);
  });

  return Array.from(grouped.entries()).map(([date, data]) => ({
    stockoutDate: date,
    skuCount: data.skus.length,
    totalValue: data.totalValue.toFixed(2),
    skus: data.skus,
  }));
}

// Get all reorder planning data for main table
export async function getReorderPlanningData(
  filters?: {
    productFamily?: string;
    inventoryStatus?: string;
    demandTrend?: string;
    onlyNeedsReorder?: boolean;
  }
): Promise<ReorderItem[]> {
  const conditions = [eq(fctInventoryForecastInAnalyticsMart.hasRecentSales, true)];

  if (filters?.productFamily) {
    conditions.push(eq(fctInventoryForecastInAnalyticsMart.productFamily, filters.productFamily));
  }
  if (filters?.inventoryStatus) {
    conditions.push(eq(fctInventoryForecastInAnalyticsMart.inventoryStatus, filters.inventoryStatus));
  }
  if (filters?.demandTrend) {
    conditions.push(eq(fctInventoryForecastInAnalyticsMart.demandTrend, filters.demandTrend));
  }
  if (filters?.onlyNeedsReorder) {
    conditions.push(
      sql`${fctInventoryForecastInAnalyticsMart.inventoryStatus} IN ('CRITICAL', 'LOW')`
    );
  }

  const data = await db
    .select({
      sku: fctInventoryForecastInAnalyticsMart.sku,
      salesDescription: fctInventoryForecastInAnalyticsMart.salesDescription,
      productFamily: fctInventoryForecastInAnalyticsMart.productFamily,
      materialType: fctInventoryForecastInAnalyticsMart.materialType,
      quantityOnHand: fctInventoryForecastInAnalyticsMart.quantityOnHand,
      availableQty: fctInventoryForecastInAnalyticsMart.availableQty,
      projectedQty: fctInventoryForecastInAnalyticsMart.projectedQty,
      forecastDailyQty: fctInventoryForecastInAnalyticsMart.forecastDailyQty,
      forecastMonthlyQty: fctInventoryForecastInAnalyticsMart.forecastMonthlyQty,
      daysRemainingAvailable: fctInventoryForecastInAnalyticsMart.daysRemainingAvailable,
      estimatedStockoutDate: fctInventoryForecastInAnalyticsMart.estimatedStockoutDate,
      reorderQtyFor90DTarget: fctInventoryForecastInAnalyticsMart.reorderQtyFor90DTarget,
      reorderQtyFor180DTarget: fctInventoryForecastInAnalyticsMart.reorderQtyFor180DTarget,
      inventoryStatus: fctInventoryForecastInAnalyticsMart.inventoryStatus,
      demandTrend: fctInventoryForecastInAnalyticsMart.demandTrend,
      reorderPriorityRank: fctInventoryForecastInAnalyticsMart.reorderPriorityRank,
      purchaseCost: fctInventoryForecastInAnalyticsMart.purchaseCost,
      salesPrice: fctInventoryForecastInAnalyticsMart.salesPrice,
      inventoryValueAtCost: fctInventoryForecastInAnalyticsMart.inventoryValueAtCost,
      unitsPerSku: fctInventoryForecastInAnalyticsMart.unitsPerSku,
      packagingType: fctInventoryForecastInAnalyticsMart.packagingType,
    })
    .from(fctInventoryForecastInAnalyticsMart)
    .where(and(...conditions))
    .orderBy(asc(fctInventoryForecastInAnalyticsMart.reorderPriorityRank));

  return data.map(item => ({
    sku: item.sku || '',
    salesDescription: item.salesDescription || '',
    productFamily: item.productFamily || 'Uncategorized',
    materialType: item.materialType || 'Uncategorized',
    quantityOnHand: Number(item.quantityOnHand || 0).toFixed(0),
    availableQty: Number(item.availableQty || 0).toFixed(0),
    projectedQty: Number(item.projectedQty || 0).toFixed(0),
    forecastDailyQty: Number(item.forecastDailyQty || 0).toFixed(1),
    forecastMonthlyQty: Number(item.forecastMonthlyQty || 0).toFixed(0),
    daysRemainingAvailable: Number(item.daysRemainingAvailable || 0).toFixed(1),
    estimatedStockoutDate: item.estimatedStockoutDate
      ? (typeof item.estimatedStockoutDate === 'string'
          ? item.estimatedStockoutDate.split('T')[0]
          : (item.estimatedStockoutDate as Date).toISOString().split('T')[0])
      : null,
    reorderQtyFor90DTarget: Number(item.reorderQtyFor90DTarget || 0).toFixed(0),
    reorderQtyFor180DTarget: Number(item.reorderQtyFor180DTarget || 0).toFixed(0),
    reorderValueFor90DTarget: (Number(item.reorderQtyFor90DTarget || 0) * Number(item.purchaseCost || 0)).toFixed(2),
    reorderValueFor180DTarget: (Number(item.reorderQtyFor180DTarget || 0) * Number(item.purchaseCost || 0)).toFixed(2),
    inventoryStatus: item.inventoryStatus || 'UNKNOWN',
    demandTrend: item.demandTrend || 'Stable',
    reorderPriorityRank: Number(item.reorderPriorityRank || 0),
    purchaseCost: Number(item.purchaseCost || 0).toFixed(2),
    salesPrice: Number(item.salesPrice || 0).toFixed(2),
    inventoryValueAtCost: Number(item.inventoryValueAtCost || 0).toFixed(2),
    unitsPerSku: Number(item.unitsPerSku || 1),
    packagingType: item.packagingType || 'individual',
  }));
}

// Get unique product families for filter dropdown
export async function getProductFamiliesForReorder(): Promise<string[]> {
  const families = await db
    .selectDistinct({
      productFamily: fctInventoryForecastInAnalyticsMart.productFamily,
    })
    .from(fctInventoryForecastInAnalyticsMart)
    .where(eq(fctInventoryForecastInAnalyticsMart.hasRecentSales, true))
    .orderBy(asc(fctInventoryForecastInAnalyticsMart.productFamily));

  return families.map(f => f.productFamily || 'Uncategorized').filter(f => f !== 'Uncategorized');
}
