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
import { Card, CardContent } from "@/components/ui/card"
import DSORiskCard from "@/components/dashboard/DSORiskCard"
import TopChannelsCard from "@/components/dashboard/TopChannelsCard"
import ARSummaryCard from "@/components/dashboard/ARSummaryCard"
import { getCurrentDSO, getChannelMetrics, getARAgingDetails } from "@/lib/queries"

async function DSORiskMetric() {
  const currentDSO = await getCurrentDSO()
  return <DSORiskCard dsoMetric={currentDSO} />
}

async function TopChannelsMetric() {
  const channelMetrics = await getChannelMetrics()
  return <TopChannelsCard channelMetrics={channelMetrics} />
}

async function ARSummaryMetric() {
  const arDetails = await getARAgingDetails()
  return <ARSummaryCard arDetails={arDetails} />
}

function LoadingCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded animate-pulse"></div>
          <div className="h-8 bg-muted rounded animate-pulse"></div>
          <div className="h-3 bg-muted rounded w-3/4 animate-pulse"></div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
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
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
            <p className="text-muted-foreground">
              Key business metrics and performance indicators
            </p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          <Suspense fallback={<LoadingCard />}>
            <DSORiskMetric />
          </Suspense>
          <Suspense fallback={<LoadingCard />}>
            <TopChannelsMetric />
          </Suspense>
          <Suspense fallback={<LoadingCard />}>
            <ARSummaryMetric />
          </Suspense>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-muted/50">
            <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
              <h3 className="text-lg font-medium mb-2">Sales Performance</h3>
              <p className="text-sm text-muted-foreground text-center">
                Channel attribution, customer segments, and sales trends
              </p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
              <h3 className="text-lg font-medium mb-2">Cash Flow Analytics</h3>
              <p className="text-sm text-muted-foreground text-center">
                DSO tracking, AR aging, and collection performance
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
