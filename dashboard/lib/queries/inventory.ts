// ABOUTME: Inventory management queries for tracking stock levels and historical trends
// ABOUTME: Provides current inventory status and historical inventory movement data
import { db, fctInventoryHistoryInAnalyticsMart } from '@/lib/db';
import { desc, sql } from 'drizzle-orm';

export interface InventorySnapshot {
  itemName: string;
  inventoryDate: string;
  quantityOnHand: string;
  quantityOnOrder: string;
  quantityOnSalesOrder: string;
  availableQuantity: string;
  totalInventoryVisibility: string;
  quantityChange: string;
  previousQuantityOnHand: string;
  inventoryValueAtCost: string;
  inventoryValueAtSalesPrice: string;
  itemStatus: string;
  isBackup: boolean;
}

export interface InventoryTrend {
  date: string;
  quantityOnHand: string;
  quantityChange: string;
  inventoryValueAtCost: string;
}

// Get current inventory status for a product
export async function getProductInventoryStatus(itemName: string): Promise<InventorySnapshot | null> {
  const inventory = await db
    .select({
      itemName: fctInventoryHistoryInAnalyticsMart.itemName,
      inventoryDate: fctInventoryHistoryInAnalyticsMart.inventoryDate,
      quantityOnHand: fctInventoryHistoryInAnalyticsMart.quantityOnHand,
      quantityOnOrder: fctInventoryHistoryInAnalyticsMart.quantityOnOrder,
      quantityOnSalesOrder: fctInventoryHistoryInAnalyticsMart.quantityOnSalesOrder,
      availableQuantity: fctInventoryHistoryInAnalyticsMart.availableQuantity,
      totalInventoryVisibility: fctInventoryHistoryInAnalyticsMart.totalInventoryVisibility,
      quantityChange: fctInventoryHistoryInAnalyticsMart.quantityChange,
      previousQuantityOnHand: fctInventoryHistoryInAnalyticsMart.previousQuantityOnHand,
      inventoryValueAtCost: fctInventoryHistoryInAnalyticsMart.inventoryValueAtCost,
      inventoryValueAtSalesPrice: fctInventoryHistoryInAnalyticsMart.inventoryValueAtSalesPrice,
      itemStatus: fctInventoryHistoryInAnalyticsMart.itemStatus,
      isBackup: fctInventoryHistoryInAnalyticsMart.isBackup,
    })
    .from(fctInventoryHistoryInAnalyticsMart)
    .where(sql`${fctInventoryHistoryInAnalyticsMart.itemName} = ${itemName}`)
    .orderBy(desc(fctInventoryHistoryInAnalyticsMart.inventoryDate))
    .limit(1);

  if (inventory.length === 0) {
    return null;
  }

  const item = inventory[0];
  return {
    itemName: item.itemName || 'Unknown',
    inventoryDate: item.inventoryDate as string,
    quantityOnHand: Number(item.quantityOnHand || 0).toFixed(0),
    quantityOnOrder: Number(item.quantityOnOrder || 0).toFixed(0),
    quantityOnSalesOrder: Number(item.quantityOnSalesOrder || 0).toFixed(0),
    availableQuantity: Number(item.availableQuantity || 0).toFixed(0),
    totalInventoryVisibility: Number(item.totalInventoryVisibility || 0).toFixed(0),
    quantityChange: Number(item.quantityChange || 0).toFixed(0),
    previousQuantityOnHand: Number(item.previousQuantityOnHand || 0).toFixed(0),
    inventoryValueAtCost: Number(item.inventoryValueAtCost || 0).toFixed(2),
    inventoryValueAtSalesPrice: Number(item.inventoryValueAtSalesPrice || 0).toFixed(2),
    itemStatus: item.itemStatus || 'Unknown',
    isBackup: item.isBackup || false,
  };
}

// Get inventory trend for a product (all time)
export async function getProductInventoryTrend(itemName: string): Promise<InventoryTrend[]> {
  const trend = await db
    .select({
      inventoryDate: fctInventoryHistoryInAnalyticsMart.inventoryDate,
      quantityOnHand: fctInventoryHistoryInAnalyticsMart.quantityOnHand,
      quantityChange: fctInventoryHistoryInAnalyticsMart.quantityChange,
      inventoryValueAtCost: fctInventoryHistoryInAnalyticsMart.inventoryValueAtCost,
    })
    .from(fctInventoryHistoryInAnalyticsMart)
    .where(sql`${fctInventoryHistoryInAnalyticsMart.itemName} = ${itemName}`)
    .orderBy(fctInventoryHistoryInAnalyticsMart.inventoryDate);

  return trend.map(item => ({
    date: item.inventoryDate as string,
    quantityOnHand: Number(item.quantityOnHand || 0).toFixed(0),
    quantityChange: Number(item.quantityChange || 0).toFixed(0),
    inventoryValueAtCost: Number(item.inventoryValueAtCost || 0).toFixed(2),
  }));
}