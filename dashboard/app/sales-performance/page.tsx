// ABOUTME: Sales Performance Dashboard with channel and segment attribution analytics
// ABOUTME: Displays the new sales_channel and customer_segment breakdown with detailed metrics
import { Suspense } from 'react'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import ChannelBreakdown from "@/components/orders/channel-breakdown"
import SegmentBreakdown from "@/components/orders/segment-breakdown"
import { getChannelMetrics, getSegmentMetrics } from "@/lib/queries"

async function ChannelMetrics() {
  const channelMetrics = await getChannelMetrics()
  return <ChannelBreakdown metrics={channelMetrics} />
}

async function SegmentMetrics() {
  const segmentMetrics = await getSegmentMetrics()
  return <SegmentBreakdown metrics={segmentMetrics} />
}

function LoadingBreakdown() {
  return (
    <div className="rounded-md border bg-card">
      <div className="h-12 bg-muted/20 border-b animate-pulse"></div>
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex space-x-4">
            <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function SalesPerformancePage() {
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
                <BreadcrumbPage>Sales Performance</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sales Performance</h1>
            <p className="text-muted-foreground">
              Sales attribution analytics with channel and customer segment breakdown
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
              <CardDescription>Channel and segment performance highlights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Invoice Channel</p>
                  <p className="text-2xl font-bold">$3.9M</p>
                  <p className="text-xs text-muted-foreground">1,727 orders • $2,271 AOV • All B2B</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Website Channel</p>
                  <p className="text-2xl font-bold">$2.1M</p>
                  <p className="text-xs text-muted-foreground">5,163 orders • $408 AOV • B2C Focus</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Amazon Channel</p>
                  <p className="text-2xl font-bold">$1.0M</p>
                  <p className="text-xs text-muted-foreground">6,435 orders • $157 AOV • Marketplace</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales by Channel</CardTitle>
              <CardDescription>Revenue, orders, and trends by sales channel</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<LoadingBreakdown />}>
                <ChannelMetrics />
              </Suspense>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Sales by Customer Segment</CardTitle>
              <CardDescription>Revenue breakdown by customer type and business model</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<LoadingBreakdown />}>
                <SegmentMetrics />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}