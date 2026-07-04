// ABOUTME: Dense company account dossier with relationship, revenue, contact, and product signals
// ABOUTME: Consolidates the previous multi-section detail page into a single report interface

import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Mail,
  Phone,
  ReceiptText,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  getCompanyByDomain,
  getCompanyContacts,
  getCompanyHealthBasic,
  getCompanyOrderTimeline,
  getCompanyProductAnalysis,
  getCompanyTimeSeriesData,
  type CompanyOrder,
  type CompanyProduct,
  type CompanyTimeSeriesQuarter,
  type Contact,
} from '@/lib/queries';
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

interface CompanyPageProps {
  params: Promise<{ domain: string }>;
}

function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function compactCurrency(value: number | string) {
  return formatCurrency(value, { showCents: false });
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function percent(part: number, total: number) {
  if (total <= 0) return '0.0%';
  return `${formatNumber((part / total) * 100, 1)}%`;
}

function healthTone(score: string | number): 'good' | 'blue' | 'warn' | 'bad' {
  const numeric = toNumber(score);
  if (numeric >= 80) return 'good';
  if (numeric >= 60) return 'blue';
  if (numeric >= 40) return 'warn';
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
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
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
          </div>
        </div>
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

function QuarterPanel({ quarters }: { quarters: CompanyTimeSeriesQuarter[] }) {
  const recent = quarters.slice(0, 6);
  const maxRevenue = Math.max(...recent.map((quarter) => toNumber(quarter.totalRevenue)), 1);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Quarterly Revenue Signal</CardTitle>
            <p className="text-xs text-slate-400">Recent performance, YoY movement, and activity classification</p>
          </div>
          <CompactBadge tone="blue">{recent.length} qtrs</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {recent.map((quarter) => {
          const revenue = toNumber(quarter.totalRevenue);
          const yoy = toNumber(quarter.yoyRevenueGrowthPct);
          return (
            <div key={`${quarter.orderYear}-${quarter.orderQuarter}`} className="grid grid-cols-[6rem_minmax(0,1fr)_7rem_4.5rem] items-center gap-3 border-b border-slate-800 px-3 py-2 last:border-b-0">
              <div>
                <p className="font-mono text-xs font-medium">{quarter.orderYear} {quarter.quarterLabel}</p>
                {quarter.isCurrentQuarter && <CompactBadge tone="blue">current</CompactBadge>}
              </div>
              <InlineBar value={(revenue / maxRevenue) * 100} tone={yoy < 0 ? 'red' : yoy > 0 ? 'green' : 'blue'} />
              <p className="text-right font-mono text-xs font-semibold">{compactCurrency(revenue)}</p>
              <p className={cn('text-right font-mono text-xs', yoy < 0 ? 'text-red-300' : yoy > 0 ? 'text-emerald-300' : 'text-slate-400')}>
                {formatNumber(yoy, 1)}%
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ContactsPanel({ contacts, companyName }: { contacts: Contact[]; companyName: string }) {
  const marketable = contacts.filter((contact) => contact.emailMarketable).length;

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Contact Coverage</CardTitle>
            <p className="text-xs text-slate-400">{marketable} marketable emails across {contacts.length} contacts</p>
          </div>
          <Link href={`/contacts?search=${encodeURIComponent(companyName)}`}>
            <CompactBadge tone="blue">open queue</CompactBadge>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {contacts.length > 0 ? contacts.slice(0, 6).map((contact, index) => (
          <div key={`${contact.contactDimKey || contact.primaryEmail || contact.fullName}-${index}`} className="border-b border-slate-800 px-3 py-2 last:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{contact.fullName || 'Unknown contact'}</p>
                  {contact.isPrimaryCompanyContact && <CompactBadge tone="good">primary</CompactBadge>}
                  {contact.keyAccountContact && <CompactBadge tone="warn">key</CompactBadge>}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-slate-400">{contact.jobTitle || contact.contactRole || 'Role unknown'}</p>
              </div>
              <CompactBadge tone={contact.contactDataQuality === 'complete' ? 'good' : contact.contactDataQuality === 'minimal' ? 'bad' : 'warn'}>
                {contact.contactDataQuality || 'unknown'}
              </CompactBadge>
            </div>
            <div className="mt-1 grid gap-1 text-[11px] text-slate-400 sm:grid-cols-2">
              <div className="flex min-w-0 items-center gap-1">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate font-mono">{contact.primaryEmail || 'No email'}</span>
              </div>
              <div className="flex min-w-0 items-center gap-1">
                <Phone className="h-3 w-3 shrink-0" />
                <span className="truncate font-mono">{contact.primaryPhone || 'No phone'}</span>
              </div>
            </div>
          </div>
        )) : (
          <div className="px-3 py-6 text-sm text-slate-400">No contact records found.</div>
        )}
      </CardContent>
    </Card>
  );
}

function ProductsPanel({ products }: { products: CompanyProduct[] }) {
  const leaders = products.slice(0, 8);
  const maxSpend = Math.max(...leaders.map((product) => toNumber(product.totalAmountSpent)), 1);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Product Affinity</CardTitle>
            <p className="text-xs text-slate-400">Top products bought by this account</p>
          </div>
          <CompactBadge tone="blue">{products.length} SKUs</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leaders.map((product) => {
          const spend = toNumber(product.totalAmountSpent);
          return (
            <div key={product.productService} className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3 border-b border-slate-800 px-3 py-2 last:border-b-0">
              <div className="min-w-0">
                <Link href={`/products/${encodeURIComponent(product.productService)}`} className="truncate font-mono text-sm font-medium hover:underline">
                  {product.productService}
                </Link>
                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                  {product.productFamily || 'Unknown family'} · {formatNumber(product.totalTransactions, 0)} orders · {formatNumber(product.daysSinceLastPurchase, 0)}d since buy
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="font-mono text-xs font-semibold">{compactCurrency(spend)}</p>
                <InlineBar value={(spend / maxSpend) * 100} tone={product.buyerStatus?.includes('Active') ? 'green' : 'amber'} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function OrdersTable({ orders }: { orders: CompanyOrder[] }) {
  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Recent Order History</CardTitle>
            <p className="text-xs text-slate-400">Latest order activity and value by invoice/order number</p>
          </div>
          <CompactBadge tone="blue">{orders.length} orders</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Age</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.slice(0, 12).map((order) => (
                <TableRow key={order.orderNumber}>
                  <TableCell className="font-mono text-xs font-medium">
                    <Link href={`/orders/${encodeURIComponent(order.orderNumber)}`} className="hover:underline">
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(order.orderDate)}</TableCell>
                  <TableCell className="text-right font-mono">{compactCurrency(order.calculatedOrderTotal)}</TableCell>
                  <TableCell className="text-right">{formatNumber(order.lineItemCount, 0)}</TableCell>
                  <TableCell><CompactBadge>{order.orderSizeCategory}</CompactBadge></TableCell>
                  <TableCell className="text-right">{formatNumber(order.daysSinceOrder, 0)}d</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { domain } = await params;
  const decodedDomain = decodeURIComponent(domain);
  const [company, orders, products, healthBasic, quarters, contacts] = await Promise.all([
    getCompanyByDomain(decodedDomain),
    getCompanyOrderTimeline(decodedDomain),
    getCompanyProductAnalysis(decodedDomain),
    getCompanyHealthBasic(decodedDomain),
    getCompanyTimeSeriesData(decodedDomain),
    getCompanyContacts(decodedDomain),
  ]);

  if (!company) notFound();

  const avgOrderValue = healthBasic?.avgOrderValue || (toNumber(company.totalOrders) > 0 ? String(toNumber(company.totalRevenue) / toNumber(company.totalOrders)) : '0');
  const recentRevenue = toNumber(company.revenueLast90Days);
  const lifetimeRevenue = toNumber(company.totalRevenue);
  const recentShare = lifetimeRevenue > 0 ? (recentRevenue / lifetimeRevenue) * 100 : 0;
  const healthToneValue = healthTone(company.healthScore);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-800 bg-[#07101d]/95 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/companies">Companies</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{company.companyName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex-1 space-y-4 bg-[#07101d] p-4 text-slate-100 md:p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-50">{company.companyName}</h1>
              <CompactBadge tone={healthToneValue}>{company.healthCategory}</CompactBadge>
              {company.atRiskFlag && <CompactBadge tone="bad">risk</CompactBadge>}
              {company.growthOpportunityFlag && <CompactBadge tone="good">growth</CompactBadge>}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {company.enrichedIndustry || 'Industry not available'} · {company.businessSizeCategory} · {company.primaryCountry || 'Unknown location'}
            </p>
            {company.enrichedDescription && (
              <p className="mt-2 max-w-5xl text-sm leading-5 text-slate-400">{company.enrichedDescription}</p>
            )}
          </div>
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="grid grid-cols-2 gap-3 p-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">Domain Key</p>
                <p className="truncate font-mono text-xs">{company.companyDomainKey}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Archetype</p>
                <p className="font-medium">{company.customerArchetype || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Founded</p>
                <p className="font-medium">{company.enrichedFoundedYear || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Employees</p>
                <p className="font-medium">{company.enrichedEmployeeCount ? formatNumber(company.enrichedEmployeeCount, 0) : '-'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          <MetricTile label="Lifetime Revenue" value={compactCurrency(company.totalRevenue)} detail={`${formatNumber(company.totalOrders, 0)} orders since ${formatDate(company.firstOrderDate)}`} icon={CircleDollarSign} tone="good" />
          <MetricTile label="Health Score" value={`${formatNumber(company.healthScore, 0)}/100`} detail={company.activityStatus} icon={Activity} tone={healthToneValue} />
          <MetricTile label="Last Order" value={`${formatNumber(company.daysSinceLastOrder, 0)}d`} detail={`Latest ${formatDate(company.latestOrderDate)}`} icon={CalendarClock} tone={company.daysSinceLastOrder > 180 ? 'bad' : company.daysSinceLastOrder > 90 ? 'warn' : 'good'} />
          <MetricTile label="90D Revenue" value={compactCurrency(recentRevenue)} detail={`${formatNumber(company.ordersLast90Days, 0)} orders · ${formatNumber(recentShare, 1)}% lifetime`} icon={TrendingUp} tone={recentRevenue > 0 ? 'good' : 'warn'} />
          <MetricTile label="Avg Order" value={compactCurrency(avgOrderValue)} detail={healthBasic?.orderFrequency || 'Frequency unavailable'} icon={ReceiptText} tone="blue" />
          <MetricTile label="Contacts" value={formatNumber(contacts.length, 0)} detail={`${percent(contacts.filter((contact) => contact.emailMarketable).length, contacts.length)} email marketable`} icon={Users} tone={contacts.length > 0 ? 'blue' : 'warn'} />
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
          <QuarterPanel quarters={quarters} />
          <ContactsPanel contacts={contacts} companyName={company.companyName} />
        </div>

        <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
          <ProductsPanel products={products} />
          <Card className="rounded-md py-0 shadow-none">
            <CardHeader className="border-b border-slate-800 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold">Account Intelligence</CardTitle>
                  <p className="text-xs text-slate-400">Profile, enrichment, and relationship flags</p>
                </div>
                <CompactBadge tone={company.growthOpportunityFlag ? 'good' : company.atRiskFlag ? 'bad' : 'blue'}>
                  {company.growthTrendDirection || 'trend unknown'}
                </CompactBadge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 p-3 text-sm md:grid-cols-2">
              <div className="rounded-md border border-slate-800 p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase text-slate-400">
                  <Building2 className="h-3.5 w-3.5" />
                  Profile
                </div>
                <dl className="mt-2 grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
                  <dt className="text-slate-400">Revenue tier</dt>
                  <dd>{company.revenueCategory}</dd>
                  <dt className="text-slate-400">Percentile</dt>
                  <dd>{formatNumber(company.revenuePercentile * 100, 0)}th</dd>
                  <dt className="text-slate-400">Region</dt>
                  <dd>{company.region || '-'}</dd>
                  <dt className="text-slate-400">Data source</dt>
                  <dd>{company.enrichmentSource || '-'}</dd>
                </dl>
              </div>
              <div className="rounded-md border border-slate-800 p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase text-slate-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Relationship Flags
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <CompactBadge tone={company.atRiskFlag ? 'bad' : 'good'}>{company.atRiskFlag ? 'at risk' : 'not risk flagged'}</CompactBadge>
                  <CompactBadge tone={company.growthOpportunityFlag ? 'good' : 'neutral'}>{company.growthOpportunityFlag ? 'growth opportunity' : 'no growth flag'}</CompactBadge>
                  <CompactBadge tone="blue">{company.engagementLevel || 'engagement unknown'}</CompactBadge>
                  <CompactBadge tone="blue">{company.domainType}</CompactBadge>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {company.primaryEmail || company.primaryPhone
                    ? `Legacy contact fields: ${company.primaryEmail || 'no email'} ${company.primaryPhone || 'no phone'}`
                    : 'No legacy contact fields available beyond contact records.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <OrdersTable orders={orders} />
      </div>
    </>
  );
}
