// ABOUTME: Dense account portfolio report with health, risk, and revenue concentration
// ABOUTME: Keeps search/filter table workflow while making the first screen analytical
import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Building2,
  CircleDollarSign,
  HeartPulse,
  Target,
  Users,
} from 'lucide-react';
import { getCompaniesWithHealth, type CompanyWithHealth } from '@/lib/queries';
import { getPeriodLabel, parseFilters, type CompanyFilters } from '@/lib/filter-utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { DataTable } from '@/components/companies/data-table';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

interface CompaniesPageProps {
  searchParams: Promise<{
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: string;
    activityStatus?: string;
    businessSize?: string;
    revenueCategory?: string;
    healthCategory?: string;
    country?: string;
    period?: string;
  }>;
}

function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function compactCurrency(value: number | string) {
  return formatCurrency(value, { showCents: false });
}

function healthTone(score: string | number): 'good' | 'blue' | 'warn' | 'bad' {
  const numeric = toNumber(score);
  if (numeric >= 80) return 'good';
  if (numeric >= 60) return 'blue';
  if (numeric >= 40) return 'warn';
  return 'bad';
}

function CompactBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'good' | 'blue' | 'warn' | 'bad';
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-5 rounded-sm px-1.5 text-[11px] font-medium',
        tone === 'good' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
        tone === 'blue' && 'border-blue-500/30 bg-blue-500/10 text-blue-200',
        tone === 'warn' && 'border-amber-500/30 bg-amber-500/10 text-amber-200',
        tone === 'bad' && 'border-red-500/30 bg-red-500/10 text-red-200',
      )}
    >
      {children}
    </Badge>
  );
}

function InlineBar({
  value,
  tone = 'blue',
}: {
  value: number;
  tone?: 'blue' | 'green' | 'amber' | 'red';
}) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
      <div
        className={cn(
          'h-full rounded-full',
          tone === 'blue' && 'bg-blue-500',
          tone === 'green' && 'bg-emerald-500',
          tone === 'amber' && 'bg-amber-500',
          tone === 'red' && 'bg-red-500',
        )}
        style={{ width: `${clampPercent(value)}%` }}
      />
    </div>
  );
}

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'blue',
}: {
  label: string;
  value: string;
  detail: ReactNode;
  icon: ComponentType<{ className?: string }>;
  tone?: 'good' | 'blue' | 'warn' | 'bad';
}) {
  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-normal text-slate-400">
              <Icon
                className={cn(
                  'h-3.5 w-3.5',
                  tone === 'good' && 'text-emerald-300',
                  tone === 'blue' && 'text-blue-300',
                  tone === 'warn' && 'text-amber-300',
                  tone === 'bad' && 'text-red-300',
                )}
              />
              <span className="truncate">{label}</span>
            </div>
            <div className="mt-1 truncate text-xl font-semibold tabular-nums">{value}</div>
          </div>
        </div>
        <div className="mt-2 text-xs leading-4 text-slate-400">{detail}</div>
      </CardContent>
    </Card>
  );
}

function AccountLeadersPanel({
  companies,
  totalRevenue,
}: {
  companies: CompanyWithHealth[];
  totalRevenue: number;
}) {
  const leaders = companies.slice(0, 8);
  const maxRevenue = Math.max(...leaders.map((company) => toNumber(company.totalRevenue)), 1);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Account Revenue Leaders</CardTitle>
            <p className="text-xs text-slate-400">Largest accounts in the current filtered result set</p>
          </div>
          <CompactBadge tone="blue">{leaders.length} shown</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leaders.map((company, index) => {
          const revenue = toNumber(company.totalRevenue);
          const health = toNumber(company.healthScore);
          const share = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
          const tone = healthTone(health);

          return (
            <div key={`${company.companyDomainKey || company.companyName}-${index}`} className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-3 border-b border-slate-800 px-3 py-2 last:border-b-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      tone === 'good' && 'bg-emerald-500',
                      tone === 'blue' && 'bg-blue-500',
                      tone === 'warn' && 'bg-amber-500',
                      tone === 'bad' && 'bg-red-500',
                    )}
                  />
                  <Link href={`/companies/${encodeURIComponent(company.companyDomainKey)}`} className="truncate text-sm font-medium hover:underline">
                    {company.companyName}
                  </Link>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                  {company.activityStatus} · {company.revenueCategory} · {formatNumber(company.daysSinceLastOrder, 0)}d since order
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="font-mono text-xs font-semibold">{compactCurrency(revenue)}</p>
                <div className="flex items-center gap-2">
                  <InlineBar value={(revenue / maxRevenue) * 100} tone={tone === 'good' ? 'green' : tone === 'bad' ? 'red' : tone === 'warn' ? 'amber' : 'blue'} />
                  <span className="w-10 font-mono text-[11px] text-slate-400">{formatNumber(share, 1)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function MixPanel({
  title,
  description,
  rows,
  total,
}: {
  title: string;
  description: string;
  rows: Array<{ label: string; count: number; tone: 'blue' | 'green' | 'amber' | 'red' }>;
  total: number;
}) {
  const maxCount = Math.max(...rows.map((row) => row.count), 1);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            <p className="text-xs text-slate-400">{description}</p>
          </div>
          <CompactBadge tone="blue">{total} rows</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[8rem_minmax(0,1fr)_2.5rem] items-center gap-2">
            <p className="truncate text-xs text-slate-400" title={row.label}>{row.label}</p>
            <InlineBar value={(row.count / maxCount) * 100} tone={row.tone} />
            <p className="text-right font-mono text-xs">{row.count}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function countBy(companies: CompanyWithHealth[], key: keyof CompanyWithHealth) {
  return companies.reduce((map, company) => {
    const label = String(company[key] || 'Unknown');
    map.set(label, (map.get(label) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
}

function mapRows(map: Map<string, number>, toneFor: (label: string) => 'blue' | 'green' | 'amber' | 'red', limit = 5) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count, tone: toneFor(label) }));
}

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const params = await searchParams;
  const filters = parseFilters<CompanyFilters>(params);

  if (!filters.period) {
    filters.period = 'all';
  }

  const searchTerm = filters.search || '';
  const currentSortBy = params.sortBy || 'totalRevenue';
  const currentSortOrder = (params.sortOrder as 'asc' | 'desc') || 'desc';
  const currentPage = parseInt((params.page as string) || '1', 10);

  const queryFilters = {
    activityStatus: params.activityStatus as string || undefined,
    businessSize: params.businessSize as string || undefined,
    revenueCategory: params.revenueCategory as string || undefined,
    healthCategory: params.healthCategory as string || undefined,
    country: params.country as string || undefined,
    period: filters.period,
  };

  const { companies, totalCount } = await getCompaniesWithHealth(
    currentPage,
    50,
    searchTerm,
    currentSortBy,
    currentSortOrder,
    queryFilters,
  );

  const periodLabel = getPeriodLabel(filters.period);
  const visibleRevenue = companies.reduce((sum, company) => sum + toNumber(company.totalRevenue), 0);
  const visibleOrders = companies.reduce((sum, company) => sum + toNumber(company.totalOrders), 0);
  const atRisk = companies.filter((company) => company.atRiskFlag).length;
  const growthOpportunities = companies.filter((company) => company.growthOpportunityFlag).length;
  const activeAccounts = companies.filter((company) => ['Active', 'Highly Active', 'Moderately Active'].includes(company.activityStatus)).length;
  const avgHealth = companies.length > 0
    ? companies.reduce((sum, company) => sum + toNumber(company.healthScore), 0) / companies.length
    : 0;
  const topAccount = companies[0] ?? null;
  const topAccountShare = topAccount && visibleRevenue > 0 ? (toNumber(topAccount.totalRevenue) / visibleRevenue) * 100 : 0;
  const activityRows = mapRows(countBy(companies, 'activityStatus'), (label) => {
    if (label.includes('Inactive') || label.includes('Dormant')) return 'red';
    if (label.includes('Active')) return 'green';
    return 'blue';
  });
  const healthRows = mapRows(countBy(companies, 'healthCategory'), (label) => {
    if (label.includes('Critical') || label.includes('Poor')) return 'red';
    if (label.includes('Fair')) return 'amber';
    if (label.includes('Excellent')) return 'green';
    return 'blue';
  });
  const countryRows = mapRows(countBy(companies, 'primaryCountry'), () => 'blue');

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-800 bg-[#07101d]/95 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex w-full items-center justify-between gap-3 px-3">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-1 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Companies</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <CompactBadge tone="blue">{periodLabel}</CompactBadge>
          </div>
          <div className="hidden shrink-0 lg:block">
            <PeriodSelector currentPeriod={filters.period || 'all'} filters={filters as Record<string, string | number | boolean | undefined>} />
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 overflow-x-hidden bg-[#07101d] p-3 md:p-4">
        <div className="flex flex-col gap-3 lg:hidden">
          <PeriodSelector currentPeriod={filters.period || 'all'} filters={filters as Record<string, string | number | boolean | undefined>} />
        </div>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Visible Revenue"
            value={compactCurrency(visibleRevenue)}
            detail={<>{formatNumber(visibleOrders, 0)} orders · {companies.length} accounts on this page</>}
            icon={CircleDollarSign}
            tone="good"
          />
          <MetricTile
            label="Average Health"
            value={`${formatNumber(avgHealth, 0)}/100`}
            detail={<>{atRisk} at risk · {growthOpportunities} growth opportunities</>}
            icon={HeartPulse}
            tone={healthTone(avgHealth)}
          />
          <MetricTile
            label="Active Share"
            value={`${formatNumber(companies.length > 0 ? (activeAccounts / companies.length) * 100 : 0, 0)}%`}
            detail={<>{activeAccounts} active accounts · {totalCount} total matching filters</>}
            icon={Users}
            tone={activeAccounts / Math.max(companies.length, 1) >= 0.6 ? 'good' : 'warn'}
          />
          <MetricTile
            label="Top Account Share"
            value={`${formatNumber(topAccountShare, 1)}%`}
            detail={topAccount ? <>{topAccount.companyName} · {compactCurrency(topAccount.totalRevenue)}</> : <>No matching accounts</>}
            icon={Building2}
            tone={topAccountShare >= 30 ? 'warn' : 'blue'}
          />
        </section>

        <section className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,.75fr)]">
          <AccountLeadersPanel companies={companies} totalRevenue={visibleRevenue} />
          <div className="space-y-3">
            <MixPanel title="Activity Mix" description="Current health model activity status in this result set" rows={activityRows} total={companies.length} />
            <MixPanel title="Health Mix" description="Company health categories from the selected page" rows={healthRows} total={companies.length} />
            <MixPanel title="Country Mix" description="Largest countries represented by matching companies" rows={countryRows} total={companies.length} />
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="flex items-center gap-3 p-3">
              <AlertTriangle className="h-4 w-4 text-red-300" />
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Risk Flags</p>
                <p className="text-sm font-semibold">{formatNumber(atRisk, 0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="flex items-center gap-3 p-3">
              <Target className="h-4 w-4 text-emerald-300" />
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Growth Opportunities</p>
                <p className="text-sm font-semibold">{formatNumber(growthOpportunities, 0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="grid grid-cols-3 gap-3 p-3 text-xs">
              <div>
                <p className="text-slate-400">Accounts</p>
                <p className="font-semibold tabular-nums">{formatNumber(totalCount, 0)}</p>
              </div>
              <div>
                <p className="text-slate-400">Countries</p>
                <p className="font-semibold tabular-nums">{countBy(companies, 'primaryCountry').size}</p>
              </div>
              <div>
                <p className="text-slate-400">Page</p>
                <p className="font-semibold tabular-nums">{currentPage}</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-md py-0 shadow-none">
          <CardHeader className="border-b border-slate-800 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold">Company Detail</CardTitle>
                <p className="text-xs text-slate-400">
                  Searchable account table with server-side filters, sort, and pagination
                </p>
              </div>
              <CompactBadge tone="blue">{formatNumber(totalCount, 0)} rows</CompactBadge>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <DataTable
              data={companies}
              totalCount={totalCount}
              currentPage={currentPage}
              pageSize={50}
              searchTerm={searchTerm}
              searchResults={searchTerm ? `${totalCount} companies found for "${searchTerm}"` : undefined}
              sortBy={currentSortBy}
              sortOrder={currentSortOrder}
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
