import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import { AlertTriangle, Boxes, CreditCard, Database, DollarSign, Package, TrendingUp, Users } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getBusinessCockpitData } from '@/lib/queries'
import { formatCurrency, formatNumber } from '@/lib/utils'

function Delta({ value }: { value: string | null }) {
  if (value == null) return <span className="text-xs text-muted-foreground">n/a</span>
  const numeric = Number(value)
  const tone = numeric >= 0 ? 'text-emerald-700' : 'text-red-700'
  return <span className={`text-xs font-medium ${tone}`}>{numeric >= 0 ? '+' : ''}{value}%</span>
}

function SummaryTile({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string
  value: string
  detail: ReactNode
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="truncate text-xl font-semibold tabular-nums">{value}</p>
          </div>
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  )
}

export default async function HomePage() {
  const { summary, dataQualityFlags, accountQueue, productQuality } = await getBusinessCockpitData()

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex-1 space-y-4 p-4 pt-2 md:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Business Cockpit</h1>
            <p className="text-sm text-muted-foreground">As of {summary?.asOfDate || 'current dbt snapshot'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {dataQualityFlags.map((flag) => (
              <Badge key={flag.flagKey} variant="outline" className={
                flag.severity === 'critical'
                  ? 'border-red-300 bg-red-50 text-red-800'
                  : flag.severity === 'warn'
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-800'
              }>
                {flag.flagLabel}: {flag.flagValue ?? 'n/a'}
              </Badge>
            ))}
          </div>
        </div>

        {summary && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              title="YTD Revenue"
              value={formatCurrency(summary.ytdRevenue, { showCents: false })}
              detail={<><Delta value={summary.ytdRevenueGrowthPct} /> vs prior YTD, {formatNumber(summary.ytdOrders, 0)} orders</>}
              icon={DollarSign}
            />
            <SummaryTile
              title="A/R"
              value={formatCurrency(summary.openArAmount, { showCents: false })}
              detail={`${summary.openInvoiceCount} invoices, ${formatCurrency(summary.overdueArAmount, { showCents: false })} overdue`}
              icon={CreditCard}
            />
            <SummaryTile
              title="Inventory Buy"
              value={formatCurrency(summary.suggestedBuyCost, { showCents: false })}
              detail={`${summary.reorderSkuCount} reorder SKUs, ${summary.manualReviewSkuCount} manual reviews`}
              icon={Boxes}
            />
            <SummaryTile
              title="Attribution Coverage"
              value={`${summary.attributionOrderCoveragePct}%`}
              detail={`${summary.futureOrderCount} future orders worth ${formatCurrency(summary.futureOrderAmount, { showCents: false })}`}
              icon={Database}
            />
          </div>
        )}

        {summary && (
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryTile
              title="Trailing 365 Revenue"
              value={formatCurrency(summary.trailing365dRevenue, { showCents: false })}
              detail={`${formatNumber(summary.trailing365dOrders, 0)} current-safe orders`}
              icon={TrendingUp}
            />
            <SummaryTile
              title="Top 10 Accounts"
              value={`${summary.top10CorporateRevenueSharePct}%`}
              detail={`Top 50 hold ${summary.top50CorporateRevenueSharePct}% of corporate revenue`}
              icon={Users}
            />
            <SummaryTile
              title="Inventory Freshness"
              value={summary.inventoryAsOfDate || 'n/a'}
              detail="Latest reorder recommendation snapshot"
              icon={Package}
            />
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader className="p-3 pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Account Attention</CardTitle>
                <Link href="/account-attention" className="text-xs text-blue-700 hover:underline">Open</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Days</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountQueue.map((account) => (
                      <TableRow key={account.companyDomainKey}>
                        <TableCell className="min-w-48 font-medium">
                          <Link
                            href={`/companies/${encodeURIComponent(account.companyDomainKey)}`}
                            className="text-blue-700 hover:underline"
                          >
                            {account.companyName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(account.totalRevenue, { showCents: false })}</TableCell>
                        <TableCell className="text-right tabular-nums">{account.daysSinceLastOrder}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap text-xs">{account.reasonCodes[0]}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Product Economics</CardTitle>
                <Link href="/products" className="text-xs text-blue-700 hover:underline">Open</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productQuality.map((product) => (
                      <TableRow key={product.sku}>
                        <TableCell className="min-w-36 font-medium">
                          <Link
                            href={`/products/${encodeURIComponent(product.sku)}`}
                            className="text-blue-700 hover:underline"
                          >
                            {product.sku}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(product.revenue, { showCents: false })}</TableCell>
                        <TableCell className="text-right font-mono">{product.grossMarginPercentage ?? 'n/a'}%</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(product.discountLeakageAmount, { showCents: false })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {summary && summary.futureOrderCount > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{summary.futureOrderCount} future-dated invoices remain in committed demand through {summary.latestFutureOrderDate}.</span>
          </div>
        )}
      </div>
    </>
  )
}
