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

// Hero Section - Company Identity
async function CompanyHero({ domain }: { domain: string }) {
  const company = await getCompanyByDomain(domain);
  
  if (!company) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Company Identity Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">{company.companyName}</h1>
          <div className="flex items-center gap-3 text-lg text-muted-foreground">
            <span>{company.enrichedIndustry || 'Industry Not Available'}</span>
            {company.enrichedEmployeeCount > 0 && (
              <>
                <span>•</span>
                <span>{formatNumber(company.enrichedEmployeeCount)} employees</span>
              </>
            )}
            {company.enrichedFoundedYear > 0 && (
              <>
                <span>•</span>
                <span>Founded {company.enrichedFoundedYear}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              📍 {company.primaryCountry !== 'Unknown' ? company.primaryCountry : 'Location Not Available'}
            </span>
            {company.region && company.region !== 'Unknown' && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">{company.region}</span>
              </>
            )}
            <Badge variant="secondary" className="ml-2">
              {company.revenueCategory}
            </Badge>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2">
          {company.primaryEmail && (
            <Badge variant="outline" className="cursor-pointer hover:bg-muted">
              📧 Contact
            </Badge>
          )}
          <Badge variant="outline">{company.domainType}</Badge>
        </div>
      </div>
    </div>
  );
}

// Executive Summary - Critical Metrics at a Glance
async function ExecutiveSummary({ domain }: { domain: string }) {
  const company = await getCompanyByDomain(domain);
  
  if (!company) return null;

  const healthScoreColor = 
    parseInt(company.healthScore) >= 80 ? 'text-green-600' :
    parseInt(company.healthScore) >= 60 ? 'text-orange-600' : 'text-red-600';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Health Score */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Health Score</p>
              <p className={`text-3xl font-bold ${healthScoreColor}`}>
                {company.healthScore}/100
              </p>
              <Badge 
                variant={
                  company.healthCategory?.includes('Excellent') ? 'default' :
                  company.healthCategory?.includes('Good') ? 'default' :
                  company.healthCategory?.includes('Fair') ? 'secondary' : 'destructive'
                }
                className="mt-2"
              >
                {company.healthCategory}
              </Badge>
            </div>
            <div className="text-right">
              {company.atRiskFlag && <Badge variant="destructive" className="mb-1">⚠️ At Risk</Badge>}
              {company.growthOpportunityFlag && <Badge variant="default">🚀 Opportunity</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Performance */}
      <Card>
        <CardContent className="p-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
            <p className="text-3xl font-bold">{formatCurrency(parseFloat(company.totalRevenue))}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{company.totalOrders} orders</Badge>
              <span className="text-sm text-muted-foreground">• 8+ years</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Percentile */}
      <Card>
        <CardContent className="p-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Revenue Percentile</p>
            <p className="text-3xl font-bold">{(company.revenuePercentile * 100).toFixed(0)}th</p>
            <div className="w-full bg-muted rounded-full h-2 mt-3">
              <div 
                className="bg-primary rounded-full h-2 transition-all duration-300"
                style={{ width: `${company.revenuePercentile * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Top {(100 - company.revenuePercentile * 100).toFixed(0)}% of customers
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Activity Status */}
      <Card>
        <CardContent className="p-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Last Activity</p>
            <p className="text-3xl font-bold">{company.daysSinceLastOrder}</p>
            <p className="text-sm text-muted-foreground">days ago</p>
            <Badge 
              variant={
                company.activityStatus?.includes('Active') ? 'default' :
                company.activityStatus?.includes('Recent') ? 'secondary' : 'outline'
              }
              className="mt-2"
            >
              {company.activityStatus}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Financial Performance Section
async function FinancialPerformance({ domain }: { domain: string }) {
  const [company, timeSeries] = await Promise.all([
    getCompanyByDomain(domain),
    getCompanyTimeSeriesData(domain)
  ]);
  
  if (!company) return null;

  const currentQuarter = timeSeries.find(q => q.isCurrentQuarter);

  return (
    <div className="space-y-6">
      {/* Current Quarter Highlight */}
      {currentQuarter && (
        <Card>
          <CardHeader>
            <CardTitle>Current Quarter Performance</CardTitle>
            <CardDescription>Q{currentQuarter.orderQuarter} {currentQuarter.orderYear} metrics and trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(parseFloat(currentQuarter.totalRevenue))}</p>
                <div className="flex items-center gap-1 mt-1">
                  {parseFloat(currentQuarter.yoyRevenueGrowthPct) > 0 ? 
                    <span className="text-green-600">↗️</span> : 
                    <span className="text-red-600">↘️</span>
                  }
                  <span className={parseFloat(currentQuarter.yoyRevenueGrowthPct) > 0 ? 'text-green-600' : 'text-red-600'}>
                    {currentQuarter.yoyRevenueGrowthPct}% YoY
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Orders</p>
                <p className="text-2xl font-bold">{formatNumber(currentQuarter.orderCount)}</p>
                <Badge variant="secondary" className="mt-1">
                  {currentQuarter.quarterlyActivityLevel}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">{formatCurrency(parseFloat(currentQuarter.avgOrderValue))}</p>
                <Badge variant="outline" className="mt-1">
                  {currentQuarter.quarterlyRevenueTier}
                </Badge>
              </div>
            </div>
            
            {/* Exception Flags */}
            {(currentQuarter.exceptionalGrowthFlag || currentQuarter.concerningDeclineFlag) && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                {currentQuarter.exceptionalGrowthFlag && (
                  <Badge variant="default">🚀 Exceptional Growth</Badge>
                )}
                {currentQuarter.concerningDeclineFlag && (
                  <Badge variant="destructive">⚠️ Concerning Decline</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quarterly Trends Table */}
      {timeSeries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quarterly Trends</CardTitle>
            <CardDescription>Historical performance over last {timeSeries.length} quarters</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quarter</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">YoY Growth</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeSeries.slice(0, 8).map((quarter, index) => (
                  <TableRow key={`quarter-${index}`} className={quarter.isCurrentQuarter ? 'bg-muted/30' : ''}>
                    <TableCell className="font-medium">
                      {quarter.orderYear} {quarter.quarterLabel}
                      {quarter.isCurrentQuarter && <Badge variant="outline" className="ml-2 text-xs">Current</Badge>}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(parseFloat(quarter.totalRevenue))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(quarter.orderCount)}
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
                      <div className="flex gap-1">
                        {quarter.exceptionalGrowthFlag && (
                          <Badge variant="default" className="text-xs">🚀</Badge>
                        )}
                        {quarter.concerningDeclineFlag && (
                          <Badge variant="destructive" className="text-xs">⚠️</Badge>
                        )}
                        {!quarter.exceptionalGrowthFlag && !quarter.concerningDeclineFlag && (
                          <Badge variant="secondary" className="text-xs">Normal</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Company Intelligence Section
async function CompanyIntelligence({ domain }: { domain: string }) {
  const company = await getCompanyByDomain(domain);
  
  if (!company) return null;

  return (
    <div className="space-y-6">
      {/* Company Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Company Profile</CardTitle>
          <CardDescription>External data and business intelligence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Core Business Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Industry</p>
              <p className="text-lg font-semibold">{company.enrichedIndustry || 'Not Available'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Business Size</p>
              <p className="text-lg font-semibold">{company.businessSizeCategory}</p>
            </div>
          </div>

          {/* Company Metrics */}
          {(company.enrichedEmployeeCount > 0 || company.enrichedAnnualRevenue > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {company.enrichedEmployeeCount > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Employee Count</p>
                  <p className="text-2xl font-bold">{formatNumber(company.enrichedEmployeeCount)}</p>
                </div>
              )}
              {company.enrichedAnnualRevenue > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Annual Revenue (Est.)</p>
                  <p className="text-2xl font-bold">{formatCurrency(company.enrichedAnnualRevenue, { showCents: false })}</p>
                </div>
              )}
            </div>
          )}

          {/* Company History */}
          {company.enrichedFoundedYear > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Company History</p>
              <p className="text-lg font-semibold">{company.enrichedFoundedYear}</p>
              <p className="text-sm text-muted-foreground">
                {new Date().getFullYear() - company.enrichedFoundedYear} years in business
              </p>
            </div>
          )}

          {/* Company Description */}
          {company.enrichedDescription && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">About</p>
              <p className="text-sm leading-relaxed text-muted-foreground mt-1">
                {company.enrichedDescription}
              </p>
            </div>
          )}

          {/* Data Source */}
          {company.enrichmentSource && (
            <div className="pt-4 border-t text-xs text-muted-foreground">
              Data sourced from {company.enrichmentSource}
              {company.enrichmentDate && ` on ${new Date(company.enrichmentDate).toLocaleDateString()}`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {company.primaryEmail && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-sm">{company.primaryEmail}</p>
            </div>
          )}
          {company.primaryPhone && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone</p>
              <p className="text-sm">{company.primaryPhone}</p>
            </div>
          )}
          {(company.primaryBillingAddressLine1 || company.primaryBillingCity) && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Address</p>
              <div className="text-sm space-y-1">
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
        </CardContent>
      </Card>
    </div>
  );
}

// Relationship Health Section
async function RelationshipHealth({ domain }: { domain: string }) {
  const [company, health] = await Promise.all([
    getCompanyByDomain(domain),
    getCompanyHealthBasic(domain)
  ]);
  
  if (!company) return null;

  return (
    <div className="space-y-6">
      {/* Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Relationship Health</CardTitle>
          <CardDescription>Customer engagement and relationship status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Archetype */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Customer Archetype</p>
              <p className="text-lg font-semibold">{company.customerArchetype}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {company.customerArchetype === 'HF' && 'High Frequency - Regular repeat orders'}
                {company.customerArchetype === 'HVLF' && 'High Value Low Frequency - Large but infrequent orders'}
                {company.customerArchetype === 'REG' && 'Regular - Standard purchasing pattern'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Engagement Level</p>
              <Badge variant="secondary" className="text-sm">
                {company.engagementLevel}
              </Badge>
            </div>
          </div>

          {/* Performance Metrics */}
          {health && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Order Frequency</p>
                <p className="text-lg font-semibold">{health.orderFrequency}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                <p className="text-lg font-semibold">{formatCurrency(parseFloat(health.avgOrderValue))}</p>
              </div>
            </div>
          )}

          {/* Growth Trends */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Growth Trend</p>
            <Badge 
              variant={
                company.growthTrendDirection?.includes('Growing') || company.growthTrendDirection?.includes('Positive') ? 'default' :
                company.growthTrendDirection?.includes('Stable') ? 'secondary' : 'outline'
              }
              className="mt-1"
            >
              {company.growthTrendDirection}
            </Badge>
          </div>

          {/* Recent Activity */}
          {company.revenueLast90Days && parseFloat(company.revenueLast90Days) > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue (Last 90 Days)</p>
                <p className="text-lg font-semibold">{formatCurrency(parseFloat(company.revenueLast90Days))}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Orders (Last 90 Days)</p>
                <p className="text-lg font-semibold">{company.ordersLast90Days}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Detailed Data Sections (Collapsible/Secondary)
async function OrderHistory({ domain }: { domain: string }) {
  const orders = await getCompanyOrderTimeline(domain);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders ({orders.length})</CardTitle>
        <CardDescription>Order history and transaction details</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="text-right">Days Ago</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.slice(0, 10).map((order, index) => (
              <TableRow key={`order-${index}`}>
                <TableCell className="font-medium">
                  <Link 
                    href={`/orders/${order.orderNumber}`}
                    className="hover:underline text-blue-600"
                  >
                    {order.orderNumber}
                  </Link>
                </TableCell>
                <TableCell>{order.orderDate}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(parseFloat(order.calculatedOrderTotal))}
                </TableCell>
                <TableCell className="text-right">{order.lineItemCount}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {order.orderSizeCategory}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{order.daysSinceOrder}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

async function ProductAnalysis({ domain }: { domain: string }) {
  const products = await getCompanyProductAnalysis(domain);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Products ({products.length})</CardTitle>
        <CardDescription>Most purchased products and categories</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.slice(0, 8).map((product, index) => (
              <TableRow key={`product-${index}`}>
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
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-xs">
                      {product.productFamily}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {product.materialType}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(parseFloat(product.totalAmountSpent))}
                </TableCell>
                <TableCell className="text-right">
                  {product.totalTransactions}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      product.buyerStatus.includes('Active') ? 'default' : 'secondary'
                    }
                    className="text-xs"
                  >
                    {product.buyerStatus}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Loading Skeletons
function CompanyHeroSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <Skeleton className="h-12 w-80" />
          <Skeleton className="h-6 w-96" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </div>
  );
}

function ExecutiveSummarySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-5 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
      
      <div className="flex-1 space-y-8 p-6">
        {/* Hero Section */}
        <Suspense fallback={<CompanyHeroSkeleton />}>
          <CompanyHero domain={domain} />
        </Suspense>
        
        {/* Executive Summary */}
        <Suspense fallback={<ExecutiveSummarySkeleton />}>
          <ExecutiveSummary domain={domain} />
        </Suspense>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Financial Performance */}
          <div className="lg:col-span-1 space-y-6">
            <Suspense fallback={<SectionSkeleton />}>
              <FinancialPerformance domain={domain} />
            </Suspense>
          </div>
          
          {/* Center Column - Company Intelligence */}
          <div className="lg:col-span-1 space-y-6">
            <Suspense fallback={<SectionSkeleton />}>
              <CompanyIntelligence domain={domain} />
            </Suspense>
          </div>
          
          {/* Right Column - Relationship Health */}
          <div className="lg:col-span-1 space-y-6">
            <Suspense fallback={<SectionSkeleton />}>
              <RelationshipHealth domain={domain} />
            </Suspense>
          </div>
        </div>
        
        {/* Detailed Data Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Suspense fallback={<SectionSkeleton />}>
            <OrderHistory domain={domain} />
          </Suspense>
          
          <Suspense fallback={<SectionSkeleton />}>
            <ProductAnalysis domain={domain} />
          </Suspense>
        </div>
      </div>
    </>
  );
}