// ABOUTME: Dense product economics report with family mix, margin, and inventory posture
// ABOUTME: Keeps SKU-level leaders and product detail visible without a large marketing-style header
import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Gauge,
  Package,
  ReceiptText,
  TrendingUp,
} from 'lucide-react';
import {
  getProductMetrics,
  getProducts,
  getFamilySales,
  type FamilySales,
  type Product,
} from '@/lib/queries';
import { getPeriodLabel, parseFilters, type ProductFilters } from '@/lib/filter-utils';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function compactCurrency(value: number | string) {
  return formatCurrency(value, { showCents: false });
}

function marginTone(value: number): 'good' | 'blue' | 'warn' | 'bad' {
  if (value >= 65) return 'good';
  if (value >= 50) return 'blue';
  if (value >= 35) return 'warn';
  return 'bad';
}

function growthTone(value: number): 'good' | 'blue' | 'warn' | 'bad' {
  if (value >= 15) return 'good';
  if (value >= 0) return 'blue';
  if (value >= -15) return 'warn';
  return 'bad';
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

function InlineBar({
  value,
  tone = 'blue',
}: {
  value: number;
  tone?: 'blue' | 'green' | 'amber' | 'red';
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
  );
}

function Delta({ value }: { value: number }) {
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums', positive ? 'text-emerald-700' : 'text-red-700')}>
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

function FamilyMixPanel({
  families,
  totalRevenue,
}: {
  families: FamilySales[];
  totalRevenue: number;
}) {
  const leaders = families.slice(0, 8);
  const maxSales = Math.max(...leaders.map((family) => toNumber(family.currentPeriodSales)), 1);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Family Mix</CardTitle>
            <p className="text-xs text-muted-foreground">Current period sales, unit volume, and growth pressure</p>
          </div>
          <CompactBadge tone="blue">{families.length} families</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leaders.map((family) => {
          const sales = toNumber(family.currentPeriodSales);
          const share = totalRevenue > 0 ? (sales / totalRevenue) * 100 : 0;
          const tone = growthTone(family.salesGrowth);

          return (
            <div key={family.productFamily} className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-3 border-b px-3 py-2 last:border-b-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      tone === 'good' && 'bg-emerald-500',
                      tone === 'blue' && 'bg-blue-500',
                      tone === 'warn' && 'bg-amber-500',
                      tone === 'bad' && 'bg-red-500',
                    )}
                  />
                  <Link href={`/families/${encodeURIComponent(family.productFamily)}`} className="truncate text-sm font-medium hover:underline">
                    {family.productFamily}
                  </Link>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {formatNumber(family.currentPeriodOrders, 0)} orders · {formatNumber(family.currentPeriodUnits, 0)} units · <Delta value={family.salesGrowth} />
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="font-mono text-xs font-semibold">{compactCurrency(sales)}</p>
                <div className="flex items-center gap-2">
                  <InlineBar value={(sales / maxSales) * 100} tone={tone === 'good' ? 'green' : tone === 'bad' ? 'red' : tone === 'warn' ? 'amber' : 'blue'} />
                  <span className="w-10 font-mono text-[11px] text-muted-foreground">{formatNumber(share, 1)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function SkuLeadersPanel({ products }: { products: Product[] }) {
  const leaders = products.slice(0, 8);
  const maxRevenue = Math.max(...leaders.map((product) => toNumber(product.periodSales)), 1);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">SKU Revenue Leaders</CardTitle>
            <p className="text-xs text-muted-foreground">Top products with margin and customer concentration signals</p>
          </div>
          <CompactBadge tone="blue">{leaders.length} shown</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leaders.map((product) => {
          const revenue = toNumber(product.periodSales);
          const margin = toNumber(product.actualMarginPercentage || product.marginPercentage);
          const tone = marginTone(margin);

          return (
            <div key={product.quickBooksInternalId} className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-3 border-b px-3 py-2 last:border-b-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      tone === 'good' && 'bg-emerald-500',
                      tone === 'blue' && 'bg-blue-500',
                      tone === 'warn' && 'bg-amber-500',
                      tone === 'bad' && 'bg-red-500',
                    )}
                  />
                  <Link href={`/products/${encodeURIComponent(product.itemName)}`} className="truncate font-mono text-sm font-medium hover:underline">
                    {product.itemName}
                  </Link>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {product.productFamily} · {formatNumber(product.periodUnits, 0)} units · {formatNumber(product.customerCount || 0, 0)} customers
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="font-mono text-xs font-semibold">{compactCurrency(revenue)}</p>
                <div className="flex items-center gap-2">
                  <InlineBar value={(revenue / maxRevenue) * 100} tone={tone === 'good' ? 'green' : tone === 'bad' ? 'red' : tone === 'warn' ? 'amber' : 'blue'} />
                  <span className="w-10 font-mono text-[11px] text-muted-foreground">{formatNumber(margin, 1)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function EconomicsPanel({ products }: { products: Product[] }) {
  const marginDollars = products.reduce((sum, product) => sum + toNumber(product.grossMarginAmount), 0);
  const discountLeakage = products.reduce((sum, product) => sum + toNumber(product.discountLeakageAmount), 0);
  const reorderValue = products.reduce((sum, product) => sum + toNumber(product.reorderValueAtCost), 0);
  const totalRevenue = products.reduce((sum, product) => sum + toNumber(product.periodSales), 0);
  const marginRate = totalRevenue > 0 ? (marginDollars / totalRevenue) * 100 : 0;
  const rows = [
    { label: 'Gross margin', value: marginDollars, share: marginRate, tone: marginRate >= 55 ? 'green' as const : 'amber' as const },
    { label: 'Discount leakage', value: discountLeakage, share: totalRevenue > 0 ? (discountLeakage / totalRevenue) * 100 : 0, tone: discountLeakage > 0 ? 'red' as const : 'green' as const },
    { label: 'Reorder value', value: reorderValue, share: marginDollars > 0 ? (reorderValue / marginDollars) * 100 : 0, tone: 'blue' as const },
  ];

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Economics / Inventory</CardTitle>
            <p className="text-xs text-muted-foreground">Margin dollars, leakage, and replenishment cost pressure</p>
          </div>
          <CompactBadge tone={marginRate >= 55 ? 'good' : 'warn'}>{formatNumber(marginRate, 1)}% GM</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[7rem_minmax(0,1fr)_5.5rem] items-center gap-2">
            <p className="truncate text-xs text-muted-foreground">{row.label}</p>
            <InlineBar value={row.share} tone={row.tone} />
            <p className="text-right font-mono text-xs font-semibold">{compactCurrency(row.value)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function InventoryFlagsPanel({ products }: { products: Product[] }) {
  const buy = products.filter((product) => product.shouldReorder).length;
  const review = products.filter((product) => product.requiresManualReview).length;
  const noStatus = products.filter((product) => !product.inventoryStatus).length;
  const total = Math.max(products.length, 1);
  const rows = [
    { label: 'Buy flag', count: buy, tone: 'amber' as const },
    { label: 'Manual review', count: review, tone: 'red' as const },
    { label: 'No status', count: noStatus, tone: 'blue' as const },
  ];

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Inventory Flags</CardTitle>
            <p className="text-xs text-muted-foreground">Top-product planning posture from current growth-quality mart</p>
          </div>
          <CompactBadge tone={review > 0 ? 'warn' : 'good'}>{review} review</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2rem] items-center gap-2">
            <p className="truncate text-xs text-muted-foreground">{row.label}</p>
            <InlineBar value={(row.count / total) * 100} tone={row.tone} />
            <p className="text-right font-mono text-xs">{row.count}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface ProductsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const filters = parseFilters<ProductFilters>(params);

  if (!filters.period) {
    filters.period = '1y';
  }

  const [metrics, products, familySales] = await Promise.all([
    getProductMetrics(),
    getProducts(50, filters),
    getFamilySales(filters),
  ]);

  const periodLabel = getPeriodLabel(filters.period);
  const totalRevenue = products.reduce((sum, product) => sum + toNumber(product.periodSales), 0);
  const totalMargin = products.reduce((sum, product) => sum + toNumber(product.grossMarginAmount), 0);
  const totalUnits = products.reduce((sum, product) => sum + toNumber(product.periodUnits), 0);
  const discountLeakage = products.reduce((sum, product) => sum + toNumber(product.discountLeakageAmount), 0);
  const marginRate = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
  const topProduct = products[0] ?? null;
  const topSkuShare = topProduct && totalRevenue > 0 ? (toNumber(topProduct.periodSales) / totalRevenue) * 100 : 0;

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
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
                  <BreadcrumbPage>Products</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <CompactBadge tone="blue">{periodLabel}</CompactBadge>
          </div>
          <div className="hidden shrink-0 lg:block">
            <PeriodSelector currentPeriod={filters.period || '1y'} filters={filters as Record<string, string | number | boolean | undefined>} />
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 overflow-x-hidden bg-muted/20 p-3 md:p-4">
        <div className="flex flex-col gap-3 lg:hidden">
          <PeriodSelector currentPeriod={filters.period || '1y'} filters={filters as Record<string, string | number | boolean | undefined>} />
        </div>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Top 50 Revenue"
            value={compactCurrency(totalRevenue)}
            detail={<>{formatNumber(totalUnits, 0)} units · {formatNumber(products.length, 0)} ranked SKUs</>}
            icon={CircleDollarSign}
            tone="good"
          />
          <MetricTile
            label="Gross Margin"
            value={`${formatNumber(marginRate, 1)}%`}
            detail={<>{compactCurrency(totalMargin)} margin dollars · catalog avg {metrics.averageMargin}%</>}
            icon={TrendingUp}
            tone={marginTone(marginRate)}
          />
          <MetricTile
            label="Inventory Value"
            value={compactCurrency(metrics.totalInventoryValue)}
            detail={<>{metrics.totalProducts} catalog products · {metrics.kitProducts} kits</>}
            icon={Boxes}
            tone="blue"
          />
          <MetricTile
            label="Top SKU Share"
            value={`${formatNumber(topSkuShare, 1)}%`}
            detail={topProduct ? <>{topProduct.itemName} · {compactCurrency(topProduct.periodSales)}</> : <>No product sales data</>}
            icon={Package}
            tone={topSkuShare >= 20 ? 'warn' : 'blue'}
          />
        </section>

        <section className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,.75fr)]">
          <SkuLeadersPanel products={products} />
          <div className="space-y-3">
            <EconomicsPanel products={products} />
            <InventoryFlagsPanel products={products} />
            <Card className="rounded-md py-0 shadow-none">
              <CardHeader className="border-b px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-semibold">Catalog Baseline</CardTitle>
                    <p className="text-xs text-muted-foreground">Average listed price and cost across inventory products</p>
                  </div>
                  <CompactBadge tone="blue">{formatNumber(metrics.totalProducts, 0)} products</CompactBadge>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3 p-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Avg price</p>
                  <p className="font-semibold tabular-nums">{compactCurrency(metrics.averageSalesPrice)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg cost</p>
                  <p className="font-semibold tabular-nums">{compactCurrency(metrics.averagePurchaseCost)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Leakage</p>
                  <p className="font-semibold tabular-nums">{compactCurrency(discountLeakage)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-3">
          <FamilyMixPanel families={familySales} totalRevenue={familySales.reduce((sum, family) => sum + toNumber(family.currentPeriodSales), 0)} />
          <Card className="min-w-0 rounded-md py-0 shadow-none">
            <CardHeader className="border-b px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold">Product Detail</CardTitle>
                  <p className="text-xs text-muted-foreground">Ranked product economics, margin, demand, and planning flags</p>
                </div>
                <CompactBadge tone="blue">{products.length} rows</CompactBadge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="h-8 min-w-56 px-3 text-[11px] uppercase text-muted-foreground">SKU</TableHead>
                      <TableHead className="h-8 min-w-32 text-[11px] uppercase text-muted-foreground">Family</TableHead>
                      <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">Revenue</TableHead>
                      <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">GM%</TableHead>
                      <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">GM$</TableHead>
                      <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">Units</TableHead>
                      <TableHead className="h-8 text-right text-[11px] uppercase text-muted-foreground">Cust.</TableHead>
                      <TableHead className="h-8 min-w-36 text-[11px] uppercase text-muted-foreground">Inventory</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const margin = toNumber(product.actualMarginPercentage || product.marginPercentage);
                      const tone = marginTone(margin);

                      return (
                        <TableRow key={product.quickBooksInternalId} className="h-11">
                          <TableCell className="px-3 py-2">
                            <div className="min-w-0">
                              <Link href={`/products/${encodeURIComponent(product.itemName)}`} className="block truncate font-mono text-sm font-medium hover:underline">
                                {product.itemName}
                              </Link>
                              <p className="truncate text-[11px] text-muted-foreground">{product.materialType}</p>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <CompactBadge tone="blue">{product.productFamily}</CompactBadge>
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono text-xs font-semibold">{compactCurrency(product.periodSales)}</TableCell>
                          <TableCell className="py-2 text-right">
                            <CompactBadge tone={tone}>{formatNumber(margin, 1)}%</CompactBadge>
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono text-xs">{product.grossMarginAmount ? compactCurrency(product.grossMarginAmount) : '-'}</TableCell>
                          <TableCell className="py-2 text-right font-mono text-xs">{formatNumber(product.periodUnits, 0)}</TableCell>
                          <TableCell className="py-2 text-right font-mono text-xs">{formatNumber(product.customerCount || 0, 0)}</TableCell>
                          <TableCell className="py-2">
                            <div className="flex max-w-44 flex-wrap gap-1">
                              {product.inventoryStatus ? <CompactBadge>{product.inventoryStatus}</CompactBadge> : null}
                              {product.shouldReorder ? <CompactBadge tone="warn">buy</CompactBadge> : null}
                              {product.requiresManualReview ? <CompactBadge tone="bad">review</CompactBadge> : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="flex items-center gap-3 p-3">
              <Gauge className="h-4 w-4 text-blue-600" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Average Sale Price</p>
                <p className="text-sm font-semibold">{compactCurrency(metrics.averageSalesPrice)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="flex items-center gap-3 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Planning Flags</p>
                <p className="text-sm font-semibold">{products.filter((product) => product.shouldReorder || product.requiresManualReview).length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="flex items-center gap-3 p-3">
              <ReceiptText className="h-4 w-4 text-emerald-600" />
              <div className="grid min-w-0 grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Revenue</p>
                  <p className="font-semibold tabular-nums">{compactCurrency(totalRevenue)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Margin</p>
                  <p className="font-semibold tabular-nums">{compactCurrency(totalMargin)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Leakage</p>
                  <p className="font-semibold tabular-nums">{compactCurrency(discountLeakage)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
