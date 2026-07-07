// ABOUTME: Dense SKU report page for replenishment, demand, pricing, and customer evidence.
// ABOUTME: Keeps operational action and supporting BI context visible without tabbed drilldowns.
import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  Gauge,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import type {
  InventorySnapshot,
  InventoryTrend,
  ProductInboundLine,
  ProductPriceDistribution,
  ProductReorderPlanningDetail,
  RecentProductOrder,
} from '@/lib/queries';
import type { ProductTopCompany } from '@/lib/queries/companies';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn, formatCurrency, formatNumber, shouldShowCompanyLink } from '@/lib/utils';
import type { ProductDetailPageData, ProductDetailProduct } from './page-data';
import {
  actionTone,
  clampPercent,
  compactCurrency,
  compactDate,
  compactInboundLabel,
  formatDate,
  formatDecimal,
  formatInteger,
  inventoryTone,
  marginTone,
  monthAxisLabel,
  operationalBuyDetail,
  operationalBuyLabel,
  operationalBuyQty,
  readableCode,
  safePercent,
  toNumber,
  type ProductDetailBarTone as BarTone,
  type ProductDetailTone as Tone,
} from './helpers';

const actionClasses: Record<string, string> = {
  OUT_OF_STOCK: 'border-red-500/30 bg-red-500/10 text-red-200',
  BUY: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  REVIEW: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  WATCH: 'border-orange-500/30 bg-orange-500/10 text-orange-200',
  OK: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
};

function CompactBadge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
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
        className,
      )}
    >
      {children}
    </Badge>
  );
}

function ActionBadge({ action }: { action: string | null | undefined }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-5 rounded-sm px-1.5 text-[11px] font-medium',
        actionClasses[action || ''] || actionClasses.OK,
      )}
    >
      {readableCode(action || 'OK')}
    </Badge>
  );
}

function InlineBar({
  value,
  tone = 'blue',
}: {
  value: number;
  tone?: BarTone;
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
          tone === 'slate' && 'bg-slate-400',
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
  tone?: Tone;
}) {
  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardContent className="p-3">
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
        <div className="mt-2 line-clamp-2 text-xs leading-4 text-slate-400">{detail}</div>
      </CardContent>
    </Card>
  );
}

function PanelHeader({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <CardHeader className="border-b border-slate-800 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="truncate text-sm font-semibold">{title}</CardTitle>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p> : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
    </CardHeader>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-8 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}

function MiniStat({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="min-w-0 border-b border-slate-800 px-3 py-2 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs text-slate-400">{label}</p>
        <span
          className={cn(
            'shrink-0 font-mono text-xs font-semibold tabular-nums',
            tone === 'good' && 'text-emerald-300',
            tone === 'blue' && 'text-blue-300',
            tone === 'warn' && 'text-amber-300',
            tone === 'bad' && 'text-red-300',
          )}
        >
          {value}
        </span>
      </div>
      {detail ? <p className="mt-0.5 truncate text-[11px] text-slate-400">{detail}</p> : null}
    </div>
  );
}

function ProductReportHeader({
  product,
  planning,
  inventory,
  periodLabel,
}: {
  product: ProductDetailProduct;
  planning: ProductReorderPlanningDetail | null;
  inventory: InventorySnapshot | null;
  periodLabel: string;
}) {
  const status = planning?.inventoryStatus || inventory?.inventoryStatus;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="break-words font-mono text-2xl font-semibold tracking-tight text-slate-50">
            {product.itemName}
          </h1>
          <CompactBadge tone="blue">{periodLabel}</CompactBadge>
          {planning ? <ActionBadge action={planning.action} /> : null}
          {status ? <CompactBadge tone={inventoryTone(status)}>{readableCode(status)}</CompactBadge> : null}
        </div>
        {product.salesDescription ? (
          <p className="mt-1 max-w-5xl text-sm text-slate-400">{product.salesDescription}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Link href={`/families/${encodeURIComponent(product.productFamily)}`}>
            <CompactBadge tone="blue">{product.productFamily}</CompactBadge>
          </Link>
          <CompactBadge>{product.materialType}</CompactBadge>
          <CompactBadge>{product.itemType}</CompactBadge>
          {product.isKit ? <CompactBadge tone="warn">kit</CompactBadge> : null}
          {planning?.policyReviewFlags ? <CompactBadge tone="warn">{readableCode(planning.policyReviewFlags)}</CompactBadge> : null}
        </div>
      </div>
      <div className="grid min-w-64 gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-slate-800 bg-[#0b1322] px-3 py-2 text-right">
          <p className="text-xs text-slate-400">Recommendation</p>
          <p className={cn('font-semibold', planning && operationalBuyQty(planning) > 0 && 'text-blue-300')}>
            {planning ? operationalBuyLabel(planning) : 'No plan'}
          </p>
          <p className="truncate text-xs text-slate-400">
            {planning ? compactCurrency(operationalBuyQty(planning) * toNumber(planning.purchaseCost)) : 'Planning unavailable'}
          </p>
        </div>
        <div className="rounded-md border border-slate-800 bg-[#0b1322] px-3 py-2 text-right">
          <p className="text-xs text-slate-400">Inventory date</p>
          <p className="font-semibold">{formatDate(planning?.inventoryAsOfDate || inventory?.inventoryDate)}</p>
          <p className="truncate text-xs text-slate-400">
            Anchor {formatDate(inventory?.anchorDate)}
          </p>
        </div>
      </div>
    </div>
  );
}

function PlanSummaryStat({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className={cn('min-w-0 rounded-md border border-slate-800 bg-[#0b1322] p-3', tone === 'warn' && 'border-amber-500/30 bg-amber-500/10', tone === 'bad' && 'border-red-500/30 bg-red-500/10', tone === 'good' && 'border-emerald-500/30 bg-emerald-500/10')}>
      <p className="truncate text-[11px] uppercase text-slate-500">{label}</p>
      <p className={cn('mt-1 truncate text-lg font-semibold tabular-nums text-slate-50', tone === 'warn' && 'text-amber-200', tone === 'bad' && 'text-red-200', tone === 'good' && 'text-emerald-200', tone === 'blue' && 'text-blue-200')}>{value}</p>
      {detail ? <p className="mt-1 line-clamp-2 text-xs text-slate-400">{detail}</p> : null}
    </div>
  );
}

function EquationTerm({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="min-w-0 rounded-md border border-slate-800 bg-[#07101d] px-3 py-2">
      <p className="truncate text-[11px] uppercase text-slate-500">{label}</p>
      <p className={cn('mt-1 truncate font-mono text-sm font-semibold tabular-nums text-slate-100', tone === 'good' && 'text-emerald-300', tone === 'blue' && 'text-blue-300', tone === 'warn' && 'text-amber-300', tone === 'bad' && 'text-red-300')}>{value}</p>
      {detail ? <p className="mt-0.5 truncate text-[11px] text-slate-400">{detail}</p> : null}
    </div>
  );
}

function EquationSymbol({ children }: { children: ReactNode }) {
  return <div className="hidden text-center text-sm font-semibold text-slate-500 sm:block">{children}</div>;
}

function InventoryPlanPanel({
  planning,
  inventory,
}: {
  planning: ProductReorderPlanningDetail | null;
  inventory: InventorySnapshot | null;
}) {
  if (!planning) {
    return (
      <Card className="rounded-md py-0 shadow-none">
        <PanelHeader
          title="Inventory Plan"
          subtitle="No reorder-planning row exists for this SKU"
          badge={inventory ? <CompactBadge tone={inventoryTone(inventory.inventoryStatus)}>{readableCode(inventory.inventoryStatus)}</CompactBadge> : null}
        />
        <CardContent className="p-0">
          {inventory ? (
            <>
              <MiniStat label="Estimated on hand" value={formatInteger(inventory.estimatedEndingInventory)} detail={`As of ${formatDate(inventory.inventoryDate)}`} />
              <MiniStat label="Available quantity" value={formatInteger(inventory.estimatedAvailableQuantity)} detail={`${formatInteger(inventory.quantityOnSalesOrder)} on sales orders`} />
              <MiniStat label="Open PO inbound" value={formatInteger(inventory.openPoQuantity)} detail={inventory.nextOpenPoDate ? `Next ${formatDate(inventory.nextOpenPoDate)}` : 'No open PO flagged'} />
              <MiniStat label="90D velocity" value={`${formatDecimal(inventory.avgDailySales90D)}/day`} detail={inventory.estimatedStockoutDate ? `Stockout ${formatDate(inventory.estimatedStockoutDate)}` : 'No stockout date'} />
            </>
          ) : (
            <EmptyState>No inventory status is available for this SKU.</EmptyState>
          )}
        </CardContent>
      </Card>
    );
  }

  const buyQty = operationalBuyQty(planning);
  const inboundQty = toNumber(planning.inboundOpenPoQty) + toNumber(planning.futureReceiptQty);
  const availablePosition = toNumber(planning.availablePositionQty);
  const reorderPoint = toNumber(planning.reorderPointQty);
  const positionBuffer = availablePosition - reorderPoint;
  const projectedAtReceipt = toNumber(planning.projectedPositionAtExpectedReceiptQty);
  const projectedBuffer = projectedAtReceipt - reorderPoint;
  const hasGap = toNumber(planning.uncoveredLeadTimeDemandQty) > 0 || projectedBuffer < 0;

  return (
    <Card className="rounded-md py-0 shadow-none">
      <PanelHeader
        title="Inventory Plan"
        subtitle={planning.recommendationReason || 'Reorder decision from stock position, inbound supply, demand, and safety stock'}
        badge={<ActionBadge action={planning.action} />}
      />
      <CardContent className="space-y-3 p-3">
        <div className="grid gap-2 md:grid-cols-4">
          <PlanSummaryStat label="Verdict" value={buyQty > 0 ? operationalBuyLabel(planning) : 'No reorder'} detail={buyQty > 0 ? operationalBuyDetail(planning) : 'Stock position is above threshold'} tone={buyQty > 0 ? 'warn' : 'good'} />
          <PlanSummaryStat label="Available position" value={formatInteger(planning.availablePositionQty)} detail={`${formatInteger(positionBuffer)} units above reorder point`} tone={positionBuffer >= 0 ? 'good' : 'bad'} />
          <PlanSummaryStat
            label="Timing"
            value={buyQty > 0 && planning.reorderByDate ? compactDate(planning.reorderByDate) : 'Not urgent'}
            detail={planning.stockoutDate ? `Safety watch ${compactDate(planning.stockoutDate)}${planning.expectedReceiptDate ? `; receipt ${compactDate(planning.expectedReceiptDate)}` : ''}` : planning.expectedReceiptDate ? `Expected receipt ${compactDate(planning.expectedReceiptDate)}` : 'No projected date'}
            tone={buyQty > 0 ? 'warn' : 'blue'}
          />
          <PlanSummaryStat label="Confidence" value={readableCode(planning.confidenceLevel)} detail={readableCode(planning.forecastModelDetail)} tone={planning.confidenceLevel.toLowerCase().includes('low') ? 'warn' : 'blue'} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <div className="rounded-md border border-slate-800">
            <div className="border-b border-slate-800 px-3 py-2">
              <p className="text-xs font-semibold text-slate-200">Position math</p>
              <p className="text-[11px] text-slate-400">What stock is available before deciding whether to buy.</p>
            </div>
            <div className="grid items-stretch gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
              <EquationTerm label="On hand" value={formatInteger(planning.onHandQty)} detail={`Snapshot ${formatDate(planning.inventoryAsOfDate)}`} tone="blue" />
              <EquationSymbol>+</EquationSymbol>
              <EquationTerm label="Inbound" value={formatInteger(inboundQty)} detail={`${formatInteger(planning.inboundOpenPoQty)} PO + ${formatInteger(planning.futureReceiptQty)} future`} tone="good" />
              <EquationSymbol>-</EquationSymbol>
              <EquationTerm label="Committed" value={formatInteger(planning.committedDemandQty)} detail={`${planning.committedOrderCount} committed orders`} tone={toNumber(planning.committedDemandQty) > 0 ? 'warn' : 'neutral'} />
              <EquationSymbol>=</EquationSymbol>
              <EquationTerm label="Available" value={formatInteger(planning.availablePositionQty)} detail={`${formatInteger(planning.positionDays)} days coverage`} tone={positionBuffer >= 0 ? 'good' : 'bad'} />
            </div>
          </div>

          <div className="rounded-md border border-slate-800">
            <div className="border-b border-slate-800 px-3 py-2">
              <p className="text-xs font-semibold text-slate-200">Reorder threshold</p>
              <p className="text-[11px] text-slate-400">What stock needs to cover before replenishment arrives.</p>
            </div>
            <div className="grid items-stretch gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
              <EquationTerm label="Lead-time demand" value={formatInteger(planning.forecastLeadTimeQty)} detail={`${planning.assumedLeadTimeDays} day lead time`} tone="warn" />
              <EquationSymbol>+</EquationSymbol>
              <EquationTerm label="Safety stock" value={formatInteger(planning.safetyStockQty)} detail={readableCode(planning.safetyStockSource)} tone="blue" />
              <EquationSymbol>=</EquationSymbol>
              <EquationTerm label="Reorder point" value={formatInteger(planning.reorderPointQty)} detail={`${formatInteger(projectedBuffer)} projected buffer at receipt`} tone={hasGap ? 'bad' : 'good'} />
            </div>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          <MiniStat label="Forecast" value={`${formatDecimal(planning.forecastDailyQty)}/day`} detail={`${formatInteger(planning.forecastMonthlyQty)}/mo modeled demand`} />
          <MiniStat label="Projected at receipt" value={formatInteger(planning.projectedPositionAtExpectedReceiptQty)} detail={planning.expectedReceiptDate ? `On ${formatDate(planning.expectedReceiptDate)}` : 'No expected receipt date'} tone={projectedAtReceipt >= reorderPoint ? 'good' : 'bad'} />
          <MiniStat label="Lead-time gap" value={formatInteger(planning.uncoveredLeadTimeDemandQty)} detail={`${formatInteger(planning.stockoutGapQty)} stockout gap units`} tone={hasGap ? 'bad' : 'good'} />
          <MiniStat label="Vendor / policy" value={planning.preferredVendor || '-'} detail={readableCode(planning.policyBucket)} />
        </div>
      </CardContent>
    </Card>
  );
}

function SalesTrendPanel({
  data,
  periodLabel,
}: {
  data: ProductDetailPageData['salesData'];
  periodLabel: string;
}) {
  const totalRevenue = data.reduce((sum, item) => sum + toNumber(item.revenue), 0);
  const totalOrders = data.reduce((sum, item) => sum + Number(item.orderCount || 0), 0);
  const maxRevenue = Math.max(1, ...data.map((item) => toNumber(item.revenue)));

  return (
    <Card className="rounded-md py-0 shadow-none">
      <PanelHeader
        title="Sales Trend"
        subtitle={`${periodLabel} monthly revenue and order count`}
        badge={<CompactBadge tone={totalRevenue > 0 ? 'good' : 'warn'}>{compactCurrency(totalRevenue)}</CompactBadge>}
      />
      <CardContent className="p-0">
        {data.length === 0 ? (
          <EmptyState>No sales found for the selected period.</EmptyState>
        ) : (
          <>
            <div className="flex h-40 items-end gap-1 overflow-x-auto px-3 pt-3">
              {data.map((item) => {
                const revenue = toNumber(item.revenue);
                const height = revenue > 0 ? Math.max(8, (revenue / maxRevenue) * 100) : 2;
                const label = monthAxisLabel(item.date);

                return (
                  <div key={item.date} className="flex h-full min-w-12 flex-1 flex-col items-center justify-end gap-1">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-sm bg-blue-500"
                        style={{ height: `${height}%` }}
                        title={`${label.long}: ${compactCurrency(revenue)}, ${item.orderCount} orders`}
                      />
                    </div>
                    <span className="whitespace-nowrap text-center text-[10px] text-slate-400">
                      <span className="sm:hidden">{label.short}</span>
                      <span className="hidden sm:inline">{label.long}</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-3 border-t text-xs">
              <MiniStat label="Revenue" value={compactCurrency(totalRevenue)} />
              <MiniStat label="Orders" value={formatInteger(totalOrders)} />
              <MiniStat label="Avg order revenue" value={totalOrders > 0 ? compactCurrency(totalRevenue / totalOrders) : '-'} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CustomerMixPanel({
  companies,
  periodRevenue,
}: {
  companies: ProductTopCompany[];
  periodRevenue: number;
}) {
  const leaders = companies.slice(0, 8);
  const maxSpend = Math.max(1, ...leaders.map((company) => toNumber(company.totalAmountSpent)));
  const topSpend = leaders[0] ? toNumber(leaders[0].totalAmountSpent) : 0;

  return (
    <Card className="rounded-md py-0 shadow-none">
      <PanelHeader
        title="Customer Mix"
        subtitle="Top buying companies and concentration risk"
        badge={<CompactBadge tone={topSpend / Math.max(periodRevenue, 1) > 0.4 ? 'warn' : 'blue'}>{safePercent(topSpend, periodRevenue)}% top</CompactBadge>}
      />
      <CardContent className="p-0">
        {leaders.length === 0 ? (
          <EmptyState>No company purchases found for this product.</EmptyState>
        ) : (
          leaders.map((company) => {
            const spend = toNumber(company.totalAmountSpent);
            const share = periodRevenue > 0 ? (spend / periodRevenue) * 100 : 0;
            return (
              <div key={`${company.companyDomainKey}-${company.companyName}`} className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-3 border-b border-slate-800 px-3 py-2 last:border-b-0">
                <div className="min-w-0">
                  {company.companyDomainKey ? (
                    <Link href={`/companies/${encodeURIComponent(company.companyDomainKey)}`} className="truncate text-sm font-medium hover:underline">
                      {company.companyName}
                    </Link>
                  ) : (
                    <p className="truncate text-sm font-medium">{company.companyName}</p>
                  )}
                  <p className="mt-0.5 truncate text-[11px] text-slate-400">
                    {formatInteger(company.totalTransactions)} orders, {formatInteger(company.totalQuantityPurchased)} units, avg {formatCurrency(company.avgUnitPrice)}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="font-mono text-xs font-semibold">{compactCurrency(spend)}</p>
                  <div className="flex items-center gap-2">
                    <InlineBar value={(spend / maxSpend) * 100} tone={share >= 40 ? 'amber' : 'green'} />
                    <span className="w-10 font-mono text-[11px] text-slate-400">{formatNumber(share, 1)}%</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function RecentProductOrdersPanel({ orders }: { orders: RecentProductOrder[] }) {
  return (
    <Card className="rounded-md py-0 shadow-none">
      <PanelHeader
        title="Recent Orders With This SKU"
        subtitle="Latest current-safe orders containing this product"
        badge={<CompactBadge tone={orders.length > 0 ? 'blue' : 'neutral'}>{orders.length} orders</CompactBadge>}
      />
      <CardContent className="p-0">
        {orders.length === 0 ? (
          <EmptyState>No recent orders found for this SKU.</EmptyState>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-950/40">
                  <TableHead className="h-8 px-3 text-[11px] uppercase text-slate-400">Order</TableHead>
                  <TableHead className="h-8 min-w-48 text-[11px] uppercase text-slate-400">Customer</TableHead>
                  <TableHead className="h-8 text-[11px] uppercase text-slate-400">Date</TableHead>
                  <TableHead className="h-8 text-right text-[11px] uppercase text-slate-400">SKU Qty</TableHead>
                  <TableHead className="h-8 text-right text-[11px] uppercase text-slate-400">SKU Amount</TableHead>
                  <TableHead className="h-8 text-right text-[11px] uppercase text-slate-400">Order Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={`${order.orderNumber}-${order.orderDate}`} className="h-9">
                    <TableCell className="px-3 py-2">
                      <Link href={`/orders/${encodeURIComponent(order.orderNumber)}`} className="font-mono text-xs font-semibold text-blue-300 hover:text-blue-200">
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="py-2">
                      {shouldShowCompanyLink(order.companyDomain, order.isIndividualCustomer) ? (
                        <Link href={`/companies/${encodeURIComponent(order.companyDomain!)}`} className="block truncate text-xs text-blue-300 hover:text-blue-200">
                          {order.customer}
                        </Link>
                      ) : (
                        <p className="truncate text-xs text-slate-300">{order.customer}</p>
                      )}
                      <p className="truncate text-[11px] text-slate-500">{order.customerSegment || 'Unknown segment'}</p>
                    </TableCell>
                    <TableCell className="py-2 text-xs text-slate-400">{formatDate(order.orderDate)}</TableCell>
                    <TableCell className="py-2 text-right font-mono text-xs">{formatInteger(order.skuQuantity)}</TableCell>
                    <TableCell className="py-2 text-right font-mono text-xs font-semibold">{compactCurrency(order.skuAmount)}</TableCell>
                    <TableCell className="py-2 text-right font-mono text-xs text-slate-300">{compactCurrency(order.totalAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PricingPanel({
  distribution,
  product,
}: {
  distribution: ProductPriceDistribution;
  product: ProductDetailProduct;
}) {
  const margin = toNumber(product.actualMarginPercentage || product.marginPercentage);
  const priceRange = Math.max(0, toNumber(distribution.maxPrice) - toNumber(distribution.minPrice));
  const spreadPct = toNumber(distribution.avgPrice) > 0 ? (priceRange / toNumber(distribution.avgPrice)) * 100 : 0;
  const maxCount = Math.max(1, ...distribution.priceRanges.map((range) => range.count));

  return (
    <Card className="rounded-md py-0 shadow-none">
      <PanelHeader
        title="Price / Margin Evidence"
        subtitle="Actual selling price distribution versus catalog economics"
        badge={<CompactBadge tone={marginTone(margin)}>{formatNumber(margin, 1)}% GM</CompactBadge>}
      />
      <CardContent className="p-0">
        <div className="grid grid-cols-2 border-b border-slate-800 md:grid-cols-4">
          <MiniStat label="Avg sell price" value={formatCurrency(distribution.avgPrice)} detail={`Catalog ${formatCurrency(product.salesPrice)}`} />
          <MiniStat label="Median price" value={formatCurrency(distribution.medianPrice)} detail={`${formatInteger(distribution.totalSales)} priced units`} />
          <MiniStat label="Low / high" value={`${formatCurrency(distribution.minPrice)} - ${formatCurrency(distribution.maxPrice)}`} detail={`${formatNumber(spreadPct, 1)}% spread`} tone={spreadPct > 25 ? 'warn' : 'blue'} />
          <MiniStat label="Unit cost" value={formatCurrency(product.purchaseCost)} detail={`${formatCurrency(product.actualMarginAmount || product.marginAmount)} unit margin`} />
        </div>
        {distribution.priceRanges.length === 0 ? (
          <EmptyState>No price distribution is available for the selected period.</EmptyState>
        ) : (
          <div className="p-3">
            <div className="space-y-2">
              {distribution.priceRanges.map((range) => (
                <div key={range.rangeLabel} className="grid grid-cols-[5.5rem_minmax(0,1fr)_4.25rem] items-center gap-2">
                  <p className="truncate text-xs text-slate-400">{range.rangeLabel}</p>
                  <InlineBar value={(range.count / maxCount) * 100} tone="blue" />
                  <p className="text-right font-mono text-xs">{formatInteger(range.count)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ForecastAuditPanel({ planning }: { planning: ProductReorderPlanningDetail | null }) {
  if (!planning) {
    return (
      <Card className="rounded-md py-0 shadow-none">
        <PanelHeader title="Forecast Audit" subtitle="Demand model inputs and calculation audit" />
        <EmptyState>No planning forecast is available for this SKU.</EmptyState>
      </Card>
    );
  }

  const rows = [
    { input: 'Baseline', value: `${formatInteger(planning.skuBaselineMonthlyQty)}/mo`, readout: readableCode(planning.forecastMethod) },
    { input: 'Seasonality', value: `${planning.appliedSeasonalityIndex}x`, readout: 'Applied to baseline demand' },
    { input: 'Growth factor', value: `${planning.appliedGrowthFactor}x`, readout: `${formatInteger(planning.cappedReductionQty12m)} capped reduction units` },
    { input: 'Forecast', value: `${formatDecimal(planning.forecastDailyQty)}/day`, readout: `${formatInteger(planning.forecastMonthlyQty)}/mo` },
    { input: 'Safety stock model', value: `${formatInteger(planning.safetyStockQty)} units`, readout: `${readableCode(planning.safetyStockSource)}; p90 LT ${formatInteger(planning.p90HistoricalLeadTimeDemandQty)} over ${planning.variabilityWindowsWithDemand}/${planning.variabilitySampleWindows} windows` },
    { input: '30D / 90D / 365D velocity', value: `${formatDecimal(planning.avgDailySales30d)} / ${formatDecimal(planning.avgDailySales90d)} / ${formatDecimal(planning.avgDailySales365d)}`, readout: 'Daily unit demand windows' },
    { input: '90D sales density', value: `${formatInteger(planning.totalSalesQty90d)} units`, readout: `${planning.daysWithSales90d} sales days` },
    { input: 'Trailing monthly avg', value: `${formatInteger(planning.trailing3mAvgMonthlySales)} / ${formatInteger(planning.trailing12mAvgMonthlySales)}`, readout: '3M versus 12M' },
    { input: 'Long-run avg', value: `${formatInteger(planning.avgMonthlySales36m)}/mo`, readout: `${planning.hasLargeOrderOutlier2025 ? 'Large 2025 outlier present' : 'No 2025 outlier flag'}` },
  ];

  const auditRows = [
    { label: 'Available position', value: formatInteger(planning.availablePositionQty), detail: `${formatInteger(planning.onHandQty)} on hand + ${compactInboundLabel(planning)}` },
    { label: 'Projected at receipt', value: formatInteger(planning.projectedPositionAtExpectedReceiptQty), detail: `${formatInteger(planning.inboundQtyByExpectedReceiptDate)} inbound by ${formatDate(planning.expectedReceiptDate)}` },
    { label: 'Lead-time gap', value: formatInteger(planning.uncoveredLeadTimeDemandQty), detail: `${formatInteger(planning.stockoutGapQty)} stockout gap units` },
    { label: 'Raw reorder qty', value: formatInteger(planning.rawReorderQty), detail: `${formatInteger(planning.suggestedBuyQty)} suggested model units` },
    { label: 'Operational buy', value: formatInteger(operationalBuyQty(planning)), detail: operationalBuyDetail(planning) },
  ];

  return (
    <Card className="rounded-md py-0 shadow-none">
      <PanelHeader
        title="Forecast Audit"
        subtitle={readableCode(planning.forecastModelDetail)}
        badge={<CompactBadge tone={planning.confidenceLevel.toLowerCase().includes('low') ? 'warn' : 'blue'}>{readableCode(planning.confidenceLevel)}</CompactBadge>}
      />
      <CardContent className="p-0">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-950/40">
                <TableHead className="h-8 px-3 text-[11px] uppercase text-slate-400">Input</TableHead>
                <TableHead className="h-8 text-right text-[11px] uppercase text-slate-400">Value</TableHead>
                <TableHead className="h-8 min-w-48 text-[11px] uppercase text-slate-400">Readout</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.input} className="h-9">
                  <TableCell className="px-3 py-2 text-xs font-medium">{row.input}</TableCell>
                  <TableCell className="py-2 text-right font-mono text-xs">{row.value}</TableCell>
                  <TableCell className="py-2 text-xs text-slate-400">{row.readout}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="grid border-t md:grid-cols-5">
          {auditRows.map((row) => (
            <MiniStat key={row.label} label={row.label} value={row.value} detail={row.detail} tone={row.label === 'Operational buy' && toNumber(row.value.replaceAll(',', '')) > 0 ? 'warn' : 'neutral'} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InboundLinesPanel({
  planning,
  inboundLines,
}: {
  planning: ProductReorderPlanningDetail | null;
  inboundLines: ProductInboundLine[];
}) {
  const totalQty = inboundLines.reduce((sum, line) => sum + toNumber(line.quantity), 0);
  const totalAmount = inboundLines.reduce((sum, line) => sum + toNumber(line.amount), 0);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <PanelHeader
        title="Inbound Detail"
        subtitle={planning ? `${compactInboundLabel(planning)} across ${planning.openPoLineCount + planning.futureReceiptLineCount} source lines` : 'Open PO and future receipt lines'}
        badge={<CompactBadge tone={inboundLines.length > 0 ? 'blue' : 'neutral'}>{inboundLines.length} lines</CompactBadge>}
      />
      <CardContent className="p-0">
        {inboundLines.length === 0 ? (
          <EmptyState>No inbound lines found for this SKU.</EmptyState>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-950/40">
                  <TableHead className="h-8 px-3 text-[11px] uppercase text-slate-400">Type</TableHead>
                  <TableHead className="h-8 text-[11px] uppercase text-slate-400">Document</TableHead>
                  <TableHead className="h-8 min-w-40 text-[11px] uppercase text-slate-400">Vendor</TableHead>
                  <TableHead className="h-8 text-[11px] uppercase text-slate-400">Expected</TableHead>
                  <TableHead className="h-8 text-right text-[11px] uppercase text-slate-400">Qty</TableHead>
                  <TableHead className="h-8 text-right text-[11px] uppercase text-slate-400">Rate</TableHead>
                  <TableHead className="h-8 text-right text-[11px] uppercase text-slate-400">Amount</TableHead>
                  <TableHead className="h-8 min-w-52 text-[11px] uppercase text-slate-400">Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inboundLines.map((line) => (
                  <TableRow key={line.inboundLineId} className="h-9">
                    <TableCell className="px-3 py-2"><CompactBadge tone={line.inboundType === 'OPEN_PO' ? 'blue' : 'good'}>{line.inboundType === 'OPEN_PO' ? 'PO' : 'Receipt'}</CompactBadge></TableCell>
                    <TableCell className="py-2 font-mono text-xs">{line.documentNumber || '-'}</TableCell>
                    <TableCell className="py-2 text-xs">{line.vendor || '-'}</TableCell>
                    <TableCell className="py-2 text-xs text-slate-400">{formatDate(line.expectedOrReceiptDate)}</TableCell>
                    <TableCell className="py-2 text-right font-mono text-xs">{formatInteger(line.quantity)}</TableCell>
                    <TableCell className="py-2 text-right font-mono text-xs">{toNumber(line.rate) ? formatCurrency(line.rate) : '-'}</TableCell>
                    <TableCell className="py-2 text-right font-mono text-xs">{toNumber(line.amount) ? formatCurrency(line.amount) : '-'}</TableCell>
                    <TableCell className="max-w-64 whitespace-normal py-2 text-xs text-slate-400">{line.inboundNote || line.status || '-'}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="h-9 bg-[#07101d]">
                  <TableCell className="px-3 py-2 text-xs font-semibold" colSpan={4}>Total inbound</TableCell>
                  <TableCell className="py-2 text-right font-mono text-xs font-semibold">{formatInteger(totalQty)}</TableCell>
                  <TableCell />
                  <TableCell className="py-2 text-right font-mono text-xs font-semibold">{compactCurrency(totalAmount)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InventoryTrendPanel({
  trend,
  inventory,
}: {
  trend: InventoryTrend[];
  inventory: InventorySnapshot | null;
}) {
  const recent = trend.slice(-18);
  const maxInventory = Math.max(1, ...recent.map((item) => Math.max(0, toNumber(item.estimatedEndingInventory))));
  const latest = recent[recent.length - 1];

  return (
    <Card className="rounded-md py-0 shadow-none">
      <PanelHeader
        title="Inventory Trend"
        subtitle="Recent estimated ending inventory with anchor-day markers"
        badge={inventory ? <CompactBadge tone={inventoryTone(inventory.inventoryStatus)}>{readableCode(inventory.inventoryStatus)}</CompactBadge> : null}
      />
      <CardContent className="p-0">
        {recent.length === 0 ? (
          <EmptyState>No inventory trend rows found for this SKU.</EmptyState>
        ) : (
          <>
            <div className="flex h-36 items-end gap-1 overflow-x-auto px-3 pt-3">
              {recent.map((item) => {
                const qty = Math.max(0, toNumber(item.estimatedEndingInventory));
                const height = qty > 0 ? Math.max(6, (qty / maxInventory) * 100) : 2;
                return (
                  <div key={item.date} className="flex h-full min-w-8 flex-1 flex-col items-center justify-end gap-1">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className={cn('relative w-full rounded-t-sm', item.isProjectedDay ? 'bg-amber-400' : 'bg-emerald-500')}
                        style={{ height: `${height}%` }}
                        title={`${formatDate(item.date)}: ${formatInteger(qty)} estimated inventory`}
                      >
                        {item.isAnchorDay ? <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-2 rounded-full bg-foreground" /> : null}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400">{compactDate(item.date)}</span>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-3 border-t text-xs">
              <MiniStat label="Latest estimate" value={latest ? formatInteger(latest.estimatedEndingInventory) : '-'} />
              <MiniStat label="Cost value" value={latest ? compactCurrency(latest.inventoryValueAtCost) : '-'} />
              <MiniStat label="Anchor age" value={inventory ? `${inventory.daysSinceAnchor}d` : '-'} detail={inventory ? formatDate(inventory.anchorDate) : undefined} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CatalogSnapshotPanel({
  product,
  inventory,
}: {
  product: ProductDetailProduct;
  inventory: InventorySnapshot | null;
}) {
  const listMargin = toNumber(product.marginPercentage);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <PanelHeader
        title="Catalog / Snapshot"
        subtitle="QuickBooks product fields and latest inventory estimate"
        badge={<CompactBadge tone={marginTone(listMargin)}>{formatNumber(listMargin, 1)}% list GM</CompactBadge>}
      />
      <CardContent className="p-0">
        <div className="grid md:grid-cols-2">
          <MiniStat label="QuickBooks ID" value={product.quickBooksInternalId} detail={product.itemType} />
          <MiniStat label="Family / material" value={product.productFamily} detail={product.materialType} />
          <MiniStat label="Catalog price" value={formatCurrency(product.salesPrice)} detail={`${formatCurrency(product.purchaseCost)} purchase cost`} />
          <MiniStat label="Catalog margin" value={`${formatNumber(product.marginPercentage, 1)}%`} detail={`${formatCurrency(product.marginAmount)} unit margin`} tone={marginTone(listMargin)} />
          <MiniStat label="Estimated available" value={inventory ? formatInteger(inventory.estimatedAvailableQuantity) : '-'} detail={inventory ? `${formatInteger(inventory.quantityOnSalesOrder)} on sales orders` : 'No inventory snapshot'} />
          <MiniStat label="Inventory value" value={inventory ? compactCurrency(inventory.inventoryValueAtCost) : '-'} detail={inventory ? `${compactCurrency(inventory.inventoryValueAtSalesPrice)} at sales price` : 'No inventory valuation'} />
        </div>
      </CardContent>
    </Card>
  );
}

export function ProductDetailPage({ data }: { data: ProductDetailPageData }) {
  const {
    product,
    filters,
    periodLabel,
    planning,
    salesData,
    topCompanies,
    recentOrders,
    priceDistribution,
    inventoryStatus,
    inboundLines,
    inventoryTrend,
    metrics,
  } = data;
  const {
    periodRevenue,
    periodOrders,
    periodUnits,
    marginPct,
    marginDollars,
    topBuyerShare,
    buyQty,
    buyCost,
    positionQty,
    positionDays,
  } = metrics;
  const topBuyer = topCompanies[0];
  const filterParams: Record<string, string | number | boolean | undefined> = { ...filters };

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-800 bg-[#07101d]/95 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex w-full items-center justify-between gap-3 px-3">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/products">Products</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{product.itemName}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="hidden shrink-0 lg:block">
            <PeriodSelector currentPeriod={filters.period} filters={filterParams} />
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 overflow-x-hidden bg-[#07101d] p-3 md:p-4">
        <div className="lg:hidden">
          <PeriodSelector currentPeriod={filters.period} filters={filterParams} />
        </div>

        <ProductReportHeader product={product} planning={planning} inventory={inventoryStatus} periodLabel={periodLabel} />

        <section className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          <MetricTile
            label="Action"
            value={planning ? readableCode(planning.action) : 'No plan'}
            detail={planning?.recommendationReason || 'No reorder-planning recommendation exists'}
            icon={ClipboardList}
            tone={actionTone(planning?.action)}
          />
          <MetricTile
            label="Recommended Buy"
            value={planning ? operationalBuyLabel(planning) : '-'}
            detail={planning ? `${compactCurrency(buyCost)} at ${formatCurrency(planning.purchaseCost)} cost` : 'Planning unavailable'}
            icon={ShoppingCart}
            tone={buyQty > 0 ? 'warn' : 'good'}
          />
          <MetricTile
            label="Position"
            value={formatInteger(positionQty)}
            detail={positionDays ? `${formatInteger(positionDays)} days of modeled coverage` : 'Coverage unavailable'}
            icon={Boxes}
            tone={toNumber(positionDays) > 0 && toNumber(positionDays) <= 30 ? 'warn' : 'blue'}
          />
          <MetricTile
            label="Period Revenue"
            value={compactCurrency(periodRevenue)}
            detail={`${formatInteger(periodOrders)} orders, ${formatInteger(periodUnits)} units`}
            icon={CircleDollarSign}
            tone={periodRevenue > 0 ? 'good' : 'warn'}
          />
          <MetricTile
            label="Gross Margin"
            value={`${formatNumber(marginPct, 1)}%`}
            detail={`${compactCurrency(marginDollars)} estimated period margin dollars`}
            icon={TrendingUp}
            tone={marginTone(marginPct)}
          />
          <MetricTile
            label="Top Buyer Share"
            value={`${formatNumber(topBuyerShare * 100, 1)}%`}
            detail={topBuyer?.companyName || 'No buyer data for period'}
            icon={Users}
            tone={topBuyerShare > 0.4 ? 'warn' : 'blue'}
          />
        </section>

        <section>
          <InventoryPlanPanel planning={planning} inventory={inventoryStatus} />
        </section>

        <section>
          <CatalogSnapshotPanel product={product} inventory={inventoryStatus} />
        </section>

        <section className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <SalesTrendPanel data={salesData} periodLabel={periodLabel} />
          <CustomerMixPanel companies={topCompanies} periodRevenue={periodRevenue} />
        </section>

        <section>
          <RecentProductOrdersPanel orders={recentOrders} />
        </section>

        <section className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <PricingPanel distribution={priceDistribution} product={product} />
          <InventoryTrendPanel trend={inventoryTrend} inventory={inventoryStatus} />
        </section>

        <InboundLinesPanel planning={planning} inboundLines={inboundLines} />
        <ForecastAuditPanel planning={planning} />

        <section className="grid gap-3 md:grid-cols-3">
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="flex items-center gap-3 p-3">
              <Gauge className="h-4 w-4 text-blue-300" />
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Average Selling Price</p>
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(priceDistribution.avgPrice)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="flex items-center gap-3 p-3">
              <Package className="h-4 w-4 text-emerald-300" />
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Inbound Visibility</p>
                <p className="text-sm font-semibold tabular-nums">{compactInboundLabel(planning)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-3 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              <div className="grid min-w-0 grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-slate-400">Stockout</p>
                  <p className="truncate font-semibold tabular-nums">{formatDate(planning?.stockoutDate || inventoryStatus?.estimatedStockoutDate)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Reorder</p>
                  <p className="truncate font-semibold tabular-nums">{formatDate(planning?.reorderByDate || null)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Receipt</p>
                  <p className="truncate font-semibold tabular-nums">{formatDate(planning?.expectedReceiptDate || null)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
