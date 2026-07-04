// ABOUTME: Dense order ledger report with channel, segment, and searchable order detail
// ABOUTME: Preserves the searchable sortable order table as the detail layer

import {
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
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { DataTable } from '@/components/orders/data-table';
import ChannelBreakdown from '@/components/orders/channel-breakdown';
import SegmentBreakdown from '@/components/orders/segment-breakdown';
import {
  CompactBadge,
  formatWholeCurrency as compactCurrency,
  MetricTile,
  ReportHeader as PanelHeader,
  ReportPanel as Panel,
  toNumber,
} from '@/components/dashboard/report-ui';
import {
  getAllOrders,
  getChannelMetrics,
  getSegmentMetrics,
} from '@/lib/queries';
import { formatNumber } from '@/lib/utils';

interface OrdersPageProps {
  searchParams: Promise<{
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: string;
  }>;
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

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const { search, sortBy, sortOrder, page } = await searchParams;
  const searchTerm = search || '';
  const currentSortBy = sortBy || 'orderDate';
  const currentSortOrder = sortOrder || 'desc';
  const currentPage = parseInt(page || '1', 10);
  const pageSize = 50;

  const [{ orders, totalCount }, channelMetrics, segmentMetrics] = await Promise.all([
    getAllOrders(currentPage, pageSize, searchTerm, currentSortBy, currentSortOrder),
    getChannelMetrics(),
    getSegmentMetrics(),
  ]);
  const visibleCount = orders.length;
  const visibleRevenue = orders.reduce((sum, order) => sum + toNumber(order.totalAmount), 0);
  const paidCount = orders.filter((order) => order.isPaid).length;
  const openCount = visibleCount - paidCount;
  const averageOrder = visibleCount > 0 ? visibleRevenue / visibleCount : 0;
  const newestOrderDate = orders.reduce<string | null>((latest, order) => {
    if (!latest || new Date(order.orderDate) > new Date(latest)) return order.orderDate;
    return latest;
  }, null);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-800 bg-[#07101d]/95 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
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

      <div className="flex-1 space-y-4 bg-[#07101d] p-4 text-slate-100 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Order Ledger</h1>
              <CompactBadge tone="blue">page {currentPage}</CompactBadge>
              {searchTerm && <CompactBadge tone="warn">search: {searchTerm}</CompactBadge>}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Recent order value, channel and segment performance, and searchable order detail.
            </p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
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
        </div>

        <section className="grid gap-3 2xl:grid-cols-[1fr_1fr]">
          <Panel>
            <PanelHeader
              title="Sales by Channel"
              eyebrow="Revenue share, order share, average order, and four-period trend"
              action={<CompactBadge tone="blue">trailing periods</CompactBadge>}
            />
            <ChannelBreakdown metrics={channelMetrics} />
          </Panel>

          <Panel>
            <PanelHeader
              title="Sales by Customer Segment"
              eyebrow="Revenue concentration by customer type and business model"
              action={<CompactBadge tone="good">trailing periods</CompactBadge>}
            />
            <SegmentBreakdown metrics={segmentMetrics} />
          </Panel>
        </section>

        <Panel>
          <PanelHeader
            title={<span className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-blue-300" />Order Detail</span>}
            eyebrow="Search, sort, and inspect individual orders"
            action={<CompactBadge tone="blue">50 per page</CompactBadge>}
          />
          <div className="px-3 pb-3 pt-0">
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
          </div>
        </Panel>
      </div>
    </>
  );
}
