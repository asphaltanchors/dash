// ABOUTME: Trade show lead attribution queries for tracking event performance and ROI
// ABOUTME: Handles lead collection metrics, company matching, and revenue attribution across time windows
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getDateRange, type DashboardFilters } from '@/lib/filter-utils';

export interface TradeShowPerformanceMetrics {
  totalShows: number;
  totalLeads: number;
  avgMatchRate: string;
  totalAttributedRevenue30d: string;
  totalAttributedRevenue90d: string;
  totalAttributedRevenue365d: string;
  topShowByRevenue: string;
  topShowRevenue: string;
}

export interface TradeShowSummary {
  showName: string;
  showDate: string;
  location: string;
  totalLeads: number;
  leadsMatched: number;
  matchRate: string;
  matchedExistingCustomers: number;
  attributedRevenue30d: string;
  attributedRevenue90d: string;
  attributedRevenue365d: string;
  attributedRevenueAllTime: string;
  conversionRate30d: string;
  conversionRate90d: string;
  conversionRate365d: string;
  conversionRateAllTime: string;
}

export interface TradeShowLead {
  leadId: string;
  showName: string;
  collectedAt: string;
  leadName: string;
  leadEmail: string;
  leadCompany: string;
  companyDomain: string | null;
  matchStatus: string;
  matchedCustomerId: number | null;
  matchedCustomerName: string | null;
  isExistingCustomer: boolean;
  leadEmailIsCustomer: boolean;
  distinctPurchasersCount: number;
  lifetimeRevenue: string;
  attributedRevenue30d: string;
  attributedRevenue90d: string;
  attributedRevenue365d: string;
  attributedRevenueAllTime: string;
  hasConverted30d: boolean;
  hasConverted90d: boolean;
  hasConverted365d: boolean;
  hasConvertedAllTime: boolean;
}

// Get overall trade show performance metrics
export async function getTradeShowMetrics(filters: DashboardFilters = {}): Promise<TradeShowPerformanceMetrics> {
  const dateRange = getDateRange(filters.period || '1y', false);
  const startDate = dateRange.start;
  const endDate = dateRange.end;

  // Get overall performance metrics
  const performanceData = await db.execute(sql`
    SELECT
      COUNT(DISTINCT show_name) as total_shows,
      SUM(total_leads_collected) as total_leads,
      ROUND(AVG(match_rate_pct), 1) as avg_match_rate,
      SUM(total_revenue_30d) as total_attributed_revenue_30d,
      SUM(total_revenue_90d) as total_attributed_revenue_90d,
      SUM(total_revenue_365d) as total_attributed_revenue_365d
    FROM analytics_mart.fct_trade_show_performance
    WHERE show_date >= ${startDate}
      AND show_date <= ${endDate}
  `);

  // Get top show by revenue (365d window)
  const topShowData = await db.execute(sql`
    SELECT
      show_name,
      total_revenue_365d
    FROM analytics_mart.fct_trade_show_performance
    WHERE show_date >= ${startDate}
      AND show_date <= ${endDate}
    ORDER BY total_revenue_365d DESC
    LIMIT 1
  `);

  const performance = performanceData as unknown as Array<{
    total_shows: number;
    total_leads: number;
    avg_match_rate: string;
    total_attributed_revenue_30d: string;
    total_attributed_revenue_90d: string;
    total_attributed_revenue_365d: string;
  }>;

  const topShow = topShowData as unknown as Array<{
    show_name: string;
    total_revenue_365d: string;
  }>;

  return {
    totalShows: Number(performance[0]?.total_shows || 0),
    totalLeads: Number(performance[0]?.total_leads || 0),
    avgMatchRate: (performance[0]?.avg_match_rate || '0'),
    totalAttributedRevenue30d: Number(performance[0]?.total_attributed_revenue_30d || 0).toFixed(2),
    totalAttributedRevenue90d: Number(performance[0]?.total_attributed_revenue_90d || 0).toFixed(2),
    totalAttributedRevenue365d: Number(performance[0]?.total_attributed_revenue_365d || 0).toFixed(2),
    topShowByRevenue: topShow[0]?.show_name || 'N/A',
    topShowRevenue: Number(topShow[0]?.total_revenue_365d || 0).toFixed(2),
  };
}

// Get trade show summaries
export async function getTradeShowSummaries(filters: DashboardFilters = {}): Promise<TradeShowSummary[]> {
  const dateRange = getDateRange(filters.period || '1y', false);
  const startDate = dateRange.start;
  const endDate = dateRange.end;

  const showData = await db.execute(sql`
    SELECT
      show_name,
      show_date,
      show_location,
      total_leads_collected,
      leads_matched_to_companies,
      match_rate_pct,
      leads_matched_to_companies as matched_existing_customers,
      total_revenue_30d,
      total_revenue_90d,
      total_revenue_365d,
      total_revenue_all_time,
      conversion_rate_90d_pct,
      conversion_rate_365d_pct,
      conversion_rate_all_time_pct
    FROM analytics_mart.fct_trade_show_performance
    WHERE show_date >= ${startDate}
      AND show_date <= ${endDate}
    ORDER BY show_date DESC
  `);

  const results = showData as unknown as Array<{
    show_name: string;
    show_date: string;
    show_location: string;
    total_leads_collected: number;
    leads_matched_to_companies: number;
    match_rate_pct: string;
    matched_existing_customers: number;
    total_revenue_30d: string;
    total_revenue_90d: string;
    total_revenue_365d: string;
    total_revenue_all_time: string;
    conversion_rate_90d_pct: string;
    conversion_rate_365d_pct: string;
    conversion_rate_all_time_pct: string;
  }>;

  return results.map(row => ({
    showName: row.show_name,
    showDate: row.show_date,
    location: row.show_location,
    totalLeads: Number(row.total_leads_collected),
    leadsMatched: Number(row.leads_matched_to_companies),
    matchRate: Number(row.match_rate_pct).toFixed(1),
    matchedExistingCustomers: Number(row.matched_existing_customers),
    attributedRevenue30d: Number(row.total_revenue_30d).toFixed(2),
    attributedRevenue90d: Number(row.total_revenue_90d).toFixed(2),
    attributedRevenue365d: Number(row.total_revenue_365d).toFixed(2),
    attributedRevenueAllTime: Number(row.total_revenue_all_time).toFixed(2),
    conversionRate30d: '0.0',  // 30d conversion rate not in performance table
    conversionRate90d: Number(row.conversion_rate_90d_pct).toFixed(1),
    conversionRate365d: Number(row.conversion_rate_365d_pct).toFixed(1),
    conversionRateAllTime: Number(row.conversion_rate_all_time_pct).toFixed(1),
  }));
}

// Get detailed lead information
export async function getTradeShowLeads(filters: DashboardFilters = {}, limit: number = 100): Promise<TradeShowLead[]> {
  const dateRange = getDateRange(filters.period || '1y', false);
  const startDate = dateRange.start;
  const endDate = dateRange.end;

  const leadData = await db.execute(sql`
    SELECT
      lead_id,
      show_name,
      show_date,
      full_name,
      email,
      lead_company_name,
      company_domain_key,
      company_match_status,
      consolidated_company_name,
      CASE WHEN company_match_status = 'matched_existing_customer' THEN true ELSE false END as is_existing_customer,
      lead_email_is_customer,
      distinct_purchasers_count,
      company_lifetime_revenue,
      revenue_30d,
      revenue_90d,
      revenue_365d,
      revenue_all_time,
      attributed_30d,
      attributed_90d,
      attributed_365d,
      attributed_all_time
    FROM analytics_mart.fct_trade_show_leads
    WHERE show_date >= ${startDate}
      AND show_date <= ${endDate}
    ORDER BY show_date DESC, lead_id
    LIMIT ${limit}
  `);

  const results = leadData as unknown as Array<{
    lead_id: string;
    show_name: string;
    show_date: string;
    full_name: string;
    email: string;
    lead_company_name: string;
    company_domain_key: string | null;
    company_match_status: string;
    consolidated_company_name: string | null;
    is_existing_customer: boolean;
    lead_email_is_customer: boolean;
    distinct_purchasers_count: number;
    company_lifetime_revenue: string;
    revenue_30d: string;
    revenue_90d: string;
    revenue_365d: string;
    revenue_all_time: string;
    attributed_30d: boolean;
    attributed_90d: boolean;
    attributed_365d: boolean;
    attributed_all_time: boolean;
  }>;

  return results.map(row => ({
    leadId: row.lead_id,
    showName: row.show_name,
    collectedAt: row.show_date,
    leadName: row.full_name,
    leadEmail: row.email,
    leadCompany: row.lead_company_name || '',
    companyDomain: row.company_domain_key,
    matchStatus: row.company_match_status,
    matchedCustomerId: null,  // Not tracked in current schema
    matchedCustomerName: row.consolidated_company_name,
    isExistingCustomer: row.is_existing_customer,
    leadEmailIsCustomer: row.lead_email_is_customer,
    distinctPurchasersCount: Number(row.distinct_purchasers_count || 0),
    lifetimeRevenue: Number(row.company_lifetime_revenue || 0).toFixed(2),
    attributedRevenue30d: Number(row.revenue_30d || 0).toFixed(2),
    attributedRevenue90d: Number(row.revenue_90d || 0).toFixed(2),
    attributedRevenue365d: Number(row.revenue_365d || 0).toFixed(2),
    attributedRevenueAllTime: Number(row.revenue_all_time || 0).toFixed(2),
    hasConverted30d: row.attributed_30d,
    hasConverted90d: row.attributed_90d,
    hasConverted365d: row.attributed_365d,
    hasConvertedAllTime: row.attributed_all_time,
  }));
}
