import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { ArrowLeft, Calendar, CreditCard, Package, User } from 'lucide-react'
import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getOrderByNumber, getOrderLineItems } from '@/lib/queries'
import { formatCurrency, formatNumber } from '@/lib/utils'

interface OrderPageProps {
  params: Promise<{ slug: string }>
}

async function OrderLineItems({ orderNumber }: { orderNumber: string }) {
  const lineItems = await getOrderLineItems(orderNumber)
  
  const formatQuantity = (value: string) => formatNumber(value, 1)

  if (lineItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
          <CardDescription>No line items found for this order</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Line Items</CardTitle>
        <CardDescription>
          {lineItems.length} item{lineItems.length !== 1 ? 's' : ''} in this order
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product/Service</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Family</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item, index) => (
              <TableRow key={`${item.lineItemId}-${index}`}>
                <TableCell className="font-medium">
                  <div className="max-w-[200px]">
                    <div className="truncate">{item.productService}</div>
                    {item.unitOfMeasure && (
                      <div className="text-xs text-muted-foreground">
                        Unit: {item.unitOfMeasure}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[250px] truncate">
                    {item.productServiceDescription || '-'}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatQuantity(item.quantity)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.rate)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.amount)}
                </TableCell>
                <TableCell>
                  <div className="max-w-[150px]">
                    <div className="truncate text-sm">
                      {item.productFamily || '-'}
                    </div>
                    {item.materialType && (
                      <div className="text-xs text-muted-foreground truncate">
                        {item.materialType}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {item.marginPercentage ? (
                    <div>
                      <div className="font-medium">{item.marginPercentage}%</div>
                      {item.marginAmount && (
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(item.marginAmount)}
                        </div>
                      )}
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

async function OrderDetails({ orderNumber }: { orderNumber: string }) {
  const order = await getOrderByNumber(orderNumber)
  
  if (!order) {
    notFound()
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order {order.orderNumber}</h1>
          <p className="text-muted-foreground">
            Placed on {formatDate(order.orderDate)}
          </p>
        </div>
        <Badge variant={order.isPaid ? "default" : "secondary"}>
          {order.isPaid ? "Paid" : "Unpaid"}
        </Badge>
      </div>

      {/* Order Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(order.totalAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{order.status}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Method</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{order.paymentMethod || 'N/A'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currency</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{order.currency || 'USD'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Order Details Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">Customer</h4>
              <p className="text-muted-foreground">{order.customer}</p>
            </div>
            {order.billingAddress && (
              <div>
                <h4 className="font-medium">Billing Address</h4>
                <p className="text-muted-foreground whitespace-pre-line">{order.billingAddress}</p>
              </div>
            )}
            {order.shippingAddress && (
              <div>
                <h4 className="font-medium">Shipping Address</h4>
                <p className="text-muted-foreground whitespace-pre-line">{order.shippingAddress}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Order Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">Order Date</h4>
              <p className="text-muted-foreground">{formatDate(order.orderDate)}</p>
            </div>
            {order.dueDate && (
              <div>
                <h4 className="font-medium">Due Date</h4>
                <p className="text-muted-foreground">{formatDate(order.dueDate)}</p>
              </div>
            )}
            {order.shipDate && (
              <div>
                <h4 className="font-medium">Ship Date</h4>
                <p className="text-muted-foreground">{formatDate(order.shipDate)}</p>
              </div>
            )}
            {order.salesRep && (
              <div>
                <h4 className="font-medium">Sales Representative</h4>
                <p className="text-muted-foreground">{order.salesRep}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Details */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="font-medium">Line Items Total</h4>
              <p className="text-2xl font-bold">{formatCurrency(order.totalLineItemsAmount || '0')}</p>
            </div>
            <div>
              <h4 className="font-medium">Total Tax</h4>
              <p className="text-2xl font-bold">{formatCurrency(order.totalTax || '0')}</p>
            </div>
            <div>
              <h4 className="font-medium">Effective Tax Rate</h4>
              <p className="text-2xl font-bold">{(parseFloat(order.effectiveTaxRate || '0') * 100).toFixed(2)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Line Items */}
      <Suspense fallback={<Card><CardHeader><CardTitle>Loading line items...</CardTitle></CardHeader></Card>}>
        <OrderLineItems orderNumber={orderNumber} />
      </Suspense>
    </div>
  )
}

function LoadingOrderDetails() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
        </div>
        <div className="h-6 bg-muted rounded w-16 animate-pulse"></div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-2">
              <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-32 animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-48 animate-pulse"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { slug } = await params
  
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
                <BreadcrumbLink asChild>
                  <Link href="/orders">Orders</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{slug}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex-1 space-y-6 p-6">
        <Link 
          href="/orders" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>
        
        <Suspense fallback={<LoadingOrderDetails />}>
          <OrderDetails orderNumber={slug} />
        </Suspense>
      </div>
    </>
  )
}