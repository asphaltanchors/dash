// ABOUTME: Dense product family performance report with customer concentration and SKU economics
// ABOUTME: Keeps product/customer detail tables visible under a report-first summary

import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Boxes,
  CircleDollarSign,
  Layers3,
  PackageSearch,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { getFamilyDetail, getFamilyProducts, getFamilyTopCustomers, type FamilyCustomer, type FamilyProduct } from '@/lib/queries';
import { parseFilters, type FamilyFilters, getPeriodLabel } from '@/lib/filter-utils';
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
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

interface FamilyPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function compactCurrency(value: number | string | null | undefined) {
  return formatCurrency(value || 0, { showCents: false });
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
        <div className="mt-2 text-xs leading-4 text-slate-400">{detail}</div>
      </CardContent>
    </Card>
  );
}

function InlineBar({ value, tone = 'blue' }: { value: number; tone?: 'blue' | 'green' | 'amber' | 'red' }) {
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
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function ProductLeaders({ products }: { products: FamilyProduct[] }) {
  const leaders = products.slice(0, 8);
  const maxRevenue = Math.max(...leaders.map((product) => toNumber(product.periodRevenue)), 1);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">SKU Leaders</CardTitle>
            <p className="text-xs text-slate-400">Top products by period revenue</p>
          </div>
          <CompactBadge tone="blue">{products.length} SKUs</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leaders.map((product) => {
          const revenue = toNumber(product.periodRevenue);
          const margin = toNumber(product.marginPercentage);
          return (
            <div key={product.itemName} className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3 border-b border-slate-800 px-3 py-2 last:border-b-0">
              <div className="min-w-0">
                <Link href={`/products/${encodeURIComponent(product.itemName)}`} className="truncate font-mono text-sm font-medium hover:underline">
                  {product.itemName}
                </Link>
                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                  {product.materialType} · {formatNumber(product.periodUnits, 0)} units · {formatNumber(product.periodOrders, 0)} orders
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="font-mono text-xs font-semibold">{compactCurrency(revenue)}</p>
                <div className="flex items-center gap-2">
                  <InlineBar value={(revenue / maxRevenue) * 100} tone={margin >= 60 ? 'green' : margin >= 35 ? 'blue' : 'amber'} />
                  <span className="w-10 font-mono text-[11px] text-slate-400">{formatNumber(margin, 0)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function CustomerLeaders({ customers }: { customers: FamilyCustomer[] }) {
  const leaders = customers.slice(0, 8);
  const maxSpend = Math.max(...leaders.map((customer) => toNumber(customer.periodSpent)), 1);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Customer Leaders</CardTitle>
            <p className="text-xs text-slate-400">Top buyers for the selected period</p>
          </div>
          <CompactBadge tone="blue">{customers.length} customers</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leaders.map((customer) => {
          const spend = toNumber(customer.periodSpent);
          return (
            <div key={customer.companyDomainKey} className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3 border-b border-slate-800 px-3 py-2 last:border-b-0">
              <div className="min-w-0">
                <Link href={`/companies/${encodeURIComponent(customer.companyDomainKey)}`} className="truncate text-sm font-medium hover:underline">
                  {customer.companyName}
                </Link>
                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                  {formatNumber(customer.periodOrders, 0)} period orders · last {formatDate(customer.lastOrderDate)}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="font-mono text-xs font-semibold">{compactCurrency(spend)}</p>
                <InlineBar value={(spend / maxSpend) * 100} tone="green" />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ProductsTable({ products }: { products: FamilyProduct[] }) {
  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Product Detail</CardTitle>
            <p className="text-xs text-slate-400">SKU price, margin, units, orders, and period revenue</p>
          </div>
          <CompactBadge tone="blue">{products.length} rows</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Orders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.itemName}>
                  <TableCell className="font-mono text-xs font-medium">
                    <Link href={`/products/${encodeURIComponent(product.itemName)}`} className="hover:underline">
                      {product.itemName}
                    </Link>
                  </TableCell>
                  <TableCell><p className="max-w-80 truncate text-xs text-slate-400" title={product.salesDescription}>{product.salesDescription || '-'}</p></TableCell>
                  <TableCell><CompactBadge>{product.materialType}</CompactBadge></TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatCurrency(product.salesPrice)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatNumber(product.marginPercentage, 1)}%</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{formatCurrency(product.periodRevenue)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatNumber(product.periodUnits, 0)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatNumber(product.periodOrders, 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomersTable({ customers }: { customers: FamilyCustomer[] }) {
  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Customer Detail</CardTitle>
            <p className="text-xs text-slate-400">Buyer concentration and all-time relationship depth</p>
          </div>
          <CompactBadge tone="blue">{customers.length} rows</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Period Spend</TableHead>
                <TableHead className="text-right">Period Orders</TableHead>
                <TableHead className="text-right">All-Time Spend</TableHead>
                <TableHead className="text-right">All-Time Orders</TableHead>
                <TableHead>Last Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.companyDomainKey}>
                  <TableCell className="font-medium">
                    <Link href={`/companies/${encodeURIComponent(customer.companyDomainKey)}`} className="hover:underline">
                      {customer.companyName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{formatCurrency(customer.periodSpent)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatNumber(customer.periodOrders, 0)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{compactCurrency(customer.totalSpent)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatNumber(customer.totalOrders, 0)}</TableCell>
                  <TableCell className="text-xs text-slate-400">{formatDate(customer.lastOrderDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function FamilyPage({ params, searchParams }: FamilyPageProps) {
  const { slug } = await params;
  const searchParamsData = await searchParams;
  const familyName = decodeURIComponent(slug);
  const filters = parseFilters<FamilyFilters>(searchParamsData);

  if (!filters.period) filters.period = '1y';

  const [familyDetail, products, customers] = await Promise.all([
    getFamilyDetail(familyName, filters),
    getFamilyProducts(familyName, filters),
    getFamilyTopCustomers(familyName, filters),
  ]);

  if (!familyDetail) notFound();

  const periodLabel = getPeriodLabel(filters.period || '1y');
  const growthTone = familyDetail.periodGrowth > 0 ? 'good' : familyDetail.periodGrowth < 0 ? 'bad' : 'blue';
  const GrowthIcon = familyDetail.periodGrowth >= 0 ? TrendingUp : TrendingDown;
  const avgProductRevenue = products.length > 0
    ? products.reduce((sum, product) => sum + toNumber(product.periodRevenue), 0) / products.length
    : 0;
  const avgMargin = products.length > 0
    ? products.reduce((sum, product) => sum + toNumber(product.marginPercentage), 0) / products.length
    : 0;
  const topCustomerShare = toNumber(familyDetail.periodRevenue) > 0 && customers[0]
    ? (toNumber(customers[0].periodSpent) / toNumber(familyDetail.periodRevenue)) * 100
    : 0;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-800 bg-[#07101d]/95 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/products">Products</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{familyName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex-1 space-y-4 bg-[#07101d] p-4 text-slate-100 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-50">{familyName}</h1>
              <CompactBadge tone="blue">{periodLabel}</CompactBadge>
              <CompactBadge tone={growthTone}>
                <GrowthIcon className="mr-1 h-3 w-3" />
                {formatNumber(familyDetail.periodGrowth, 1)}%
              </CompactBadge>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Product family revenue, SKU economics, customer concentration, and top buyer detail.
            </p>
          </div>
          <PeriodSelector
            currentPeriod={filters.period || '1y'}
            filters={filters as Record<string, string | number | boolean | undefined>}
          />
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          <MetricTile label="Period Revenue" value={compactCurrency(familyDetail.periodRevenue)} detail={`${compactCurrency(familyDetail.totalRevenue)} all-time`} icon={CircleDollarSign} tone="good" />
          <MetricTile label="Period Orders" value={formatNumber(familyDetail.periodOrders, 0)} detail={`${compactCurrency(familyDetail.averageOrderValue)} average line/order value`} icon={ReceiptText} tone="blue" />
          <MetricTile label="Active Customers" value={formatNumber(familyDetail.totalCustomers, 0)} detail={`${familyDetail.customersTo50Percent}/${familyDetail.customersTo80Percent} customers to 50%/80%`} icon={Users} tone={topCustomerShare > 40 ? 'warn' : 'good'} />
          <MetricTile label="Products" value={formatNumber(familyDetail.totalProducts, 0)} detail={`${compactCurrency(avgProductRevenue)} avg visible SKU revenue`} icon={Boxes} tone="blue" />
          <MetricTile label="Avg Margin" value={`${formatNumber(avgMargin, 1)}%`} detail={`${products.length} visible product rows`} icon={PackageSearch} tone={avgMargin >= 50 ? 'good' : avgMargin >= 30 ? 'blue' : 'warn'} />
          <MetricTile label="Top Buyer Share" value={`${formatNumber(topCustomerShare, 1)}%`} detail={customers[0]?.companyName || 'No customers'} icon={Layers3} tone={topCustomerShare > 40 ? 'warn' : 'blue'} />
        </div>

        <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
          <ProductLeaders products={products} />
          <CustomerLeaders customers={customers} />
        </div>

        <Card className="rounded-md py-0 shadow-none">
          <CardHeader className="border-b border-slate-800 px-3 py-2">
            <CardTitle className="text-sm font-semibold">Material Mix</CardTitle>
            <p className="text-xs text-slate-400">Distinct material types represented in this family</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5 p-3">
            {familyDetail.topMaterialTypes.length > 0
              ? familyDetail.topMaterialTypes.slice(0, 16).map((material) => <CompactBadge key={material} tone="blue">{material}</CompactBadge>)
              : <p className="text-sm text-slate-400">No material types available.</p>}
          </CardContent>
        </Card>

        <ProductsTable products={products} />
        <CustomersTable customers={customers} />
      </div>
    </>
  );
}
