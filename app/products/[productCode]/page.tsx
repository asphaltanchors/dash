import { db } from "@/db"
import { sql } from "drizzle-orm"
import { orderItemsInAnalytics, ordersInAnalytics, productsInAnalytics, companiesInAnalytics, companyOrderMappingInAnalytics, itemHistoryViewInAnalytics } from "@/db/schema"
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
import { ProductSalesChart } from "@/app/components/ProductSalesChart"

export default async function ProductDashboard(
  props: {
    params: Promise<{ productCode: string }>
    searchParams: Promise<{ range?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const productCode = params.productCode
  const range = searchParams.range || "last-12-months"

  // Get date range based on the range parameter
  const dateRange = getDateRangeFromTimeFrame(range)
  const { formattedStartDate, formattedEndDate } = dateRange

  // Query to get product information from the products table
  const productInfoResult = await db
    .select({
      productFamily: productsInAnalytics.productFamily,
      itemQuantity: productsInAnalytics.itemQuantity,
      salesDescription: productsInAnalytics.salesDescription,
      materialType: productsInAnalytics.materialType,
      isKit: productsInAnalytics.isKit
    })
    .from(productsInAnalytics)
    .where(sql`${productsInAnalytics.itemName} = ${productCode}`)
    .limit(1)

  const productInfo = productInfoResult[0] || {
    productFamily: null,
    itemQuantity: 0,
    salesDescription: null,
    materialType: null,
    isKit: false
  }
  
  const productFamily = productInfo.productFamily
  const productFamilyId = productFamily ? productFamily.toLowerCase() : null
  const currentInventory = productInfo.itemQuantity || 0

  // Query to get product details with date range filter
  const productDetailsResult = await db
    .select({
      productCode: orderItemsInAnalytics.productCode,
      productDescription: orderItemsInAnalytics.productDescription,
      totalQuantity: sql<number>`SUM(CAST(${orderItemsInAnalytics.quantity} AS NUMERIC))`.as("total_quantity"),
      totalRevenue: sql<number>`SUM(${orderItemsInAnalytics.lineAmount})`.as("total_revenue"),
      avgUnitPrice: sql<number>`AVG(${orderItemsInAnalytics.unitPrice})`.as("avg_unit_price"),
      orderCount: sql<number>`COUNT(DISTINCT ${orderItemsInAnalytics.orderNumber})`.as("order_count"),
    })
    .from(orderItemsInAnalytics)
    .innerJoin(ordersInAnalytics, sql`${ordersInAnalytics.orderNumber} = ${orderItemsInAnalytics.orderNumber}`)
    .where(
      sql`${orderItemsInAnalytics.productCode} = ${productCode} AND 
          ${ordersInAnalytics.orderDate} >= ${formattedStartDate} AND 
          ${ordersInAnalytics.orderDate} <= ${formattedEndDate}`
    )
    .groupBy(orderItemsInAnalytics.productCode, orderItemsInAnalytics.productDescription)

  const productDetails = productDetailsResult[0] || {
    productCode,
    productDescription: "Unknown Product",
    totalQuantity: 0,
    totalRevenue: 0,
    avgUnitPrice: 0,
    orderCount: 0,
  }

  // Query to get all-time sales by month for this product
  const allTimeSalesByMonthResult = await db.execute(sql`
    SELECT 
      TO_CHAR(o.order_date, 'YYYY-MM') as month,
      SUM(CAST(oi.quantity AS NUMERIC)) as quantity,
      SUM(oi.line_amount) as revenue,
      COUNT(DISTINCT o.order_number) as order_count
    FROM analytics.order_items oi
    INNER JOIN analytics.orders o ON o.order_number = oi.order_number
    WHERE oi.product_code = ${productCode}
    GROUP BY TO_CHAR(o.order_date, 'YYYY-MM')
    ORDER BY month ASC
  `)

  // Process the sales data for the chart with proper number formatting
  const allTimeSalesData = (allTimeSalesByMonthResult as unknown[]).map(item => {
    const typedItem = item as Record<string, unknown>;
    return {
      month: String(typedItem.month || ''),
      quantity: parseFloat(String(typedItem.quantity || '0')),
      revenue: parseFloat(String(typedItem.revenue || '0')),
      order_count: parseInt(String(typedItem.order_count || '0'))
    };
  })

  // Query to get recent orders for this product with date range filter
  const recentOrders = await db
    .select({
      orderNumber: orderItemsInAnalytics.orderNumber,
      orderDate: ordersInAnalytics.orderDate,
      quantity: orderItemsInAnalytics.quantity,
      unitPrice: orderItemsInAnalytics.unitPrice,
      lineAmount: orderItemsInAnalytics.lineAmount,
      customerName: ordersInAnalytics.customerName,
    })
    .from(orderItemsInAnalytics)
    .innerJoin(ordersInAnalytics, sql`${ordersInAnalytics.orderNumber} = ${orderItemsInAnalytics.orderNumber}`)
    .where(
      sql`${orderItemsInAnalytics.productCode} = ${productCode} AND 
          ${ordersInAnalytics.orderDate} >= ${formattedStartDate} AND 
          ${ordersInAnalytics.orderDate} <= ${formattedEndDate}`
    )
    .orderBy(sql`${ordersInAnalytics.orderDate} DESC`)
    .limit(10)

  // Query to get orders by payment method for this product
  const ordersByPaymentMethod = await db
    .select({
      paymentMethod: ordersInAnalytics.paymentMethod,
      count: sql<number>`count(*)`.as("count"),
      totalAmount: sql<number>`SUM(${orderItemsInAnalytics.lineAmount})`.as("total_amount"),
    })
    .from(orderItemsInAnalytics)
    .innerJoin(ordersInAnalytics, sql`${ordersInAnalytics.orderNumber} = ${orderItemsInAnalytics.orderNumber}`)
    .where(
      sql`${orderItemsInAnalytics.productCode} = ${productCode} AND 
          ${ordersInAnalytics.orderDate} >= ${formattedStartDate} AND 
          ${ordersInAnalytics.orderDate} <= ${formattedEndDate}`
    )
    .groupBy(ordersInAnalytics.paymentMethod)
    .orderBy(sql`count DESC`)
    
  // Query to get top companies for this product
  const topCompaniesForProduct = await db
    .select({
      companyId: companiesInAnalytics.companyId,
      companyName: companiesInAnalytics.companyName,
      companyDomain: companiesInAnalytics.companyDomain,
      totalQuantity: sql<number>`SUM(CAST(${orderItemsInAnalytics.quantity} AS NUMERIC))`.as("total_quantity"),
      totalRevenue: sql<number>`SUM(${orderItemsInAnalytics.lineAmount})`.as("total_revenue"),
      orderCount: sql<number>`COUNT(DISTINCT ${orderItemsInAnalytics.orderNumber})`.as("order_count"),
    })
    .from(orderItemsInAnalytics)
    .innerJoin(ordersInAnalytics, sql`${ordersInAnalytics.orderNumber} = ${orderItemsInAnalytics.orderNumber}`)
    .innerJoin(companyOrderMappingInAnalytics, sql`${ordersInAnalytics.orderNumber} = ${companyOrderMappingInAnalytics.orderNumber}`)
    .innerJoin(companiesInAnalytics, sql`${companyOrderMappingInAnalytics.companyId} = ${companiesInAnalytics.companyId}`)
    .where(
      sql`${orderItemsInAnalytics.productCode} = ${productCode} AND 
          ${ordersInAnalytics.orderDate} >= ${formattedStartDate} AND 
          ${ordersInAnalytics.orderDate} <= ${formattedEndDate} AND
          ${companiesInAnalytics.isConsumerDomain} = false`
    )
    .groupBy(companiesInAnalytics.companyId, companiesInAnalytics.companyName, companiesInAnalytics.companyDomain)
    .orderBy(sql`total_revenue DESC`)
    .limit(5)
    
  // Calculate the concentration (percentage of revenue from top 5 companies)
  const totalRevenueFromTop5 = topCompaniesForProduct.reduce(
    (sum, company) => sum + Number(company.totalRevenue || 0), 
    0
  )
  const concentrationPercentage = productDetails.totalRevenue > 0
    ? (totalRevenueFromTop5 / Number(productDetails.totalRevenue)) * 100
    : 0
    
  // Query to get inventory history for this product
  const inventoryHistory = await db
    .select({
      columnName: itemHistoryViewInAnalytics.columnName,
      oldValue: itemHistoryViewInAnalytics.oldValue,
      newValue: itemHistoryViewInAnalytics.newValue,
      changedAt: itemHistoryViewInAnalytics.changedAt,
      numericChange: itemHistoryViewInAnalytics.numericChange,
      percentChange: itemHistoryViewInAnalytics.percentChange
    })
    .from(itemHistoryViewInAnalytics)
    .where(
      sql`${itemHistoryViewInAnalytics.itemName} = ${productCode} AND 
          ${itemHistoryViewInAnalytics.columnName} = 'quantity_on_hand'`
    )
    .orderBy(sql`${itemHistoryViewInAnalytics.changedAt} DESC`)
    .limit(10)

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
                      href={`/products?range=${range}`}
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
                      Back to Products
                    </Link>
                  </Button>
                  
                  {productFamily && (
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/product-families/${productFamilyId}?range=${range}`}
                        className="flex items-center gap-1 ml-2"
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
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
                          />
                        </svg>
                        View {productFamily} Family
                      </Link>
                    </Button>
                  )}
                </div>
                <h2 className="text-lg font-medium">
                  {dateRange.displayText}
                </h2>
              </div>

              <div className="px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Product Code
                        </p>
                        <p className="text-lg font-medium">
                          {productDetails.productCode}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Description
                        </p>
                        <p className="text-lg font-medium">
                          {productDetails.productDescription}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Average Unit Price
                        </p>
                        <p className="text-lg font-medium">
                          $
                          {Number(productDetails.avgUnitPrice).toLocaleString(
                            undefined,
                            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Orders
                        </p>
                        <p className="text-lg font-medium">
                          {Number(productDetails.orderCount).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 px-6 md:grid-cols-3 lg:grid-cols-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Current Inventory
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {Number(currentInventory).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Quantity Sold
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {Number(productDetails.totalQuantity).toLocaleString()}
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
                      ${Number(productDetails.totalRevenue).toLocaleString()}
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
                      $
                      {productDetails.orderCount > 0
                        ? Number(
                            productDetails.totalRevenue / productDetails.orderCount
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "0.00"}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Customer Concentration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {concentrationPercentage.toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Revenue from top 5 companies
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="px-6 mb-6">
                <ProductSalesChart 
                  salesData={allTimeSalesData}
                />
              </div>

              <div className="px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Companies for This Product</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Percentage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topCompaniesForProduct.map((company, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="font-medium">
                                  <Link
                                    href={`/companies/${encodeURIComponent(company.companyId || '')}?range=${range}`}
                                    className="text-primary hover:underline"
                                  >
                                    {company.companyName}
                                  </Link>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {company.companyDomain}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {Number(company.totalQuantity).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                ${Number(company.totalRevenue).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {((Number(company.totalQuantity) / Number(productDetails.totalQuantity)) * 100).toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))}
                          {topCompaniesForProduct.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">
                                No company data available
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
                                {((method.count / productDetails.orderCount) * 100).toFixed(1)}%
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
              
              <div className="px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Inventory History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Previous Value</TableHead>
                            <TableHead className="text-right">New Value</TableHead>
                            <TableHead className="text-right">Change</TableHead>
                            <TableHead className="text-right">% Change</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventoryHistory.map((record, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                {record.changedAt
                                  ? new Date(record.changedAt).toLocaleDateString()
                                  : "N/A"}
                              </TableCell>
                              <TableCell className="text-right">
                                {Number(record.oldValue || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {Number(record.newValue || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className={`text-right ${Number(record.numericChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {Number(record.numericChange || 0) >= 0 ? '+' : ''}
                                {Number(record.numericChange || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className={`text-right ${Number(record.percentChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {Number(record.percentChange || 0) >= 0 ? '+' : ''}
                                {Number(record.percentChange || 0).toFixed(2)}%
                              </TableCell>
                            </TableRow>
                          ))}
                          {inventoryHistory.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="py-4 text-center text-muted-foreground"
                              >
                                No inventory history available
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
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentOrders.map((order, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                <Link 
                                  href={`/orders/${order.orderNumber}?range=${range}`}
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
                                {Number(order.quantity).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                ${Number(order.lineAmount).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                          {recentOrders.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="py-4 text-center text-muted-foreground"
                              >
                                No recent orders
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
