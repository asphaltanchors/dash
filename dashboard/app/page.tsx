import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Gauge,
  Mail,
  Package,
  Percent,
  ShoppingCart,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getBusinessCockpitData } from '@/lib/queries'
import type {
  AccountAttentionItem,
  BusinessCockpitSummary,
  DataQualityFlag,
  ProductGrowthQualityItem,
} from '@/lib/queries'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'

function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

function Delta({ value }: { value: string | null }) {
  if (value == null) return <span className="text-xs text-muted-foreground">n/a</span>

  const numeric = Number(value)
  const positive = numeric >= 0

  return (
    <span className={cn(
      'text-xs font-semibold tabular-nums',
      positive ? 'text-emerald-700' : 'text-red-700',
    )}>
      {positive ? '+' : ''}{value}%
    </span>
  )
}

function SeverityDot({ severity }: { severity: DataQualityFlag['severity'] }) {
  return (
    <span className={cn(
      'h-2 w-2 rounded-full',
      severity === 'critical' && 'bg-red-500',
      severity === 'warn' && 'bg-amber-500',
      severity === 'ok' && 'bg-emerald-500',
    )} />
  )
}

function CompactBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'blue'
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-5 rounded-sm px-1.5 text-[11px] font-medium',
        tone === 'good' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
        tone === 'warn' && 'border-amber-200 bg-amber-50 text-amber-800',
        tone === 'bad' && 'border-red-200 bg-red-50 text-red-800',
        tone === 'blue' && 'border-blue-200 bg-blue-50 text-blue-800',
      )}
    >
      {children}
    </Badge>
  )
}

function InlineBar({
  value,
  tone = 'blue',
}: {
  value: number
  tone?: 'blue' | 'green' | 'amber' | 'red'
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
  )
}

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string
  value: string
  detail: ReactNode
  icon: ComponentType<{ className?: string }>
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'blue'
}) {
  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
              <Icon className={cn(
                'h-3.5 w-3.5',
                tone === 'good' && 'text-emerald-600',
                tone === 'warn' && 'text-amber-600',
                tone === 'bad' && 'text-red-600',
                tone === 'blue' && 'text-blue-600',
              )} />
              <span className="truncate">{label}</span>
            </div>
            <div className="mt-1 truncate text-xl font-semibold tabular-nums">{value}</div>
          </div>
        </div>
        <div className="mt-2 text-xs leading-4 text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
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
  tone: 'blue' | 'green' | 'amber' | 'red'
}) {
  return (
    <div className="border-b py-1.5 last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs font-medium">{label}</p>
          <p className="text-xs font-semibold tabular-nums">{value}</p>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <InlineBar value={percent} tone={tone} />
          <span className="shrink-0 text-[11px] text-muted-foreground">{detail}</span>
        </div>
      </div>
    </div>
  )
}

function InsightPanel({
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
  const top10Share = toNumber(summary.top10CorporateRevenueSharePct)
  const top50Share = toNumber(summary.top50CorporateRevenueSharePct)
  const futureOrders = toNumber(summary.futureOrderCount)

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b px-3 py-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Report Health</CardTitle>
          <CompactBadge tone={flags.some((flag) => flag.severity === 'critical') ? 'bad' : flags.some((flag) => flag.severity === 'warn') ? 'warn' : 'good'}>
            {flags.length} checks
          </CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            {flags.map((flag) => (
              <div key={flag.flagKey} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-sm px-1 py-1 text-xs">
                <SeverityDot severity={flag.severity} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{flag.flagLabel}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{flag.details}</p>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">{flag.flagValue ?? 'n/a'}</span>
              </div>
            ))}
          </div>

          <div className="border-t pt-1 md:border-l md:border-t-0 md:pl-3 md:pt-0">
            <RatioRow
              label="Overdue A/R"
              value={formatCurrency(overdueAr, { showCents: false })}
              detail={`${formatNumber(overdueShare, 0)}%`}
              percent={overdueShare}
              tone={overdueShare >= 30 ? 'red' : overdueShare >= 12 ? 'amber' : 'green'}
            />
            <RatioRow
              label="Attribution Coverage"
              value={`${summary.attributionRevenueCoveragePct}%`}
              detail="revenue"
              percent={attributionRevenue}
              tone={attributionRevenue >= 80 ? 'green' : attributionRevenue >= 50 ? 'amber' : 'red'}
            />
            <RatioRow
              label="Top 10 Account Share"
              value={`${summary.top10CorporateRevenueSharePct}%`}
              detail={`top 50 ${summary.top50CorporateRevenueSharePct}%`}
              percent={top10Share}
              tone={top50Share >= 70 ? 'amber' : 'blue'}
            />
            <RatioRow
              label="Future-Dated Demand"
              value={formatCurrency(summary.futureOrderAmount, { showCents: false })}
              detail={`${futureOrders} orders`}
              percent={Math.min(futureOrders * 10, 100)}
              tone={futureOrders > 0 ? 'amber' : 'green'}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AccountTone(account: AccountAttentionItem): 'good' | 'warn' | 'bad' | 'neutral' {
  const score = toNumber(account.healthScore)
  if (score < 45 || account.daysSinceLastOrder >= 120) return 'bad'
  if (score < 70 || account.daysSinceLastOrder >= 60) return 'warn'
  return 'good'
}

function ProductTone(product: ProductGrowthQualityItem): 'good' | 'warn' | 'bad' | 'neutral' {
  const margin = toNumber(product.grossMarginPercentage)
  if (product.requiresManualReview || margin < 15) return 'bad'
  if (product.shouldReorder || margin < 30) return 'warn'
  return 'good'
}

function AccountTable({ accounts }: { accounts: AccountAttentionItem[] }) {
  const maxRevenue = Math.max(...accounts.map((account) => toNumber(account.totalRevenue)), 1)

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Accounts Needing Attention</CardTitle>
            <p className="text-xs text-muted-foreground">{accounts.length} highest-priority accounts by attention score</p>
          </div>
          <Link href="/account-attention" className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline">
            Open <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="h-8 px-3 text-[11px] uppercase text-muted-foreground">Company</TableHead>
              <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">Revenue</TableHead>
              <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">90d</TableHead>
              <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">Idle</TableHead>
              <TableHead className="h-8 text-[11px] uppercase text-muted-foreground">Signal</TableHead>
              <TableHead className="h-8 text-[11px] uppercase text-muted-foreground">Contact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => {
              const tone = AccountTone(account)
              const revenue = toNumber(account.totalRevenue)

              return (
                <TableRow key={account.companyDomainKey} className="h-9">
                  <TableCell className="max-w-[18rem] px-3 py-1.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        tone === 'good' && 'bg-emerald-500',
                        tone === 'warn' && 'bg-amber-500',
                        tone === 'bad' && 'bg-red-500',
                      )} />
                      <div className="min-w-0">
                        <Link
                          href={`/companies/${encodeURIComponent(account.companyDomainKey)}`}
                          className="block truncate text-sm font-medium text-blue-700 hover:underline"
                        >
                          {account.companyName}
                        </Link>
                        <p className="truncate text-[11px] text-muted-foreground">{account.revenueCategory} · {account.combinedGrowthTrend}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5 text-right">
                    <div className="ml-auto w-28 space-y-1">
                      <p className="font-mono text-xs">{formatCurrency(revenue, { showCents: false })}</p>
                      <InlineBar value={(revenue / maxRevenue) * 100} tone="blue" />
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-xs">
                    {formatCurrency(account.trailing90dRevenue, { showCents: false })}
                  </TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-xs">
                    {account.daysSinceLastOrder}d
                  </TableCell>
                  <TableCell className="max-w-[12rem] py-1.5">
                    <div className="flex min-w-0 flex-wrap gap-1">
                      {(account.reasonCodes.length ? account.reasonCodes : ['Review']).slice(0, 2).map((reason) => (
                        <CompactBadge key={reason} tone={tone}>{reason}</CompactBadge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[11rem] py-1.5">
                    <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{account.bestContactName || account.bestContactEmail || 'No contact'}</span>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function ProductTable({ products }: { products: ProductGrowthQualityItem[] }) {
  const maxRevenue = Math.max(...products.map((product) => toNumber(product.revenue)), 1)

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Product Economics</CardTitle>
            <p className="text-xs text-muted-foreground">{products.length} revenue leaders with margin, discount, and inventory posture</p>
          </div>
          <Link href="/products" className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline">
            Open <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="h-8 px-3 text-[11px] uppercase text-muted-foreground">SKU</TableHead>
              <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">Revenue</TableHead>
              <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">Margin</TableHead>
              <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">YoY</TableHead>
              <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">Discount</TableHead>
              <TableHead className="h-8 text-[11px] uppercase text-muted-foreground">Inventory</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const tone = ProductTone(product)
              const revenue = toNumber(product.revenue)
              const growth = toNumber(product.yoyRevenueGrowthPct)

              return (
                <TableRow key={product.sku} className="h-9">
                  <TableCell className="max-w-[14rem] px-3 py-1.5">
                    <Link
                      href={`/products/${encodeURIComponent(product.sku)}`}
                      className="block truncate text-sm font-medium text-blue-700 hover:underline"
                    >
                      {product.sku}
                    </Link>
                    <p className="truncate text-[11px] text-muted-foreground">{product.productFamily} · {product.materialType}</p>
                  </TableCell>
                  <TableCell className="py-1.5 text-right">
                    <div className="ml-auto w-28 space-y-1">
                      <p className="font-mono text-xs">{formatCurrency(revenue, { showCents: false })}</p>
                      <InlineBar value={(revenue / maxRevenue) * 100} tone="green" />
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-xs">
                    {product.grossMarginPercentage ?? 'n/a'}%
                  </TableCell>
                  <TableCell className={cn(
                    'py-1.5 text-right font-mono text-xs',
                    growth >= 0 ? 'text-emerald-700' : 'text-red-700',
                  )}>
                    {growth >= 0 ? '+' : ''}{product.yoyRevenueGrowthPct}%
                  </TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-xs">
                    {formatCurrency(product.discountLeakageAmount, { showCents: false })}
                  </TableCell>
                  <TableCell className="py-1.5">
                    <div className="flex flex-wrap gap-1">
                      <CompactBadge tone={tone}>
                        {product.requiresManualReview ? 'Manual' : product.shouldReorder ? 'Reorder' : product.inventoryStatus || 'Current'}
                      </CompactBadge>
                      {product.estimatedAvailableQuantity != null && (
                        <CompactBadge>{formatNumber(product.estimatedAvailableQuantity, 0)} avail</CompactBadge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default async function HomePage() {
  const { summary, dataQualityFlags, accountQueue, productQuality } = await getBusinessCockpitData()

  if (!summary) {
    return (
      <>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-3">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="p-4">
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="p-4 text-sm text-muted-foreground">
              No business cockpit summary is available from the current dbt snapshot.
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  const criticalFlags = dataQualityFlags.filter((flag) => flag.severity === 'critical').length
  const warningFlags = dataQualityFlags.filter((flag) => flag.severity === 'warn').length
  const dataQualityTone = criticalFlags > 0 ? 'bad' : warningFlags > 0 ? 'warn' : 'good'

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background/95">
        <div className="flex w-full items-center justify-between gap-3 px-3">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Business Cockpit</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
            <span>Snapshot {summary.asOfDate}</span>
            <CompactBadge tone={dataQualityTone}>{criticalFlags} critical, {warningFlags} warn</CompactBadge>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-3 bg-muted/20 p-3 md:p-4">
        <section className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <MetricTile
                label="YTD Revenue"
                value={formatCurrency(summary.ytdRevenue, { showCents: false })}
                detail={<><Delta value={summary.ytdRevenueGrowthPct} /> vs prior YTD, {formatNumber(summary.ytdOrders, 0)} orders</>}
                icon={CircleDollarSign}
                tone="good"
              />
              <MetricTile
                label="Trailing 365d"
                value={formatCurrency(summary.trailing365dRevenue, { showCents: false })}
                detail={`${formatNumber(summary.trailing365dOrders, 0)} current-safe orders`}
                icon={TrendingUp}
                tone="blue"
              />
              <MetricTile
                label="Open A/R"
                value={formatCurrency(summary.openArAmount, { showCents: false })}
                detail={`${summary.openInvoiceCount} invoices, ${formatCurrency(summary.overdueArAmount, { showCents: false })} overdue`}
                icon={CreditCard}
                tone={toNumber(summary.overdueArAmount) > 0 ? 'warn' : 'good'}
              />
              <MetricTile
                label="Inventory Buy"
                value={formatCurrency(summary.suggestedBuyCost, { showCents: false })}
                detail={`${summary.reorderSkuCount} reorder SKUs, ${summary.manualReviewSkuCount} manual reviews`}
                icon={Boxes}
                tone={summary.manualReviewSkuCount > 0 ? 'warn' : 'blue'}
              />
            </div>

            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <MetricTile
                label="Attribution"
                value={`${summary.attributionOrderCoveragePct}%`}
                detail={`${summary.attributionRevenueCoveragePct}% of revenue is attributed`}
                icon={Target}
                tone={toNumber(summary.attributionOrderCoveragePct) >= 80 ? 'good' : 'warn'}
              />
              <MetricTile
                label="Concentration"
                value={`${summary.top10CorporateRevenueSharePct}%`}
                detail={`Top 50 accounts hold ${summary.top50CorporateRevenueSharePct}%`}
                icon={Users}
                tone="blue"
              />
              <MetricTile
                label="Inventory Freshness"
                value={summary.inventoryAsOfDate || 'n/a'}
                detail="Latest reorder recommendation snapshot"
                icon={ClipboardList}
                tone={summary.inventoryAsOfDate ? 'good' : 'warn'}
              />
              <MetricTile
                label="Demand Check"
                value={formatCurrency(summary.futureOrderAmount, { showCents: false })}
                detail={`${summary.futureOrderCount} future-dated orders through ${summary.latestFutureOrderDate || 'n/a'}`}
                icon={ShoppingCart}
                tone={summary.futureOrderCount > 0 ? 'warn' : 'good'}
              />
            </div>
          </div>

          <InsightPanel summary={summary} flags={dataQualityFlags} />
        </section>

        {summary.futureOrderCount > 0 && (
          <section className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{summary.futureOrderCount} future-dated invoices remain in committed demand through {summary.latestFutureOrderDate}.</span>
          </section>
        )}

        <section className="grid gap-3 2xl:grid-cols-[1.15fr_0.85fr]">
          <AccountTable accounts={accountQueue} />
          <ProductTable products={productQuality} />
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <Link href="/sales-performance" className="group rounded-md border bg-card p-3 text-card-foreground shadow-none transition-colors hover:border-blue-300">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold">Sales Performance</span>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-700" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Channel, segment, and revenue trend drill-downs</p>
          </Link>
          <Link href="/cash-flow" className="group rounded-md border bg-card p-3 text-card-foreground shadow-none transition-colors hover:border-blue-300">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold">Cash Flow</span>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-700" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">DSO, A/R aging, collections, and overdue exposure</p>
          </Link>
          <Link href="/inventory" className="group rounded-md border bg-card p-3 text-card-foreground shadow-none transition-colors hover:border-blue-300">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold">Inventory</span>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-700" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Reorder posture, stockout risk, and manual review queue</p>
          </Link>
        </section>
      </main>
    </>
  )
}
