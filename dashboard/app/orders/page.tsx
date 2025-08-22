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
import { DataTable } from "@/components/orders/data-table"
import { SearchInput } from "@/components/orders/search-input"
import ChannelBreakdown from "@/components/orders/channel-breakdown"
import SegmentBreakdown from "@/components/orders/segment-breakdown"
import { getAllOrders, getChannelMetrics, getSegmentMetrics } from "@/lib/queries"

interface OrdersPageProps {
  searchParams: Promise<{ 
    search?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }>
}

async function OrdersTable({ 
  searchTerm, 
  sortBy, 
  sortOrder 
}: { 
  searchTerm: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}) {
  // Server-side search and sorting - only fetch relevant results
  const { orders, totalCount } = await getAllOrders(1, 50, searchTerm, sortBy, sortOrder)
  
  return (
    <DataTable 
      data={orders} 
      searchInput={<SearchInput initialValue={searchTerm} />}
      searchResults={searchTerm ? `${totalCount} orders found for "${searchTerm}"` : undefined}
      sortBy={sortBy}
      sortOrder={sortOrder}
    />
  )
}

async function ChannelMetrics() {
  const channelMetrics = await getChannelMetrics()
  return <ChannelBreakdown metrics={channelMetrics} />
}

async function SegmentMetrics() {
  const segmentMetrics = await getSegmentMetrics()
  return <SegmentBreakdown metrics={segmentMetrics} />
}

function LoadingTable() {
  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <div className="h-10 bg-muted rounded w-80 animate-pulse"></div>
        <div className="ml-auto h-10 bg-muted rounded w-24 animate-pulse"></div>
      </div>
      <div className="rounded-md border bg-card">
        <div className="h-12 bg-muted/20 border-b animate-pulse"></div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex space-x-4">
              <div className="h-4 bg-muted rounded flex-1 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="h-8 bg-muted rounded w-32 animate-pulse"></div>
        <div className="h-8 bg-muted rounded w-20 animate-pulse"></div>
        <div className="h-8 bg-muted rounded w-16 animate-pulse"></div>
      </div>
    </div>
  )
}

function LoadingChannelBreakdown() {
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

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const { search, sortBy, sortOrder } = await searchParams
  const searchTerm = search || ''
  const currentSortBy = sortBy || 'orderDate'
  const currentSortOrder = sortOrder || 'desc'

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
                <BreadcrumbPage>Orders</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground">
              Search and manage all your orders
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Sales by Channel</h2>
            <Suspense fallback={<LoadingChannelBreakdown />}>
              <ChannelMetrics />
            </Suspense>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Sales by Segment</h2>
            <Suspense fallback={<LoadingChannelBreakdown />}>
              <SegmentMetrics />
            </Suspense>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">All Orders</h2>
            <Suspense fallback={<LoadingTable />} key={`${searchTerm}-${currentSortBy}-${currentSortOrder}`}>
              <OrdersTable 
                searchTerm={searchTerm}
                sortBy={currentSortBy}
                sortOrder={currentSortOrder}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  )
}