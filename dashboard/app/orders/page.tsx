// ABOUTME: Dense order ledger report with channel, payment, and value concentration readouts
// ABOUTME: Preserves the searchable sortable order table as the detail layer

import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import {
  BadgeDollarSign,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  ReceiptText,
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
import { DataTable } from '@/components/orders/data-table';
import { getAllOrders, type OrderTableItem } from '@/lib/queries';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

interface OrdersPageProps {
  searchParams: Promise<{
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: string;
  }>;
}

function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function compactCurrency(value: number) {
  return formatCurrency(value, { showCents: false });
}

function percent(part: number, total: number) {
  if (total <= 0) return '0.0%';
  return `${formatNumber((part / total) * 100, 1)}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

function InlineBar({ value, tone = 'blue' }: { value: number; tone?: 'blue' | 'green' | 'amber' | 'red' }) {
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
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function countBy(orders: OrderTableItem[], key: keyof OrderTableItem) {
  return orders.reduce((map, order) => {
    const label = String(order[key] || 'Unknown');
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
      <CardHeader className="border-b px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <CompactBadge tone="blue">{total} visible</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[8rem_minmax(0,1fr)_2.5rem] items-center gap-2">
            <p className="truncate text-xs text-muted-foreground" title={row.label}>{row.label}</p>
            <InlineBar value={(row.count / maxCount) * 100} tone={row.tone} />
            <p className="text-right font-mono text-xs">{row.count}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ValueQueue({ orders }: { orders: OrderTableItem[] }) {
  const leaders = [...orders].sort((a, b) => toNumber(b.totalAmount) - toNumber(a.totalAmount)).slice(0, 8);
  const maxAmount = Math.max(...leaders.map((order) => toNumber(order.totalAmount)), 1);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Visible Value Queue</CardTitle>
            <p className="text-xs text-muted-foreground">Largest orders in the current result page</p>
          </div>
          <CompactBadge tone="blue">{leaders.length} shown</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leaders.map((order) => {
          const amount = toNumber(order.totalAmount);
          return (
            <div key={order.orderNumber} className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3 border-b px-3 py-2 last:border-b-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/orders/${encodeURIComponent(order.orderNumber)}`} className="truncate font-mono text-sm font-medium hover:underline">
                    {order.orderNumber}
                  </Link>
                  <CompactBadge tone={order.isPaid ? 'good' : 'warn'}>{order.isPaid ? 'paid' : 'open'}</CompactBadge>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {order.customer} · {formatDate(order.orderDate)} · {order.salesChannel || 'Unknown channel'}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="font-mono text-xs font-semibold">{compactCurrency(amount)}</p>
                <InlineBar value={(amount / maxAmount) * 100} tone={order.isPaid ? 'green' : 'amber'} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const { search, sortBy, sortOrder, page } = await searchParams;
  const searchTerm = search || '';
  const currentSortBy = sortBy || 'orderDate';
  const currentSortOrder = sortOrder || 'desc';
  const currentPage = parseInt(page || '1', 10);
  const pageSize = 50;

  const { orders, totalCount } = await getAllOrders(currentPage, pageSize, searchTerm, currentSortBy, currentSortOrder);
  const visibleCount = orders.length;
  const visibleRevenue = orders.reduce((sum, order) => sum + toNumber(order.totalAmount), 0);
  const paidCount = orders.filter((order) => order.isPaid).length;
  const openCount = visibleCount - paidCount;
  const averageOrder = visibleCount > 0 ? visibleRevenue / visibleCount : 0;
  const newestOrderDate = orders.reduce<string | null>((latest, order) => {
    if (!latest || new Date(order.orderDate) > new Date(latest)) return order.orderDate;
    return latest;
  }, null);
  const channelRows = mapRows(countBy(orders, 'salesChannel'), () => 'blue');
  const segmentRows = mapRows(countBy(orders, 'customerSegment'), () => 'green');
  const statusRows = mapRows(countBy(orders, 'status'), (label) => (label === 'PAID' ? 'green' : label === 'OPEN' ? 'amber' : 'blue'));

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Orders</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Order Ledger</h1>
              <CompactBadge tone="blue">page {currentPage}</CompactBadge>
              {searchTerm && <CompactBadge tone="warn">search: {searchTerm}</CompactBadge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Recent order value, payment status, channel mix, and searchable order detail.
            </p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          <MetricTile
            label="Filtered Orders"
            value={formatNumber(totalCount, 0)}
            detail={`${visibleCount} visible on this page`}
            icon={ReceiptText}
            tone="blue"
          />
          <MetricTile
            label="Visible Revenue"
            value={compactCurrency(visibleRevenue)}
            detail={`${compactCurrency(averageOrder)} average order`}
            icon={CircleDollarSign}
            tone="good"
          />
          <MetricTile
            label="Paid Share"
            value={percent(paidCount, visibleCount)}
            detail={`${paidCount} paid, ${openCount} open visible`}
            icon={CreditCard}
            tone={openCount > 0 ? 'warn' : 'good'}
          />
          <MetricTile
            label="Newest Visible"
            value={formatDate(newestOrderDate)}
            detail={`Sorted by ${currentSortBy} ${currentSortOrder}`}
            icon={CalendarDays}
            tone="blue"
          />
          <MetricTile
            label="High Value Visible"
            value={formatNumber(orders.filter((order) => toNumber(order.totalAmount) >= averageOrder && averageOrder > 0).length, 0)}
            detail="Orders above the visible average"
            icon={BadgeDollarSign}
            tone="good"
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
          <ValueQueue orders={orders} />
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
            <MixPanel title="Channel Mix" description="Sales channel represented in visible results" rows={channelRows} total={visibleCount} />
            <MixPanel title="Segment Mix" description="Customer segment distribution" rows={segmentRows} total={visibleCount} />
            <MixPanel title="Payment Status" description="Current order status in the queue" rows={statusRows} total={visibleCount} />
          </div>
        </div>

        <Card className="rounded-md py-0 shadow-none">
          <CardHeader className="border-b px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ClipboardList className="h-4 w-4 text-blue-600" />
                  Order Detail
                </CardTitle>
                <p className="text-xs text-muted-foreground">Search, sort, and inspect individual orders</p>
              </div>
              <CompactBadge tone="blue">50 per page</CompactBadge>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <DataTable
              data={orders}
              totalCount={totalCount}
              currentPage={currentPage}
              pageSize={pageSize}
              searchTerm={searchTerm}
              searchResults={searchTerm ? `${totalCount} orders found for "${searchTerm}"` : undefined}
              sortBy={currentSortBy}
              sortOrder={currentSortOrder}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
