// ABOUTME: Dense trade show attribution report for show ROI and lead quality
// ABOUTME: Compares attribution windows, match quality, and lead-level exceptions in one scan
import type { ComponentType, ReactNode } from 'react';
import {
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  MapPin,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
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
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import {
  getTradeShowMetrics,
  getTradeShowSummaries,
  getTradeShowLeads,
  type TradeShowLead,
  type TradeShowSummary,
} from '@/lib/queries/trade-shows';
import { parseFilters, getPeriodLabel, type DashboardFilters } from '@/lib/filter-utils';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

function displayDate(value: string) {
  return format(new Date(value), 'MMM d, yyyy');
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
        tone === 'good' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
        tone === 'blue' && 'border-blue-200 bg-blue-50 text-blue-800',
        tone === 'warn' && 'border-amber-200 bg-amber-50 text-amber-800',
        tone === 'bad' && 'border-red-200 bg-red-50 text-red-800',
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
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
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
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
              <Icon
                className={cn(
                  'h-3.5 w-3.5',
                  tone === 'good' && 'text-emerald-600',
                  tone === 'blue' && 'text-blue-600',
                  tone === 'warn' && 'text-amber-600',
                  tone === 'bad' && 'text-red-600',
                )}
              />
              <span className="truncate">{label}</span>
            </div>
            <div className="mt-1 truncate text-xl font-semibold tabular-nums">{value}</div>
          </div>
        </div>
        <div className="mt-2 text-xs leading-4 text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  );
}

function ShowPerformancePanel({ shows }: { shows: TradeShowSummary[] }) {
  const leaders = [...shows]
    .sort((a, b) => toNumber(b.attributedRevenue365d) - toNumber(a.attributedRevenue365d))
    .slice(0, 8);
  const maxRevenue = Math.max(...leaders.map((show) => toNumber(show.attributedRevenue365d)), 1);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Show ROI Leaders</CardTitle>
            <p className="text-xs text-muted-foreground">365-day attribution by event with lead quality context</p>
          </div>
          <CompactBadge tone="blue">{shows.length} shows</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leaders.map((show) => {
          const revenue = toNumber(show.attributedRevenue365d);
          const conversion = toNumber(show.conversionRate365d);

          return (
            <div key={`${show.showName}-${show.showDate}`} className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-3 border-b px-3 py-2 last:border-b-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', revenue > 0 ? 'bg-emerald-500' : 'bg-muted-foreground')} />
                  <p className="truncate text-sm font-medium">{show.showName}</p>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {displayDate(show.showDate)} · {show.location || 'No location'} · {formatNumber(show.totalLeads, 0)} leads · {show.matchRate}% matched
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="font-mono text-xs font-semibold">{compactCurrency(revenue)}</p>
                <div className="flex items-center gap-2">
                  <InlineBar value={(revenue / maxRevenue) * 100} tone={conversion >= 10 ? 'green' : 'blue'} />
                  <span className="w-10 font-mono text-[11px] text-muted-foreground">{formatNumber(conversion, 1)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function AttributionWindowPanel({
  revenue30d,
  revenue90d,
  revenue365d,
}: {
  revenue30d: number;
  revenue90d: number;
  revenue365d: number;
}) {
  const maxRevenue = Math.max(revenue30d, revenue90d, revenue365d, 1);
  const rows = [
    { label: '30 day', revenue: revenue30d, tone: 'blue' as const },
    { label: '90 day', revenue: revenue90d, tone: 'amber' as const },
    { label: '365 day', revenue: revenue365d, tone: 'green' as const },
  ];

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Attribution Window</CardTitle>
            <p className="text-xs text-muted-foreground">Revenue maturity from short to long horizon</p>
          </div>
          <CompactBadge tone="good">{compactCurrency(revenue365d)}</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[4rem_minmax(0,1fr)_5.5rem] items-center gap-2">
            <p className="text-xs text-muted-foreground">{row.label}</p>
            <InlineBar value={(row.revenue / maxRevenue) * 100} tone={row.tone} />
            <p className="text-right font-mono text-xs font-semibold">{compactCurrency(row.revenue)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function LeadQualityPanel({ leads }: { leads: TradeShowLead[] }) {
  const matched = leads.filter((lead) => lead.matchStatus !== 'no_match' && lead.companyDomain).length;
  const existing = leads.filter((lead) => lead.isExistingCustomer).length;
  const converted365d = leads.filter((lead) => lead.hasConverted365d).length;
  const noMatch = leads.filter((lead) => lead.matchStatus === 'no_match' || !lead.companyDomain).length;
  const total = Math.max(leads.length, 1);
  const rows = [
    { label: 'Matched', count: matched, tone: 'green' as const },
    { label: 'Existing', count: existing, tone: 'blue' as const },
    { label: 'Converted 365d', count: converted365d, tone: 'green' as const },
    { label: 'No match', count: noMatch, tone: 'red' as const },
  ];

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Lead Quality</CardTitle>
            <p className="text-xs text-muted-foreground">Match and conversion readiness across sampled leads</p>
          </div>
          <CompactBadge tone={noMatch > 0 ? 'warn' : 'good'}>{formatNumber((matched / total) * 100, 0)}% matched</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[6rem_minmax(0,1fr)_2rem] items-center gap-2">
            <p className="truncate text-xs text-muted-foreground">{row.label}</p>
            <InlineBar value={(row.count / total) * 100} tone={row.tone} />
            <p className="text-right font-mono text-xs">{row.count}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function LeadExceptionPanel({ leads }: { leads: TradeShowLead[] }) {
  const exceptions = leads
    .filter((lead) => !lead.companyDomain || !lead.hasConverted365d || toNumber(lead.lifetimeRevenue) > 0)
    .slice(0, 8);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Lead Exceptions</CardTitle>
            <p className="text-xs text-muted-foreground">Rows worth inspecting before trusting attribution totals</p>
          </div>
          <CompactBadge tone="warn">{exceptions.length} leads</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {exceptions.map((lead) => {
          const revenue = toNumber(lead.attributedRevenue365d);
          const lifetime = toNumber(lead.lifetimeRevenue);
          const matched = Boolean(lead.companyDomain);

          return (
            <div key={lead.leadId} className="grid grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-3 border-b px-3 py-2 last:border-b-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', matched ? 'bg-blue-500' : 'bg-red-500')} />
                  <p className="truncate text-sm font-medium">{lead.leadName || lead.leadEmail || 'Unnamed lead'}</p>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {lead.showName} · {lead.leadCompany || 'No company'} · {matched ? lead.companyDomain : 'no match'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs font-semibold">{compactCurrency(revenue)}</p>
                <p className="text-[11px] text-muted-foreground">{compactCurrency(lifetime)} lifetime</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function matchStatusBadge(lead: TradeShowLead) {
  if (!lead.companyDomain || lead.matchStatus === 'no_match') return <CompactBadge tone="bad">No match</CompactBadge>;
  if (lead.isExistingCustomer) return <CompactBadge tone="good">Existing</CompactBadge>;
  return <CompactBadge tone="blue">Matched</CompactBadge>;
}

interface TradeShowsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TradeShowsPage({ searchParams }: TradeShowsPageProps) {
  const params = await searchParams;
  const filters = parseFilters<DashboardFilters>(params);

  if (!filters.period) {
    filters.period = '1y';
  }

  const [metrics, shows, leads] = await Promise.all([
    getTradeShowMetrics(filters),
    getTradeShowSummaries(filters),
    getTradeShowLeads(filters, 100),
  ]);

  const periodLabel = getPeriodLabel(filters.period);
  const revenue30d = toNumber(metrics.totalAttributedRevenue30d);
  const revenue90d = toNumber(metrics.totalAttributedRevenue90d);
  const revenue365d = toNumber(metrics.totalAttributedRevenue365d);
  const matchedLeads = leads.filter((lead) => lead.companyDomain).length;
  const converted365d = leads.filter((lead) => lead.hasConverted365d).length;
  const leadMatchRate = leads.length > 0 ? (matchedLeads / leads.length) * 100 : 0;
  const leadConversionRate = leads.length > 0 ? (converted365d / leads.length) * 100 : 0;

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
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
                  <BreadcrumbPage>Trade Shows</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <CompactBadge tone="blue">{periodLabel}</CompactBadge>
          </div>
          <div className="hidden shrink-0 lg:block">
            <PeriodSelector currentPeriod={filters.period} filters={filters as Record<string, string | number | boolean | undefined>} />
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 overflow-x-hidden bg-muted/20 p-3 md:p-4">
        <div className="flex flex-col gap-3 lg:hidden">
          <PeriodSelector currentPeriod={filters.period} filters={filters as Record<string, string | number | boolean | undefined>} />
        </div>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="365D Attributed"
            value={compactCurrency(revenue365d)}
            detail={<>{compactCurrency(revenue90d)} at 90d · {compactCurrency(revenue30d)} at 30d</>}
            icon={CircleDollarSign}
            tone="good"
          />
          <MetricTile
            label="Shows / Leads"
            value={`${formatNumber(metrics.totalShows, 0)} / ${formatNumber(metrics.totalLeads, 0)}`}
            detail={<>{formatNumber(leads.length, 0)} lead rows sampled in detail table</>}
            icon={Calendar}
            tone="blue"
          />
          <MetricTile
            label="Lead Match Rate"
            value={`${formatNumber(leadMatchRate, 1)}%`}
            detail={<>{matchedLeads} matched leads · show average {metrics.avgMatchRate}%</>}
            icon={CheckCircle2}
            tone={leadMatchRate >= 70 ? 'good' : leadMatchRate >= 50 ? 'warn' : 'bad'}
          />
          <MetricTile
            label="Top Show"
            value={compactCurrency(metrics.topShowRevenue)}
            detail={<>{metrics.topShowByRevenue} · {formatNumber(leadConversionRate, 1)}% sampled 365d conversion</>}
            icon={TrendingUp}
            tone="blue"
          />
        </section>

        <section className="grid gap-3 xl:grid-cols-[1.35fr_.65fr]">
          <ShowPerformancePanel shows={shows} />
          <div className="space-y-3">
            <AttributionWindowPanel revenue30d={revenue30d} revenue90d={revenue90d} revenue365d={revenue365d} />
            <LeadQualityPanel leads={leads} />
            <LeadExceptionPanel leads={leads} />
          </div>
        </section>

        <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,.95fr)]">
          <Card className="min-w-0 rounded-md py-0 shadow-none">
            <CardHeader className="border-b px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold">Show Performance Detail</CardTitle>
                  <p className="text-xs text-muted-foreground">Trade show attribution analysis for {periodLabel.toLowerCase()}</p>
                </div>
                <CompactBadge tone="blue">{shows.length} rows</CompactBadge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="h-8 min-w-64 px-3 text-[11px] uppercase text-muted-foreground">Show</TableHead>
                      <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">Leads</TableHead>
                      <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">Match</TableHead>
                      <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">30D</TableHead>
                      <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">90D</TableHead>
                      <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">365D</TableHead>
                      <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">Conv.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shows.map((show) => (
                      <TableRow key={`${show.showName}-${show.showDate}`} className="h-12">
                        <TableCell className="px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{show.showName}</p>
                            <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>{displayDate(show.showDate)}</span>
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{show.location || 'No location'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <div className="font-mono text-xs font-semibold">{formatNumber(show.totalLeads, 0)}</div>
                          <div className="text-[11px] text-muted-foreground">{formatNumber(show.leadsMatched, 0)} matched</div>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <CompactBadge tone={toNumber(show.matchRate) >= 70 ? 'good' : toNumber(show.matchRate) >= 50 ? 'warn' : 'bad'}>{show.matchRate}%</CompactBadge>
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono text-xs">{compactCurrency(show.attributedRevenue30d)}</TableCell>
                        <TableCell className="py-2 text-right font-mono text-xs">{compactCurrency(show.attributedRevenue90d)}</TableCell>
                        <TableCell className="py-2 text-right font-mono text-xs font-semibold">{compactCurrency(show.attributedRevenue365d)}</TableCell>
                        <TableCell className="py-2 text-right">
                          <CompactBadge tone={toNumber(show.conversionRate365d) >= 10 ? 'good' : 'blue'}>{show.conversionRate365d}%</CompactBadge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 rounded-md py-0 shadow-none">
            <CardHeader className="border-b px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold">Lead Detail</CardTitle>
                  <p className="text-xs text-muted-foreground">Individual lead matching and revenue attribution</p>
                </div>
                <CompactBadge tone="blue">{leads.length} rows</CompactBadge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="h-8 min-w-60 px-3 text-[11px] uppercase text-muted-foreground">Lead</TableHead>
                      <TableHead className="h-8 min-w-48 text-[11px] uppercase text-muted-foreground">Show / Company</TableHead>
                      <TableHead className="h-8 text-[11px] uppercase text-muted-foreground">Match</TableHead>
                      <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">Lifetime</TableHead>
                      <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">365D</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.leadId} className="h-12">
                        <TableCell className="px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{lead.leadName || 'Unnamed lead'}</p>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">{lead.leadEmail || 'No email'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs">{lead.showName}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{lead.matchedCustomerName || lead.leadCompany || 'No company'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">{matchStatusBadge(lead)}</TableCell>
                        <TableCell className="py-2 text-right font-mono text-xs">{toNumber(lead.lifetimeRevenue) > 0 ? compactCurrency(lead.lifetimeRevenue) : '-'}</TableCell>
                        <TableCell className="py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {lead.hasConverted365d ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : null}
                            <span className="font-mono text-xs">{toNumber(lead.attributedRevenue365d) > 0 ? compactCurrency(lead.attributedRevenue365d) : '-'}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="flex items-center gap-3 p-3">
              <Target className="h-4 w-4 text-blue-600" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">365D Converted Leads</p>
                <p className="text-sm font-semibold">{formatNumber(converted365d, 0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="flex items-center gap-3 p-3">
              <Users className="h-4 w-4 text-emerald-600" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Matched Lead Rows</p>
                <p className="text-sm font-semibold">{formatNumber(matchedLeads, 0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="grid grid-cols-3 gap-3 p-3 text-xs">
              <div>
                <p className="text-muted-foreground">30D</p>
                <p className="font-semibold tabular-nums">{compactCurrency(revenue30d)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">90D</p>
                <p className="font-semibold tabular-nums">{compactCurrency(revenue90d)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">365D</p>
                <p className="font-semibold tabular-nums">{compactCurrency(revenue365d)}</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
