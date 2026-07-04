import Link from 'next/link'
import type { ComponentType } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Filter,
  Layers3,
  LineChart,
  MoreHorizontal,
  Package,
  Percent,
  Share2,
  ShoppingCart,
  Target,
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
  ReportIconButton as IconButton,
  ReportPanel as Panel,
  type Tone,
  toneStyles,
  toNumber,
} from '@/components/dashboard/report-ui'
import type {
  AccountAttentionItem,
  BusinessCockpitSummary,
  DataQualityFlag,
  ProductGrowthQualityItem,
  SalesPerformanceHighlight,
} from '@/lib/queries'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import type { AgingBucket, BusinessCockpitPageData, ChannelMixRow, CurrentDso } from './page-data'

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

function ReportHealthPanel({
  summary,
  flags,
}: {
  summary: BusinessCockpitSummary
  flags: DataQualityFlag[]
}) {
  const openAr = toNumber(summary.openArAmount)
  const overdueAr = toNumber(summary.overdueArAmount)
  const overdueShare = openAr > 0 ? (overdueAr / openAr) * 100 : 0
  const attributionRevenue = toNumber(summary.attributionRevenueCoveragePct)
  const top50Share = toNumber(summary.top50CorporateRevenueSharePct)
  const critical = flags.filter((flag) => flag.severity === 'critical').length
  const warnings = flags.filter((flag) => flag.severity === 'warn').length
  const tone: Tone = critical > 0 ? 'red' : warnings > 0 ? 'amber' : 'green'

  return (
    <Panel>
      <PanelHeader
        title="Report Health"
        eyebrow={`${critical} critical, ${warnings} warning`}
        action={<CompactBadge tone={tone}>{flags.length} checks</CompactBadge>}
      />
      <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_12rem] 2xl:grid-cols-1">
        <div className="space-y-1">
          {flags.length === 0 ? (
            <div className="rounded-md border border-slate-800 border-slate-800 bg-slate-950/30 px-3 py-2 text-xs text-slate-500">No health checks returned.</div>
          ) : flags.slice(0, 5).map((flag) => (
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
            label="Attribution"
            value={`${summary.attributionRevenueCoveragePct}%`}
            detail="revenue"
            percent={attributionRevenue}
            tone={attributionRevenue >= 80 ? 'green' : attributionRevenue >= 50 ? 'amber' : 'red'}
          />
          <RatioRow
            label="Top 50 Share"
            value={`${summary.top50CorporateRevenueSharePct}%`}
            detail={`top 10 ${summary.top10CorporateRevenueSharePct}%`}
            percent={top50Share}
            tone={top50Share >= 70 ? 'amber' : 'blue'}
          />
          <RatioRow
            label="Future Demand"
            value={formatCurrency(summary.futureOrderAmount, { showCents: false })}
            detail={`${formatNumber(summary.futureOrderCount, 0)} orders`}
            percent={Math.min(summary.futureOrderCount * 12, 100)}
            tone={summary.futureOrderCount > 0 ? 'amber' : 'green'}
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
          <Link href="/sales-performance" className="inline-flex items-center gap-1 text-xs font-medium text-blue-300 hover:text-blue-200">
            Sales performance <ArrowUpRight className="size-3" />
          </Link>
        </div>
        <CockpitRevenueChart data={points} />
      </div>
    </Panel>
  )
}

function AccountTone(account: AccountAttentionItem): Tone {
  const score = toNumber(account.healthScore)
  if (score < 45 || account.daysSinceLastOrder >= 120) return 'red'
  if (score < 70 || account.daysSinceLastOrder >= 60) return 'amber'
  return 'green'
}

function ProductTone(product: ProductGrowthQualityItem): Tone {
  const margin = toNumber(product.grossMarginPercentage)
  if (product.requiresManualReview || margin < 15) return 'red'
  if (product.shouldReorder || margin < 30) return 'amber'
  return 'green'
}

function AccountAttentionTable({ accounts }: { accounts: AccountAttentionItem[] }) {
  const maxRevenue = Math.max(...accounts.map((account) => toNumber(account.totalRevenue)), 1)

  return (
    <Panel>
      <PanelHeader
        title="Accounts Needing Attention"
        eyebrow={`${accounts.length} highest-priority accounts by attention score`}
        action={
          <Link href="/account-attention" className="inline-flex items-center gap-1 text-xs font-medium text-blue-300 hover:text-blue-200">
            Open all <ArrowUpRight className="size-3" />
          </Link>
        }
      />
      <div className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 bg-slate-950/30 hover:bg-slate-950/30">
              <TableHead className="h-8 px-3 text-[11px] uppercase text-slate-500">Account</TableHead>
              <TableHead className="h-8 text-[11px] uppercase text-slate-500">Segment</TableHead>
              <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Revenue</TableHead>
              <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">90D</TableHead>
              <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Idle</TableHead>
              <TableHead className="h-8 text-[11px] uppercase text-slate-500">Signal</TableHead>
              <TableHead className="h-8 text-[11px] uppercase text-slate-500">Contact</TableHead>
              <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow className="border-slate-800 hover:bg-slate-900/40">
                <TableCell colSpan={8} className="px-3 py-5 text-center text-xs text-slate-500">No account attention records returned.</TableCell>
              </TableRow>
            ) : accounts.map((account) => {
              const tone = AccountTone(account)
              const revenue = toNumber(account.totalRevenue)

              return (
                <TableRow key={account.companyDomainKey} className="h-9 border-slate-800 hover:bg-slate-900/50">
                  <TableCell className="max-w-[18rem] px-3 py-1.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={cn('size-2 shrink-0 rounded-full', toneStyles[tone].bg)} style={{ backgroundColor: toneStyles[tone].fill }} />
                      <div className="min-w-0">
                        <Link
                          href={`/companies/${encodeURIComponent(account.companyDomainKey)}`}
                          className="block truncate text-xs font-semibold text-blue-300 hover:text-blue-200"
                        >
                          {account.companyName}
                        </Link>
                        <p className="truncate text-[11px] text-slate-500">{account.activityStatus} · {account.combinedGrowthTrend}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5 text-xs text-slate-300">{account.revenueCategory}</TableCell>
                  <TableCell className="py-1.5 text-right">
                    <div className="ml-auto w-24 space-y-1">
                      <p className="font-mono text-xs text-slate-100">{formatCurrency(revenue, { showCents: false })}</p>
                      <InlineBar value={(revenue / maxRevenue) * 100} tone="blue" />
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">
                    {formatCompactCurrency(account.trailing90dRevenue, 0)}
                  </TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">{account.daysSinceLastOrder}d</TableCell>
                  <TableCell className="max-w-[15rem] py-1.5">
                    <div className="flex min-w-0 flex-wrap gap-1">
                      {(account.reasonCodes.length ? account.reasonCodes : ['Review']).slice(0, 2).map((reason) => (
                        <CompactBadge key={reason} tone={tone}>{reason}</CompactBadge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[12rem] py-1.5">
                    <p className="truncate text-xs text-slate-400">{account.bestContactName || account.bestContactEmail || 'No contact'}</p>
                  </TableCell>
                  <TableCell className={cn('py-1.5 text-right font-mono text-xs font-semibold', toneStyles[tone].text)}>
                    {formatNumber(account.attentionScore, 0)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </Panel>
  )
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

function ChannelMixPanel({ rows, title = 'Revenue by Channel' }: { rows: ChannelMixRow[]; title?: string }) {
  const tones: Tone[] = ['blue', 'green', 'amber', 'purple', 'cyan']

  return (
    <Panel>
      <PanelHeader
        title={title}
        eyebrow={rows.length > 0 ? 'Top visible revenue sources' : 'No channel revenue returned'}
        action={<CompactBadge tone="blue">12M</CompactBadge>}
      />
      <div className="space-y-3 p-3">
        {rows.length === 0 ? (
          <div className="rounded-md border border-slate-800 border-slate-800 bg-slate-950/30 px-3 py-5 text-center text-xs text-slate-500">No channel mix available.</div>
        ) : rows.map((row, index) => {
          const tone = tones[index % tones.length]

          return (
            <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_4rem_4.5rem] items-center gap-3 text-xs">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: toneStyles[tone].fill }} />
                  <span className="truncate font-medium text-slate-200">{row.label}</span>
                </div>
                <div className="mt-1">
                  <InlineBar value={row.percent} tone={tone} />
                </div>
              </div>
              <div className="text-right font-mono text-slate-100">{formatNumber(row.percent, 0)}%</div>
              <div className="text-right font-mono text-slate-400">{formatCompactCurrency(row.value, 0)}</div>
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

function DemandAndAgingPanel({
  summary,
  buckets,
}: {
  summary: BusinessCockpitSummary
  buckets: AgingBucket[]
}) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.amount, 0)

  return (
    <Panel>
      <PanelHeader title="Demand & Commitments" eyebrow="Future-dated demand and receivables aging" />
      <div className="grid gap-4 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <p className="text-xs text-slate-400">Committed Demand</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-xl font-semibold tabular-nums text-slate-50">{formatCurrency(summary.futureOrderAmount, { showCents: false })}</p>
            <span className="text-xs text-slate-500">{formatNumber(summary.futureOrderCount, 0)} orders</span>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>$0</span>
              <span>{formatCompactCurrency(Math.max(toNumber(summary.futureOrderAmount), 1) * 1.25, 0)}</span>
            </div>
            <div className="relative mt-1 h-4 overflow-hidden rounded-sm bg-slate-800">
              <div className="absolute inset-y-0 left-0 bg-blue-500/70" style={{ width: '78%' }} />
              <div className="absolute inset-y-0 w-2 rounded-sm bg-amber-400" style={{ left: '68%' }} />
            </div>
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
          <Link href="/sales-performance" className="inline-flex items-center gap-1 text-xs font-medium text-blue-300 hover:text-blue-200">
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

function FutureDemandAlert({ summary }: { summary: BusinessCockpitSummary }) {
  if (summary.futureOrderCount <= 0) return null

  return (
    <Panel className="border-amber-500/35 bg-amber-500/10">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <AlertTriangle className="size-4 shrink-0 text-amber-300" />
          <p className="truncate text-sm font-medium text-amber-100">
            {formatNumber(summary.futureOrderCount, 0)} future-dated invoices remain in committed demand through {formatIsoDate(summary.latestFutureOrderDate)}.
          </p>
        </div>
        <Link href="/orders" className="hidden shrink-0 items-center gap-1 rounded-md border border-slate-800 border-amber-400/40 px-2 py-1 text-xs font-medium text-amber-200 hover:bg-amber-400/10 sm:inline-flex">
          Review <ArrowRight className="size-3" />
        </Link>
      </div>
    </Panel>
  )
}

export function BusinessCockpitPage({ data }: { data: BusinessCockpitPageData }) {
  const {
    summary,
    dataQualityFlags,
    accountQueue,
    productQuality,
    revenuePoints,
    channelRows,
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
    inventoryValues,
    reorderValues,
    attributionValues,
    openArValues,
  } = metricTrends

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
              <p className="hidden truncate text-xs text-slate-400 sm:block">Revenue, accounts, inventory, attribution, and committed demand</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-1 rounded-md border border-slate-800 border-slate-700 bg-slate-950/40 px-2 py-1 text-xs text-slate-200 md:flex">
              <CalendarDays className="size-3.5 text-slate-400" />
              <span className="font-mono">{formatIsoDate(summary.asOfDate)}</span>
            </div>
            <div className="hidden rounded-md border border-slate-800 border-slate-700 bg-slate-950/40 px-2 py-1 text-xs text-slate-300 lg:block">
              Snapshot <span className="font-semibold text-slate-100">Auto</span>
            </div>
            <div className="hidden items-center gap-1 rounded-full border border-slate-800 border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300 sm:flex">
              <span className="size-2 rounded-full bg-emerald-400" />
              Live
            </div>
            <CompactBadge tone={healthTone}>{criticalFlags}C {warningFlags}W</CompactBadge>
            <div className="hidden items-center gap-2 md:flex">
              <IconButton icon={Share2} label="Share dashboard" />
              <IconButton icon={Filter} label="Filter dashboard" />
              <IconButton icon={MoreHorizontal} label="More dashboard actions" />
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-[calc(100svh-3.5rem)] space-y-2 bg-[#08111f] p-2 text-slate-100 sm:p-3">
        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
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
            label="Attribution"
            value={`${summary.attributionOrderCoveragePct}%`}
            detail={`${summary.attributionRevenueCoveragePct}% of revenue is attributed`}
            icon={Target}
            tone={toNumber(summary.attributionOrderCoveragePct) >= 80 ? 'green' : 'amber'}
            trend={attributionValues}
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
            label="Inventory Freshness"
            value={formatIsoDate(summary.inventoryAsOfDate)}
            detail="Latest reorder recommendation snapshot"
            icon={Clock3}
            tone={summary.inventoryAsOfDate ? 'green' : 'amber'}
            trend={inventoryValues}
          />
          <MetricTile
            label="Demand Check"
            value={formatCurrency(summary.futureOrderAmount, { showCents: false })}
            detail={`${summary.futureOrderCount} future-dated orders through ${formatIsoDate(summary.latestFutureOrderDate)}`}
            icon={ShoppingCart}
            tone={summary.futureOrderCount > 0 ? 'amber' : 'green'}
            trend={[0, toNumber(summary.futureOrderAmount), toNumber(summary.futureOrderAmount) * 0.85, toNumber(summary.futureOrderAmount) * 1.05]}
          />
        </section>

        <FutureDemandAlert summary={summary} />

        <section className="grid gap-2 2xl:grid-cols-[minmax(0,1.35fr)_minmax(24rem,0.65fr)]">
          <div className="grid gap-2 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
            <RevenueTrendPanel points={revenuePoints} summary={summary} />
            <ReportHealthPanel summary={summary} flags={dataQualityFlags} />
            <div className="xl:col-span-2">
              <AccountAttentionTable accounts={accountQueue} />
            </div>
          </div>

          <div className="grid content-start gap-2">
            <ChannelMixPanel rows={channelRows} />
            <InventoryRiskTable products={productQuality} />
          </div>
        </section>

        <section className="grid gap-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,1fr)]">
          <ProductEconomicsPanel products={productQuality} />
          <SalesPerformancePanel highlights={salesHighlights} summary={summary} currentDso={currentDso} />
          <DemandAndAgingPanel summary={summary} buckets={agingBuckets} />
        </section>

        <section className="grid gap-2 md:grid-cols-4">
          <QuickLink href="/cash-flow" icon={Percent} label="Cash Flow" detail="DSO, A/R aging, collections, overdue exposure" tone="green" />
          <QuickLink href="/marketing-attribution" icon={Activity} label="Marketing Attribution" detail="Attribution coverage, UTM quality, source mix" tone="blue" />
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
