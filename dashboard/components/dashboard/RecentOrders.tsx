import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RecentOrder } from "@/lib/queries"
import { CheckCircle, Clock } from "lucide-react"
import Link from "next/link"
import { formatCurrency, shouldShowCompanyLink } from "@/lib/utils"

interface RecentOrdersProps {
  orders: RecentOrder[]
}

function StatusBadge({ status }: { status: string; isPaid: boolean }) {
  // Direct status matching with standardized DBT values: PAID, OPEN, PARTIALLY_PAID
  let variant: "default" | "secondary" | "destructive" | "outline" = "default"
  let icon = <Clock className="h-3 w-3" />
  
  if (status === 'PAID') {
    variant = "default"
    icon = <CheckCircle className="h-3 w-3" />
  } else if (status === 'OPEN') {
    variant = "secondary"
    icon = <Clock className="h-3 w-3" />
  } else if (status === 'PARTIALLY_PAID') {
    variant = "outline"
    icon = <Clock className="h-3 w-3" />
  }

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      {icon}
      {status}
    </Badge>
  )
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
        <CardDescription>
          Latest {orders.length} orders from your store
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order, index) => (
              <TableRow key={`${order.orderNumber}-${index}`}>
                <TableCell className="font-medium">
                  <Link 
                    href={`/orders/${encodeURIComponent(order.orderNumber)}`}
                    className="text-blue-600 hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="max-w-[200px] truncate">
                    {shouldShowCompanyLink(order.companyDomain, order.isIndividualCustomer) ? (
                      <Link 
                        href={`/companies/${encodeURIComponent(order.companyDomain!)}`}
                        className="text-blue-600 hover:underline"
                      >
                        {order.customer}
                      </Link>
                    ) : (
                      order.customer
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {new Date(order.orderDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell>
                  <StatusBadge status={order.status} isPaid={order.isPaid} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(order.totalAmount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}