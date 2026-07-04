// ABOUTME: Dense sales performance report with channel and segment breakdowns
// ABOUTME: Pulls top-line revenue, channel mix, and segment concentration into one scan
import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CircleDollarSign,
  Gauge,
  Layers3,
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
import ChannelBreakdown from '@/components/orders/channel-breakdown';
import SegmentBreakdown from '@/components/orders/segment-breakdown';
import {
  getChannelMetrics,
  getSegmentMetrics,
  type SalesChannelMetric,
} from '@/lib/queries';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function currentPeriod(metric: SalesChannelMetric) {
  return metric.periods[0] ?? null;
}

function priorPeriod(metric: SalesChannelMetric) {
  return metric.periods[1] ?? null;
}

function revenueChange(metric: SalesChannelMetric) {
  const current = toNumber(currentPeriod(metric)?.total_revenue);
  const prior = toNumber(priorPeriod(metric)?.total_revenue);
  if (prior === 0) return current === 0 ? 0 : null;
  return ((current - prior) / prior) * 100;
}

function filterChannelMetrics(metrics: SalesChannelMetric[]) {
  return metrics.filter((metric) => {
    const period = currentPeriod(metric);
    return (
      metric.sales_channel !== 'Contractor' &&
      metric.sales_channel !== 'EXPORT from WWD' &&
      period != null &&
      toNumber(period.total_revenue) >= 5000
    );
  });
}

function filterSegmentMetrics(metrics: SalesChannelMetric[]) {
  return metrics.filter((metric) => currentPeriod(metric) != null && toNumber(currentPeriod(metric)?.total_revenue) > 0);
}

function totals(metrics: SalesChannelMetric[]) {
  return metrics.reduce(
    (acc, metric) => {
      const period = currentPeriod(metric);
      if (!period) return acc;

      acc.revenue += toNumber(period.total_revenue);
      acc.orders += toNumber(period.order_count);
      return acc;
    },
    { revenue: 0, orders: 0 },
  );
}

function displayChannelName(channel: string) {
  return channel.startsWith('Amazon Combined:') ? channel.split(':')[1]?.trim() || channel : channel;
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

function Delta({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-xs font-semibold text-emerald-300">New</span>;
  }

  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums', positive ? 'text-emerald-300' : 'text-red-300')}>
      <Icon className="h-3 w-3" />
      {formatNumber(Math.abs(value), 1)}%
    </span>
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

function HighlightsPanel({
  channels,
  totalRevenue,
}: {
  channels: SalesChannelMetric[];
  totalRevenue: number;
}) {
  const leaders = [...channels]
    .sort((a, b) => toNumber(currentPeriod(b)?.total_revenue) - toNumber(currentPeriod(a)?.total_revenue))
    .slice(0, 5);
  const maxRevenue = Math.max(...leaders.map((channel) => toNumber(currentPeriod(channel)?.total_revenue)), 1);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Channel Leaders</CardTitle>
            <p className="text-xs text-slate-400">Largest current revenue channels and mix pressure</p>
          </div>
          <CompactBadge tone="blue">{leaders.length} leaders</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leaders.map((channel) => {
          const period = currentPeriod(channel);
          const revenue = toNumber(period?.total_revenue);
          const orders = toNumber(period?.order_count);
          const aov = orders === 0 ? 0 : revenue / orders;
          const share = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
          const change = revenueChange(channel);

          return (
            <div key={channel.sales_channel} className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-3 border-b border-slate-800 px-3 py-2 last:border-b-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <p className="truncate text-sm font-medium">{displayChannelName(channel.sales_channel || 'Unknown')}</p>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                  {formatNumber(orders, 0)} orders · {formatCurrency(aov, { showCents: false })} AOV · <Delta value={change} />
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="font-mono text-xs">{formatCurrency(revenue, { showCents: false })}</p>
                <div className="flex items-center gap-2">
                  <InlineBar value={(revenue / maxRevenue) * 100} tone="blue" />
                  <span className="w-9 text-[11px] text-slate-400">{formatNumber(share, 1)}%</span>
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
  rows,
  totalRevenue,
}: {
  title: string;
  rows: SalesChannelMetric[];
  totalRevenue: number;
}) {
  const orderedRows = [...rows]
    .sort((a, b) => toNumber(currentPeriod(b)?.total_revenue) - toNumber(currentPeriod(a)?.total_revenue))
    .slice(0, 5);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {orderedRows.map((row) => {
          const period = currentPeriod(row);
          const revenue = toNumber(period?.total_revenue);
          const share = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
          const change = revenueChange(row);

          return (
            <div key={row.sales_channel} className="grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-3 border-b border-slate-800 px-3 py-1.5 last:border-b-0">
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium">{displayChannelName(row.sales_channel || 'Unknown')}</p>
                  <Delta value={change} />
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <InlineBar value={share} tone={share >= 35 ? 'green' : 'blue'} />
                  <span className="w-9 text-[11px] text-slate-400">{formatNumber(share, 1)}%</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs">{formatCurrency(revenue, { showCents: false })}</p>
                <p className="font-mono text-[11px] text-slate-400">{formatNumber(toNumber(period?.order_count), 0)} orders</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default async function SalesPerformancePage() {
  const [channelMetricsRaw, segmentMetricsRaw] = await Promise.all([
    getChannelMetrics(),
    getSegmentMetrics(),
  ]);
  const channelMetrics = filterChannelMetrics(channelMetricsRaw);
  const segmentMetrics = filterSegmentMetrics(segmentMetricsRaw);
  const channelTotals = totals(channelMetrics);
  const segmentTotals = totals(segmentMetrics);
  const topChannel = [...channelMetrics].sort((a, b) => toNumber(currentPeriod(b)?.total_revenue) - toNumber(currentPeriod(a)?.total_revenue))[0];
  const topSegment = [...segmentMetrics].sort((a, b) => toNumber(currentPeriod(b)?.total_revenue) - toNumber(currentPeriod(a)?.total_revenue))[0];
  const topChannelRevenue = toNumber(currentPeriod(topChannel)?.total_revenue);
  const topChannelShare = channelTotals.revenue > 0 ? (topChannelRevenue / channelTotals.revenue) * 100 : 0;
  const topSegmentRevenue = toNumber(currentPeriod(topSegment)?.total_revenue);
  const topSegmentShare = segmentTotals.revenue > 0 ? (topSegmentRevenue / segmentTotals.revenue) * 100 : 0;

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-800 bg-[#07101d]/95">
        <div className="flex w-full items-center justify-between gap-3 px-3">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Sales Performance</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="hidden items-center gap-2 text-xs text-slate-400 md:flex">
            <span>{channelMetrics.length} channels</span>
            <CompactBadge tone={topChannelShare >= 45 ? 'warn' : 'blue'}>{formatNumber(topChannelShare, 1)}% top-channel share</CompactBadge>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-3 bg-[#07101d] p-3 md:p-4">
        <section className="grid gap-3 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <MetricTile
                label="Channel Revenue"
                value={formatCurrency(channelTotals.revenue, { showCents: false })}
                detail={`${formatNumber(channelTotals.orders, 0)} orders across ${channelMetrics.length} channels`}
                icon={CircleDollarSign}
                tone="good"
              />
              <MetricTile
                label="Average Order"
                value={formatCurrency(channelTotals.orders === 0 ? 0 : channelTotals.revenue / channelTotals.orders, { showCents: false })}
                detail="Current trailing-year channel mix"
                icon={ReceiptText}
                tone="blue"
              />
              <MetricTile
                label="Top Channel"
                value={`${formatNumber(topChannelShare, 1)}%`}
                detail={topChannel ? displayChannelName(topChannel.sales_channel || 'Unknown') : 'No channel data'}
                icon={Target}
                tone={topChannelShare >= 45 ? 'warn' : 'blue'}
              />
              <MetricTile
                label="Top Segment"
                value={`${formatNumber(topSegmentShare, 1)}%`}
                detail={topSegment?.sales_channel || 'No segment data'}
                icon={Users}
                tone={topSegmentShare >= 60 ? 'warn' : 'good'}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <MixPanel title="Channel Mix" rows={channelMetrics} totalRevenue={channelTotals.revenue} />
              <MixPanel title="Segment Mix" rows={segmentMetrics} totalRevenue={segmentTotals.revenue} />
            </div>
          </div>

          <HighlightsPanel channels={channelMetrics} totalRevenue={channelTotals.revenue} />
        </section>

        <section className="grid gap-3 2xl:grid-cols-[1fr_1fr]">
          <Card className="rounded-md py-0 shadow-none">
            <CardHeader className="border-b border-slate-800 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold">Sales by Channel</CardTitle>
                  <p className="text-xs text-slate-400">Revenue share, order share, average order, and four-period trend</p>
                </div>
                <CompactBadge tone="blue">{formatCurrency(channelTotals.revenue, { showCents: false })}</CompactBadge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ChannelBreakdown metrics={channelMetricsRaw} />
            </CardContent>
          </Card>

          <Card className="rounded-md py-0 shadow-none">
            <CardHeader className="border-b border-slate-800 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold">Sales by Customer Segment</CardTitle>
                  <p className="text-xs text-slate-400">Revenue concentration by customer type and business model</p>
                </div>
                <CompactBadge tone="good">{segmentMetrics.length} segments</CompactBadge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <SegmentBreakdown metrics={segmentMetricsRaw} />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <Link href="/marketing-attribution" className="group rounded-md border border-slate-800 bg-[#0b1322] p-3 text-slate-100 shadow-none transition-colors hover:border-blue-500/50">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-blue-300" />
                <span className="text-sm font-semibold">Marketing Attribution</span>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-300" />
            </div>
            <p className="mt-1 text-xs text-slate-400">Acquisition channel, campaign, referral, and landing-page readouts</p>
          </Link>
          <Link href="/orders" className="group rounded-md border border-slate-800 bg-[#0b1322] p-3 text-slate-100 shadow-none transition-colors hover:border-blue-500/50">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-300" />
                <span className="text-sm font-semibold">Orders</span>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-300" />
            </div>
            <p className="mt-1 text-xs text-slate-400">Order-level customer, status, amount, channel, and payment detail</p>
          </Link>
          <Link href="/" className="group rounded-md border border-slate-800 bg-[#0b1322] p-3 text-slate-100 shadow-none transition-colors hover:border-blue-500/50">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-amber-300" />
                <span className="text-sm font-semibold">Business Cockpit</span>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-300" />
            </div>
            <p className="mt-1 text-xs text-slate-400">Revenue, cash, inventory, attribution, and exception context</p>
          </Link>
        </section>
      </main>
    </>
  );
}
