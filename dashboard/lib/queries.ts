import { db, fctOrdersInAnalyticsMart, fctProductsInAnalyticsMart, fctInventoryHistoryInAnalyticsMart } from '@/lib/db';
import { desc, gte, sql, count, sum, avg, and, notInArray } from 'drizzle-orm';
import { format } from 'date-fns';

export interface DashboardMetrics {
  sales365Days: string;
  totalRevenue: string;
  totalOrders: number;
  averageOrderValue: string;
  previousPeriodRevenue: string;
  previousPeriodOrders: number;
  revenueGrowth: number;
  orderGrowth: number;
}

export interface RecentOrder {
  orderNumber: string;
  customer: string;
  orderDate: string;
  totalAmount: string;
  status: string;
  isPaid: boolean;
}

export interface WeeklyRevenue {
  date: string;
  revenue: string;
  orderCount: number;
}

// Get last 30 days metrics compared to previous 30 days
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = format(thirtyDaysAgo, 'yyyy-MM-dd');
  
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sixtyDaysAgoStr = format(sixtyDaysAgo, 'yyyy-MM-dd');

  const threeSixtyFiveDaysAgo = new Date();
  threeSixtyFiveDaysAgo.setDate(threeSixtyFiveDaysAgo.getDate() - 365);
  const threeSixtyFiveDaysAgoStr = format(threeSixtyFiveDaysAgo, 'yyyy-MM-dd');

  // 365 day sales
  const sales365 = await db
    .select({
      totalSales: sum(fctOrdersInAnalyticsMart.totalAmount),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, threeSixtyFiveDaysAgoStr),
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`
      )
    );

  // Current period (last 30 days)
  const currentPeriod = await db
    .select({
      totalRevenue: sum(fctOrdersInAnalyticsMart.totalAmount),
      totalOrders: count(),
      averageOrderValue: avg(fctOrdersInAnalyticsMart.totalAmount),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, thirtyDaysAgoStr),
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`
      )
    );

  // Previous period (30-60 days ago)
  const previousPeriod = await db
    .select({
      totalRevenue: sum(fctOrdersInAnalyticsMart.totalAmount),
      totalOrders: count(),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, sixtyDaysAgoStr),
        sql`${fctOrdersInAnalyticsMart.orderDate} < ${thirtyDaysAgoStr}`,
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`
      )
    );

  const current = currentPeriod[0];
  const previous = previousPeriod[0];

  const currentRevenue = Number(current.totalRevenue || 0);
  const previousRevenue = Number(previous.totalRevenue || 0);
  const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  
  const orderGrowth = previous.totalOrders > 0 ? ((current.totalOrders - previous.totalOrders) / previous.totalOrders) * 100 : 0;

  return {
    sales365Days: Number(sales365[0].totalSales || 0).toFixed(2),
    totalRevenue: currentRevenue.toFixed(2),
    totalOrders: current.totalOrders,
    averageOrderValue: Number(current.averageOrderValue || 0).toFixed(2),
    previousPeriodRevenue: previousRevenue.toFixed(2),
    previousPeriodOrders: previous.totalOrders,
    revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
    orderGrowth: parseFloat(orderGrowth.toFixed(1)),
  };
}

// Get recent orders
export async function getRecentOrders(limit: number = 20): Promise<RecentOrder[]> {
  const orders = await db
    .select({
      orderNumber: fctOrdersInAnalyticsMart.orderNumber,
      customer: fctOrdersInAnalyticsMart.customer,
      orderDate: fctOrdersInAnalyticsMart.orderDate,
      totalAmount: fctOrdersInAnalyticsMart.totalAmount,
      status: fctOrdersInAnalyticsMart.status,
      isPaid: fctOrdersInAnalyticsMart.isPaid,
    })
    .from(fctOrdersInAnalyticsMart)
    .where(sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`)
    .orderBy(desc(fctOrdersInAnalyticsMart.orderDate))
    .limit(limit);

  return orders.map(order => ({
    orderNumber: order.orderNumber || 'N/A',
    customer: order.customer || 'Unknown',
    orderDate: order.orderDate as string,
    totalAmount: Number(order.totalAmount || 0).toFixed(2),
    status: order.status!,
    isPaid: order.isPaid!,
  }));
}

// Get weekly revenue for the last year
export async function getWeeklyRevenue(): Promise<WeeklyRevenue[]> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAgoStr = format(oneYearAgo, 'yyyy-MM-dd');

  const weeklyData = await db.execute(sql`
    SELECT 
      DATE_TRUNC('week', order_date) as week_start,
      SUM(total_amount) as revenue,
      COUNT(*) as order_count
    FROM analytics_mart.fct_orders
    WHERE order_date >= ${oneYearAgoStr}
      AND total_amount IS NOT NULL
    GROUP BY DATE_TRUNC('week', order_date)
    ORDER BY week_start
  `);

  // Handle different return formats from Drizzle
  const results = weeklyData as unknown as Array<{ week_start: string; revenue: string; order_count: number }>;
  
  return results.map(week => ({
    date: week.week_start,
    revenue: Number(week.revenue || 0).toFixed(2),
    orderCount: Number(week.order_count || 0),
  }));
}

// Get order status breakdown
export async function getOrderStatusBreakdown() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = format(thirtyDaysAgo, 'yyyy-MM-dd');

  return await db
    .select({
      status: fctOrdersInAnalyticsMart.status,
      count: count(),
      totalAmount: sum(fctOrdersInAnalyticsMart.totalAmount),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, thirtyDaysAgoStr),
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`
      )
    )
    .groupBy(fctOrdersInAnalyticsMart.status)
    .orderBy(desc(count()));
}

// Product interfaces and queries
export interface ProductMetrics {
  totalProducts: number;
  averageMargin: string;
  totalInventoryValue: string;
  kitProducts: number;
  averageSalesPrice: string;
  averagePurchaseCost: string;
  marginGrowth: number;
}

export interface Product {
  quickBooksInternalId: string;
  itemName: string;
  productFamily: string;
  materialType: string;
  salesPrice: string;
  purchaseCost: string;
  marginPercentage: string;
  marginAmount: string;
  isKit: boolean;
  itemType: string;
}

export interface ProductFamilyBreakdown {
  productFamily: string;
  productCount: number;
  averageMargin: string;
  totalValue: string;
}

export interface MarginDistribution {
  marginRange: string;
  productCount: number;
  percentage: number;
}

// Get product metrics
export async function getProductMetrics(): Promise<ProductMetrics> {
  const metrics = await db
    .select({
      totalProducts: count(),
      averageMargin: avg(fctProductsInAnalyticsMart.marginPercentage),
      totalInventoryValue: sum(fctProductsInAnalyticsMart.salesPrice),
      kitProducts: sql<number>`count(case when ${fctProductsInAnalyticsMart.isKit} = true then 1 end)`,
      averageSalesPrice: avg(fctProductsInAnalyticsMart.salesPrice),
      averagePurchaseCost: avg(fctProductsInAnalyticsMart.purchaseCost),
    })
    .from(fctProductsInAnalyticsMart)
    .where(and(
      sql`${fctProductsInAnalyticsMart.salesPrice} is not null`,
      notInArray(fctProductsInAnalyticsMart.itemType, ['NonInventory', 'OtherCharge'])
    ));

  const result = metrics[0];

  return {
    totalProducts: result.totalProducts,
    averageMargin: Number(result.averageMargin || 0).toFixed(1),
    totalInventoryValue: Number(result.totalInventoryValue || 0).toFixed(2),
    kitProducts: result.kitProducts,
    averageSalesPrice: Number(result.averageSalesPrice || 0).toFixed(2),
    averagePurchaseCost: Number(result.averagePurchaseCost || 0).toFixed(2),
    marginGrowth: 0, // TODO: Calculate based on historical data when available
  };
}

// Get product list
export async function getProducts(limit: number = 50): Promise<Product[]> {
  const products = await db
    .select({
      quickBooksInternalId: fctProductsInAnalyticsMart.quickBooksInternalId,
      itemName: fctProductsInAnalyticsMart.itemName,
      productFamily: fctProductsInAnalyticsMart.productFamily,
      materialType: fctProductsInAnalyticsMart.materialType,
      salesPrice: fctProductsInAnalyticsMart.salesPrice,
      purchaseCost: fctProductsInAnalyticsMart.purchaseCost,
      marginPercentage: fctProductsInAnalyticsMart.marginPercentage,
      marginAmount: fctProductsInAnalyticsMart.marginAmount,
      isKit: fctProductsInAnalyticsMart.isKit,
      itemType: fctProductsInAnalyticsMart.itemType,
    })
    .from(fctProductsInAnalyticsMart)
    .where(and(
      sql`${fctProductsInAnalyticsMart.salesPrice} is not null`,
      notInArray(fctProductsInAnalyticsMart.itemType, ['NonInventory', 'OtherCharge'])
    ))
    .orderBy(desc(fctProductsInAnalyticsMart.marginAmount))
    .limit(limit);

  return products.map(product => ({
    quickBooksInternalId: product.quickBooksInternalId || 'N/A',
    itemName: product.itemName || 'Unknown',
    productFamily: product.productFamily || 'Other',
    materialType: product.materialType || 'Unknown',
    salesPrice: Number(product.salesPrice || 0).toFixed(2),
    purchaseCost: Number(product.purchaseCost || 0).toFixed(2),
    marginPercentage: Number(product.marginPercentage || 0).toFixed(1),
    marginAmount: Number(product.marginAmount || 0).toFixed(2),
    isKit: product.isKit || false,
    itemType: product.itemType || 'Unknown',
  }));
}

// Get single product by name
export async function getProductByName(itemName: string): Promise<Product | null> {
  const products = await db
    .select({
      quickBooksInternalId: fctProductsInAnalyticsMart.quickBooksInternalId,
      itemName: fctProductsInAnalyticsMart.itemName,
      productFamily: fctProductsInAnalyticsMart.productFamily,
      materialType: fctProductsInAnalyticsMart.materialType,
      salesPrice: fctProductsInAnalyticsMart.salesPrice,
      purchaseCost: fctProductsInAnalyticsMart.purchaseCost,
      marginPercentage: fctProductsInAnalyticsMart.marginPercentage,
      marginAmount: fctProductsInAnalyticsMart.marginAmount,
      isKit: fctProductsInAnalyticsMart.isKit,
      itemType: fctProductsInAnalyticsMart.itemType,
    })
    .from(fctProductsInAnalyticsMart)
    .where(sql`${fctProductsInAnalyticsMart.itemName} = ${itemName}`)
    .limit(1);

  if (products.length === 0) {
    return null;
  }

  const product = products[0];
  return {
    quickBooksInternalId: product.quickBooksInternalId || 'N/A',
    itemName: product.itemName || 'Unknown',
    productFamily: product.productFamily || 'Other',
    materialType: product.materialType || 'Unknown',
    salesPrice: Number(product.salesPrice || 0).toFixed(2),
    purchaseCost: Number(product.purchaseCost || 0).toFixed(2),
    marginPercentage: Number(product.marginPercentage || 0).toFixed(1),
    marginAmount: Number(product.marginAmount || 0).toFixed(2),
    isKit: product.isKit || false,
    itemType: product.itemType || 'Unknown',
  };
}

// Get product family breakdown
export async function getProductFamilyBreakdown(): Promise<ProductFamilyBreakdown[]> {
  const breakdown = await db
    .select({
      productFamily: fctProductsInAnalyticsMart.productFamily,
      productCount: count(),
      averageMargin: avg(fctProductsInAnalyticsMart.marginPercentage),
      totalValue: sum(fctProductsInAnalyticsMart.salesPrice),
    })
    .from(fctProductsInAnalyticsMart)
    .where(and(
      sql`${fctProductsInAnalyticsMart.salesPrice} is not null`,
      notInArray(fctProductsInAnalyticsMart.itemType, ['NonInventory', 'OtherCharge'])
    ))
    .groupBy(fctProductsInAnalyticsMart.productFamily)
    .orderBy(desc(count()));

  return breakdown.map(item => ({
    productFamily: item.productFamily || 'Other',
    productCount: item.productCount,
    averageMargin: Number(item.averageMargin || 0).toFixed(1),
    totalValue: Number(item.totalValue || 0).toFixed(2),
  }));
}

// Get margin distribution
export async function getMarginDistribution(): Promise<MarginDistribution[]> {
  const distribution = await db.execute(sql`
    SELECT 
      margin_range,
      COUNT(*) as product_count
    FROM (
      SELECT 
        CASE 
          WHEN margin_percentage < 10 THEN '0-10%'
          WHEN margin_percentage < 20 THEN '10-20%'
          WHEN margin_percentage < 30 THEN '20-30%'
          WHEN margin_percentage < 40 THEN '30-40%'
          WHEN margin_percentage < 50 THEN '40-50%'
          ELSE '50%+'
        END as margin_range
      FROM analytics_mart.fct_products 
      WHERE margin_percentage IS NOT NULL
        AND item_type NOT IN ('NonInventory', 'OtherCharge')
    ) ranges
    GROUP BY margin_range
    ORDER BY 
      CASE margin_range
        WHEN '0-10%' THEN 1
        WHEN '10-20%' THEN 2
        WHEN '20-30%' THEN 3
        WHEN '30-40%' THEN 4
        WHEN '40-50%' THEN 5
        ELSE 6
      END
  `);

  // Handle different return formats from Drizzle
  const results = distribution as unknown as Array<{ margin_range: string; product_count: number }>;
  const totalProducts = results.reduce((sum, item) => sum + item.product_count, 0);

  return results.map(item => ({
    marginRange: item.margin_range,
    productCount: item.product_count,
    percentage: totalProducts > 0 ? (item.product_count / totalProducts) * 100 : 0,
  }));
}

// Inventory interfaces and queries
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