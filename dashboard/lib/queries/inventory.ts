// ABOUTME: Inventory queries backed by sales-based daily inventory estimates.
// ABOUTME: QuickBooks quantities are treated as anchors, with sales reducing inventory between anchors.
import { db, fctInventoryHistoryInAnalyticsMart } from '@/lib/db';
import { desc, eq, sql } from 'drizzle-orm';

export interface InventorySnapshot {
  sku: string;
  inventoryDate: string;
  estimatedEndingInventory: string;
  estimatedAvailableQuantity: string;
  estimatedTotalVisibility: string;
  inventoryChange: string;
  salesQty: string;
  receiptQty: string;
  adjustmentQty: string;
  netInventoryMovement: string;
  quantityOnOrder: string;
  quantityOnSalesOrder: string;
  openPoQuantity: string;
  openPoLineCount: number;
  nextOpenPoDate: string | null;
  hasOpenPoInbound: boolean;
  anchorDate: string;
  anchorQuantityOnHand: string;
  daysSinceAnchor: number;
  avgDailySales30D: string;
  avgDailySales90D: string;
  daysRemaining90DVelocity: string | null;
  estimatedStockoutDate: string | null;
  inventoryStatus: string;
  inventoryValueAtCost: string;
  inventoryValueAtSalesPrice: string;
  includesFutureDatedOrders: boolean;
}

export interface InventoryTrend {
  date: string;
  estimatedEndingInventory: string;
  inventoryChange: string;
  salesQty: string;
  receiptQty: string;
  adjustmentQty: string;
  netInventoryMovement: string;
  inventoryValueAtCost: string;
  isAnchorDay: boolean;
  isProjectedDay: boolean;
}

function formatDate(value: string | Date | null): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value.split('T')[0] : value.toISOString().split('T')[0];
}

export async function getProductInventoryStatus(itemName: string): Promise<InventorySnapshot | null> {
  const inventory = await db
    .select({
      sku: fctInventoryHistoryInAnalyticsMart.sku,
      inventoryDate: fctInventoryHistoryInAnalyticsMart.inventoryDate,
      estimatedEndingInventory: fctInventoryHistoryInAnalyticsMart.estimatedEndingInventory,
      estimatedAvailableQuantity: fctInventoryHistoryInAnalyticsMart.estimatedAvailableQuantity,
      estimatedTotalVisibility: fctInventoryHistoryInAnalyticsMart.estimatedTotalVisibility,
      inventoryChange: fctInventoryHistoryInAnalyticsMart.inventoryChange,
      salesQty: fctInventoryHistoryInAnalyticsMart.salesQty,
      receiptQty: fctInventoryHistoryInAnalyticsMart.receiptQty,
      adjustmentQty: fctInventoryHistoryInAnalyticsMart.adjustmentQty,
      netInventoryMovement: fctInventoryHistoryInAnalyticsMart.netInventoryMovement,
      quantityOnOrder: fctInventoryHistoryInAnalyticsMart.quantityOnOrder,
      quantityOnSalesOrder: fctInventoryHistoryInAnalyticsMart.quantityOnSalesOrder,
      openPoQuantity: fctInventoryHistoryInAnalyticsMart.openPoQuantity,
      openPoLineCount: fctInventoryHistoryInAnalyticsMart.openPoLineCount,
      nextOpenPoDate: fctInventoryHistoryInAnalyticsMart.nextOpenPoDate,
      hasOpenPoInbound: fctInventoryHistoryInAnalyticsMart.hasOpenPoInbound,
      anchorDate: fctInventoryHistoryInAnalyticsMart.anchorDate,
      anchorQuantityOnHand: fctInventoryHistoryInAnalyticsMart.anchorQuantityOnHand,
      daysSinceAnchor: fctInventoryHistoryInAnalyticsMart.daysSinceAnchor,
      avgDailySales30D: fctInventoryHistoryInAnalyticsMart.avgDailySales30D,
      avgDailySales90D: fctInventoryHistoryInAnalyticsMart.avgDailySales90D,
      daysRemaining90DVelocity: fctInventoryHistoryInAnalyticsMart.daysRemaining90DVelocity,
      estimatedStockoutDate: fctInventoryHistoryInAnalyticsMart.estimatedStockoutDate,
      inventoryStatus: fctInventoryHistoryInAnalyticsMart.inventoryStatus,
      inventoryValueAtCost: fctInventoryHistoryInAnalyticsMart.inventoryValueAtCost,
      inventoryValueAtSalesPrice: fctInventoryHistoryInAnalyticsMart.inventoryValueAtSalesPrice,
      includesFutureDatedOrders: fctInventoryHistoryInAnalyticsMart.includesFutureDatedOrders,
    })
    .from(fctInventoryHistoryInAnalyticsMart)
    .where(eq(fctInventoryHistoryInAnalyticsMart.sku, itemName))
    .orderBy(desc(fctInventoryHistoryInAnalyticsMart.inventoryDate))
    .limit(1);

  if (inventory.length === 0) {
    return null;
  }

  const item = inventory[0];
  return {
    sku: item.sku || 'Unknown',
    inventoryDate: formatDate(item.inventoryDate) || '',
    estimatedEndingInventory: Number(item.estimatedEndingInventory || 0).toFixed(0),
    estimatedAvailableQuantity: Number(item.estimatedAvailableQuantity || 0).toFixed(0),
    estimatedTotalVisibility: Number(item.estimatedTotalVisibility || 0).toFixed(0),
    inventoryChange: Number(item.inventoryChange || 0).toFixed(0),
    salesQty: Number(item.salesQty || 0).toFixed(0),
    receiptQty: Number(item.receiptQty || 0).toFixed(0),
    adjustmentQty: Number(item.adjustmentQty || 0).toFixed(0),
    netInventoryMovement: Number(item.netInventoryMovement || 0).toFixed(0),
    quantityOnOrder: Number(item.quantityOnOrder || 0).toFixed(0),
    quantityOnSalesOrder: Number(item.quantityOnSalesOrder || 0).toFixed(0),
    openPoQuantity: Number(item.openPoQuantity || 0).toFixed(0),
    openPoLineCount: Number(item.openPoLineCount || 0),
    nextOpenPoDate: formatDate(item.nextOpenPoDate),
    hasOpenPoInbound: item.hasOpenPoInbound || false,
    anchorDate: formatDate(item.anchorDate) || '',
    anchorQuantityOnHand: Number(item.anchorQuantityOnHand || 0).toFixed(0),
    daysSinceAnchor: Number(item.daysSinceAnchor || 0),
    avgDailySales30D: Number(item.avgDailySales30D || 0).toFixed(1),
    avgDailySales90D: Number(item.avgDailySales90D || 0).toFixed(1),
    daysRemaining90DVelocity: item.daysRemaining90DVelocity === null
      ? null
      : Number(item.daysRemaining90DVelocity || 0).toFixed(0),
    estimatedStockoutDate: formatDate(item.estimatedStockoutDate),
    inventoryStatus: item.inventoryStatus || 'UNKNOWN',
    inventoryValueAtCost: Number(item.inventoryValueAtCost || 0).toFixed(2),
    inventoryValueAtSalesPrice: Number(item.inventoryValueAtSalesPrice || 0).toFixed(2),
    includesFutureDatedOrders: item.includesFutureDatedOrders || false,
  };
}

export async function getProductInventoryTrend(itemName: string): Promise<InventoryTrend[]> {
  const trend = await db
    .select({
      inventoryDate: fctInventoryHistoryInAnalyticsMart.inventoryDate,
      estimatedEndingInventory: fctInventoryHistoryInAnalyticsMart.estimatedEndingInventory,
      inventoryChange: fctInventoryHistoryInAnalyticsMart.inventoryChange,
      salesQty: fctInventoryHistoryInAnalyticsMart.salesQty,
      receiptQty: fctInventoryHistoryInAnalyticsMart.receiptQty,
      adjustmentQty: fctInventoryHistoryInAnalyticsMart.adjustmentQty,
      netInventoryMovement: fctInventoryHistoryInAnalyticsMart.netInventoryMovement,
      inventoryValueAtCost: fctInventoryHistoryInAnalyticsMart.inventoryValueAtCost,
      isAnchorDay: fctInventoryHistoryInAnalyticsMart.isAnchorDay,
      isProjectedDay: fctInventoryHistoryInAnalyticsMart.isProjectedDay,
    })
    .from(fctInventoryHistoryInAnalyticsMart)
    .where(eq(fctInventoryHistoryInAnalyticsMart.sku, itemName))
    .orderBy(fctInventoryHistoryInAnalyticsMart.inventoryDate);

  return trend.map(item => ({
    date: formatDate(item.inventoryDate) || '',
    estimatedEndingInventory: Number(item.estimatedEndingInventory || 0).toFixed(0),
    inventoryChange: Number(item.inventoryChange || 0).toFixed(0),
    salesQty: Number(item.salesQty || 0).toFixed(0),
    receiptQty: Number(item.receiptQty || 0).toFixed(0),
    adjustmentQty: Number(item.adjustmentQty || 0).toFixed(0),
    netInventoryMovement: Number(item.netInventoryMovement || 0).toFixed(0),
    inventoryValueAtCost: Number(item.inventoryValueAtCost || 0).toFixed(2),
    isAnchorDay: item.isAnchorDay || false,
    isProjectedDay: item.isProjectedDay || false,
  }));
}

export async function getInventoryHistoryMaxDate(): Promise<string | null> {
  const [result] = await db
    .select({
      maxDate: sql<string>`max(${fctInventoryHistoryInAnalyticsMart.inventoryDate})`,
    })
    .from(fctInventoryHistoryInAnalyticsMart);

  return formatDate(result?.maxDate || null);
}
