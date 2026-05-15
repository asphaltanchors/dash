// ABOUTME: Inventory level queries for the inventory planning page.
// ABOUTME: Uses sales-based daily inventory estimates instead of the removed forecast mart.
import { db, fctInventoryHistoryInAnalyticsMart } from '@/lib/db';
import { and, asc, eq, gte, isNotNull, lte, sql } from 'drizzle-orm';

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
  anchorDate: string;
  anchorQuantityOnHand: string;
  daysSinceAnchor: number;
  salesQtyToday: string;
  receiptQtyToday: string;
  adjustmentQtyToday: string;
  netInventoryMovementToday: string;
  includesFutureDatedOrders: boolean;
  openPoQuantity: string;
  openPoLineCount: number;
  nextOpenPoDate: string | null;
  hasOpenPoInbound: boolean;
}

function formatDate(value: string | Date | null): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value.split('T')[0] : value.toISOString().split('T')[0];
}

const currentRows = eq(fctInventoryHistoryInAnalyticsMart.inventoryDate, sql`CURRENT_DATE`);
const activeStatuses = sql`${fctInventoryHistoryInAnalyticsMart.inventoryStatus} <> 'NO_RECENT_SALES'`;

export async function getReorderMetrics(): Promise<ReorderMetrics> {
  const metrics = await db
    .select({
      inventoryStatus: fctInventoryHistoryInAnalyticsMart.inventoryStatus,
      count: sql<number>`count(*)::int`,
      totalReorderQty90d: sql<string>`sum(greatest(0, (${fctInventoryHistoryInAnalyticsMart.avgDailySales90D} * 90) - ${fctInventoryHistoryInAnalyticsMart.estimatedEndingInventory}))`,
      totalReorderQty180d: sql<string>`sum(greatest(0, (${fctInventoryHistoryInAnalyticsMart.avgDailySales90D} * 180) - ${fctInventoryHistoryInAnalyticsMart.estimatedEndingInventory}))`,
      totalReorderValue90d: sql<string>`sum(greatest(0, (${fctInventoryHistoryInAnalyticsMart.avgDailySales90D} * 90) - ${fctInventoryHistoryInAnalyticsMart.estimatedEndingInventory}) * ${fctInventoryHistoryInAnalyticsMart.purchaseCost})`,
      totalReorderValue180d: sql<string>`sum(greatest(0, (${fctInventoryHistoryInAnalyticsMart.avgDailySales90D} * 180) - ${fctInventoryHistoryInAnalyticsMart.estimatedEndingInventory}) * ${fctInventoryHistoryInAnalyticsMart.purchaseCost})`,
      avgDaysRemaining: sql<string>`avg(${fctInventoryHistoryInAnalyticsMart.daysRemaining90DVelocity})`,
    })
    .from(fctInventoryHistoryInAnalyticsMart)
    .where(and(currentRows, activeStatuses))
    .groupBy(fctInventoryHistoryInAnalyticsMart.inventoryStatus);

  const statusMap = new Map(metrics.map(m => [m.inventoryStatus, m]));
  const low = statusMap.get('LOW');
  const moderate = statusMap.get('MODERATE');
  const sufficient = statusMap.get('SUFFICIENT');
  const negativeOrZero = statusMap.get('NEGATIVE_OR_ZERO');

  const totalReorderUnits90d = metrics.reduce((sum, m) => sum + Number(m.totalReorderQty90d || 0), 0);
  const totalReorderUnits180d = metrics.reduce((sum, m) => sum + Number(m.totalReorderQty180d || 0), 0);
  const totalReorderValue90d = metrics.reduce((sum, m) => sum + Number(m.totalReorderValue90d || 0), 0);
  const totalReorderValue180d = metrics.reduce((sum, m) => sum + Number(m.totalReorderValue180d || 0), 0);

  const criticalCount = (negativeOrZero?.count || 0) + (statusMap.get('CRITICAL')?.count || 0);
  const lowCount = low?.count || 0;
  const needReorderCount = criticalCount + lowCount;
  const avgDaysUntilStockout = metrics
    .filter(m => ['NEGATIVE_OR_ZERO', 'CRITICAL', 'LOW'].includes(m.inventoryStatus || ''))
    .reduce(
      (acc, m) => ({
        total: acc.total + Number(m.avgDaysRemaining || 0) * m.count,
        count: acc.count + m.count,
      }),
      { total: 0, count: 0 }
    );

  return {
    totalSkusNeedingReorder: needReorderCount,
    totalReorderUnits90d: totalReorderUnits90d.toFixed(0),
    totalReorderUnits180d: totalReorderUnits180d.toFixed(0),
    totalReorderValue90d: totalReorderValue90d.toFixed(2),
    totalReorderValue180d: totalReorderValue180d.toFixed(2),
    avgDaysUntilStockout: avgDaysUntilStockout.count > 0
      ? (avgDaysUntilStockout.total / avgDaysUntilStockout.count).toFixed(1)
      : '0.0',
    criticalCount,
    lowCount,
    moderateCount: moderate?.count || 0,
    sufficientCount: sufficient?.count || 0,
  };
}

export async function getPriorityBreakdown(): Promise<PriorityBreakdown[]> {
  const breakdown = await db
    .select({
      status: fctInventoryHistoryInAnalyticsMart.inventoryStatus,
      count: sql<number>`count(*)::int`,
    })
    .from(fctInventoryHistoryInAnalyticsMart)
    .where(currentRows)
    .groupBy(fctInventoryHistoryInAnalyticsMart.inventoryStatus);

  const total = breakdown.reduce((sum, item) => sum + item.count, 0);

  return breakdown.map(item => ({
    status: item.status || 'UNKNOWN',
    count: item.count,
    percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
  }));
}

export async function getStockoutTimeline(): Promise<StockoutTimelineItem[]> {
  const timeline = await db
    .select({
      stockoutDate: fctInventoryHistoryInAnalyticsMart.estimatedStockoutDate,
      sku: fctInventoryHistoryInAnalyticsMart.sku,
      inventoryValueAtCost: fctInventoryHistoryInAnalyticsMart.inventoryValueAtCost,
    })
    .from(fctInventoryHistoryInAnalyticsMart)
    .where(
      and(
        currentRows,
        isNotNull(fctInventoryHistoryInAnalyticsMart.estimatedStockoutDate),
        gte(fctInventoryHistoryInAnalyticsMart.estimatedStockoutDate, sql`CURRENT_DATE`),
        lte(fctInventoryHistoryInAnalyticsMart.estimatedStockoutDate, sql`CURRENT_DATE + INTERVAL '90 days'`),
        activeStatuses
      )
    )
    .orderBy(asc(fctInventoryHistoryInAnalyticsMart.estimatedStockoutDate));

  const grouped = new Map<string, { skus: string[], totalValue: number }>();

  timeline.forEach(item => {
    const dateStr = formatDate(item.stockoutDate);
    if (!dateStr) return;

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

export async function getReorderPlanningData(): Promise<ReorderItem[]> {
  const data = await db
    .select({
      sku: fctInventoryHistoryInAnalyticsMart.sku,
      salesDescription: fctInventoryHistoryInAnalyticsMart.salesDescription,
      productFamily: fctInventoryHistoryInAnalyticsMart.productFamily,
      materialType: fctInventoryHistoryInAnalyticsMart.materialType,
      quantityOnHand: fctInventoryHistoryInAnalyticsMart.estimatedEndingInventory,
      availableQty: fctInventoryHistoryInAnalyticsMart.estimatedAvailableQuantity,
      projectedQty: fctInventoryHistoryInAnalyticsMart.estimatedTotalVisibility,
      forecastDailyQty: fctInventoryHistoryInAnalyticsMart.avgDailySales90D,
      daysRemainingAvailable: fctInventoryHistoryInAnalyticsMart.daysRemaining90DVelocity,
      estimatedStockoutDate: fctInventoryHistoryInAnalyticsMart.estimatedStockoutDate,
      reorderQtyFor90DTarget: sql<string>`greatest(0, (${fctInventoryHistoryInAnalyticsMart.avgDailySales90D} * 90) - ${fctInventoryHistoryInAnalyticsMart.estimatedEndingInventory})`,
      reorderQtyFor180DTarget: sql<string>`greatest(0, (${fctInventoryHistoryInAnalyticsMart.avgDailySales90D} * 180) - ${fctInventoryHistoryInAnalyticsMart.estimatedEndingInventory})`,
      inventoryStatus: fctInventoryHistoryInAnalyticsMart.inventoryStatus,
      purchaseCost: fctInventoryHistoryInAnalyticsMart.purchaseCost,
      salesPrice: fctInventoryHistoryInAnalyticsMart.salesPrice,
      inventoryValueAtCost: fctInventoryHistoryInAnalyticsMart.inventoryValueAtCost,
      unitsPerSku: fctInventoryHistoryInAnalyticsMart.unitsPerSku,
      packagingType: fctInventoryHistoryInAnalyticsMart.packagingType,
      anchorDate: fctInventoryHistoryInAnalyticsMart.anchorDate,
      anchorQuantityOnHand: fctInventoryHistoryInAnalyticsMart.anchorQuantityOnHand,
      daysSinceAnchor: fctInventoryHistoryInAnalyticsMart.daysSinceAnchor,
      salesQtyToday: fctInventoryHistoryInAnalyticsMart.salesQty,
      receiptQtyToday: fctInventoryHistoryInAnalyticsMart.receiptQty,
      adjustmentQtyToday: fctInventoryHistoryInAnalyticsMart.adjustmentQty,
      netInventoryMovementToday: fctInventoryHistoryInAnalyticsMart.netInventoryMovement,
      includesFutureDatedOrders: fctInventoryHistoryInAnalyticsMart.includesFutureDatedOrders,
      openPoQuantity: fctInventoryHistoryInAnalyticsMart.openPoQuantity,
      openPoLineCount: fctInventoryHistoryInAnalyticsMart.openPoLineCount,
      nextOpenPoDate: fctInventoryHistoryInAnalyticsMart.nextOpenPoDate,
      hasOpenPoInbound: fctInventoryHistoryInAnalyticsMart.hasOpenPoInbound,
    })
    .from(fctInventoryHistoryInAnalyticsMart)
    .where(currentRows)
    .orderBy(
      sql`case ${fctInventoryHistoryInAnalyticsMart.inventoryStatus}
        when 'NEGATIVE_OR_ZERO' then 0
        when 'CRITICAL' then 1
        when 'LOW' then 2
        when 'MODERATE' then 3
        when 'SUFFICIENT' then 4
        else 5
      end`,
      asc(fctInventoryHistoryInAnalyticsMart.daysRemaining90DVelocity)
    );

  return data.map((item, index) => {
    const reorderQty90 = Number(item.reorderQtyFor90DTarget || 0);
    const reorderQty180 = Number(item.reorderQtyFor180DTarget || 0);
    const purchaseCost = Number(item.purchaseCost || 0);

    return {
      sku: item.sku || '',
      salesDescription: item.salesDescription || '',
      productFamily: item.productFamily || 'Uncategorized',
      materialType: item.materialType || 'Uncategorized',
      quantityOnHand: Number(item.quantityOnHand || 0).toFixed(0),
      availableQty: Number(item.availableQty || 0).toFixed(0),
      projectedQty: Number(item.projectedQty || 0).toFixed(0),
      forecastDailyQty: Number(item.forecastDailyQty || 0).toFixed(1),
      forecastMonthlyQty: (Number(item.forecastDailyQty || 0) * 30).toFixed(0),
      daysRemainingAvailable: item.daysRemainingAvailable === null
        ? ''
        : Number(item.daysRemainingAvailable || 0).toFixed(0),
      estimatedStockoutDate: formatDate(item.estimatedStockoutDate),
      reorderQtyFor90DTarget: reorderQty90.toFixed(0),
      reorderQtyFor180DTarget: reorderQty180.toFixed(0),
      reorderValueFor90DTarget: (reorderQty90 * purchaseCost).toFixed(2),
      reorderValueFor180DTarget: (reorderQty180 * purchaseCost).toFixed(2),
      inventoryStatus: item.inventoryStatus || 'UNKNOWN',
      demandTrend: 'Sales based',
      reorderPriorityRank: index + 1,
      purchaseCost: purchaseCost.toFixed(2),
      salesPrice: Number(item.salesPrice || 0).toFixed(2),
      inventoryValueAtCost: Number(item.inventoryValueAtCost || 0).toFixed(2),
      unitsPerSku: Number(item.unitsPerSku || 1),
      packagingType: item.packagingType || 'individual',
      anchorDate: formatDate(item.anchorDate) || '',
      anchorQuantityOnHand: Number(item.anchorQuantityOnHand || 0).toFixed(0),
      daysSinceAnchor: Number(item.daysSinceAnchor || 0),
      salesQtyToday: Number(item.salesQtyToday || 0).toFixed(0),
      receiptQtyToday: Number(item.receiptQtyToday || 0).toFixed(0),
      adjustmentQtyToday: Number(item.adjustmentQtyToday || 0).toFixed(0),
      netInventoryMovementToday: Number(item.netInventoryMovementToday || 0).toFixed(0),
      includesFutureDatedOrders: item.includesFutureDatedOrders || false,
      openPoQuantity: Number(item.openPoQuantity || 0).toFixed(0),
      openPoLineCount: Number(item.openPoLineCount || 0),
      nextOpenPoDate: formatDate(item.nextOpenPoDate),
      hasOpenPoInbound: item.hasOpenPoInbound || false,
    };
  });
}

export async function getProductFamiliesForReorder(): Promise<string[]> {
  const families = await db
    .selectDistinct({
      productFamily: fctInventoryHistoryInAnalyticsMart.productFamily,
    })
    .from(fctInventoryHistoryInAnalyticsMart)
    .where(currentRows)
    .orderBy(asc(fctInventoryHistoryInAnalyticsMart.productFamily));

  return families.map(f => f.productFamily || 'Uncategorized').filter(f => f !== 'Uncategorized');
}
