import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCompanyByDomain, getCompanyOrderTimeline, getCompanyProductAnalysis, getCompanyHealthBasic, getCompanyTimeSeriesData } from '@/lib/queries';
import { formatCurrency, formatNumber } from '@/lib/utils';
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
    <div className="grid gap-6 lg:grid-cols-3 md:grid-cols-2">
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
            
            <div className="flex gap-2 flex-wrap">
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
              {company.primaryCountry && company.primaryCountry !== 'Unknown' && (
                <Badge variant="outline">
                  🌍 {company.primaryCountry}
                </Badge>
              )}
              {company.region && company.region !== 'Unknown' && (
                <Badge variant="secondary">
                  📍 {company.region}
                </Badge>
              )}
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
          <CardDescription>Financial performance and customer health indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Financial Metrics */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Financial Performance</h4>
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
              {company.revenueLast90Days && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm font-medium">Revenue (Last 90 Days)</p>
                    <p className="text-lg font-semibold">{formatCurrency(parseFloat(company.revenueLast90Days))}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Orders (Last 90 Days)</p>
                    <p className="text-lg font-semibold">{company.ordersLast90Days}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Health & Activity */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Customer Health</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Health Score</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{company.healthScore}/100</p>
                    <Badge 
                      variant={
                        company.healthCategory?.includes('Excellent') ? 'default' :
                        company.healthCategory?.includes('Good') ? 'default' :
                        company.healthCategory?.includes('Fair') ? 'secondary' : 'destructive'
                      }
                    >
                      {company.healthCategory}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Activity Status</p>
                  <Badge 
                    variant={
                      company.activityStatus?.includes('Active') ? 'default' :
                      company.activityStatus?.includes('Recent') ? 'secondary' : 'outline'
                    }
                  >
                    {company.activityStatus}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm font-medium">Customer Archetype</p>
                  <Badge variant="outline">{company.customerArchetype}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Engagement Level</p>
                  <Badge variant="secondary">{company.engagementLevel}</Badge>
                </div>
              </div>

              {company.revenuePercentile > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium">Revenue Percentile</p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-lg font-semibold">{(company.revenuePercentile * 100).toFixed(1)}th</p>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary rounded-full h-2 transition-all duration-300"
                        style={{ width: `${company.revenuePercentile * 100}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher than {(company.revenuePercentile * 100).toFixed(1)}% of customers
                  </p>
                </div>
              )}
            </div>

            {/* Risk & Opportunity Flags */}
            {(company.atRiskFlag || company.growthOpportunityFlag) && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Alerts & Opportunities</h4>
                <div className="flex gap-2">
                  {company.atRiskFlag && (
                    <Badge variant="destructive">⚠️ At Risk</Badge>
                  )}
                  {company.growthOpportunityFlag && (
                    <Badge variant="default">🚀 Growth Opportunity</Badge>
                  )}
                </div>
              </div>
            )}

            {health && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Order Frequency</p>
                    <p className="text-sm">{health.orderFrequency}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Avg Order Value</p>
                    <p className="text-lg font-semibold">{formatCurrency(parseFloat(health.avgOrderValue))}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Days Since Last Order</p>
                    <p className="text-2xl font-bold">{health.daysSinceLastOrder}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Growth Trend</p>
                    <Badge 
                      variant={
                        company.growthTrendDirection?.includes('Positive') ? 'default' :
                        company.growthTrendDirection?.includes('Stable') ? 'secondary' : 'outline'
                      }
                    >
                      {company.growthTrendDirection}
                    </Badge>
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

      {/* Industry Intelligence Card */}
      {company.enrichedIndustry && (
        <Card>
          <CardHeader>
            <CardTitle>Industry Intelligence</CardTitle>
            <CardDescription>External data and company insights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Industry</p>
                <p className="text-lg font-semibold">{company.enrichedIndustry}</p>
              </div>

              {company.enrichedEmployeeCount > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Employee Count</p>
                    <p className="text-2xl font-bold">{formatNumber(company.enrichedEmployeeCount)}</p>
                  </div>
                  {company.enrichedAnnualRevenue > 0 && (
                    <div>
                      <p className="text-sm font-medium">Annual Revenue (Est.)</p>
                      <p className="text-2xl font-bold">{formatCurrency(company.enrichedAnnualRevenue, { showCents: false })}</p>
                    </div>
                  )}
                </div>
              )}

              {company.enrichedFoundedYear > 0 && (
                <div>
                  <p className="text-sm font-medium">Founded</p>
                  <p className="text-lg font-semibold">{company.enrichedFoundedYear}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date().getFullYear() - company.enrichedFoundedYear} years in business
                  </p>
                </div>
              )}

              {company.enrichedDescription && (
                <div>
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {company.enrichedDescription.slice(0, 200)}
                    {company.enrichedDescription.length > 200 && '...'}
                  </p>
                </div>
              )}

              {company.enrichmentSource && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Data sourced from {company.enrichmentSource}
                    {company.enrichmentDate && ` on ${new Date(company.enrichmentDate).toLocaleDateString()}`}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
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

async function CompanyQuarterlyPerformance({ domain }: { domain: string }) {
  const timeSeries = await getCompanyTimeSeriesData(domain);
  
  if (timeSeries.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quarterly Performance ({timeSeries.length} quarters)</CardTitle>
        <CardDescription>
          Revenue trends and growth analysis over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary metrics for current quarter */}
          {timeSeries.find(q => q.isCurrentQuarter) && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium">Current Quarter</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(parseFloat(timeSeries.find(q => q.isCurrentQuarter)?.totalRevenue || '0'))}
                  </p>
                  <Badge variant={
                    parseFloat(timeSeries.find(q => q.isCurrentQuarter)?.yoyRevenueGrowthPct || '0') > 0 ? 'default' : 'secondary'
                  }>
                    {parseFloat(timeSeries.find(q => q.isCurrentQuarter)?.yoyRevenueGrowthPct || '0') > 0 ? '↗️' : '↘️'} 
                    {timeSeries.find(q => q.isCurrentQuarter)?.yoyRevenueGrowthPct}% YoY
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Order Count</p>
                  <p className="text-2xl font-bold">
                    {formatNumber(timeSeries.find(q => q.isCurrentQuarter)?.orderCount || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Avg Order Value</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(parseFloat(timeSeries.find(q => q.isCurrentQuarter)?.avgOrderValue || '0'))}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quarterly data table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quarter</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Avg Order</TableHead>
                <TableHead className="text-right">YoY Growth</TableHead>
                <TableHead>Activity Level</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeSeries.map((quarter, index) => (
                <TableRow key={`quarter-${index}-${quarter.quarterLabel}`} className={quarter.isCurrentQuarter ? 'bg-muted/30' : ''}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{quarter.orderYear} {quarter.quarterLabel}</div>
                      <Badge variant="outline" className="text-xs">
                        {quarter.quarterlyRevenueTier}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(parseFloat(quarter.totalRevenue))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(quarter.orderCount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(parseFloat(quarter.avgOrderValue))}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {parseFloat(quarter.yoyRevenueGrowthPct) !== 0 && (
                        <span className={parseFloat(quarter.yoyRevenueGrowthPct) > 0 ? 'text-green-600' : 'text-red-600'}>
                          {parseFloat(quarter.yoyRevenueGrowthPct) > 0 ? '↗️' : '↘️'}
                        </span>
                      )}
                      <span className={parseFloat(quarter.yoyRevenueGrowthPct) > 0 ? 'text-green-600' : parseFloat(quarter.yoyRevenueGrowthPct) < 0 ? 'text-red-600' : ''}>
                        {quarter.yoyRevenueGrowthPct}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {quarter.quarterlyActivityLevel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {quarter.exceptionalGrowthFlag && (
                        <Badge variant="default" className="text-xs">🚀 Exceptional</Badge>
                      )}
                      {quarter.concerningDeclineFlag && (
                        <Badge variant="destructive" className="text-xs">⚠️ Decline</Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function CompanyHeaderSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3 md:grid-cols-2">
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
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-16 w-full" />
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

function CompanyQuarterlyPerformanceSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
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
        
        <Suspense fallback={<CompanyQuarterlyPerformanceSkeleton />}>
          <CompanyQuarterlyPerformance domain={domain} />
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