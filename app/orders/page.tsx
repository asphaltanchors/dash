import { db } from "@/db"
import { sql } from "drizzle-orm"
import { orders, orderCompanyView } from "@/db/schema"
import { desc, sum, count, and, gte, lte } from "drizzle-orm" // Import necessary Drizzle functions
import { getDateRangeFromTimeFrame, getPreviousDateRange } from "@/app/utils/dates" // Import getPreviousDateRange
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge, badgeVariants } from "@/components/ui/badge" // Import badgeVariants
import { type VariantProps } from "class-variance-authority" // Import VariantProps
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
// Import the new component and its type
import SalesChannelTable, { SalesChannelMetric } from "@/app/components/SalesChannelTable"

export default function OrdersPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  // Handle search params safely
  const range = searchParams && searchParams.range
    ? Array.isArray(searchParams.range)
      ? searchParams.range[0]
      : searchParams.range
    : "last-12-months"

  // Calculate date range based on the selected time frame
  const dateRange = getDateRangeFromTimeFrame(range)
  const { formattedStartDate, formattedEndDate, startDate, endDate } = dateRange // Destructure start/end dates

  // Calculate the previous date range
  const previousDateRange = getPreviousDateRange(startDate, endDate)
  const { formattedStartDate: prevFormattedStartDate, formattedEndDate: prevFormattedEndDate } = previousDateRange

  // Query to get total number of orders and revenue for the selected time frame
  const orderSummaryResultPromise = db
    .select({
      totalOrders: sql<number>`count(*)`.as("total_orders"),
      totalRevenue: sql<number>`SUM(total_amount)`.as("total_revenue"),
      avgOrderValue: sql<number>`AVG(total_amount)`.as("avg_order_value"),
    })
    .from(orders)
    .where(
      // Use Drizzle's 'and', 'gte', 'lte' for type safety if possible, or stick to sql``
      and(
        gte(orders.orderDate, formattedStartDate),
        lte(orders.orderDate, formattedEndDate)
      )
      // sql`order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`
    )

  // Query to get orders by status
  const ordersByStatusPromise = db
    .select({
      status: orders.status,
      count: sql<number>`count(*)`.as("count"),
      totalAmount: sql<number>`SUM(total_amount)`.as("total_amount"),
    })
    .from(orders)
    .where(
      and(
        gte(orders.orderDate, formattedStartDate),
        lte(orders.orderDate, formattedEndDate)
      )
      // sql`order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`
    )
    .groupBy(orders.status)
    .orderBy(sql`count DESC`)

  // Query to get orders by payment method
  const ordersByPaymentMethodPromise = db
    .select({
      paymentMethod: orders.paymentMethod,
      count: sql<number>`count(*)`.as("count"),
      totalAmount: sql<number>`SUM(total_amount)`.as("total_amount"),
    })
    .from(orders)
    .where(
      and(
        gte(orders.orderDate, formattedStartDate),
        lte(orders.orderDate, formattedEndDate)
      )
      // sql`order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`
    )
    .groupBy(orders.paymentMethod)
    .orderBy(sql`count DESC`)

  // Query to get most recent orders list with company information
  const recentOrdersListPromise = db
    .select({
      orderNumber: orderCompanyView.orderNumber,
      customerName: orderCompanyView.customerName,
      orderDate: orderCompanyView.orderDate,
      totalAmount: orderCompanyView.totalAmount,
      companyName: orderCompanyView.companyName,
      companyDomain: orderCompanyView.companyDomain,
      matchType: orderCompanyView.matchType,
      confidence: orderCompanyView.confidence,
    })
    .from(orderCompanyView)
    .where(
      and(
        gte(orderCompanyView.orderDate, formattedStartDate),
        lte(orderCompanyView.orderDate, formattedEndDate)
      )
      // sql`order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`
    )
    .orderBy(desc(orderCompanyView.orderDate))
    .limit(25)

  // --- NEW: Query for Sales Channel Metrics (Current Period) ---
  const currentSalesChannelMetricsPromise = db
    .select({
      sales_channel: orders.class, // 'class' column likely holds the channel
      total_revenue: sum(orders.totalAmount).mapWith(String), // Ensure string type
      order_count: count(orders.orderNumber).mapWith(String), // Ensure string type
    })
    .from(orders)
    .where(
      and(
        gte(orders.orderDate, formattedStartDate),
        lte(orders.orderDate, formattedEndDate),
        // Optional: Add other filters if needed, e.g., filter out null channels
        sql`${orders.class} IS NOT NULL`
      )
    )
    .groupBy(orders.class)

  // --- NEW: Query for Sales Channel Metrics (Previous Period) ---
  const previousSalesChannelMetricsPromise = db
    .select({
      sales_channel: orders.class,
      total_revenue: sum(orders.totalAmount).mapWith(String),
      order_count: count(orders.orderNumber).mapWith(String),
    })
    .from(orders)
    .where(
      and(
        gte(orders.orderDate, prevFormattedStartDate),
        lte(orders.orderDate, prevFormattedEndDate),
        sql`${orders.class} IS NOT NULL`
      )
    )
    .groupBy(orders.class)


  // Helper function to join all data fetching promises and render UI
  async function OrdersPageContent() {
    // Wait for all data to be fetched in parallel
    const [
      orderSummaryResult,
      ordersByStatus,
      ordersByPaymentMethod,
      recentOrdersList,
      currentSalesChannelMetrics, // Add new promise result
      previousSalesChannelMetrics // Add new promise result
    ] = await Promise.all([
      orderSummaryResultPromise,
      ordersByStatusPromise,
      ordersByPaymentMethodPromise,
      recentOrdersListPromise,
      currentSalesChannelMetricsPromise, // Add new promise
      previousSalesChannelMetricsPromise // Add new promise
    ])

    // --- NEW: Combine Sales Channel Metrics ---
    const combinedMetrics: { [key: string]: SalesChannelMetric } = {};

    // Process current period data
    currentSalesChannelMetrics.forEach(metric => {
      if (!metric.sales_channel) return; // Skip null channels
      combinedMetrics[metric.sales_channel] = {
        sales_channel: metric.sales_channel,
        periods: [{
          period_start: formattedStartDate,
          period_end: formattedEndDate,
          total_revenue: metric.total_revenue || "0",
          order_count: metric.order_count || "0",
        }]
      };
    });

    // Process previous period data
    previousSalesChannelMetrics.forEach(metric => {
      if (!metric.sales_channel) return; // Skip null channels
      const periodData = {
        period_start: prevFormattedStartDate,
        period_end: prevFormattedEndDate,
        total_revenue: metric.total_revenue || "0",
        order_count: metric.order_count || "0",
      };
      if (combinedMetrics[metric.sales_channel]) {
        // Add to existing channel's periods array (ensure current is first)
        combinedMetrics[metric.sales_channel].periods.push(periodData);
      } else {
        // Channel exists only in previous period, create entry with empty current period
        combinedMetrics[metric.sales_channel] = {
          sales_channel: metric.sales_channel,
          periods: [
            { // Placeholder for current period
              period_start: formattedStartDate,
              period_end: formattedEndDate,
              total_revenue: "0",
              order_count: "0",
            },
            periodData // Previous period data
          ]
        };
      }
    });

    // Ensure all channels from current period have a previous period entry (even if zero)
     Object.values(combinedMetrics).forEach(metric => {
       if (metric.periods.length === 1) {
         metric.periods.push({
           period_start: prevFormattedStartDate,
           period_end: prevFormattedEndDate,
           total_revenue: "0",
           order_count: "0",
         });
       }
       // Ensure periods are ordered: current, previous
       metric.periods.sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime());
     });

    const salesChannelMetrics: SalesChannelMetric[] = Object.values(combinedMetrics);
    // --- END NEW ---


    const totalOrders = orderSummaryResult[0]?.totalOrders || 0
    const totalRevenue = orderSummaryResult[0]?.totalRevenue || 0
    const avgOrderValue = orderSummaryResult[0]?.avgOrderValue || 0

    // Match type badge variant mapping
    const getMatchTypeVariant = (matchType: string | null): VariantProps<typeof badgeVariants>["variant"] => {
      switch (matchType) {
        case "exact":
          return "default" // Changed from "success"
        case "fuzzy":
          return "secondary" // Changed from "warning"
        case "manual":
          return "outline" // Changed from "info"
        default:
          return "secondary" // Kept as secondary
      }
    }

    // Fetch status information directly from orders table for each order
    const orderStatusPromises = recentOrdersList.map(order =>
      db.select({ status: orders.status })
        .from(orders)
        .where(sql`${orders.orderNumber} = ${order.orderNumber}`)
        .limit(1)
    )

    // Wait for all status queries to complete
    const orderStatuses = await Promise.all(orderStatusPromises)

    // Add status information to each order in the list
    const ordersWithStatus = recentOrdersList.map((order, index) => ({
      ...order,
      status: orderStatuses[index][0]?.status || null
    }))

    // Status badge variant mapping
    const getStatusVariant = (status: string | null): VariantProps<typeof badgeVariants>["variant"] => {
      switch (status) {
        case "Paid":
          return "default" // Changed from "success"
        case "Pending":
          return "secondary" // Changed from "warning"
        default:
          return "outline" // Changed from "secondary"
      }
    }

    return (
      <>
        <div className="flex items-center justify-between px-6">
          <h1 className="text-2xl font-bold">Orders</h1>
          <h2 className="text-lg font-medium">
            {dateRange.displayText}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 px-6 md:grid-cols-3">
          {/* Summary Cards ... */}
           <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {totalOrders.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ${Number(totalRevenue).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Average Order Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ${Number(avgOrderValue).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* --- NEW: Render Sales Channel Table --- */}
        <div className="px-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales by Channel</CardTitle>
            </CardHeader>
            {/* Add overflow-x-auto here for scrolling */}
            <CardContent className="overflow-x-auto"> 
              {/* Pass the range prop */}
              <SalesChannelTable metrics={salesChannelMetrics} range={range} />
            </CardContent>
          </Card>
        </div>
        {/* --- END NEW --- */}


        <div className="grid grid-cols-1 gap-6 px-6 lg:grid-cols-2">
          {/* Orders by Status/Payment Method Cards ... */}
          <Card>
            <CardHeader>
              <CardTitle>Orders by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersByStatus.map((status, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {status.status || "Unknown"}
                        </TableCell>
                        <TableCell className="text-right">
                          {status.count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Number(status.totalAmount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {totalOrders > 0 ? ((status.count / totalOrders) * 100).toFixed(1) : '0.0'}%
                        </TableCell>
                      </TableRow>
                    ))}
                    {ordersByStatus.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Orders by Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Method</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersByPaymentMethod.map((method, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {method.paymentMethod || "Unknown"}
                        </TableCell>
                        <TableCell className="text-right">
                          {method.count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Number(method.totalAmount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {totalOrders > 0 ? ((method.count / totalOrders) * 100).toFixed(1) : '0.0'}%
                        </TableCell>
                      </TableRow>
                    ))}
                    {ordersByPaymentMethod.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mx-6">
          {/* Recent Orders Table ... */}
           <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersWithStatus.map((order, index) => {
                    // Format the date
                    const orderDate = order.orderDate
                      ? new Date(order.orderDate)
                      : null
                    const formattedDate = orderDate
                      ? orderDate.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "N/A"

                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/orders/${encodeURIComponent(
                              order.orderNumber ?? '' // Handle potential null order number
                            )}?range=${range}`}
                            className="text-primary hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {order.companyName || "—"}
                          </div>
                          {order.companyDomain && (
                            <div className="text-xs text-muted-foreground">
                              {order.companyDomain}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{formattedDate}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(order.status)}>
                            {order.status || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.matchType && (
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={getMatchTypeVariant(order.matchType)}
                                className="text-xs"
                              >
                                {order.matchType}
                              </Badge>
                              {order.confidence && (
                                <span className="text-xs text-muted-foreground">
                                  {(order.confidence * 100).toFixed(1)}%
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Number(order.totalAmount).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {ordersWithStatus.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No orders found for the selected date range
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-6 py-6">
              {/* OrdersPageContent is an async component, Next.js handles this */}
              <OrdersPageContent />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
