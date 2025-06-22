import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCompanyByDomain, getCompanyOrderTimeline, getCompanyProductAnalysis, getCompanyHealthBasic } from '@/lib/queries';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface CompanyPageProps {
  params: Promise<{ domain: string }>;
}

async function CompanyHeader({ domain }: { domain: string }) {
  const [company, health] = await Promise.all([
    getCompanyByDomain(domain),
    getCompanyHealthBasic(domain)
  ]);
  
  if (!company) {
    notFound();
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Company Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{company.companyName}</h3>
              <p className="text-sm text-muted-foreground">{company.companyDomainKey}</p>
            </div>
            
            <div className="flex gap-2">
              <Badge variant="outline">
                {company.domainType}
              </Badge>
              <Badge variant="secondary">
                {company.businessSizeCategory}
              </Badge>
              <Badge 
                variant={
                  company.revenueCategory.includes('High') ? 'default' :
                  company.revenueCategory.includes('Medium') ? 'secondary' : 'outline'
                }
              >
                {company.revenueCategory}
              </Badge>
            </div>

            {company.primaryEmail && (
              <div>
                <span className="text-sm font-medium">Email: </span>
                <span className="text-sm">{company.primaryEmail}</span>
              </div>
            )}

            {company.primaryPhone && (
              <div>
                <span className="text-sm font-medium">Phone: </span>
                <span className="text-sm">{company.primaryPhone}</span>
              </div>
            )}

            {(company.primaryBillingAddressLine1 || company.primaryBillingCity) && (
              <div>
                <span className="text-sm font-medium">Address: </span>
                <div className="text-sm">
                  {company.primaryBillingAddressLine1 && <div>{company.primaryBillingAddressLine1}</div>}
                  {(company.primaryBillingCity || company.primaryBillingState) && (
                    <div>
                      {company.primaryBillingCity}
                      {company.primaryBillingCity && company.primaryBillingState && ', '}
                      {company.primaryBillingState} {company.primaryBillingPostalCode}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key Metrics & Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(parseFloat(company.totalRevenue))}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Total Orders</p>
                <p className="text-2xl font-bold">{company.totalOrders}</p>
              </div>
            </div>

            {health && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Activity Status</p>
                    <Badge 
                      variant={
                        health.activityStatus.includes('Active') ? 'default' :
                        health.activityStatus.includes('Recent') ? 'secondary' : 'outline'
                      }
                    >
                      {health.activityStatus}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Order Frequency</p>
                    <p className="text-sm">{health.orderFrequency}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Avg Order Value</p>
                    <p className="text-2xl font-bold">{formatCurrency(parseFloat(health.avgOrderValue))}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Days Since Last Order</p>
                    <p className="text-2xl font-bold">{health.daysSinceLastOrder}</p>
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">First Order</p>
                <p className="text-sm">{company.firstOrderDate || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Latest Order</p>
                <p className="text-sm">{company.latestOrderDate || 'N/A'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function CompanyOrderTimeline({ domain }: { domain: string }) {
  const orders = await getCompanyOrderTimeline(domain);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order History ({orders.length})</CardTitle>
        <CardDescription>
          Recent orders placed by this company
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Number</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Order Type</TableHead>
              <TableHead className="text-right">Order Total</TableHead>
              <TableHead className="text-right">Line Items</TableHead>
              <TableHead className="text-right">Products</TableHead>
              <TableHead>Size Category</TableHead>
              <TableHead>Days Ago</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order, index) => (
              <TableRow key={`order-${index}-${order.orderNumber}`}>
                <TableCell className="font-medium">
                  <Link 
                    href={`/orders/${order.orderNumber}`}
                    className="hover:underline text-blue-600"
                  >
                    {order.orderNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  {order.orderDate}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {order.orderType}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(parseFloat(order.calculatedOrderTotal))}
                </TableCell>
                <TableCell className="text-right">
                  {order.lineItemCount}
                </TableCell>
                <TableCell className="text-right">
                  {order.uniqueProducts}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {order.orderSizeCategory}
                  </Badge>
                </TableCell>
                <TableCell>
                  {order.daysSinceOrder} days
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

async function CompanyProductAnalysis({ domain }: { domain: string }) {
  const products = await getCompanyProductAnalysis(domain);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Products Purchased ({products.length})</CardTitle>
        <CardDescription>
          Products this company buys most frequently
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Product Family</TableHead>
              <TableHead>Material Type</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead className="text-right">Avg Price</TableHead>
              <TableHead>Purchase Status</TableHead>
              <TableHead>Days Since Last</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product, index) => (
              <TableRow key={`product-${index}-${product.productService?.replace(/[^a-zA-Z0-9]/g, '')}`}>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-medium">{product.productService}</div>
                    {product.productServiceDescription && (
                      <div className="text-sm text-muted-foreground truncate max-w-48">
                        {product.productServiceDescription}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {product.productFamily}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {product.materialType}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(parseFloat(product.totalAmountSpent))}
                </TableCell>
                <TableCell className="text-right">
                  {product.totalTransactions}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(parseFloat(product.avgUnitPrice))}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      product.buyerStatus.includes('Active') ? 'default' : 'secondary'
                    }
                  >
                    {product.buyerStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  {product.daysSinceLastPurchase} days
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CompanyHeaderSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CompanyOrderTimelineSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CompanyProductAnalysisSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { domain } = await params;

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
                <BreadcrumbLink href="/companies">Companies</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{decodeURIComponent(domain)}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex-1 space-y-6 p-6">
        <Suspense fallback={<CompanyHeaderSkeleton />}>
          <CompanyHeader domain={domain} />
        </Suspense>
        
        <Suspense fallback={<CompanyOrderTimelineSkeleton />}>
          <CompanyOrderTimeline domain={domain} />
        </Suspense>
        
        <Suspense fallback={<CompanyProductAnalysisSkeleton />}>
          <CompanyProductAnalysis domain={domain} />
        </Suspense>
      </div>
    </>
  );
}