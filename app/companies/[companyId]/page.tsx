import { db } from "@/db"
import { sql } from "drizzle-orm"
import { companies, companyOrderMapping, companyStats, customers, orders, orderItems } from "@/db/schema"
import { notFound } from "next/navigation"
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getDateRangeFromTimeFrame } from "@/app/utils/dates"
import { formatCurrency } from "@/lib/utils"

export default async function CompanyDetailPage(
  props: {
    params: Promise<{ companyId: string }>
    searchParams: Promise<{ range?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { companyId } = params
  const range = searchParams.range || "last-12-months"

  // Get date range based on the range parameter
  const dateRange = getDateRangeFromTimeFrame(range)
  const { formattedStartDate, formattedEndDate } = dateRange

  // Fetch the company details
  const companyDetails = await db
    .select()
    .from(companies)
    .where(sql`${companies.companyId} = ${companyId}`)
    .limit(1)

  // If company not found, return 404
  if (companyDetails.length === 0) {
    notFound()
  }

  const company = companyDetails[0]

  // Fetch company stats
  const statsResult = await db
    .select()
    .from(companyStats)
    .where(sql`${companyStats.companyId} = ${companyId}`)
    .limit(1)

  const stats = statsResult.length > 0 ? statsResult[0] : { customerCount: 0, totalOrders: 0 }

  // Query to get company orders with date range filter
  const companyOrdersPromise = db
    .select({
      orderNumber: orders.orderNumber,
      orderDate: orders.orderDate,
      customerName: orders.customerName,
      totalAmount: orders.totalAmount,
      status: orders.status,
    })
    .from(orders)
    .innerJoin(
      companyOrderMapping,
      sql`${orders.orderNumber} = ${companyOrderMapping.orderNumber}`
    )
    .where(
      sql`${companyOrderMapping.companyId} = ${companyId} AND 
          ${orders.orderDate} >= ${formattedStartDate} AND 
          ${orders.orderDate} <= ${formattedEndDate}`
    )
    .orderBy(sql`${orders.orderDate} DESC`)
    .limit(10)

  // Query to get total revenue for the company in the selected time frame
  const totalRevenuePromise = db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`.as("total_revenue"),
      orderCount: sql<number>`COUNT(DISTINCT ${orders.orderNumber})`.as("order_count"),
    })
    .from(orders)
    .innerJoin(
      companyOrderMapping,
      sql`${orders.orderNumber} = ${companyOrderMapping.orderNumber}`
    )
    .where(
      sql`${companyOrderMapping.companyId} = ${companyId} AND 
          ${orders.orderDate} >= ${formattedStartDate} AND 
          ${orders.orderDate} <= ${formattedEndDate}`
    )

  // Query to get customers associated with this company
  const companyCustomersPromise = db
    .select({
      quickbooksId: customers.quickbooksId,
      customerName: customers.customerName,
      firstName: customers.firstName,
      lastName: customers.lastName,
      customerType: customers.customerType,
    })
    .from(customers)
    .where(sql`${customers.companyId} = ${companyId}`)
    .limit(10)

  // Query to get top products purchased by this company
  const topProductsPromise = db
    .select({
      productCode: orderItems.productCode,
      productDescription: orderItems.productDescription,
      totalQuantity: sql<number>`SUM(CAST(${orderItems.quantity} AS NUMERIC))`.as("total_quantity"),
      totalRevenue: sql<number>`SUM(${orderItems.lineAmount})`.as("total_revenue"),
      orderCount: sql<number>`COUNT(DISTINCT ${orderItems.orderNumber})`.as("order_count"),
    })
    .from(orderItems)
    .innerJoin(
      orders,
      sql`${orderItems.orderNumber} = ${orders.orderNumber}`
    )
    .innerJoin(
      companyOrderMapping,
      sql`${orders.orderNumber} = ${companyOrderMapping.orderNumber}`
    )
    .where(
      sql`${companyOrderMapping.companyId} = ${companyId} AND 
          ${orders.orderDate} >= ${formattedStartDate} AND 
          ${orders.orderDate} <= ${formattedEndDate}`
    )
    .groupBy(orderItems.productCode, orderItems.productDescription)
    .orderBy(sql`total_revenue DESC`)
    .limit(5)

  // Wait for all data to be fetched in parallel
  const [companyOrders, totalRevenueResult, companyCustomers, topProducts] = await Promise.all([
    companyOrdersPromise,
    totalRevenuePromise,
    companyCustomersPromise,
    topProductsPromise,
  ])

  const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0] : { totalRevenue: 0, orderCount: 0 }
  const avgOrderValue = totalRevenue.orderCount > 0 
    ? Number(totalRevenue.totalRevenue) / Number(totalRevenue.orderCount) 
    : 0

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
              <div className="flex items-center justify-between px-6">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      href={`/companies?range=${range}`}
                      className="flex items-center gap-1"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                      </svg>
                      Back to Companies
                    </Link>
                  </Button>
                </div>
                <h2 className="text-lg font-medium">
                  {dateRange.displayText}
                </h2>
              </div>

              <div className="px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Company Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Company Name
                        </p>
                        <p className="text-lg font-medium">
                          {company.companyName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Domain
                        </p>
                        <p className="text-lg font-medium">
                          {company.companyDomain}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Customer Name
                        </p>
                        <p className="text-lg font-medium">
                          {company.customerName || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Created Date
                        </p>
                        <p className="text-lg font-medium">
                          {company.createdAt
                            ? new Date(company.createdAt).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 px-6 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Customers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {Number(stats.customerCount).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {Number(totalRevenue.orderCount).toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      In selected time period
                    </p>
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
                      {formatCurrency(Number(totalRevenue.totalRevenue))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      In selected time period
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 px-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {companyOrders.map((order, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                <Link
                                  href={`/orders/${encodeURIComponent(
                                    order.orderNumber || ''
                                  )}?range=${range}`}
                                  className="text-primary hover:underline"
                                >
                                  {order.orderNumber}
                                </Link>
                              </TableCell>
                              <TableCell>
                                {order.orderDate
                                  ? new Date(order.orderDate).toLocaleDateString()
                                  : "N/A"}
                              </TableCell>
                              <TableCell>{order.customerName}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(Number(order.totalAmount || 0))}
                              </TableCell>
                            </TableRow>
                          ))}
                          {companyOrders.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="py-6 text-center text-muted-foreground"
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

                <Card>
                  <CardHeader>
                    <CardTitle>Top Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topProducts.map((product, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="font-medium">
                                  <Link
                                    href={`/products/${encodeURIComponent(
                                      product.productCode || ''
                                    )}?range=${range}`}
                                    className="text-primary hover:underline"
                                  >
                                    {product.productCode}
                                  </Link>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {product.productDescription}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {Number(product.totalQuantity).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(Number(product.totalRevenue || 0))}
                              </TableCell>
                            </TableRow>
                          ))}
                          {topProducts.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                className="py-6 text-center text-muted-foreground"
                              >
                                No products found for the selected date range
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Associated Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer Name</TableHead>
                            <TableHead>First Name</TableHead>
                            <TableHead>Last Name</TableHead>
                            <TableHead>Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {companyCustomers.map((customer, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {customer.customerName}
                              </TableCell>
                              <TableCell>{customer.firstName || "N/A"}</TableCell>
                              <TableCell>{customer.lastName || "N/A"}</TableCell>
                              <TableCell>{customer.customerType || "N/A"}</TableCell>
                            </TableRow>
                          ))}
                          {companyCustomers.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="py-6 text-center text-muted-foreground"
                              >
                                No customers found for this company
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {totalRevenue.orderCount > 0 && (
                <div className="px-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="rounded-lg border p-4">
                          <h3 className="font-medium mb-2">Average Order Value</h3>
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(avgOrderValue)}
                          </p>
                        </div>

                        <div className="rounded-lg border p-4">
                          <h3 className="font-medium mb-2">Orders in Period</h3>
                          <p className="text-2xl font-bold text-primary">
                            {Number(totalRevenue.orderCount).toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {dateRange.displayText}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
