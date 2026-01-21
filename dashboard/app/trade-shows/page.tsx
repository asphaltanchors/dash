// ABOUTME: Trade show lead attribution dashboard showing event performance and lead conversion metrics
// ABOUTME: Displays show performance, lead match rates, and revenue attribution across multiple time windows
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
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import {
  getTradeShowMetrics,
  getTradeShowSummaries,
  getTradeShowLeads,
} from '@/lib/queries/trade-shows';
import { parseFilters, getPeriodLabel, type DashboardFilters } from '@/lib/filter-utils';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { DollarSign, TrendingUp, CheckCircle2, Calendar, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

async function TradeShowMetrics({ filters }: { filters: DashboardFilters }) {
  const metrics = await getTradeShowMetrics(filters);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Trade Shows"
        value={metrics.totalShows.toString()}
        subtitle={`${formatNumber(metrics.totalLeads)} leads collected`}
        icon={Calendar}
        formatValue={(value) => formatNumber(value, 0)}
      />
      <MetricCard
        title="Average Match Rate"
        value={metrics.avgMatchRate}
        subtitle="Leads matched to companies"
        icon={CheckCircle2}
        formatValue={(value) => `${value}%`}
      />
      <MetricCard
        title="365d Attributed Revenue"
        value={metrics.totalAttributedRevenue365d}
        subtitle="One year attribution window"
        icon={DollarSign}
        formatValue={(value) => formatCurrency(value)}
      />
      <MetricCard
        title={`Top Show: ${metrics.topShowByRevenue}`}
        value={metrics.topShowRevenue}
        subtitle="Highest revenue attributed"
        icon={TrendingUp}
        formatValue={(value) => formatCurrency(value)}
      />
    </div>
  );
}

async function TradeShowPerformanceTable({ filters }: { filters: DashboardFilters }) {
  const shows = await getTradeShowSummaries(filters);

  return (
    <div className="space-y-4">
      {shows.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Show Details</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Match Rate</TableHead>
                <TableHead className="text-right">Existing Customers</TableHead>
                <TableHead className="text-right">30d Revenue</TableHead>
                <TableHead className="text-right">90d Revenue</TableHead>
                <TableHead className="text-right">365d Revenue</TableHead>
                <TableHead className="text-right">365d Conv. Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shows.map((show, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{show.showName}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(show.showDate), 'MMM d, yyyy')}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        {show.location}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="space-y-1">
                      <div className="font-medium">{formatNumber(show.totalLeads)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatNumber(show.leadsMatched)} matched
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={Number(show.matchRate) >= 70 ? "default" : Number(show.matchRate) >= 50 ? "secondary" : "outline"}>
                      {show.matchRate}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(show.matchedExistingCustomers)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(show.attributedRevenue30d)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(show.attributedRevenue90d)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(show.attributedRevenue365d)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={Number(show.conversionRate365d) >= 10 ? "default" : "secondary"}>
                      {show.conversionRate365d}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>No trade show data available for the selected period</p>
        </div>
      )}
    </div>
  );
}

async function TradeShowLeadsTable({ filters }: { filters: DashboardFilters }) {
  const leads = await getTradeShowLeads(filters, 100);

  const getMatchStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return <Badge variant="default">Matched</Badge>;
      case 'no_match':
        return <Badge variant="outline">No Match</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {leads.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead Details</TableHead>
                <TableHead>Show</TableHead>
                <TableHead>Match Status</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Lifetime Revenue</TableHead>
                <TableHead className="text-right">30d Attribution</TableHead>
                <TableHead className="text-right">90d Attribution</TableHead>
                <TableHead className="text-right">365d Attribution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.leadId}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{lead.leadName}</div>
                      <div className="text-sm text-muted-foreground font-mono">
                        {lead.leadEmail}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(lead.collectedAt), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{lead.showName}</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getMatchStatusBadge(lead.matchStatus)}
                      {lead.isExistingCustomer && (
                        <Badge variant="secondary" className="ml-1">
                          Existing
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">{lead.leadCompany}</div>
                      {lead.matchedCustomerName && (
                        <div className="text-xs text-muted-foreground">
                          → {lead.matchedCustomerName}
                        </div>
                      )}
                      {lead.companyDomain && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {lead.companyDomain}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {Number(lead.lifetimeRevenue) > 0 ? formatCurrency(lead.lifetimeRevenue) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="space-y-1">
                      <div className={Number(lead.attributedRevenue30d) > 0 ? "font-medium" : "text-muted-foreground"}>
                        {Number(lead.attributedRevenue30d) > 0 ? formatCurrency(lead.attributedRevenue30d) : '-'}
                      </div>
                      {lead.hasConverted30d && (
                        <CheckCircle2 className="h-3 w-3 text-green-600 inline" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="space-y-1">
                      <div className={Number(lead.attributedRevenue90d) > 0 ? "font-medium" : "text-muted-foreground"}>
                        {Number(lead.attributedRevenue90d) > 0 ? formatCurrency(lead.attributedRevenue90d) : '-'}
                      </div>
                      {lead.hasConverted90d && (
                        <CheckCircle2 className="h-3 w-3 text-green-600 inline" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="space-y-1">
                      <div className={Number(lead.attributedRevenue365d) > 0 ? "font-medium" : "text-muted-foreground"}>
                        {Number(lead.attributedRevenue365d) > 0 ? formatCurrency(lead.attributedRevenue365d) : '-'}
                      </div>
                      {lead.hasConverted365d && (
                        <CheckCircle2 className="h-3 w-3 text-green-600 inline" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>No lead data available for the selected period</p>
        </div>
      )}
    </div>
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

function LoadingTable() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}

interface TradeShowsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TradeShowsPage({ searchParams }: TradeShowsPageProps) {
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
                <BreadcrumbPage>Trade Shows</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trade Show Lead Attribution</h1>
            <p className="text-muted-foreground">
              Event performance, lead matching, and revenue attribution tracking
            </p>
          </div>
          <PeriodSelector currentPeriod={filters.period} filters={filters as Record<string, string | number | boolean | undefined>} />
        </div>

        {/* Key Metrics */}
        <Suspense fallback={<LoadingCards />}>
          <TradeShowMetrics filters={filters} />
        </Suspense>

        {/* Show Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Show Performance</CardTitle>
            <CardDescription>
              Trade show metrics and attribution analysis for {periodLabel.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<LoadingTable />}>
              <TradeShowPerformanceTable filters={filters} />
            </Suspense>
          </CardContent>
        </Card>

        {/* Detailed Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Details</CardTitle>
            <CardDescription>
              Individual lead information with company matching and revenue attribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<LoadingTable />}>
              <TradeShowLeadsTable filters={filters} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
