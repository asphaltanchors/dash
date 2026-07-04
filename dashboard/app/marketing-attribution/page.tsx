// ABOUTME: Dense marketing attribution report for channel, campaign, and surface performance
// ABOUTME: Keeps attribution summary, mix concentration, and UTM detail visible together
import type { ComponentType, ReactNode } from 'react';
import {
  BarChart3,
  CircleDollarSign,
  Gauge,
  MousePointerClick,
  ReceiptText,
  Target,
  Users,
} from 'lucide-react';
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
import { ChannelRevenueChart } from '@/components/dashboard/ChannelRevenueChart';
import { CampaignPerformanceTable } from '@/components/dashboard/CampaignPerformanceTable';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import {
  getAttributionMetrics,
  getChannelRevenue,
  getCampaignPerformance,
  getMonthlyChannelRevenue,
  getTopReferringSites,
  getTopLandingPages,
  type CampaignPerformance,
  type ChannelRevenue,
  type MonthlyChannelRevenue,
} from '@/lib/queries/marketing';
import { parseFilters, getPeriodLabel, type DashboardFilters } from '@/lib/filter-utils';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

type ReferringSite = Awaited<ReturnType<typeof getTopReferringSites>>[number];
type LandingPage = Awaited<ReturnType<typeof getTopLandingPages>>[number];

function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatCompactCurrency(value: number | string) {
  return formatCurrency(value, { showCents: false });
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

function ChannelMixPanel({ channels }: { channels: ChannelRevenue[] }) {
  const leaders = channels.slice(0, 7);
  const maxRevenue = Math.max(...leaders.map((channel) => toNumber(channel.totalRevenue)), 1);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Channel Mix</CardTitle>
            <p className="text-xs text-slate-400">Revenue concentration and order quality by acquisition source</p>
          </div>
          <CompactBadge tone="blue">{channels.length} channels</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leaders.map((channel) => {
          const revenue = toNumber(channel.totalRevenue);
          const share = channel.revenuePercentage;

          return (
            <div key={channel.acquisitionChannel} className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-3 border-b border-slate-800 px-3 py-2 last:border-b-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <p className="truncate text-sm font-medium">{channel.acquisitionChannel || 'Unknown'}</p>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                  {formatNumber(channel.orderCount, 0)} orders · {formatNumber(channel.customerCount, 0)} customers · {formatCompactCurrency(channel.avgOrderValue)} AOV
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="font-mono text-xs">{formatCompactCurrency(revenue)}</p>
                <div className="flex items-center gap-2">
                  <InlineBar value={(revenue / maxRevenue) * 100} tone={share >= 45 ? 'amber' : 'blue'} />
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

function CampaignFocusPanel({ campaigns }: { campaigns: CampaignPerformance[] }) {
  const leaders = campaigns.slice(0, 6);
  const maxRevenue = Math.max(...leaders.map((campaign) => toNumber(campaign.totalRevenue)), 1);
  const namedCampaigns = campaigns.filter((campaign) => campaign.utmCampaign).length;

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Campaign Signals</CardTitle>
            <p className="text-xs text-slate-400">Highest UTM-tracked demand in the selected period</p>
          </div>
          <CompactBadge tone={namedCampaigns > 0 ? 'good' : 'warn'}>{namedCampaigns} named</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leaders.length > 0 ? (
          leaders.map((campaign) => {
            const revenue = toNumber(campaign.totalRevenue);

            return (
              <div key={`${campaign.utmSource || 'none'}-${campaign.utmMedium || 'none'}-${campaign.utmCampaign || 'none'}`} className="border-b border-slate-800 px-3 py-2 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{campaign.utmCampaign || '(not set)'}</p>
                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1">
                      <CompactBadge>{campaign.utmSource || 'source unset'}</CompactBadge>
                      <CompactBadge tone="blue">{campaign.utmMedium || 'medium unset'}</CompactBadge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-semibold">{formatCompactCurrency(revenue)}</p>
                    <p className="text-[11px] text-slate-400">{formatNumber(campaign.orderCount, 0)} orders</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <InlineBar value={(revenue / maxRevenue) * 100} tone="green" />
                  <span className="w-12 text-right font-mono text-[11px] text-slate-400">{campaign.optInRate}% opt</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-3 py-8 text-center text-sm text-slate-400">No UTM campaign data for this period</div>
        )}
      </CardContent>
    </Card>
  );
}

function SurfaceList({
  title,
  rows,
  getName,
}: {
  title: string;
  rows: Array<ReferringSite | LandingPage>;
  getName: (row: ReferringSite | LandingPage) => string;
}) {
  const leaders = rows.slice(0, 5);
  const maxRevenue = Math.max(...leaders.map((row) => toNumber(row.totalRevenue)), 1);

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">{title}</p>
        <CompactBadge>{rows.length}</CompactBadge>
      </div>
      <div className="space-y-2">
        {leaders.length > 0 ? (
          leaders.map((row) => {
            const revenue = toNumber(row.totalRevenue);
            const name = getName(row);

            return (
              <div key={`${title}-${name}`} className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate font-mono text-xs" title={name}>{name}</p>
                  <p className="shrink-0 font-mono text-xs font-semibold">{formatCompactCurrency(revenue)}</p>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <InlineBar value={(revenue / maxRevenue) * 100} tone="blue" />
                  <span className="w-16 text-right text-[11px] text-slate-400">{formatNumber(row.orderCount, 0)} orders</span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="py-6 text-center text-sm text-slate-400">No data</p>
        )}
      </div>
    </div>
  );
}

function AcquisitionSurfacePanel({
  sites,
  pages,
}: {
  sites: ReferringSite[];
  pages: LandingPage[];
}) {
  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Acquisition Surfaces</CardTitle>
            <p className="text-xs text-slate-400">Where attributed demand enters and originates</p>
          </div>
          <CompactBadge tone="blue">{sites.length + pages.length} rows</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-3 md:grid-cols-2">
        <SurfaceList title="Referrers" rows={sites} getName={(row) => 'referringSite' in row ? row.referringSite : ''} />
        <SurfaceList title="Landing Pages" rows={pages} getName={(row) => 'landingSite' in row ? row.landingSite : ''} />
      </CardContent>
    </Card>
  );
}

function TrendPulsePanel({
  monthlyData,
  channels,
}: {
  monthlyData: MonthlyChannelRevenue[];
  channels: ChannelRevenue[];
}) {
  const latest = monthlyData[monthlyData.length - 1];
  const prior = monthlyData[monthlyData.length - 2];
  const leadingChannels = channels.slice(0, 5);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Recent Channel Pulse</CardTitle>
            <p className="text-xs text-slate-400">Latest completed month compared with prior available month</p>
          </div>
          <CompactBadge tone={latest ? 'blue' : 'warn'}>{monthlyData.length} months</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {latest ? (
          leadingChannels.map((channel) => {
            const currentRevenue = latest.channels[channel.acquisitionChannel] ?? 0;
            const priorRevenue = prior?.channels[channel.acquisitionChannel] ?? 0;
            const change = priorRevenue > 0 ? ((currentRevenue - priorRevenue) / priorRevenue) * 100 : null;

            return (
              <div key={channel.acquisitionChannel} className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3 border-b border-slate-800 px-3 py-2 last:border-b-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{channel.acquisitionChannel}</p>
                  <p className="text-[11px] text-slate-400">{formatCompactCurrency(currentRevenue)} latest month</p>
                </div>
                <div className={cn('text-right font-mono text-xs font-semibold', change == null ? 'text-slate-400' : change >= 0 ? 'text-emerald-300' : 'text-red-300')}>
                  {change == null ? 'new' : `${change >= 0 ? '+' : ''}${formatNumber(change, 1)}%`}
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-3 py-8 text-center text-sm text-slate-400">No monthly trend data for this period</div>
        )}
      </CardContent>
    </Card>
  );
}

interface MarketingAttributionPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MarketingAttributionPage({ searchParams }: MarketingAttributionPageProps) {
  const params = await searchParams;
  const filters = parseFilters<DashboardFilters>(params);

  if (!filters.period) {
    filters.period = '1y';
  }

  const [
    metrics,
    channelRevenue,
    campaigns,
    monthlyRevenue,
    referringSites,
    landingPages,
  ] = await Promise.all([
    getAttributionMetrics(filters),
    getChannelRevenue(filters),
    getCampaignPerformance(filters),
    getMonthlyChannelRevenue(filters),
    getTopReferringSites(filters, 10),
    getTopLandingPages(filters, 10),
  ]);

  const periodLabel = getPeriodLabel(filters.period);
  const totalRevenue = toNumber(metrics.totalAttributedRevenue);
  const totalOrders = toNumber(metrics.totalAttributedOrders);
  const totalCustomers = toNumber(metrics.totalAttributedCustomers);
  const topChannelRevenue = toNumber(metrics.topChannelRevenue);
  const topChannelShare = totalRevenue > 0 ? (topChannelRevenue / totalRevenue) * 100 : 0;
  const campaignRevenue = campaigns.reduce((sum, campaign) => sum + toNumber(campaign.totalRevenue), 0);
  const campaignShare = totalRevenue > 0 ? (campaignRevenue / totalRevenue) * 100 : 0;

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
                  <BreadcrumbPage>Marketing Attribution</BreadcrumbPage>
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

      <main className="flex-1 space-y-4 overflow-x-hidden bg-[#07101d] p-3 md:p-4">
        <div className="flex flex-col gap-3 lg:hidden">
          <PeriodSelector currentPeriod={filters.period} filters={filters as Record<string, string | number | boolean | undefined>} />
        </div>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Attributed Revenue"
            value={formatCompactCurrency(totalRevenue)}
            detail={<>{formatNumber(totalOrders, 0)} orders · {formatCompactCurrency(totalOrders > 0 ? totalRevenue / totalOrders : 0)} AOV</>}
            icon={CircleDollarSign}
            tone="good"
          />
          <MetricTile
            label="Attributed Customers"
            value={formatNumber(totalCustomers, 0)}
            detail={<>{metrics.attributedCustomerPercentage}% of order customers have attribution</>}
            icon={Users}
            tone="blue"
          />
          <MetricTile
            label="Top Channel"
            value={metrics.topChannel}
            detail={<>{formatCompactCurrency(topChannelRevenue)} · {formatNumber(topChannelShare, 1)}% of attributed revenue</>}
            icon={Target}
            tone={topChannelShare >= 55 ? 'warn' : 'blue'}
          />
          <MetricTile
            label="UTM Coverage"
            value={`${formatNumber(campaignShare, 1)}%`}
            detail={<>{campaigns.length} tracked source/medium/campaign combinations</>}
            icon={MousePointerClick}
            tone={campaignShare >= 35 ? 'good' : 'warn'}
          />
        </section>

        <section className="grid gap-3 xl:grid-cols-[1.35fr_.65fr]">
          <div className="space-y-3">
            <ChannelMixPanel channels={channelRevenue} />
            <AcquisitionSurfacePanel sites={referringSites} pages={landingPages} />
          </div>
          <div className="space-y-3">
            <CampaignFocusPanel campaigns={campaigns} />
            <TrendPulsePanel monthlyData={monthlyRevenue} channels={channelRevenue} />
          </div>
        </section>

        <section className="grid gap-3 xl:grid-cols-[1fr_.95fr]">
          <div className="min-w-0">
            <ChannelRevenueChart data={channelRevenue} monthlyData={monthlyRevenue} />
          </div>
          <Card className="rounded-md py-0 shadow-none">
            <CardHeader className="border-b border-slate-800 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold">Campaign Performance</CardTitle>
                  <p className="text-xs text-slate-400">UTM-tracked campaign results for {periodLabel.toLowerCase()}</p>
                </div>
                <CompactBadge tone="blue">{campaigns.length} rows</CompactBadge>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <div className="overflow-x-auto">
                <CampaignPerformanceTable campaigns={campaigns} />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="flex items-center gap-3 p-3">
              <Gauge className="h-4 w-4 text-blue-300" />
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Average per Channel</p>
                <p className="text-sm font-semibold">{formatCompactCurrency(metrics.avgRevenuePerChannel)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="flex items-center gap-3 p-3">
              <ReceiptText className="h-4 w-4 text-emerald-300" />
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Campaign Revenue</p>
                <p className="text-sm font-semibold">{formatCompactCurrency(campaignRevenue)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="flex items-center gap-3 p-3">
              <div className="grid h-8 w-8 place-items-center rounded-md border border-slate-800 bg-slate-950/40">
                <BarChart3 className="h-4 w-4 text-amber-300" />
              </div>
              <div className="grid min-w-0 grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-slate-400">Channels</p>
                  <p className="font-semibold tabular-nums">{formatNumber(channelRevenue.length, 0)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Referrers</p>
                  <p className="font-semibold tabular-nums">{formatNumber(referringSites.length, 0)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Landings</p>
                  <p className="font-semibold tabular-nums">{formatNumber(landingPages.length, 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
