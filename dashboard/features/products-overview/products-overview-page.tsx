// ABOUTME: Dense products and inventory cockpit combining product economics with stock planning.
// ABOUTME: Replaces the separate inventory surface with product-centric sales, margin, and reorder health.
import Link from 'next/link'
import type { ComponentType } from 'react'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Filter,
  Layers3,
  MoreHorizontal,
  Package,
  PackageCheck,
  Share2,
  ShoppingBag,
  Target,
  TrendingUp,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProductRevenueBars, type ProductRevenueBarPoint } from '@/components/dashboard/ProductInventoryCharts'
import {
  clampPercent,
  CompactBadge,
  formatCompactCurrency as compactCurrency,
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
import {
  type FamilySales,
  type InventoryPlanningItem,
  type InventoryPlanningSummary,
  type Product,
} from '@/lib/queries'
import { cn, formatNumber } from '@/lib/utils'
import type { InventoryBucket, ProductsOverviewPageData } from './page-data'

const periods = [
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y', label: '1 year' },
  { value: 'all', label: 'All' },
]

function marginTone(value: number): Tone {
  if (value >= 60) return 'green'
  if (value >= 45) return 'blue'
  if (value >= 30) return 'amber'
  return 'red'
}

function actionTone(action: InventoryPlanningItem['action'] | undefined): Tone {
  if (action === 'OUT_OF_STOCK') return 'red'
  if (action === 'BUY') return 'blue'
  if (action === 'REVIEW') return 'amber'
  if (action === 'WATCH') return 'purple'
  return 'green'
}

function stockTone(item: InventoryPlanningItem | undefined): Tone {
  if (!item) return 'neutral'
  if (item.action === 'OUT_OF_STOCK') return 'red'
  if (item.shouldReorder) return 'blue'
  if (item.requiresManualReview || item.action === 'WATCH') return 'amber'
  return 'green'
}

function Delta({ value }: { value: number | string | null | undefined }) {
  const numeric = toNumber(value)
  const positive = numeric >= 0
  const Icon = positive ? ArrowUpRight : ArrowDownRight

  return (
    <span className={cn('inline-flex items-center gap-0.5 font-mono text-xs font-semibold tabular-nums', positive ? 'text-emerald-300' : 'text-red-300')}>
      <Icon className="size-3" />
      {formatNumber(Math.abs(numeric), 1)}%
    </span>
  )
}

function conicStops<T>(
  items: T[],
  total: number,
  getValue: (item: T) => number,
  getColor: (item: T, index: number) => string,
) {
  return items.reduce<{ cursor: number; stops: string[] }>((acc, item, index) => {
    const start = acc.cursor
    const size = total > 0 ? (getValue(item) / total) * 100 : 0
    const end = start + size

    return {
      cursor: end,
      stops: [...acc.stops, `${getColor(item, index)} ${start}% ${end}%`],
    }
  }, { cursor: 0, stops: [] }).stops.join(', ')
}

function PeriodControl({ currentPeriod }: { currentPeriod: string }) {
  return (
    <div className="hidden items-center gap-1 rounded-md border border-slate-800 border-slate-700 bg-slate-950/40 p-0.5 text-xs text-slate-400 md:flex">
      {periods.map((period) => (
        <Link
          key={period.value}
          href={`/products?period=${period.value}`}
          className={cn('rounded-sm px-2 py-1 transition hover:text-slate-100', currentPeriod === period.value && 'bg-blue-500/20 text-blue-200')}
        >
          {period.label}
        </Link>
      ))}
    </div>
  )
}

function FamilyDonut({ families, totalRevenue }: { families: FamilySales[]; totalRevenue: number }) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#64748b']
  const leaders = families.slice(0, 5)
  const otherRevenue = Math.max(totalRevenue - leaders.reduce((sum, family) => sum + toNumber(family.currentPeriodSales), 0), 0)
  const slices = [...leaders.map((family) => ({ label: family.productFamily, value: toNumber(family.currentPeriodSales) })), { label: 'Other', value: otherRevenue }].filter((slice) => slice.value > 0)
  const gradient = totalRevenue <= 0 || slices.length === 0
    ? '#1e293b'
    : `conic-gradient(${conicStops(slices, totalRevenue, (slice) => slice.value, (_slice, index) => colors[index % colors.length])})`

  return (
    <Panel>
      <PanelHeader title="Sales by Product Family" eyebrow="Current period product revenue mix" />
      <div className="grid gap-4 p-3 md:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="relative size-36 place-self-center rounded-full" style={{ background: gradient }}>
          <div className="absolute inset-6 grid place-items-center rounded-full bg-[#0b1322] text-center">
            <div>
              <p className="text-lg font-semibold tabular-nums text-slate-50">{compactCurrency(totalRevenue, 2)}</p>
              <p className="text-[10px] uppercase text-slate-500">Total</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {slices.map((slice, index) => (
            <div key={slice.label} className="grid grid-cols-[minmax(0,1fr)_3.5rem_5rem] items-center gap-2 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                <span className="truncate font-medium text-slate-200">{slice.label}</span>
              </div>
              <span className="text-right font-mono text-slate-400">{formatNumber(totalRevenue > 0 ? (slice.value / totalRevenue) * 100 : 0, 1)}%</span>
              <span className="text-right font-mono text-slate-100">{compactCurrency(slice.value, 0)}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

function RevenueTrendPanel({
  points,
  totalRevenue,
  periodLabel,
  currentPeriod,
  salesGrowth,
}: {
  points: ProductRevenueBarPoint[]
  totalRevenue: number
  periodLabel: string
  currentPeriod: string
  salesGrowth: number
}) {
  const orders = points.reduce((sum, point) => sum + point.orders, 0)

  return (
    <Panel>
      <PanelHeader title="Revenue Trend" eyebrow={`Monthly product sales over ${periodLabel}`} action={<PeriodControl currentPeriod={currentPeriod} />} />
      <div className="p-3">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-semibold tabular-nums text-slate-50">{compactCurrency(totalRevenue, 2)}</p>
              <Delta value={salesGrowth} />
              <span className="text-xs text-slate-500">vs previous period</span>
            </div>
            <p className="text-xs text-slate-400">{formatNumber(orders, 0)} order lines in visible months</p>
          </div>
          <Link href="/orders" className="inline-flex items-center gap-1 text-xs font-medium text-blue-300 hover:text-blue-200">
            Order ledger <ArrowUpRight className="size-3" />
          </Link>
        </div>
        <ProductRevenueBars data={points} />
      </div>
    </Panel>
  )
}

function InventoryHealthPanel({ buckets, totalSkus }: { buckets: InventoryBucket[]; totalSkus: number }) {
  const total = Math.max(totalSkus, 1)
  const gradient = `conic-gradient(${conicStops(buckets, total, (bucket) => bucket.count, (bucket) => toneStyles[bucket.tone].fill)})`

  return (
    <Panel>
      <PanelHeader title="Inventory Health" eyebrow="Planning status across active SKUs" />
      <div className="grid gap-4 p-3 md:grid-cols-[9rem_minmax(0,1fr)]">
        <div className="relative size-32 place-self-center rounded-full" style={{ background: gradient }}>
          <div className="absolute inset-5 grid place-items-center rounded-full bg-[#0b1322] text-center">
            <div>
              <p className="text-lg font-semibold tabular-nums text-slate-50">{formatNumber(totalSkus, 0)}</p>
              <p className="text-[10px] uppercase text-slate-500">SKUs</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {buckets.map((bucket) => (
            <div key={bucket.label} className="grid grid-cols-[minmax(0,1fr)_3rem_4rem] items-center gap-2 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: toneStyles[bucket.tone].fill }} />
                <span className="truncate text-slate-300">{bucket.label}</span>
              </div>
              <span className="text-right font-mono text-slate-100">{formatNumber(bucket.count, 0)}</span>
              <span className="text-right font-mono text-slate-500">{formatNumber((bucket.count / total) * 100, 1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

function InventoryValuePanel({ buckets }: { buckets: InventoryBucket[] }) {
  const maxValue = Math.max(...buckets.map((bucket) => bucket.value), 1)

  return (
    <Panel>
      <PanelHeader title="Inventory Value by Status" eyebrow="On-hand quantity multiplied by purchase cost" />
      <div className="grid h-40 grid-cols-4 items-end gap-3 px-3 pb-3 pt-8">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="flex h-full min-w-0 flex-col justify-end gap-2 text-center">
            <div className="text-xs font-semibold tabular-nums text-slate-100">{compactCurrency(bucket.value, 0)}</div>
            <div className="mx-auto w-10 rounded-t-sm" style={{ height: `${Math.max((bucket.value / maxValue) * 100, bucket.value > 0 ? 8 : 2)}%`, backgroundColor: toneStyles[bucket.tone].fill, opacity: 0.85 }} />
            <div className="truncate text-[11px] text-slate-500">{bucket.label}</div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function ProductPerformanceTable({
  products,
  planningBySku,
}: {
  products: Product[]
  planningBySku: Map<string, InventoryPlanningItem>
}) {
  const maxRevenue = Math.max(...products.map((product) => toNumber(product.periodSales)), 1)

  return (
    <Panel>
      <PanelHeader
        title="Product Performance"
        eyebrow={`${products.length} ranked products with sales, margin, stock, and planning posture`}
        action={<Link href="/products" className="inline-flex items-center gap-1 text-xs font-medium text-blue-300 hover:text-blue-200">View all <ArrowUpRight className="size-3" /></Link>}
      />
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 bg-slate-950/30 hover:bg-slate-950/30">
            <TableHead className="h-8 px-3 text-[11px] uppercase text-slate-500">SKU</TableHead>
            <TableHead className="h-8 text-[11px] uppercase text-slate-500">Family</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Revenue</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">GM%</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Units</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">On Hand</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Days</TableHead>
            <TableHead className="h-8 text-[11px] uppercase text-slate-500">Status</TableHead>
            <TableHead className="h-8 text-[11px] uppercase text-slate-500">Trend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.slice(0, 10).map((product) => {
            const planning = planningBySku.get(product.itemName)
            const margin = toNumber(product.actualMarginPercentage || product.marginPercentage)
            const growth = toNumber(product.yoyRevenueGrowthPct)
            const tone = stockTone(planning)
            const revenue = toNumber(product.periodSales)

            return (
              <TableRow key={product.quickBooksInternalId} className="h-10 border-slate-800 hover:bg-slate-900/50">
                <TableCell className="max-w-[13rem] px-3 py-1.5">
                  <Link href={`/products/${encodeURIComponent(product.itemName)}`} className="block truncate font-mono text-xs font-semibold text-blue-300 hover:text-blue-200">
                    {product.itemName}
                  </Link>
                  <p className="truncate text-[11px] text-slate-500">{planning?.salesDescription || product.materialType || 'Product'}</p>
                </TableCell>
                <TableCell className="py-1.5"><CompactBadge tone="blue">{product.productFamily}</CompactBadge></TableCell>
                <TableCell className="py-1.5 text-right">
                  <div className="ml-auto w-24 space-y-1">
                    <p className="font-mono text-xs text-slate-100">{compactCurrency(revenue, 0)}</p>
                    <InlineBar value={(revenue / maxRevenue) * 100} tone="blue" />
                  </div>
                </TableCell>
                <TableCell className="py-1.5 text-right"><CompactBadge tone={marginTone(margin)}>{formatNumber(margin, 1)}%</CompactBadge></TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">{formatNumber(product.periodUnits, 0)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">{planning ? formatNumber(planning.onHandQty, 0) : product.estimatedAvailableQuantity || 'n/a'}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">{planning?.positionDays || '-'}</TableCell>
                <TableCell className="py-1.5"><CompactBadge tone={tone}>{planning?.action || product.inventoryStatus || 'Current'}</CompactBadge></TableCell>
                <TableCell className="py-1.5">
                  <div className={cn('font-mono text-xs', growth >= 0 ? 'text-emerald-300' : 'text-red-300')}>
                    {growth >= 0 ? '+' : ''}{formatNumber(growth, 1)}%
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Panel>
  )
}

function TopMoversPanel({ products }: { products: Product[] }) {
  const movers = [...products]
    .filter((product) => product.yoyRevenueGrowthPct != null)
    .sort((a, b) => Math.abs(toNumber(b.yoyRevenueGrowthPct)) - Math.abs(toNumber(a.yoyRevenueGrowthPct)))
    .slice(0, 8)
  const maxMove = Math.max(...movers.map((product) => Math.abs(toNumber(product.yoyRevenueGrowthPct))), 1)

  return (
    <Panel>
      <PanelHeader title="Top Movers" eyebrow="YoY revenue movement in ranked products" action={<CompactBadge tone="blue">Revenue</CompactBadge>} />
      <div className="space-y-2 p-3">
        {movers.map((product) => {
          const growth = toNumber(product.yoyRevenueGrowthPct)
          return (
            <div key={product.itemName} className="grid grid-cols-[7rem_minmax(0,1fr)_4rem_4rem] items-center gap-2 text-xs">
              <Link href={`/products/${encodeURIComponent(product.itemName)}`} className="truncate font-mono font-semibold text-blue-300 hover:text-blue-200">{product.itemName}</Link>
              <InlineBar value={(Math.abs(growth) / maxMove) * 100} tone={growth >= 0 ? 'green' : 'red'} />
              <span className="text-right font-mono text-slate-100">{compactCurrency(product.periodSales, 0)}</span>
              <span className={cn('text-right font-mono', growth >= 0 ? 'text-emerald-300' : 'text-red-300')}>{growth >= 0 ? '+' : ''}{formatNumber(growth, 1)}%</span>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

function InventoryPlanningPanel({ summary }: { summary: InventoryPlanningSummary }) {
  return (
    <Panel>
      <PanelHeader title="Inventory Planning" eyebrow="WWD and replenishment recommendations" action={<CompactBadge tone="blue">{summary.buyCount} buys</CompactBadge>} />
      <div className="grid gap-2 p-3 sm:grid-cols-2">
        <MiniBox label="WWD planning" value={formatNumber(summary.wwdBuyCount, 0)} detail={`${formatNumber(summary.wwdSuggestedBuyQty, 0)} units | ${compactCurrency(summary.wwdSuggestedBuyCost, 0)}`} tone="blue" />
        <MiniBox label="Suggested buys" value={formatNumber(summary.buyCount, 0)} detail={`${formatNumber(summary.suggestedBuyQty, 0)} units recommended`} tone="green" />
        <MiniBox label="Buy cost" value={compactCurrency(summary.suggestedBuyCost, 0)} detail={`${summary.reviewCount} SKUs need review`} tone="amber" />
        <MiniBox label="Out of stock" value={formatNumber(summary.outOfStockCount, 0)} detail={`${summary.totalSkus} active planning SKUs`} tone={summary.outOfStockCount > 0 ? 'red' : 'green'} />
      </div>
      <div className="border-t border-slate-800 px-3 py-2">
        <Link href="/inventory" className="inline-flex items-center gap-1 text-xs font-medium text-blue-300 hover:text-blue-200">
          View planning risks <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </Panel>
  )
}

function MiniBox({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: Tone }) {
  return (
    <div className={cn('rounded-md border border-slate-800 p-3', toneStyles[tone].border, toneStyles[tone].bg)}>
      <p className="text-[11px] uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-50">{value}</p>
      <p className="mt-1 truncate text-xs text-slate-400">{detail}</p>
    </div>
  )
}

function InventoryAgingPanel({ buckets }: { buckets: InventoryBucket[] }) {
  const totalValue = buckets.reduce((sum, bucket) => sum + bucket.value, 0)
  const total = Math.max(totalValue, 1)

  return (
    <Panel>
      <PanelHeader title="Inventory Aging" eyebrow={`${compactCurrency(totalValue, 0)} current on-hand value by status`} />
      <div className="p-3">
        <div className="flex h-10 overflow-hidden rounded-md border border-slate-800 border-slate-800">
          {buckets.map((bucket) => (
            <div
              key={bucket.label}
              className="grid place-items-center text-[10px] font-semibold text-white"
              style={{ width: `${clampPercent((bucket.value / total) * 100)}%`, minWidth: bucket.value > 0 ? '2rem' : 0, backgroundColor: toneStyles[bucket.tone].fill }}
              title={`${bucket.label}: ${compactCurrency(bucket.value, 0)}`}
            >
              {bucket.value > 0 ? formatNumber((bucket.value / total) * 100, 0) + '%' : ''}
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {buckets.map((bucket) => (
            <div key={bucket.label} className="min-w-0">
              <p className="truncate text-[11px] text-slate-500">{bucket.label}</p>
              <p className="font-mono text-xs text-slate-100">{compactCurrency(bucket.value, 0)}</p>
              <p className="text-[11px] text-slate-500">{formatNumber((bucket.value / total) * 100, 1)}%</p>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

function LowStockRisksPanel({ items }: { items: InventoryPlanningItem[] }) {
  const risks = items
    .filter((item) => item.action === 'OUT_OF_STOCK' || item.shouldReorder || item.requiresManualReview || item.action === 'WATCH')
    .slice(0, 8)

  return (
    <Panel id="planning-risks">
      <PanelHeader title="Low Stock & Risks" eyebrow={`${risks.length} highest-priority visible items`} action={<CompactBadge tone="blue">{items.length} items</CompactBadge>} />
      <div className="space-y-2 p-3">
        {risks.map((item) => {
          const tone = actionTone(item.action)
          return (
            <div key={item.sku} className="grid grid-cols-[auto_6.5rem_minmax(0,1fr)_4rem] items-center gap-2 text-xs">
              <AlertTriangle className={cn('size-3.5', toneStyles[tone].icon)} />
              <Link href={`/products/${encodeURIComponent(item.sku)}`} className="truncate font-mono font-semibold text-blue-300 hover:text-blue-200">{item.sku}</Link>
              <span className="truncate text-slate-400">{item.salesDescription || item.productFamily}</span>
              <span className="text-right font-mono text-slate-100">{formatNumber(item.onHandQty, 0)}</span>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

export function ProductsOverviewPage({ data }: { data: ProductsOverviewPageData }) {
  const {
    filters,
    periodLabel,
    metrics,
    products,
    familySales,
    planning,
    planningBySku,
    revenuePoints,
    buckets,
    totals,
    metricTrends,
  } = data
  const {
    familyRevenue,
    revenueGrowth,
    totalMargin,
    totalUnits,
    marginRate,
    topSkuShare,
    lowStockCount,
    averageFamilyUnitGrowth,
  } = totals
  const { revenueValues, familyValues, unitValues, inventoryValues } = metricTrends
  const topProduct = products[0]

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center border-b border-slate-800 border-slate-800 bg-[#07101d]/95 text-slate-100 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-3 px-3">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="-ml-1 text-slate-300 hover:bg-slate-800 hover:text-slate-50" />
            <Separator orientation="vertical" className="hidden bg-slate-800 data-[orientation=vertical]:h-5 sm:block" />
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-5 text-slate-50">Products & Inventory</h1>
              <p className="hidden truncate text-xs text-slate-400 sm:block">Sales, inventory health, and product performance overview</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-1 rounded-md border border-slate-800 border-slate-700 bg-slate-950/40 px-2 py-1 text-xs text-slate-200 md:flex">
              <CalendarDays className="size-3.5 text-slate-400" />
              <span className="font-mono">{formatIsoDate(planning.summary.inventoryAsOfDate)}</span>
            </div>
            <PeriodControl currentPeriod={filters.period} />
            <div className="hidden items-center gap-1 rounded-full border border-slate-800 border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300 sm:flex">
              <span className="size-2 rounded-full bg-emerald-400" />
              Live
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <IconButton icon={Share2} label="Share products dashboard" />
              <IconButton icon={Filter} label="Filter products dashboard" />
              <IconButton icon={MoreHorizontal} label="More product dashboard actions" />
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-[calc(100svh-3.5rem)] space-y-2 bg-[#08111f] p-2 text-slate-100 sm:p-3">
        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          <MetricTile label="Total Revenue" value={compactCurrency(familyRevenue, 2)} detail={<><Delta value={revenueGrowth} /> <span className="text-slate-400">vs previous {periodLabel}</span></>} icon={CircleDollarSign} tone="blue" trend={revenueValues} />
          <MetricTile label="Gross Margin" value={`${formatNumber(marginRate, 1)}%`} detail={<>{compactCurrency(totalMargin, 1)} margin dollars</>} icon={TrendingUp} tone={marginTone(marginRate)} trend={products.map((product) => product.actualMarginPercentage || product.marginPercentage)} />
          <MetricTile label="Inventory Value" value={compactCurrency(metrics.totalInventoryValue, 0)} detail={`${metrics.totalProducts} catalog products`} icon={Boxes} tone="amber" trend={inventoryValues} />
          <MetricTile label="Units Sold" value={formatNumber(totalUnits, 0)} detail={<><Delta value={averageFamilyUnitGrowth} /> <span className="text-slate-400">avg family growth</span></>} icon={ShoppingBag} tone="green" trend={unitValues} />
          <MetricTile label="Top SKU Share" value={`${formatNumber(topSkuShare, 1)}%`} detail={topProduct ? topProduct.itemName : 'No SKU data'} icon={Target} tone={topSkuShare >= 20 ? 'amber' : 'purple'} trend={familyValues} />
          <MetricTile label="Low Stock SKUs" value={formatNumber(lowStockCount, 0)} detail={`${formatNumber((lowStockCount / Math.max(planning.summary.totalSkus, 1)) * 100, 1)}% of active SKUs`} icon={PackageCheck} tone={lowStockCount > 0 ? 'amber' : 'green'} trend={planning.items.map((item) => item.onHandQty).slice(0, 30)} />
          <MetricTile label="Out of Stock" value={formatNumber(planning.summary.outOfStockCount, 0)} detail={`${formatNumber((planning.summary.outOfStockCount / Math.max(planning.summary.totalSkus, 1)) * 100, 1)}% of active SKUs`} icon={AlertTriangle} tone={planning.summary.outOfStockCount > 0 ? 'red' : 'green'} trend={planning.items.filter((item) => item.action === 'OUT_OF_STOCK').map((item) => item.suggestedBuyCost)} />
        </section>

        <section className="grid gap-2 2xl:grid-cols-[minmax(0,1.2fr)_minmax(24rem,0.8fr)]">
          <div className="grid gap-2 xl:grid-cols-[minmax(22rem,0.72fr)_minmax(0,1.28fr)]">
            <FamilyDonut families={familySales} totalRevenue={familyRevenue} />
            <RevenueTrendPanel points={revenuePoints} totalRevenue={familyRevenue} periodLabel={periodLabel} currentPeriod={filters.period} salesGrowth={revenueGrowth} />
            <div className="xl:col-span-2">
              <ProductPerformanceTable products={products} planningBySku={planningBySku} />
            </div>
          </div>
          <div className="grid content-start gap-2">
            <InventoryHealthPanel buckets={buckets} totalSkus={planning.summary.totalSkus} />
            <InventoryValuePanel buckets={buckets} />
            <TopMoversPanel products={products} />
          </div>
        </section>

        <section className="grid gap-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <InventoryPlanningPanel summary={planning.summary} />
          <InventoryAgingPanel buckets={buckets} />
          <LowStockRisksPanel items={planning.items} />
        </section>

        <section className="grid gap-2 md:grid-cols-3">
          <QuickLink href="/products" icon={Package} label="Product Detail" detail="SKU economics, families, margin, and customers" tone="blue" />
          <QuickLink href="/inventory" icon={AlertTriangle} label="Inventory Risks" detail="Low stock, out-of-stock, and review queue" tone="amber" />
          <QuickLink href="/orders" icon={Layers3} label="Order Ledger" detail="Channel, segment, and order drilldowns" tone="green" />
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
