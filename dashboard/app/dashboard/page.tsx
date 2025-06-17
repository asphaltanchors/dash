import { Suspense } from 'react'
import { DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { RecentOrders } from '@/components/dashboard/RecentOrders'
import { getDashboardMetrics, getRecentOrders, getDailyRevenue } from '@/lib/queries'

async function DashboardMetrics() {
  const metrics = await getDashboardMetrics()
  
  const formatCurrency = (value: string) => `$${parseFloat(value).toLocaleString()}`
  const formatNumber = (value: string) => parseInt(value).toLocaleString()

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Revenue"
        value={metrics.totalRevenue}
        change={metrics.revenueGrowth}
        icon={DollarSign}
        formatValue={formatCurrency}
      />
      <MetricCard
        title="Total Orders"
        value={metrics.totalOrders.toString()}
        change={metrics.orderGrowth}
        icon={ShoppingCart}
        formatValue={formatNumber}
      />
      <MetricCard
        title="Average Order Value"
        value={metrics.averageOrderValue}
        icon={TrendingUp}
        formatValue={formatCurrency}
      />
      <MetricCard
        title="Unique Customers"
        value={metrics.uniqueCustomers.toString()}
        icon={Users}
        formatValue={formatNumber}
      />
    </div>
  )
}

async function DashboardChart() {
  const dailyRevenue = await getDailyRevenue()
  return <RevenueChart data={dailyRevenue} />
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

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your e-commerce performance
          </p>
        </div>
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
        <DashboardMetrics />
      </Suspense>

      {/* Chart and Orders Grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <Suspense fallback={<LoadingChart />}>
            <DashboardChart />
          </Suspense>
        </div>
        <div className="lg:col-span-3">
          <Suspense fallback={<LoadingTable />}>
            <DashboardOrders />
          </Suspense>
        </div>
      </div>
    </div>
  )
}