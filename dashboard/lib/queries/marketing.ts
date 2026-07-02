// ABOUTME: Marketing attribution queries including channel performance and UTM campaign analytics
// ABOUTME: Handles acquisition channel revenue, customer attribution, and campaign ROI metrics
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getDateRange, type DashboardFilters } from '@/lib/filter-utils';

export interface AttributionMetrics {
  totalAttributedRevenue: string;
  totalAttributedOrders: number;
  totalAttributedCustomers: number;
  topChannel: string;
  topChannelRevenue: string;
  avgRevenuePerChannel: string;
  attributedCustomerPercentage: string;
}

export interface ChannelRevenue {
  acquisitionChannel: string;
  totalRevenue: string;
  orderCount: number;
  customerCount: number;
  avgOrderValue: string;
  revenuePercentage: number;
}

export interface CampaignPerformance {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  totalRevenue: string;
  orderCount: number;
  customerCount: number;
  avgOrderValue: string;
  marketingOptIns: number;
  optInRate: string;
}

export interface MonthlyChannelRevenue {
  month: string;
  channels: Record<string, number>;
}

// Get overall attribution metrics
export async function getAttributionMetrics(filters: DashboardFilters = {}): Promise<AttributionMetrics> {
  const dateRange = getDateRange(filters.period || '1y', false);
  const startDate = dateRange.start;
  const endDate = dateRange.end;

  // Get total attributed revenue and orders
  const attributedData = await db.execute(sql`
    SELECT
      COALESCE(SUM(revenue), 0) as total_revenue,
      COUNT(DISTINCT order_id) as total_orders,
      COUNT(DISTINCT customer_id) as total_customers
    FROM analytics_mart.fct_order_attribution
    WHERE order_date >= ${startDate}
      AND order_date <= ${endDate}
      AND revenue IS NOT NULL
      AND acquisition_channel IS NOT NULL
      AND acquisition_channel != ''
  `);

  // Get top channel
  const topChannelData = await db.execute(sql`
    SELECT
      acquisition_channel,
      SUM(revenue) as channel_revenue
    FROM analytics_mart.fct_order_attribution
    WHERE order_date >= ${startDate}
      AND order_date <= ${endDate}
      AND revenue IS NOT NULL
      AND acquisition_channel IS NOT NULL
      AND acquisition_channel != ''
    GROUP BY acquisition_channel
    ORDER BY channel_revenue DESC
    LIMIT 1
  `);

  // Get channel count for average calculation
  const channelCountData = await db.execute(sql`
    SELECT COUNT(DISTINCT acquisition_channel) as channel_count
    FROM analytics_mart.fct_order_attribution
    WHERE order_date >= ${startDate}
      AND order_date <= ${endDate}
      AND revenue IS NOT NULL
      AND acquisition_channel IS NOT NULL
      AND acquisition_channel != ''
  `);

  // Get total customer count for percentage
  const totalCustomersData = await db.execute(sql`
    SELECT COUNT(DISTINCT customer) as total_customers
    FROM analytics_mart.fct_orders
    WHERE order_date >= ${startDate}
      AND order_date <= ${endDate}
      AND total_amount IS NOT NULL
  `);

  const attributed = attributedData as unknown as Array<{ total_revenue: string; total_orders: number; total_customers: number }>;
  const topChannel = topChannelData as unknown as Array<{ acquisition_channel: string; channel_revenue: string }>;
  const channelCount = channelCountData as unknown as Array<{ channel_count: number }>;
  const totalCustomers = totalCustomersData as unknown as Array<{ total_customers: number }>;

  const totalRevenue = Number(attributed[0]?.total_revenue || 0);
  const totalOrders = Number(attributed[0]?.total_orders || 0);
  const totalAttributedCustomers = Number(attributed[0]?.total_customers || 0);
  const numChannels = Number(channelCount[0]?.channel_count || 1);
  const allCustomers = Number(totalCustomers[0]?.total_customers || 1);

  return {
    totalAttributedRevenue: totalRevenue.toFixed(2),
    totalAttributedOrders: totalOrders,
    totalAttributedCustomers: totalAttributedCustomers,
    topChannel: topChannel[0]?.acquisition_channel || 'Unknown',
    topChannelRevenue: Number(topChannel[0]?.channel_revenue || 0).toFixed(2),
    avgRevenuePerChannel: (totalRevenue / numChannels).toFixed(2),
    attributedCustomerPercentage: ((totalAttributedCustomers / allCustomers) * 100).toFixed(1),
  };
}

// Get revenue by acquisition channel
export async function getChannelRevenue(filters: DashboardFilters = {}): Promise<ChannelRevenue[]> {
  const dateRange = getDateRange(filters.period || '1y', false);
  const startDate = dateRange.start;
  const endDate = dateRange.end;

  const channelData = await db.execute(sql`
    SELECT
      acquisition_channel,
      SUM(revenue) as total_revenue,
      COUNT(DISTINCT order_id) as order_count,
      COUNT(DISTINCT customer_id) as customer_count,
      AVG(revenue) as avg_order_value
    FROM analytics_mart.fct_order_attribution
    WHERE order_date >= ${startDate}
      AND order_date <= ${endDate}
      AND revenue IS NOT NULL
      AND acquisition_channel IS NOT NULL
      AND acquisition_channel != ''
    GROUP BY acquisition_channel
    ORDER BY total_revenue DESC
  `);

  const results = channelData as unknown as Array<{
    acquisition_channel: string;
    total_revenue: string;
    order_count: number;
    customer_count: number;
    avg_order_value: string;
  }>;

  const totalRevenue = results.reduce((sum, row) => sum + Number(row.total_revenue), 0);

  return results.map(row => ({
    acquisitionChannel: row.acquisition_channel,
    totalRevenue: Number(row.total_revenue).toFixed(2),
    orderCount: Number(row.order_count),
    customerCount: Number(row.customer_count),
    avgOrderValue: Number(row.avg_order_value).toFixed(2),
    revenuePercentage: totalRevenue > 0 ? (Number(row.total_revenue) / totalRevenue) * 100 : 0,
  }));
}

// Get campaign performance with UTM tracking
export async function getCampaignPerformance(filters: DashboardFilters = {}): Promise<CampaignPerformance[]> {
  const dateRange = getDateRange(filters.period || '1y', false);
  const startDate = dateRange.start;
  const endDate = dateRange.end;

  const campaignData = await db.execute(sql`
    SELECT
      utm_source,
      utm_medium,
      utm_campaign,
      SUM(revenue) as total_revenue,
      COUNT(DISTINCT order_id) as order_count,
      COUNT(DISTINCT customer_id) as customer_count,
      AVG(revenue) as avg_order_value,
      COUNT(DISTINCT CASE WHEN buyer_accepts_marketing = true THEN customer_id END) as marketing_opt_ins
    FROM analytics_mart.fct_order_attribution
    WHERE order_date >= ${startDate}
      AND order_date <= ${endDate}
      AND revenue IS NOT NULL
      AND (utm_source IS NOT NULL OR utm_medium IS NOT NULL OR utm_campaign IS NOT NULL)
    GROUP BY utm_source, utm_medium, utm_campaign
    ORDER BY total_revenue DESC
    LIMIT 50
  `);

  const results = campaignData as unknown as Array<{
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    total_revenue: string;
    order_count: number;
    customer_count: number;
    avg_order_value: string;
    marketing_opt_ins: number;
  }>;

  return results.map(row => ({
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    totalRevenue: Number(row.total_revenue).toFixed(2),
    orderCount: Number(row.order_count),
    customerCount: Number(row.customer_count),
    avgOrderValue: Number(row.avg_order_value).toFixed(2),
    marketingOptIns: Number(row.marketing_opt_ins),
    optInRate: row.customer_count > 0
      ? ((Number(row.marketing_opt_ins) / Number(row.customer_count)) * 100).toFixed(1)
      : '0.0',
  }));
}

// Get monthly revenue trend by top channels
export async function getMonthlyChannelRevenue(filters: DashboardFilters = {}): Promise<MonthlyChannelRevenue[]> {
  const dateRange = getDateRange(filters.period || '1y', false);
  const startDate = dateRange.start;
  const endDate = dateRange.end;

  // First, get top 5 channels by revenue
  const topChannels = await db.execute(sql`
    SELECT acquisition_channel
    FROM analytics_mart.fct_order_attribution
    WHERE order_date >= ${startDate}
      AND order_date <= ${endDate}
      AND revenue IS NOT NULL
      AND acquisition_channel IS NOT NULL
      AND acquisition_channel != ''
    GROUP BY acquisition_channel
    ORDER BY SUM(revenue) DESC
    LIMIT 5
  `);

  const topChannelNames = (topChannels as unknown as Array<{ acquisition_channel: string }>)
    .map(row => row.acquisition_channel);

  if (topChannelNames.length === 0) {
    return [];
  }

  // Get monthly data for these channels
  const channelFilter = sql.join(topChannelNames.map(name => sql`${name}`), sql`, `);
  const monthlyData = await db.execute(sql`
    SELECT
      DATE_TRUNC('month', order_date) as month,
      acquisition_channel,
      SUM(revenue) as revenue
    FROM analytics_mart.fct_order_attribution
    WHERE order_date >= ${startDate}
      AND order_date <= ${endDate}
      AND revenue IS NOT NULL
      AND acquisition_channel IN (${channelFilter})
    GROUP BY DATE_TRUNC('month', order_date), acquisition_channel
    ORDER BY month
  `);

  const results = monthlyData as unknown as Array<{
    month: string;
    acquisition_channel: string;
    revenue: string;
  }>;

  // Transform to monthly format with channels as keys
  const monthlyMap = new Map<string, Record<string, number>>();

  for (const row of results) {
    const monthKey = row.month;
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {});
    }
    const monthData = monthlyMap.get(monthKey)!;
    monthData[row.acquisition_channel] = Number(row.revenue);
  }

  return Array.from(monthlyMap.entries()).map(([month, channels]) => ({
    month,
    channels,
  }));
}

// Get top referring sites
export async function getTopReferringSites(filters: DashboardFilters = {}, limit: number = 10): Promise<Array<{
  referringSite: string;
  totalRevenue: string;
  orderCount: number;
  avgOrderValue: string;
}>> {
  const dateRange = getDateRange(filters.period || '1y', false);
  const startDate = dateRange.start;
  const endDate = dateRange.end;

  const referringData = await db.execute(sql`
    SELECT
      referring_site,
      SUM(revenue) as total_revenue,
      COUNT(DISTINCT order_id) as order_count,
      AVG(revenue) as avg_order_value
    FROM analytics_mart.fct_order_attribution
    WHERE order_date >= ${startDate}
      AND order_date <= ${endDate}
      AND revenue IS NOT NULL
      AND referring_site IS NOT NULL
      AND referring_site != ''
    GROUP BY referring_site
    ORDER BY total_revenue DESC
    LIMIT ${limit}
  `);

  const results = referringData as unknown as Array<{
    referring_site: string;
    total_revenue: string;
    order_count: number;
    avg_order_value: string;
  }>;

  return results.map(row => ({
    referringSite: row.referring_site,
    totalRevenue: Number(row.total_revenue).toFixed(2),
    orderCount: Number(row.order_count),
    avgOrderValue: Number(row.avg_order_value).toFixed(2),
  }));
}

// Get top landing pages
export async function getTopLandingPages(filters: DashboardFilters = {}, limit: number = 10): Promise<Array<{
  landingSite: string;
  totalRevenue: string;
  orderCount: number;
  avgOrderValue: string;
  conversionRate: string;
}>> {
  const dateRange = getDateRange(filters.period || '1y', false);
  const startDate = dateRange.start;
  const endDate = dateRange.end;

  const landingData = await db.execute(sql`
    SELECT
      landing_site,
      SUM(revenue) as total_revenue,
      COUNT(DISTINCT order_id) as order_count,
      AVG(revenue) as avg_order_value
    FROM analytics_mart.fct_order_attribution
    WHERE order_date >= ${startDate}
      AND order_date <= ${endDate}
      AND revenue IS NOT NULL
      AND landing_site IS NOT NULL
      AND landing_site != ''
    GROUP BY landing_site
    ORDER BY total_revenue DESC
    LIMIT ${limit}
  `);

  const results = landingData as unknown as Array<{
    landing_site: string;
    total_revenue: string;
    order_count: number;
    avg_order_value: string;
  }>;

  return results.map(row => ({
    landingSite: row.landing_site,
    totalRevenue: Number(row.total_revenue).toFixed(2),
    orderCount: Number(row.order_count),
    avgOrderValue: Number(row.avg_order_value).toFixed(2),
    conversionRate: '0.0', // Placeholder - would need session data to calculate actual conversion rate
  }));
}
