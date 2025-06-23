import { Suspense } from 'react'
import { DollarSign, ShoppingCart, TrendingUp } from 'lucide-react'
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
import { MetricCard } from '@/components/dashboard/MetricCard'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { RecentOrders } from '@/components/dashboard/RecentOrders'
import { getDashboardMetrics, getRecentOrders, getWeeklyRevenue } from '@/lib/queries'
import { parseFilters, getPeriodLabel, type DashboardFilters } from '@/lib/filter-utils'
import { PeriodSelector } from '@/components/dashboard/PeriodSelector'
import { formatCurrency, formatNumber } from '@/lib/utils'

async function DashboardMetrics({ filters }: { filters: DashboardFilters }) {
  const metrics = await getDashboardMetrics(filters)
  const periodLabel = getPeriodLabel(filters.period || '1y')

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="365 Day Sales"
        value={metrics.sales365Days}
        change={metrics.sales365DaysGrowth}
        icon={DollarSign}
        formatValue={(value) => formatCurrency(value, { showCents: false })}
      />
      <MetricCard
        title={`${periodLabel} Sales`}
        value={metrics.totalRevenue}
        change={metrics.revenueGrowth}
        icon={DollarSign}
        formatValue={(value) => formatCurrency(value)}
      />
      <MetricCard
        title={`${periodLabel} Orders`}
        value={metrics.totalOrders.toString()}
        change={metrics.orderGrowth}
        icon={ShoppingCart}
        formatValue={(value) => formatNumber(value, 0)}
      />
      <MetricCard
        title="Average Order Value"
        value={metrics.averageOrderValue}
        icon={TrendingUp}
        formatValue={(value) => formatCurrency(value)}
      />
    </div>
  )
}

async function DashboardChart({ filters }: { filters: DashboardFilters }) {
  const weeklyRevenue = await getWeeklyRevenue(filters)
  return <RevenueChart data={weeklyRevenue} period={filters.period} />
}

async function DashboardOrders() {
  const orders = await getRecentOrders(15)
  return <RecentOrders orders={orders} />
}

function LoadingCard() {
  return (
    <div className="rounded-lg border bg-card p-6 animate-pulse">
      <div className="h-4 bg-muted rounded w-24 mb-2"></div>
      <div className="h-8 bg-muted rounded w-32"></div>
    </div>
  )
}

function LoadingChart() {
  return (
    <div className="rounded-lg border bg-card p-6 animate-pulse">
      <div className="h-4 bg-muted rounded w-48 mb-6"></div>
      <div className="h-64 bg-muted rounded"></div>
    </div>
  )
}

function LoadingTable() {
  return (
    <div className="rounded-lg border bg-card p-6 animate-pulse">
      <div className="h-4 bg-muted rounded w-32 mb-6"></div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex space-x-4">
            <div className="h-4 bg-muted rounded flex-1"></div>
            <div className="h-4 bg-muted rounded w-24"></div>
            <div className="h-4 bg-muted rounded w-20"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const filters = parseFilters<DashboardFilters>(params);
  
  // Default to 1 year period if no period specified
  if (!filters.period) {
    filters.period = '1y';
  }

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
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your e-commerce performance
            </p>
          </div>
          <PeriodSelector currentPeriod={filters.period || '1y'} filters={filters as Record<string, string | number | boolean | undefined>} />
        </div>

        {/* Metrics Cards */}
        <Suspense 
          fallback={
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
            </div>
          }
        >
          <DashboardMetrics filters={filters} />
        </Suspense>

        {/* Revenue Chart - Full Width */}
        <Suspense fallback={<LoadingChart />}>
          <DashboardChart filters={filters} />
        </Suspense>

        {/* Recent Orders */}
        <Suspense fallback={<LoadingTable />}>
          <DashboardOrders />
        </Suspense>
      </div>
    </>
  )
}