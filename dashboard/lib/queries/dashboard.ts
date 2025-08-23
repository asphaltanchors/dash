// ABOUTME: Dashboard metrics and chart data queries for main dashboard overview
// ABOUTME: Handles revenue trends, metrics calculations, and channel analysis
import { db, fctOrdersInAnalyticsMart, bridgeCustomerCompanyInAnalyticsMart, fctDsoMetricsInAnalyticsMart, dimAccountsReceivableAgingInAnalyticsMart } from '@/lib/db';
import { desc, gte, lte, sql, count, sum, avg, and, eq } from 'drizzle-orm';
import { format } from 'date-fns';
import { getDateRange, type DashboardFilters } from '@/lib/filter-utils';

export interface DashboardMetrics {
  sales365Days: string;
  totalRevenue: string;
  totalOrders: number;
  averageOrderValue: string;
  accountsReceivable: string;
  arOrders: number;
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

export interface DSOMetric {
  metricCategory: string;
  period: number | null;
  dsoDays: string;
  collectionEfficiencyPct: string;
  totalAccountsReceivable: string;
  openInvoiceCount: number;
  dailyAvgSales: string;
  dsoAssessment: string;
  customerSegment: string | null;
  segmentAr: string | null;
  avgDaysOutstanding: string | null;
}

export interface ARAgingDetail {
  analysisLevel: string;
  orderNumber: string | null;
  customer: string | null;
  customerSegment: string | null;
  orderDate: string | null;
  dueDate: string | null;
  totalAmount: string;
  terms: string | null;
  daysOutstanding: number;
  daysPastDue: number;
  agingBucket: string;
  collectionRisk: string;
  paymentPattern: string | null;
  openInvoiceCount: number;
  totalArAmount: string;
  avgDaysOutstanding: string;
  maxDaysOutstanding: string;
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
      totalSales: sum(fctOrdersInAnalyticsMart.totalAmount),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, yearStart),
        lte(fctOrdersInAnalyticsMart.orderDate, yearEnd),
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`,
        sql`${fctOrdersInAnalyticsMart.isPaid} = true`
      )
    );

  // Previous 365 day sales - only paid orders
  const previousSales365 = await db
    .select({
      totalSales: sum(fctOrdersInAnalyticsMart.totalAmount),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, previousYearStart),
        lte(fctOrdersInAnalyticsMart.orderDate, previousYearEnd),
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`,
        sql`${fctOrdersInAnalyticsMart.isPaid} = true`
      )
    );

  // Current period revenue - only paid orders
  const currentPaidPeriod = await db
    .select({
      totalRevenue: sum(fctOrdersInAnalyticsMart.totalAmount),
      averageOrderValue: avg(fctOrdersInAnalyticsMart.totalAmount),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, currentStart),
        lte(fctOrdersInAnalyticsMart.orderDate, currentEnd),
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`,
        sql`${fctOrdersInAnalyticsMart.isPaid} = true`
      )
    );

  // Current period orders - all orders
  const currentAllPeriod = await db
    .select({
      totalOrders: count(),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, currentStart),
        lte(fctOrdersInAnalyticsMart.orderDate, currentEnd),
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`
      )
    );

  // Current period accounts receivable - unpaid orders
  const currentAR = await db
    .select({
      totalAR: sum(fctOrdersInAnalyticsMart.totalAmount),
      arOrders: count(),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, currentStart),
        lte(fctOrdersInAnalyticsMart.orderDate, currentEnd),
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`,
        sql`${fctOrdersInAnalyticsMart.isPaid} = false`
      )
    );

  // Previous period revenue - only paid orders
  const previousPaidPeriod = await db
    .select({
      totalRevenue: sum(fctOrdersInAnalyticsMart.totalAmount),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, previousStart),
        lte(fctOrdersInAnalyticsMart.orderDate, previousEnd),
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`,
        sql`${fctOrdersInAnalyticsMart.isPaid} = true`
      )
    );

  // Previous period orders - all orders
  const previousAllPeriod = await db
    .select({
      totalOrders: count(),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, previousStart),
        lte(fctOrdersInAnalyticsMart.orderDate, previousEnd),
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`
      )
    );

  const currentPaid = currentPaidPeriod[0];
  const previousPaid = previousPaidPeriod[0];
  const currentAll = currentAllPeriod[0];
  const previousAll = previousAllPeriod[0];
  const currentARData = currentAR[0];

  const currentRevenue = Number(currentPaid.totalRevenue);
  const previousRevenue = Number(previousPaid.totalRevenue);
  const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  
  const orderGrowth = previousAll.totalOrders > 0 ? ((currentAll.totalOrders - previousAll.totalOrders) / previousAll.totalOrders) * 100 : 0;

  const current365Sales = Number(sales365[0].totalSales);
  const previous365Sales = Number(previousSales365[0].totalSales);
  const sales365Growth = previous365Sales > 0 ? ((current365Sales - previous365Sales) / previous365Sales) * 100 : 0;

  return {
    sales365Days: current365Sales.toFixed(2),
    totalRevenue: currentRevenue.toFixed(2),
    totalOrders: currentAll.totalOrders,
    averageOrderValue: Number(currentPaid.averageOrderValue).toFixed(2),
    accountsReceivable: Number(currentARData.totalAR || 0).toFixed(2),
    arOrders: currentARData.arOrders || 0,
    previousPeriodRevenue: previousRevenue.toFixed(2),
    previousPeriodOrders: previousAll.totalOrders,
    revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
    orderGrowth: parseFloat(orderGrowth.toFixed(1)),
    sales365DaysGrowth: parseFloat(sales365Growth.toFixed(1)),
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
      companyDomain: bridgeCustomerCompanyInAnalyticsMart.companyDomainKey,
      isIndividualCustomer: bridgeCustomerCompanyInAnalyticsMart.isIndividualCustomer,
    })
    .from(fctOrdersInAnalyticsMart)
    .leftJoin(
      bridgeCustomerCompanyInAnalyticsMart,
      eq(fctOrdersInAnalyticsMart.customer, bridgeCustomerCompanyInAnalyticsMart.customerName)
    )
    .where(
      sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`
    )
    .orderBy(desc(fctOrdersInAnalyticsMart.orderDate))
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
        sales_channel,
        SUM(total_amount) as total_revenue,
        COUNT(*) as order_count
      FROM analytics_mart.fct_orders 
      WHERE total_amount IS NOT NULL 
        AND order_date >= ${period.period_start}
        AND order_date <= ${period.period_end}
        AND sales_channel IS NOT NULL 
        AND sales_channel != ''
        AND sales_channel NOT IN ('Contractor', 'EXPORT from WWD')
      GROUP BY sales_channel
      ORDER BY sales_channel
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

// Get customer segment metrics with 4-year trailing trends
export async function getSegmentMetrics(): Promise<SalesChannelMetric[]> {
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
  
  const segmentMap = new Map<string, SalesPeriodMetric[]>();
  
  // Query each period separately to get trailing year data
  for (const period of periods) {
    const segmentData = await db.execute(sql`
      SELECT 
        customer_segment as sales_channel,
        SUM(total_amount) as total_revenue,
        COUNT(*) as order_count
      FROM analytics_mart.fct_orders 
      WHERE total_amount IS NOT NULL 
        AND order_date >= ${period.period_start}
        AND order_date <= ${period.period_end}
        AND customer_segment IS NOT NULL 
        AND customer_segment != ''
      GROUP BY customer_segment
      ORDER BY customer_segment
    `);

    // Handle different return formats from Drizzle
    const results = segmentData as unknown as Array<{ 
      sales_channel: string; 
      total_revenue: string; 
      order_count: number;
    }>;
    
    results.forEach(row => {
      const segment = row.sales_channel;
      
      if (!segmentMap.has(segment)) {
        segmentMap.set(segment, []);
      }
      
      segmentMap.get(segment)!.push({
        period_start: period.period_start,
        period_end: period.period_end,
        total_revenue: Number(row.total_revenue).toFixed(2),
        order_count: row.order_count.toString(),
      });
    });
  }

  // Convert to final format and ensure periods are in reverse chronological order (most recent first)
  return Array.from(segmentMap.entries()).map(([sales_channel, periods]) => ({
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

// Get DSO (Days Sales Outstanding) metrics
export async function getDSOMetrics(): Promise<DSOMetric[]> {
  const dsoData = await db
    .select({
      metricCategory: fctDsoMetricsInAnalyticsMart.metricCategory,
      period: fctDsoMetricsInAnalyticsMart.period,
      dsoDays: fctDsoMetricsInAnalyticsMart.dsoDays,
      collectionEfficiencyPct: fctDsoMetricsInAnalyticsMart.collectionEfficiencyPct,
      totalAccountsReceivable: fctDsoMetricsInAnalyticsMart.totalAccountsReceivable,
      openInvoiceCount: fctDsoMetricsInAnalyticsMart.openInvoiceCount,
      dailyAvgSales: fctDsoMetricsInAnalyticsMart.dailyAvgSales,
      dsoAssessment: fctDsoMetricsInAnalyticsMart.dsoAssessment,
      customerSegment: fctDsoMetricsInAnalyticsMart.customerSegment,
      segmentAr: fctDsoMetricsInAnalyticsMart.segmentAr,
      avgDaysOutstanding: fctDsoMetricsInAnalyticsMart.avgDaysOutstanding,
    })
    .from(fctDsoMetricsInAnalyticsMart);

  return dsoData.map(metric => ({
    metricCategory: metric.metricCategory || 'Unknown',
    period: metric.period,
    dsoDays: Number(metric.dsoDays || 0).toFixed(1),
    collectionEfficiencyPct: Number(metric.collectionEfficiencyPct || 0).toFixed(1),
    totalAccountsReceivable: Number(metric.totalAccountsReceivable || 0).toFixed(2),
    openInvoiceCount: Number(metric.openInvoiceCount || 0),
    dailyAvgSales: Number(metric.dailyAvgSales || 0).toFixed(2),
    dsoAssessment: metric.dsoAssessment || 'Unknown',
    customerSegment: metric.customerSegment,
    segmentAr: metric.segmentAr ? Number(metric.segmentAr).toFixed(2) : null,
    avgDaysOutstanding: metric.avgDaysOutstanding ? Number(metric.avgDaysOutstanding).toFixed(1) : null,
  }));
}

// Get current DSO summary for executive dashboard
export async function getCurrentDSO(): Promise<DSOMetric | null> {
  const metrics = await getDSOMetrics();
  const overallMetric = metrics.find(m => m.metricCategory === 'Overall DSO Metrics');
  return overallMetric || null;
}

// Get accounts receivable aging details
export async function getARAgingDetails(): Promise<ARAgingDetail[]> {
  const arData = await db
    .select({
      analysisLevel: dimAccountsReceivableAgingInAnalyticsMart.analysisLevel,
      orderNumber: dimAccountsReceivableAgingInAnalyticsMart.orderNumber,
      customer: dimAccountsReceivableAgingInAnalyticsMart.customer,
      customerSegment: dimAccountsReceivableAgingInAnalyticsMart.customerSegment,
      orderDate: dimAccountsReceivableAgingInAnalyticsMart.orderDate,
      dueDate: dimAccountsReceivableAgingInAnalyticsMart.dueDate,
      totalAmount: dimAccountsReceivableAgingInAnalyticsMart.totalAmount,
      terms: dimAccountsReceivableAgingInAnalyticsMart.terms,
      daysOutstanding: dimAccountsReceivableAgingInAnalyticsMart.daysOutstanding,
      daysPastDue: dimAccountsReceivableAgingInAnalyticsMart.daysPastDue,
      agingBucket: dimAccountsReceivableAgingInAnalyticsMart.agingBucket,
      collectionRisk: dimAccountsReceivableAgingInAnalyticsMart.collectionRisk,
      paymentPattern: dimAccountsReceivableAgingInAnalyticsMart.paymentPattern,
      openInvoiceCount: dimAccountsReceivableAgingInAnalyticsMart.openInvoiceCount,
      totalArAmount: dimAccountsReceivableAgingInAnalyticsMart.totalArAmount,
      avgDaysOutstanding: dimAccountsReceivableAgingInAnalyticsMart.avgDaysOutstanding,
      maxDaysOutstanding: dimAccountsReceivableAgingInAnalyticsMart.maxDaysOutstanding,
    })
    .from(dimAccountsReceivableAgingInAnalyticsMart)
    .orderBy(desc(dimAccountsReceivableAgingInAnalyticsMart.daysOutstanding));

  return arData.map(item => ({
    analysisLevel: item.analysisLevel || 'Unknown',
    orderNumber: item.orderNumber,
    customer: item.customer,
    customerSegment: item.customerSegment,
    orderDate: item.orderDate as string | null,
    dueDate: item.dueDate as string | null,
    totalAmount: Number(item.totalAmount || 0).toFixed(2),
    terms: item.terms,
    daysOutstanding: Number(item.daysOutstanding || 0),
    daysPastDue: Number(item.daysPastDue || 0),
    agingBucket: item.agingBucket || 'Unknown',
    collectionRisk: item.collectionRisk || 'Unknown',
    paymentPattern: item.paymentPattern,
    openInvoiceCount: Number(item.openInvoiceCount || 0),
    totalArAmount: Number(item.totalArAmount || 0).toFixed(2),
    avgDaysOutstanding: Number(item.avgDaysOutstanding || 0).toFixed(1),
    maxDaysOutstanding: Number(item.maxDaysOutstanding || 0).toFixed(1),
  }));
}

// Get problem accounts (high-risk AR)
export async function getProblemAccounts(): Promise<ARAgingDetail[]> {
  const arDetails = await getARAgingDetails();
  return arDetails.filter(item => 
    item.analysisLevel === 'Individual Invoices' &&
    (item.collectionRisk === 'High Risk' || item.collectionRisk === 'Critical Risk')
  );
}