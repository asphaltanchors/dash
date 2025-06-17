import { db, fctOrdersInAnalyticsMart, fctProductsInAnalyticsMart } from '@/lib/db';
import { desc, gte, sql, count, sum, avg, and, notInArray } from 'drizzle-orm';
import { format } from 'date-fns';

export interface DashboardMetrics {
  totalRevenue: string;
  totalOrders: number;
  averageOrderValue: string;
  uniqueCustomers: number;
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

export interface DailyRevenue {
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

  // Current period (last 30 days)
  const currentPeriod = await db
    .select({
      totalRevenue: sum(fctOrdersInAnalyticsMart.totalAmount),
      totalOrders: count(),
      averageOrderValue: avg(fctOrdersInAnalyticsMart.totalAmount),
      uniqueCustomers: sql<number>`count(distinct ${fctOrdersInAnalyticsMart.customer})`,
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
    totalRevenue: currentRevenue.toFixed(2),
    totalOrders: current.totalOrders,
    averageOrderValue: Number(current.averageOrderValue || 0).toFixed(2),
    uniqueCustomers: current.uniqueCustomers,
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

// Get daily revenue for the last 30 days
export async function getDailyRevenue(): Promise<DailyRevenue[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = format(thirtyDaysAgo, 'yyyy-MM-dd');

  const dailyData = await db
    .select({
      date: fctOrdersInAnalyticsMart.orderDate,
      revenue: sum(fctOrdersInAnalyticsMart.totalAmount),
      orderCount: count(),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, thirtyDaysAgoStr),
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`
      )
    )
    .groupBy(fctOrdersInAnalyticsMart.orderDate)
    .orderBy(fctOrdersInAnalyticsMart.orderDate);

  return dailyData.map(day => ({
    date: day.date as string,
    revenue: Number(day.revenue || 0).toFixed(2),
    orderCount: day.orderCount,
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
  const results = (distribution.rows || distribution) as Array<{ margin_range: string; product_count: number }>;
  const totalProducts = results.reduce((sum, item) => sum + item.product_count, 0);

  return results.map(item => ({
    marginRange: item.margin_range,
    productCount: item.product_count,
    percentage: totalProducts > 0 ? (item.product_count / totalProducts) * 100 : 0,
  }));
}