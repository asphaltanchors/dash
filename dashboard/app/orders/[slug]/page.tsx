// ABOUTME: Dense order detail report with payment, customer, timeline, and line-item economics
// ABOUTME: Presents an order as an invoice dossier rather than a spacious card page

import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  MapPin,
  Package,
  ReceiptText,
  Truck,
  User,
} from 'lucide-react';
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
import { getOrderByNumber, getOrderLineItems, type OrderLineItem } from '@/lib/queries';
import { cn, formatCompleteAddress, formatCurrency, formatNumber, shouldShowCompanyLink } from '@/lib/utils';

interface OrderPageProps {
  params: Promise<{ slug: string }>;
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
        <div className="mt-2 text-xs leading-4 text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  );
}

function InlineBar({ value, tone = 'blue' }: { value: number; tone?: 'blue' | 'green' | 'amber' | 'red' }) {
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
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function familyMix(lineItems: OrderLineItem[]) {
  const map = new Map<string, { amount: number; qty: number; lines: number }>();
  lineItems.forEach((item) => {
    const family = item.productFamily || 'Unknown';
    const current = map.get(family) || { amount: 0, qty: 0, lines: 0 };
    current.amount += toNumber(item.amount);
    current.qty += toNumber(item.quantity);
    current.lines += 1;
    map.set(family, current);
  });
  return Array.from(map.entries())
    .map(([family, values]) => ({ family, ...values }))
    .sort((a, b) => b.amount - a.amount);
}

function AddressBlock({
  title,
  address,
}: {
  title: string;
  address: ReturnType<typeof formatCompleteAddress>;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        {title}
      </div>
      <p className="whitespace-pre-line text-sm leading-5 text-muted-foreground">{address || 'No address on file'}</p>
    </div>
  );
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { slug } = await params;
  const orderNumber = decodeURIComponent(slug);
  const [order, lineItems] = await Promise.all([
    getOrderByNumber(orderNumber),
    getOrderLineItems(orderNumber),
  ]);

  if (!order) notFound();

  const lineTotal = toNumber(order.totalLineItemsAmount);
  const tax = toNumber(order.totalTax);
  const total = toNumber(order.totalAmount);
  const marginTotal = lineItems.reduce((sum, item) => sum + toNumber(item.marginAmount), 0);
  const marginPct = lineTotal > 0 ? (marginTotal / lineTotal) * 100 : 0;
  const discountValues = lineItems.map((item) => toNumber(item.historicalDiscountPercentage)).filter((value) => value > 0);
  const avgDiscount = discountValues.length > 0 ? discountValues.reduce((sum, value) => sum + value, 0) / discountValues.length : 0;
  const families = familyMix(lineItems);
  const maxFamilyAmount = Math.max(...families.map((family) => family.amount), 1);

  const billingAddress = formatCompleteAddress({
    address: order.billingAddress,
    city: order.billingAddressCity,
    state: order.billingAddressState,
    postalCode: order.billingAddressPostalCode,
    country: order.billingAddressCountry,
  });
  const shippingAddress = formatCompleteAddress({
    address: order.shippingAddress,
    city: order.shippingAddressCity,
    state: order.shippingAddressState,
    postalCode: order.shippingAddressPostalCode,
    country: order.shippingAddressCountry,
  });

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/orders">Orders</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{order.orderNumber}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-5">
        <Link href="/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-2xl font-semibold tracking-tight">Order {order.orderNumber}</h1>
              <CompactBadge tone={order.isPaid ? 'good' : 'warn'}>{order.isPaid ? 'paid' : 'open'}</CompactBadge>
              <CompactBadge tone="blue">{order.status}</CompactBadge>
              {order.salesChannel && <CompactBadge>{order.salesChannel}</CompactBadge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDate(order.orderDate)} · {order.customerSegment || 'Unknown segment'} · {order.currency || 'USD'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Customer</p>
            {shouldShowCompanyLink(order.companyDomain, order.isIndividualCustomer) ? (
              <Link href={`/companies/${encodeURIComponent(order.companyDomain!)}`} className="text-sm font-medium hover:underline">
                {order.customer}
              </Link>
            ) : (
              <p className="text-sm font-medium">{order.customer}</p>
            )}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          <MetricTile label="Order Total" value={compactCurrency(total)} detail={`${compactCurrency(lineTotal)} lines + ${compactCurrency(tax)} tax`} icon={CircleDollarSign} tone="good" />
          <MetricTile label="Line Items" value={formatNumber(lineItems.length, 0)} detail={`${formatNumber(lineItems.reduce((sum, item) => sum + toNumber(item.quantity), 0), 1)} units`} icon={Package} tone="blue" />
          <MetricTile label="Margin" value={`${formatNumber(marginPct, 1)}%`} detail={`${compactCurrency(marginTotal)} estimated margin`} icon={ReceiptText} tone={marginPct > 35 ? 'good' : marginPct > 20 ? 'blue' : 'warn'} />
          <MetricTile label="Avg Discount" value={`${formatNumber(avgDiscount, 1)}%`} detail={`${discountValues.length} priced lines with discount data`} icon={CreditCard} tone={avgDiscount > 25 ? 'warn' : 'blue'} />
          <MetricTile label="Due Date" value={formatDate(order.dueDate)} detail={order.paymentMethod || 'Payment method unknown'} icon={CalendarDays} tone={order.isPaid ? 'good' : 'warn'} />
          <MetricTile label="Ship Date" value={formatDate(order.shipDate)} detail={order.shippingMethod || 'Shipping method unknown'} icon={Truck} tone="blue" />
        </div>

        <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-md py-0 shadow-none">
            <CardHeader className="border-b px-3 py-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <User className="h-4 w-4 text-blue-600" />
                Customer, Payment, Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-3 text-sm md:grid-cols-2 xl:grid-cols-1">
              <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-md border p-3 text-xs">
                <dt className="text-muted-foreground">Customer</dt>
                <dd className="truncate">{order.customer}</dd>
                <dt className="text-muted-foreground">Sales rep</dt>
                <dd>{order.salesRep || '-'}</dd>
                <dt className="text-muted-foreground">Channel</dt>
                <dd>{order.salesChannel || '-'}</dd>
                <dt className="text-muted-foreground">Payment</dt>
                <dd>{order.paymentMethod || '-'}</dd>
                <dt className="text-muted-foreground">Tax rate</dt>
                <dd>{formatNumber(toNumber(order.effectiveTaxRate) * 100, 2)}%</dd>
              </div>
              <AddressBlock title="Billing" address={billingAddress} />
              <AddressBlock title="Shipping" address={shippingAddress} />
            </CardContent>
          </Card>

          <Card className="rounded-md py-0 shadow-none">
            <CardHeader className="border-b px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold">Family Mix</CardTitle>
                  <p className="text-xs text-muted-foreground">Line value grouped by product family</p>
                </div>
                <CompactBadge tone="blue">{families.length} families</CompactBadge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-3">
              {families.slice(0, 8).map((family) => (
                <div key={family.family} className="grid grid-cols-[9rem_minmax(0,1fr)_6rem_3rem] items-center gap-2">
                  <p className="truncate text-xs text-muted-foreground" title={family.family}>{family.family}</p>
                  <InlineBar value={(family.amount / maxFamilyAmount) * 100} tone="blue" />
                  <p className="text-right font-mono text-xs">{compactCurrency(family.amount)}</p>
                  <p className="text-right text-xs text-muted-foreground">{family.lines}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-md py-0 shadow-none">
          <CardHeader className="border-b px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold">Line Item Detail</CardTitle>
                <p className="text-xs text-muted-foreground">Product, rate, retail reference, discount, amount, and margin</p>
              </div>
              <CompactBadge tone="blue">{lineItems.length} lines</CompactBadge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Retail</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Disc</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Family</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, index) => (
                    <TableRow key={`${item.lineItemId}-${index}`}>
                      <TableCell className="font-mono text-xs font-medium">
                        {item.productService ? (
                          <Link href={`/products/${encodeURIComponent(item.productService)}`} className="hover:underline">
                            {item.productService}
                          </Link>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <p className="max-w-72 truncate text-xs text-muted-foreground" title={item.productServiceDescription || undefined}>
                          {item.productServiceDescription || '-'}
                        </p>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatNumber(item.quantity, 1)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{item.historicalRetailPrice ? formatCurrency(item.historicalRetailPrice) : '-'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(item.rate)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{item.historicalDiscountPercentage ? `${item.historicalDiscountPercentage}%` : '-'}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">{formatCurrency(item.amount)}</TableCell>
                      <TableCell>
                        <div className="max-w-36">
                          <p className="truncate text-xs">{item.productFamily || '-'}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{item.materialType || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {item.marginPercentage ? (
                          <div>
                            <p className="font-semibold">{item.marginPercentage}%</p>
                            <p className="text-[11px] text-muted-foreground">{compactCurrency(item.marginAmount)}</p>
                          </div>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
