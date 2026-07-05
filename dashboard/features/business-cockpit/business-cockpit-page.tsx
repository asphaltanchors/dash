import Link from 'next/link'
import type { ComponentType } from 'react'
import {
  ArrowUpRight,
  Boxes,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Layers3,
  LineChart,
  Package,
  Percent,
  Users,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CockpitRevenueChart, type CockpitRevenuePoint } from '@/components/dashboard/CockpitCharts'
import {
  CompactBadge,
  formatCompactCurrency,
  formatIsoDate,
  InlineBar,
  MetricTile,
  ReportHeader as PanelHeader,
  ReportPanel as Panel,
  type Tone,
  toneStyles,
  toNumber,
} from '@/components/dashboard/report-ui'
import type {
  BusinessCockpitSummary,
  DataQualityFlag,
  LargeRecentOrder,
  ProductGrowthQualityItem,
  SalesPerformanceHighlight,
} from '@/lib/queries'
import { cn, formatCurrency, formatNumber, shouldShowCompanyLink } from '@/lib/utils'
import type { AgingBucket, BusinessCockpitPageData, CurrentDso } from './page-data'

function Delta({ value, suffix = '%' }: { value: number | string | null | undefined; suffix?: string }) {
  if (value == null) return <span className="text-xs text-slate-500">n/a</span>

  const numeric = toNumber(value)
  const positive = numeric >= 0

  return (
    <span className={cn('font-mono text-xs font-semibold tabular-nums', positive ? 'text-emerald-300' : 'text-red-300')}>
      {positive ? '+' : ''}{formatNumber(numeric, 1)}{suffix}
    </span>
  )
}

function SeverityDot({ severity }: { severity: DataQualityFlag['severity'] }) {
  return (
    <span
      className={cn(
        'size-2 rounded-full',
        severity === 'critical' && 'bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.35)]',
        severity === 'warn' && 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35)]',
        severity === 'ok' && 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.35)]',
      )}
    />
  )
}

function RatioRow({
  label,
  value,
  detail,
  percent,
  tone,
}: {
  label: string
  value: string
  detail: string
  percent: number
  tone: Tone
}) {
  return (
    <div className="border-b border-slate-800 border-slate-800 py-2 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-medium text-slate-200">{label}</p>
        <p className="shrink-0 font-mono text-xs text-slate-100">{value}</p>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <InlineBar value={percent} tone={tone} />
        <span className="shrink-0 text-[11px] text-slate-500">{detail}</span>
      </div>
    </div>
  )
}

function currentDateKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daysSinceIsoDate(value: string | null | undefined) {
  if (!value) return null

  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return null

  const [currentYear, currentMonth, currentDay] = currentDateKey().split('-').map(Number)
  const valueTime = Date.UTC(year, month - 1, day)
  const currentTime = Date.UTC(currentYear, currentMonth - 1, currentDay)
  return Math.floor((currentTime - valueTime) / 86_400_000)
}

function dataFreshnessTone(asOfDate: string | null | undefined): Tone {
  const age = daysSinceIsoDate(asOfDate)
  if (age == null || age >= 2) return 'red'
  if (age >= 1) return 'amber'
  return 'green'
}

function dataFreshnessDetail(asOfDate: string | null | undefined) {
  const age = daysSinceIsoDate(asOfDate)
  if (age == null) return 'No cockpit run date'
  if (age <= 0) return 'Updated today'
  if (age === 1) return '1 day behind today'
  return `${age} days behind today`
}

function ReportHealthPanel({
  summary,
  flags,
}: {
  summary: BusinessCockpitSummary
  flags: DataQualityFlag[]
}) {
  const visibleFlags = flags.filter((flag) => !['future_orders', 'future_line_items', 'attribution_coverage'].includes(flag.flagKey))
  const openAr = toNumber(summary.openArAmount)
  const overdueAr = toNumber(summary.overdueArAmount)
  const overdueShare = openAr > 0 ? (overdueAr / openAr) * 100 : 0
  const top50Share = toNumber(summary.top50CorporateRevenueSharePct)
  const critical = visibleFlags.filter((flag) => flag.severity === 'critical').length
  const warnings = visibleFlags.filter((flag) => flag.severity === 'warn').length
  const tone: Tone = critical > 0 ? 'red' : warnings > 0 ? 'amber' : 'green'

  return (
    <Panel>
      <PanelHeader
        title="Data Checks"
        eyebrow={`${critical} critical, ${warnings} warning`}
        action={<CompactBadge tone={tone}>{visibleFlags.length} checks</CompactBadge>}
      />
      <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_12rem] 2xl:grid-cols-1">
        <div className="space-y-1">
          {visibleFlags.length === 0 ? (
            <div className="rounded-md border border-slate-800 border-slate-800 bg-slate-950/30 px-3 py-2 text-xs text-slate-500">No health checks returned.</div>
          ) : visibleFlags.slice(0, 5).map((flag) => (
            <div key={flag.flagKey} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-sm px-1 py-1.5 text-xs">
              <SeverityDot severity={flag.severity} />
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-200">{flag.flagLabel}</p>
                <p className="truncate text-[11px] text-slate-500">{flag.details}</p>
              </div>
              <span className="font-mono text-[11px] text-slate-400">{flag.flagValue ?? 'n/a'}</span>
            </div>
          ))}
        </div>
        <div>
          <RatioRow
            label="Overdue A/R"
            value={formatCurrency(overdueAr, { showCents: false })}
            detail={`${formatNumber(overdueShare, 0)}%`}
            percent={overdueShare}
            tone={overdueShare >= 30 ? 'red' : overdueShare >= 12 ? 'amber' : 'green'}
          />
          <RatioRow
            label="Top 50 Share"
            value={`${summary.top50CorporateRevenueSharePct}%`}
            detail={`top 10 ${summary.top10CorporateRevenueSharePct}%`}
            percent={top50Share}
            tone={top50Share >= 70 ? 'amber' : 'blue'}
          />
        </div>
      </div>
    </Panel>
  )
}

function RevenueTrendPanel({
  points,
  summary,
}: {
  points: CockpitRevenuePoint[]
  summary: BusinessCockpitSummary
}) {
  const orders = points.reduce((sum, point) => sum + point.orders, 0)

  return (
    <Panel>
      <PanelHeader
        title="Revenue Trend"
        eyebrow="Trailing 12 months from current-safe paid order data"
        action={
          <div className="hidden items-center gap-1 rounded-md border border-slate-800 border-slate-800 bg-slate-950/40 p-0.5 text-[11px] text-slate-400 sm:flex">
            <span className="rounded-sm bg-blue-500/20 px-2 py-1 text-blue-200">12M</span>
            <span className="px-2 py-1">YTD</span>
            <span className="px-2 py-1">3Y</span>
          </div>
        }
      />
      <div className="p-3">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-lg font-semibold tabular-nums text-slate-50">{formatCompactCurrency(summary.trailing365dRevenue, 2)}</p>
              <Delta value={summary.ytdRevenueGrowthPct} />
              <span className="text-xs text-slate-500">vs prior YTD</span>
            </div>
            <p className="text-xs text-slate-400">{formatNumber(orders, 0)} orders in displayed periods</p>
          </div>
          <Link href="/orders" className="inline-flex items-center gap-1 text-xs font-medium text-blue-300 hover:text-blue-200">
            Order ledger <ArrowUpRight className="size-3" />
          </Link>
        </div>
        <CockpitRevenueChart data={points} />
      </div>
    </Panel>
  )
}

function LargeRecentOrdersPanel({ orders }: { orders: LargeRecentOrder[] }) {
  const unusualCount = orders.filter((order) => order.isUnusuallyLarge).length

  return (
    <Panel>
      <PanelHeader
        title="Large Recent Orders"
        eyebrow="Last 45 days, ranked against trailing-year order size"
        action={
          <Link href="/orders" className="inline-flex items-center gap-1 text-xs font-medium text-blue-300 hover:text-blue-200">
            Orders <ArrowUpRight className="size-3" />
          </Link>
        }
      />
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 bg-slate-950/30 hover:bg-slate-950/30">
            <TableHead className="h-8 px-3 text-[11px] uppercase text-slate-500">Order</TableHead>
            <TableHead className="h-8 text-[11px] uppercase text-slate-500">Customer</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Date</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Amount</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Signal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow className="border-slate-800 hover:bg-slate-900/40">
              <TableCell colSpan={5} className="px-3 py-5 text-center text-xs text-slate-500">No recent order records returned.</TableCell>
            </TableRow>
          ) : orders.map((order) => (
            <TableRow key={order.orderNumber} className="h-9 border-slate-800 hover:bg-slate-900/50">
              <TableCell className="px-3 py-1.5">
                <Link href={`/orders/${encodeURIComponent(order.orderNumber)}`} className="text-xs font-semibold text-blue-300 hover:text-blue-200">
                  {order.orderNumber}
                </Link>
              </TableCell>
              <TableCell className="max-w-[18rem] py-1.5">
                {shouldShowCompanyLink(order.companyDomain, order.isIndividualCustomer) ? (
                  <Link href={`/companies/${encodeURIComponent(order.companyDomain!)}`} className="block truncate text-xs text-blue-300 hover:text-blue-200">
                    {order.customer}
                  </Link>
                ) : (
                  <span className="block truncate text-xs text-slate-300">{order.customer}</span>
                )}
              </TableCell>
              <TableCell className="py-1.5 text-right font-mono text-xs text-slate-400">{formatIsoDate(order.orderDate)}</TableCell>
              <TableCell className="py-1.5 text-right font-mono text-xs font-semibold text-slate-100">
                {formatCurrency(order.totalAmount, { showCents: false })}
              </TableCell>
              <TableCell className="py-1.5 text-right">
                <CompactBadge tone={order.isUnusuallyLarge ? 'amber' : 'neutral'}>
                  {order.isUnusuallyLarge ? `${formatNumber(order.multipleOfAverage, 1)}x avg` : 'Large'}
                </CompactBadge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {orders.length > 0 && unusualCount === 0 ? (
        <p className="border-t border-slate-800 px-3 py-2 text-[11px] text-slate-500">
          No order crossed the unusual-size benchmark, so this shows the largest recent orders.
        </p>
      ) : null}
    </Panel>
  )
}

function ProductTone(product: ProductGrowthQualityItem): Tone {
  const margin = toNumber(product.grossMarginPercentage)
  if (product.requiresManualReview || margin < 15) return 'red'
  if (product.shouldReorder || margin < 30) return 'amber'
  return 'green'
}

function InventoryRiskTable({ products }: { products: ProductGrowthQualityItem[] }) {
  const riskProducts = products
    .filter((product) => product.requiresManualReview || product.shouldReorder || ProductTone(product) !== 'green')
    .concat(products)
    .filter((product, index, all) => all.findIndex((candidate) => candidate.sku === product.sku) === index)
    .slice(0, 5)

  return (
    <Panel>
      <PanelHeader
        title="Inventory At Risk"
        eyebrow={`${riskProducts.filter((product) => product.shouldReorder).length} reorder flags in visible list`}
        action={
          <Link href="/inventory" className="inline-flex items-center gap-1 text-xs font-medium text-blue-300 hover:text-blue-200">
            View inventory <ArrowUpRight className="size-3" />
          </Link>
        }
      />
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 bg-slate-950/30 hover:bg-slate-950/30">
            <TableHead className="h-8 px-3 text-[11px] uppercase text-slate-500">SKU</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Avail</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Margin</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Reorder</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Risk</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {riskProducts.map((product) => {
            const tone = ProductTone(product)
            return (
              <TableRow key={product.sku} className="h-9 border-slate-800 hover:bg-slate-900/50">
                <TableCell className="max-w-[10rem] px-3 py-1.5">
                  <Link href={`/products/${encodeURIComponent(product.sku)}`} className="block truncate text-xs font-semibold text-blue-300 hover:text-blue-200">
                    {product.sku}
                  </Link>
                  <p className="truncate text-[11px] text-slate-500">{product.productFamily}</p>
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">
                  {product.estimatedAvailableQuantity == null ? 'n/a' : formatNumber(product.estimatedAvailableQuantity, 0)}
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">
                  {product.grossMarginPercentage ?? 'n/a'}%
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">
                  {product.reorderValueAtCost ? formatCompactCurrency(product.reorderValueAtCost, 0) : '$0'}
                </TableCell>
                <TableCell className="py-1.5 text-right">
                  <CompactBadge tone={tone}>{product.requiresManualReview ? 'Manual' : product.shouldReorder ? 'Reorder' : 'Watch'}</CompactBadge>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Panel>
  )
}

function ProductEconomicsPanel({ products }: { products: ProductGrowthQualityItem[] }) {
  const maxRevenue = Math.max(...products.map((product) => toNumber(product.revenue)), 1)

  return (
    <Panel>
      <PanelHeader
        title="Top Products by Revenue"
        eyebrow="Revenue leaders with margin and inventory posture"
        action={
          <Link href="/products" className="inline-flex items-center gap-1 text-xs font-medium text-blue-300 hover:text-blue-200">
            Products <ArrowUpRight className="size-3" />
          </Link>
        }
      />
      <div className="space-y-2 p-3">
        {products.slice(0, 6).map((product) => {
          const revenue = toNumber(product.revenue)
          const growth = toNumber(product.yoyRevenueGrowthPct)
          const tone = ProductTone(product)

          return (
            <div key={product.sku} className="grid grid-cols-[minmax(0,1fr)_5.5rem_3.5rem] items-center gap-3 text-xs">
              <div className="min-w-0">
                <Link href={`/products/${encodeURIComponent(product.sku)}`} className="truncate font-semibold text-slate-100 hover:text-blue-200">
                  {product.sku}
                </Link>
                <div className="mt-1 flex items-center gap-2">
                  <InlineBar value={(revenue / maxRevenue) * 100} tone={tone} />
                  <span className="shrink-0 text-[11px] text-slate-500">{product.grossMarginPercentage ?? 'n/a'}%</span>
                </div>
              </div>
              <div className="text-right font-mono text-slate-100">{formatCompactCurrency(revenue, 0)}</div>
              <div className={cn('text-right font-mono', growth >= 0 ? 'text-emerald-300' : 'text-red-300')}>
                {growth >= 0 ? '+' : ''}{formatNumber(growth, 1)}%
              </div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

function DonutGauge({ buckets, total }: { buckets: AgingBucket[]; total: number }) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
  let cumulative = 0
  const gradient = buckets.length === 0 || total <= 0
    ? '#1e293b'
    : `conic-gradient(${buckets.map((bucket, index) => {
      const start = cumulative
      const size = (bucket.amount / total) * 100
      cumulative += size
      return `${colors[index % colors.length]} ${start}% ${cumulative}%`
    }).join(', ')})`

  return (
    <div className="relative size-28 shrink-0 rounded-full" style={{ background: gradient }}>
      <div className="absolute inset-4 grid place-items-center rounded-full bg-[#0b1322] text-center">
        <div>
          <p className="text-base font-semibold tabular-nums text-slate-50">{formatCompactCurrency(total, 1)}</p>
          <p className="text-[10px] uppercase text-slate-500">Open A/R</p>
        </div>
      </div>
    </div>
  )
}

function ReceivablesAgingPanel({
  summary,
  buckets,
}: {
  summary: BusinessCockpitSummary
  buckets: AgingBucket[]
}) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.amount, 0)

  return (
    <Panel>
      <PanelHeader title="A/R Aging" eyebrow="Open receivables by aging bucket" />
      <div className="grid gap-4 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <p className="text-xs text-slate-400">Open A/R</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-xl font-semibold tabular-nums text-slate-50">{formatCurrency(summary.openArAmount, { showCents: false })}</p>
            <span className="text-xs text-slate-500">{formatNumber(summary.openInvoiceCount, 0)} invoices</span>
          </div>
          <div className="mt-4 space-y-1">
            {buckets.slice(0, 4).map((bucket, index) => (
              <div key={bucket.label} className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] items-center gap-2 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4] }} />
                  <span className="truncate text-slate-300">{bucket.label}</span>
                </div>
                <span className="text-right font-mono text-slate-400">{bucket.invoices}</span>
                <span className="text-right font-mono text-slate-100">{formatCompactCurrency(bucket.amount, 0)}</span>
              </div>
            ))}
          </div>
        </div>
        <DonutGauge buckets={buckets} total={total || toNumber(summary.openArAmount)} />
      </div>
    </Panel>
  )
}

function SalesPerformancePanel({
  highlights,
  summary,
  currentDso,
}: {
  highlights: SalesPerformanceHighlight[]
  summary: BusinessCockpitSummary
  currentDso: CurrentDso
}) {
  const avgOrderValue = summary.ytdOrders > 0 ? toNumber(summary.ytdRevenue) / summary.ytdOrders : 0

  return (
    <Panel>
      <PanelHeader
        title="Sales Performance"
        eyebrow="YTD quality indicators and top selling channels"
        action={
          <Link href="/orders" className="inline-flex items-center gap-1 text-xs font-medium text-blue-300 hover:text-blue-200">
            Drill in <ArrowUpRight className="size-3" />
          </Link>
        }
      />
      <div className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="Revenue" value={formatCompactCurrency(summary.ytdRevenue, 2)} delta={summary.ytdRevenueGrowthPct} tone="green" />
          <MiniStat label="Orders" value={formatNumber(summary.ytdOrders, 0)} delta={summary.ytdOrderGrowthPct} tone="green" />
          <MiniStat label="Avg Order" value={formatCurrency(avgOrderValue, { showCents: false })} tone="blue" />
          <MiniStat label="DSO" value={currentDso ? `${currentDso.dsoDays}d` : 'n/a'} tone={currentDso && toNumber(currentDso.dsoDays) > 45 ? 'amber' : 'green'} />
        </div>
        <div className="space-y-2">
          {highlights.slice(0, 4).map((row) => (
            <div key={row.salesChannel} className="grid grid-cols-[minmax(0,1fr)_5.5rem_4rem] items-center gap-2 text-xs">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-200">{row.salesChannel}</p>
                <p className="truncate text-[11px] text-slate-500">{row.customerSegment}</p>
              </div>
              <span className="text-right font-mono text-slate-100">{formatCompactCurrency(row.totalRevenue, 0)}</span>
              <span className="text-right font-mono text-slate-400">{formatNumber(row.orderCount, 0)}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

function MiniStat({
  label,
  value,
  delta,
  tone,
}: {
  label: string
  value: string
  delta?: string | null
  tone: Tone
}) {
  return (
    <div className={cn('rounded-md border border-slate-800 p-2', toneStyles[tone].border, toneStyles[tone].bg)}>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums text-slate-50">{value}</p>
      {delta != null ? <Delta value={delta} /> : null}
    </div>
  )
}

export function BusinessCockpitPage({ data }: { data: BusinessCockpitPageData }) {
  const {
    summary,
    dataQualityFlags,
    productQuality,
    largeRecentOrders,
    revenuePoints,
    agingBuckets,
    salesHighlights,
    currentDso,
    health,
    metricTrends,
  } = data
  const { criticalFlags, warningFlags, healthTone } = health
  const {
    revenueValues,
    accountRevenueValues,
    reorderValues,
    openArValues,
  } = metricTrends
  const freshnessTone: Tone = summary ? dataFreshnessTone(summary.asOfDate) : 'neutral'
  const freshnessAge = summary ? daysSinceIsoDate(summary.asOfDate) : null

  if (!summary) {
    return (
      <>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-800 border-slate-800 bg-[#07101d] text-slate-100">
          <div className="flex items-center gap-2 px-3">
            <SidebarTrigger className="-ml-1 text-slate-300 hover:bg-slate-800 hover:text-slate-50" />
            <Separator orientation="vertical" className="mr-1 bg-slate-800 data-[orientation=vertical]:h-4" />
            <span className="text-sm font-semibold">Business Cockpit</span>
          </div>
        </header>
        <main className="min-h-[calc(100svh-3.5rem)] bg-[#08111f] p-3 text-slate-100">
          <Panel className="p-4 text-sm text-slate-400">
            No business cockpit summary is available from the current dbt snapshot.
          </Panel>
        </main>
      </>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center border-b border-slate-800 border-slate-800 bg-[#07101d]/95 text-slate-100 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-3 px-3">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="-ml-1 text-slate-300 hover:bg-slate-800 hover:text-slate-50" />
            <Separator orientation="vertical" className="hidden bg-slate-800 data-[orientation=vertical]:h-5 sm:block" />
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-5 text-slate-50">Business Cockpit</h1>
              <p className="hidden truncate text-xs text-slate-400 sm:block">Revenue, receivables, inventory, and data freshness</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-1 rounded-md border border-slate-800 border-slate-700 bg-slate-950/40 px-2 py-1 text-xs text-slate-200 md:flex">
              <CalendarDays className="size-3.5 text-slate-400" />
              <span className="font-mono">{formatIsoDate(summary.asOfDate)}</span>
            </div>
            <CompactBadge tone={healthTone}>{criticalFlags}C {warningFlags}W</CompactBadge>
          </div>
        </div>
      </header>

      <main className="min-h-[calc(100svh-3.5rem)] space-y-2 bg-[#08111f] p-2 text-slate-100 sm:p-3">
        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <MetricTile
            label="YTD Revenue"
            value={formatCurrency(summary.ytdRevenue, { showCents: false })}
            detail={<><Delta value={summary.ytdRevenueGrowthPct} /> <span className="text-slate-400">vs prior YTD</span><br />{formatNumber(summary.ytdOrders, 0)} orders</>}
            icon={CircleDollarSign}
            tone="blue"
            trend={revenueValues}
          />
          <MetricTile
            label="Trailing 365D"
            value={formatCurrency(summary.trailing365dRevenue, { showCents: false })}
            detail={<><Delta value={summary.trailing365dRevenueGrowthPct} /> <span className="text-slate-400">vs prior 365D</span><br />{formatNumber(summary.trailing365dOrders, 0)} current-safe orders</>}
            icon={LineChart}
            tone="purple"
            trend={revenueValues}
          />
          <MetricTile
            label="Open A/R"
            value={formatCurrency(summary.openArAmount, { showCents: false })}
            detail={`${summary.openInvoiceCount} invoices, ${formatCurrency(summary.overdueArAmount, { showCents: false })} overdue`}
            icon={CreditCard}
            tone={toNumber(summary.overdueArAmount) > 0 ? 'amber' : 'green'}
            trend={openArValues}
          />
          <MetricTile
            label="Inventory Buy"
            value={formatCurrency(summary.suggestedBuyCost, { showCents: false })}
            detail={`${summary.reorderSkuCount} reorder SKUs, ${summary.manualReviewSkuCount} manual reviews`}
            icon={Boxes}
            tone={summary.manualReviewSkuCount > 0 ? 'amber' : 'cyan'}
            trend={reorderValues}
          />
          <MetricTile
            label="Concentration"
            value={`${summary.top10CorporateRevenueSharePct}%`}
            detail={`Top 50 accounts hold ${summary.top50CorporateRevenueSharePct}%`}
            icon={Users}
            tone="purple"
            trend={accountRevenueValues}
          />
          <MetricTile
            label="Data Freshness"
            value={formatIsoDate(summary.asOfDate)}
            detail={dataFreshnessDetail(summary.asOfDate)}
            icon={CalendarDays}
            tone={freshnessTone}
            trend={freshnessAge == null ? [] : [0, Math.max(freshnessAge, 0)]}
          />
        </section>

        <section className="grid gap-2 2xl:grid-cols-[minmax(0,1.35fr)_minmax(24rem,0.65fr)]">
          <div className="grid gap-2 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
            <RevenueTrendPanel points={revenuePoints} summary={summary} />
            <ReportHealthPanel summary={summary} flags={dataQualityFlags} />
            <div className="xl:col-span-2">
              <LargeRecentOrdersPanel orders={largeRecentOrders} />
            </div>
          </div>

          <div className="grid content-start gap-2">
            <InventoryRiskTable products={productQuality} />
          </div>
        </section>

        <section className="grid gap-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,1fr)]">
          <ProductEconomicsPanel products={productQuality} />
          <SalesPerformancePanel highlights={salesHighlights} summary={summary} currentDso={currentDso} />
          <ReceivablesAgingPanel summary={summary} buckets={agingBuckets} />
        </section>

        <section className="grid gap-2 md:grid-cols-4">
          <QuickLink href="/cash-flow" icon={Percent} label="Cash Flow" detail="DSO, A/R aging, collections, overdue exposure" tone="green" />
          <QuickLink href="/account-attention" icon={Users} label="Account Attention" detail="Full account review queue and contact signals" tone="blue" />
          <QuickLink href="/products" icon={Package} label="Products" detail="Margin quality, discounts, reorder posture" tone="amber" />
          <QuickLink href="/companies" icon={Layers3} label="Companies" detail="Account health, contacts, concentration" tone="purple" />
        </section>
      </main>
    </>
  )
}

function QuickLink({
  href,
  icon: Icon,
  label,
  detail,
  tone,
}: {
  href: string
  icon: ComponentType<{ className?: string }>
  label: string
  detail: string
  tone: Tone
}) {
  return (
    <Link href={href} className={cn('group rounded-md border border-slate-800 border-slate-800 bg-[#0b1322] p-3 transition hover:border-slate-600', toneStyles[tone].border)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={cn('size-4 shrink-0', toneStyles[tone].icon)} />
          <span className="truncate text-sm font-semibold text-slate-100">{label}</span>
        </div>
        <ChevronRight className="size-4 shrink-0 text-slate-600 transition group-hover:text-slate-300" />
      </div>
      <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
    </Link>
  )
}
