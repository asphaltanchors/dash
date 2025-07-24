// ABOUTME: Dashboard metrics and chart data queries for main dashboard overview
// ABOUTME: Handles revenue trends, metrics calculations, and channel analysis
import { db, baseFctOrdersCurrentInAnalyticsMart, bridgeCustomerCompanyInAnalyticsMart } from '@/lib/db';
import { desc, gte, lte, sql, count, sum, avg, and, eq } from 'drizzle-orm';
import { format } from 'date-fns';
import { getDateRange, type DashboardFilters } from '@/lib/filter-utils';

export interface DashboardMetrics {
  sales365Days: string;
  totalRevenue: string;
  totalOrders: number;
  averageOrderValue: string;
  previousPeriodRevenue: string;
  previousPeriodOrders: number;
  revenueGrowth: number;
  orderGrowth: number;
  sales365DaysGrowth: number;
}

export interface RecentOrder {
  orderNumber: string;
  customer: string;
  orderDate: string;
  totalAmount: string;
  status: string;
  isPaid: boolean;
  companyDomain: string | null;
  isIndividualCustomer: boolean;
}

export interface WeeklyRevenue {
  date: string;
  revenue: string;
  orderCount: number;
}

export interface SalesPeriodMetric {
  period_start: string;
  period_end: string;
  total_revenue: string;
  order_count: string;
}

export interface SalesChannelMetric {
  sales_channel: string;
  periods: SalesPeriodMetric[];
}

// Get dashboard metrics with flexible period comparison
export async function getDashboardMetrics(filters: DashboardFilters = {}): Promise<DashboardMetrics> {
  const currentDateRange = getDateRange(filters.period || '30d', true);
  const currentStart = currentDateRange.start;
  const currentEnd = currentDateRange.end;
  
  // For "all" period, use a fallback comparison period (previous year)
  const fallbackDateRange = getDateRange('1y', true);
  const previousStart = currentDateRange.compareStart || fallbackDateRange.compareStart!;
  const previousEnd = currentDateRange.compareEnd || fallbackDateRange.compareEnd!;

  // Calculate 365 day periods (for 365 day sales card)
  const yearDateRange = getDateRange('1y', true);
  const yearStart = yearDateRange.start;
  const yearEnd = yearDateRange.end;
  const previousYearStart = yearDateRange.compareStart!;
  const previousYearEnd = yearDateRange.compareEnd!;


  // 365 day sales - only paid orders 
  const sales365 = await db
    .select({
      totalSales: sum(baseFctOrdersCurrentInAnalyticsMart.totalAmount),
    })
    .from(baseFctOrdersCurrentInAnalyticsMart)
    .where(
      and(
        gte(baseFctOrdersCurrentInAnalyticsMart.orderDate, yearStart),
        lte(baseFctOrdersCurrentInAnalyticsMart.orderDate, yearEnd),
        sql`${baseFctOrdersCurrentInAnalyticsMart.totalAmount} is not null`,
        sql`${baseFctOrdersCurrentInAnalyticsMart.isPaid} = true`
      )
    );

  // Previous 365 day sales - only paid orders
  const previousSales365 = await db
    .select({
      totalSales: sum(baseFctOrdersCurrentInAnalyticsMart.totalAmount),
    })
    .from(baseFctOrdersCurrentInAnalyticsMart)
    .where(
      and(
        gte(baseFctOrdersCurrentInAnalyticsMart.orderDate, previousYearStart),
        lte(baseFctOrdersCurrentInAnalyticsMart.orderDate, previousYearEnd),
        sql`${baseFctOrdersCurrentInAnalyticsMart.totalAmount} is not null`,
        sql`${baseFctOrdersCurrentInAnalyticsMart.isPaid} = true`
      )
    );

  // Current period (based on selected period)
  const currentPeriod = await db
    .select({
      totalRevenue: sum(baseFctOrdersCurrentInAnalyticsMart.totalAmount),
      totalOrders: count(),
      averageOrderValue: avg(baseFctOrdersCurrentInAnalyticsMart.totalAmount),
    })
    .from(baseFctOrdersCurrentInAnalyticsMart)
    .where(
      and(
        gte(baseFctOrdersCurrentInAnalyticsMart.orderDate, currentStart),
        lte(baseFctOrdersCurrentInAnalyticsMart.orderDate, currentEnd),
        sql`${baseFctOrdersCurrentInAnalyticsMart.totalAmount} is not null`
      )
    );

  // Previous period (comparison period)
  const previousPeriod = await db
    .select({
      totalRevenue: sum(baseFctOrdersCurrentInAnalyticsMart.totalAmount),
      totalOrders: count(),
    })
    .from(baseFctOrdersCurrentInAnalyticsMart)
    .where(
      and(
        gte(baseFctOrdersCurrentInAnalyticsMart.orderDate, previousStart),
        lte(baseFctOrdersCurrentInAnalyticsMart.orderDate, previousEnd),
        sql`${baseFctOrdersCurrentInAnalyticsMart.totalAmount} is not null`
      )
    );

  const current = currentPeriod[0];
  const previous = previousPeriod[0];

  const currentRevenue = Number(current.totalRevenue);
  const previousRevenue = Number(previous.totalRevenue);
  const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  
  const orderGrowth = previous.totalOrders > 0 ? ((current.totalOrders - previous.totalOrders) / previous.totalOrders) * 100 : 0;

  const current365Sales = Number(sales365[0].totalSales);
  const previous365Sales = Number(previousSales365[0].totalSales);
  const sales365Growth = previous365Sales > 0 ? ((current365Sales - previous365Sales) / previous365Sales) * 100 : 0;

  return {
    sales365Days: current365Sales.toFixed(2),
    totalRevenue: currentRevenue.toFixed(2),
    totalOrders: current.totalOrders,
    averageOrderValue: Number(current.averageOrderValue).toFixed(2),
    previousPeriodRevenue: previousRevenue.toFixed(2),
    previousPeriodOrders: previous.totalOrders,
    revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
    orderGrowth: parseFloat(orderGrowth.toFixed(1)),
    sales365DaysGrowth: parseFloat(sales365Growth.toFixed(1)),
  };
}

// Get recent orders
export async function getRecentOrders(limit: number = 20): Promise<RecentOrder[]> {
  const orders = await db
    .select({
      orderNumber: baseFctOrdersCurrentInAnalyticsMart.orderNumber,
      customer: baseFctOrdersCurrentInAnalyticsMart.customer,
      orderDate: baseFctOrdersCurrentInAnalyticsMart.orderDate,
      totalAmount: baseFctOrdersCurrentInAnalyticsMart.totalAmount,
      status: baseFctOrdersCurrentInAnalyticsMart.status,
      isPaid: baseFctOrdersCurrentInAnalyticsMart.isPaid,
      companyDomain: bridgeCustomerCompanyInAnalyticsMart.companyDomainKey,
      isIndividualCustomer: bridgeCustomerCompanyInAnalyticsMart.isIndividualCustomer,
    })
    .from(baseFctOrdersCurrentInAnalyticsMart)
    .leftJoin(
      bridgeCustomerCompanyInAnalyticsMart,
      eq(baseFctOrdersCurrentInAnalyticsMart.customer, bridgeCustomerCompanyInAnalyticsMart.customerName)
    )
    .where(
      sql`${baseFctOrdersCurrentInAnalyticsMart.totalAmount} is not null`
    )
    .orderBy(desc(baseFctOrdersCurrentInAnalyticsMart.orderDate))
    .limit(limit);

  return orders.map(order => ({
    orderNumber: order.orderNumber || 'N/A',
    customer: order.customer || 'Unknown',
    orderDate: order.orderDate as string,
    totalAmount: Number(order.totalAmount).toFixed(2),
    status: order.status!,
    isPaid: order.isPaid!,
    companyDomain: order.companyDomain,
    isIndividualCustomer: order.isIndividualCustomer || false,
  }));
}

// Get channel metrics with 4-year trailing trends
export async function getChannelMetrics(): Promise<SalesChannelMetric[]> {
  const today = new Date();
  const fourYearsAgo = new Date();
  fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4);
  
  // Generate 4 trailing year periods from today
  const periods = [];
  for (let i = 0; i < 4; i++) {
    const periodEnd = new Date(today);
    periodEnd.setFullYear(periodEnd.getFullYear() - i);
    
    const periodStart = new Date(periodEnd);
    periodStart.setFullYear(periodStart.getFullYear() - 1);
    periodStart.setDate(periodStart.getDate() + 1); // Start day after to avoid overlap
    
    periods.push({
      period_start: format(periodStart, 'yyyy-MM-dd'),
      period_end: format(periodEnd, 'yyyy-MM-dd'),
      period_label: `${periodStart.getFullYear()}-${periodEnd.getFullYear()}`
    });
  }
  
  const channelMap = new Map<string, SalesPeriodMetric[]>();
  
  // Query each period separately to get trailing year data
  for (const period of periods) {
    const channelData = await db.execute(sql`
      SELECT 
        class as sales_channel,
        SUM(total_amount) as total_revenue,
        COUNT(*) as order_count
      FROM analytics_mart.fct_orders 
      WHERE total_amount IS NOT NULL 
        AND order_date >= ${period.period_start}
        AND order_date <= ${period.period_end}
        AND class IS NOT NULL 
        AND class != ''
        AND class NOT IN ('Contractor', 'EXPORT from WWD')
      GROUP BY class
      ORDER BY class
    `);

    // Handle different return formats from Drizzle
    const results = channelData as unknown as Array<{ 
      sales_channel: string; 
      total_revenue: string; 
      order_count: number;
    }>;
    
    results.forEach(row => {
      const channel = row.sales_channel;
      
      if (!channelMap.has(channel)) {
        channelMap.set(channel, []);
      }
      
      channelMap.get(channel)!.push({
        period_start: period.period_start,
        period_end: period.period_end,
        total_revenue: Number(row.total_revenue).toFixed(2),
        order_count: row.order_count.toString(),
      });
    });
  }

  // Convert to final format and ensure periods are in reverse chronological order (most recent first)
  return Array.from(channelMap.entries()).map(([sales_channel, periods]) => ({
    sales_channel,
    periods: periods.sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime()),
  }));
}

// Get revenue trend for specified period with appropriate granularity
export async function getWeeklyRevenue(filters: DashboardFilters = {}): Promise<WeeklyRevenue[]> {
  const period = filters.period || '30d';
  
  // Use the actual selected period for data range
  const dateRange = getDateRange(period, false);
  const startDate = dateRange.start;
  const endDate = dateRange.end;

  // Determine appropriate grouping based on period length
  let dateGrouping: string;
  switch (period) {
    case '7d':
      dateGrouping = 'day'; // Daily granularity for 7 days
      break;
    case '30d':
      dateGrouping = 'week'; // Weekly granularity for 30 days
      break;
    case '90d':
      dateGrouping = 'week'; // Weekly granularity for 90 days
      break;
    case '1y':
      dateGrouping = 'month'; // Monthly granularity for 1 year
      break;
    case 'all':
      dateGrouping = 'quarter'; // Quarterly granularity for all time
      break;
    default:
      dateGrouping = 'week';
  }

  const revenueData = await db.execute(sql`
    SELECT 
      DATE_TRUNC('${sql.raw(dateGrouping)}', order_date) as period_start,
      SUM(total_amount) as revenue,
      COUNT(*) as order_count
    FROM analytics_mart.fct_orders
    WHERE order_date >= ${startDate}
      AND order_date <= ${endDate}
      AND total_amount IS NOT NULL
    GROUP BY DATE_TRUNC('${sql.raw(dateGrouping)}', order_date)
    ORDER BY period_start
  `);

  // Handle different return formats from Drizzle
  const results = revenueData as unknown as Array<{ period_start: string; revenue: string; order_count: number }>;
  
  return results.map(period => ({
    date: period.period_start,
    revenue: Number(period.revenue).toFixed(2),
    orderCount: Number(period.order_count),
  }));
}

// Get order status breakdown
export async function getOrderStatusBreakdown() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = format(thirtyDaysAgo, 'yyyy-MM-dd');

  return await db
    .select({
      status: baseFctOrdersCurrentInAnalyticsMart.status,
      count: count(),
      totalAmount: sum(baseFctOrdersCurrentInAnalyticsMart.totalAmount),
    })
    .from(baseFctOrdersCurrentInAnalyticsMart)
    .where(
      and(
        gte(baseFctOrdersCurrentInAnalyticsMart.orderDate, thirtyDaysAgoStr),
        sql`${baseFctOrdersCurrentInAnalyticsMart.totalAmount} is not null`
      )
    )
    .groupBy(baseFctOrdersCurrentInAnalyticsMart.status)
    .orderBy(desc(count()));
}