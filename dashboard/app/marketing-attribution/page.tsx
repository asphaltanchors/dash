// ABOUTME: Marketing attribution dashboard showing channel and campaign performance
// ABOUTME: Displays acquisition channel revenue, UTM campaign analytics, and attribution metrics
import { Suspense } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AttributionMetricCards } from '@/components/dashboard/AttributionMetricCards';
import { ChannelRevenueChart } from '@/components/dashboard/ChannelRevenueChart';
import { CampaignPerformanceTable } from '@/components/dashboard/CampaignPerformanceTable';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import {
  getAttributionMetrics,
  getChannelRevenue,
  getCampaignPerformance,
  getMonthlyChannelRevenue,
  getTopReferringSites,
  getTopLandingPages,
} from '@/lib/queries/marketing';
import { parseFilters, getPeriodLabel, type DashboardFilters } from '@/lib/filter-utils';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

async function AttributionMetrics({ filters }: { filters: DashboardFilters }) {
  const metrics = await getAttributionMetrics(filters);
  return <AttributionMetricCards metrics={metrics} />;
}

async function ChannelCharts({ filters }: { filters: DashboardFilters }) {
  const [channelRevenue, monthlyRevenue] = await Promise.all([
    getChannelRevenue(filters),
    getMonthlyChannelRevenue(filters),
  ]);
  return <ChannelRevenueChart data={channelRevenue} monthlyData={monthlyRevenue} />;
}

async function CampaignTable({ filters }: { filters: DashboardFilters }) {
  const campaigns = await getCampaignPerformance(filters);
  return <CampaignPerformanceTable campaigns={campaigns} />;
}

async function ReferringSites({ filters }: { filters: DashboardFilters }) {
  const sites = await getTopReferringSites(filters, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Referring Sites</CardTitle>
        <CardDescription>Traffic sources driving the most revenue</CardDescription>
      </CardHeader>
      <CardContent>
        {sites.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referring Site</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">AOV</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="max-w-[600px] truncate font-mono text-sm" title={site.referringSite}>
                      {site.referringSite}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(parseFloat(site.totalRevenue))}
                  </TableCell>
                  <TableCell className="text-right">{site.orderCount}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(parseFloat(site.avgOrderValue))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No referring site data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function LandingPages({ filters }: { filters: DashboardFilters }) {
  const pages = await getTopLandingPages(filters, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Landing Pages</CardTitle>
        <CardDescription>Entry pages generating the most revenue</CardDescription>
      </CardHeader>
      <CardContent>
        {pages.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Landing Page</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">AOV</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="max-w-[600px] truncate font-mono text-sm" title={page.landingSite}>
                      {page.landingSite}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(parseFloat(page.totalRevenue))}
                  </TableCell>
                  <TableCell className="text-right">{page.orderCount}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(parseFloat(page.avgOrderValue))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No landing page data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LoadingChart() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[350px] w-full" />
      </CardContent>
    </Card>
  );
}

function LoadingTable() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface MarketingAttributionPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MarketingAttributionPage({ searchParams }: MarketingAttributionPageProps) {
  const params = await searchParams;
  const filters = parseFilters<DashboardFilters>(params);

  // Default to 1 year period if no period specified
  if (!filters.period) {
    filters.period = '1y';
  }

  const periodLabel = getPeriodLabel(filters.period);

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
                <BreadcrumbPage>Marketing Attribution</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Marketing Attribution</h1>
            <p className="text-muted-foreground">
              Acquisition channel performance and campaign analytics
            </p>
          </div>
          <PeriodSelector currentPeriod={filters.period} filters={filters as Record<string, string | number | boolean | undefined>} />
        </div>

        {/* Key Metrics */}
        <Suspense fallback={<LoadingCards />}>
          <AttributionMetrics filters={filters} />
        </Suspense>

        {/* Channel Revenue Charts */}
        <Suspense fallback={<LoadingChart />}>
          <ChannelCharts filters={filters} />
        </Suspense>

        {/* Campaign Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
            <CardDescription>
              UTM-tracked campaign results for {periodLabel.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<LoadingTable />}>
              <CampaignTable filters={filters} />
            </Suspense>
          </CardContent>
        </Card>

        {/* Referring Sites */}
        <Suspense fallback={<LoadingTable />}>
          <ReferringSites filters={filters} />
        </Suspense>

        {/* Landing Pages */}
        <Suspense fallback={<LoadingTable />}>
          <LandingPages filters={filters} />
        </Suspense>
      </div>
    </>
  );
}
