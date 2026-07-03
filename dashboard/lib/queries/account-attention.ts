// ABOUTME: Read-only account attention queue queries backed by mart_account_attention_queue
// ABOUTME: Surfaces prioritized account risk and opportunity without write-back workflows
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export interface AccountAttentionItem {
  companyDomainKey: string;
  companyName: string;
  revenueCategory: string;
  healthScore: string;
  activityStatus: string;
  combinedGrowthTrend: string;
  daysSinceLastOrder: number;
  totalRevenue: string;
  trailing90dRevenue: string;
  trailing1yRevenue: string;
  attentionScore: number;
  reasonCodes: string[];
  bestContactName: string | null;
  bestContactEmail: string | null;
  bestContactRole: string | null;
  bestContactIsBilling: boolean;
  bestContactIsGeneric: boolean;
  bestContactIsInternal: boolean;
  bestContactIsLikelyHuman: boolean;
}

export async function getAccountAttentionQueue(limit = 50): Promise<AccountAttentionItem[]> {
  const rows = await db.execute(sql`
    SELECT
      company_domain_key,
      company_name,
      revenue_category,
      health_score,
      activity_status,
      combined_growth_trend,
      days_since_last_order,
      total_revenue,
      trailing_90d_revenue,
      trailing_1y_revenue,
      attention_score,
      reason_codes,
      best_contact_name,
      best_contact_email,
      best_contact_role,
      best_contact_is_billing,
      best_contact_is_generic,
      best_contact_is_internal,
      best_contact_is_likely_human
    FROM analytics_mart.mart_account_attention_queue
    ORDER BY attention_score DESC, total_revenue DESC
    LIMIT ${limit}
  `);

  const results = rows as unknown as Array<{
    company_domain_key: string;
    company_name: string;
    revenue_category: string;
    health_score: string;
    activity_status: string;
    combined_growth_trend: string;
    days_since_last_order: number;
    total_revenue: string;
    trailing_90d_revenue: string;
    trailing_1y_revenue: string;
    attention_score: number;
    reason_codes: string;
    best_contact_name: string | null;
    best_contact_email: string | null;
    best_contact_role: string | null;
    best_contact_is_billing: boolean;
    best_contact_is_generic: boolean;
    best_contact_is_internal: boolean;
    best_contact_is_likely_human: boolean;
  }>;

  return results.map((row) => ({
    companyDomainKey: row.company_domain_key,
    companyName: row.company_name || row.company_domain_key,
    revenueCategory: row.revenue_category || 'Uncategorized',
    healthScore: Number(row.health_score || 0).toFixed(0),
    activityStatus: row.activity_status || 'Unknown',
    combinedGrowthTrend: row.combined_growth_trend || 'Unknown',
    daysSinceLastOrder: Number(row.days_since_last_order || 0),
    totalRevenue: Number(row.total_revenue || 0).toFixed(2),
    trailing90dRevenue: Number(row.trailing_90d_revenue || 0).toFixed(2),
    trailing1yRevenue: Number(row.trailing_1y_revenue || 0).toFixed(2),
    attentionScore: Number(row.attention_score || 0),
    reasonCodes: (row.reason_codes || '').split(';').map((reason) => reason.trim()).filter(Boolean),
    bestContactName: row.best_contact_name,
    bestContactEmail: row.best_contact_email,
    bestContactRole: row.best_contact_role,
    bestContactIsBilling: Boolean(row.best_contact_is_billing),
    bestContactIsGeneric: Boolean(row.best_contact_is_generic),
    bestContactIsInternal: Boolean(row.best_contact_is_internal),
    bestContactIsLikelyHuman: Boolean(row.best_contact_is_likely_human),
  }));
}
