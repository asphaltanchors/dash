import { db, fctOrdersInAnalyticsMart } from '@/lib/db';
import { desc, gte, sql, count, sum, avg, and } from 'drizzle-orm';

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
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
  
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];

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

  const currentRevenue = parseFloat(current.totalRevenue || '0');
  const previousRevenue = parseFloat(previous.totalRevenue || '0');
  const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  
  const orderGrowth = previous.totalOrders > 0 ? ((current.totalOrders - previous.totalOrders) / previous.totalOrders) * 100 : 0;

  return {
    totalRevenue: currentRevenue.toFixed(2),
    totalOrders: current.totalOrders,
    averageOrderValue: parseFloat(current.averageOrderValue || '0').toFixed(2),
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
    orderDate: order.orderDate || 'N/A',
    totalAmount: parseFloat(order.totalAmount || '0').toFixed(2),
    status: order.status || 'Unknown',
    isPaid: order.isPaid || false,
  }));
}

// Get daily revenue for the last 30 days
export async function getDailyRevenue(): Promise<DailyRevenue[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

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
    date: day.date || 'N/A',
    revenue: parseFloat(day.revenue || '0').toFixed(2),
    orderCount: day.orderCount,
  }));
}

// Get order status breakdown
export async function getOrderStatusBreakdown() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

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