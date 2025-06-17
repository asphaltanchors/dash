import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RecentOrder } from "@/lib/queries"
import { CheckCircle, Clock, XCircle } from "lucide-react"

interface RecentOrdersProps {
  orders: RecentOrder[]
}

function StatusBadge({ status, isPaid }: { status: string; isPaid: boolean }) {
  // Normalize status for consistent display
  const normalizedStatus = status?.toLowerCase() || 'unknown'
  
  // Determine badge variant and icon based on status and payment
  let variant: "default" | "secondary" | "destructive" | "outline" = "default"
  let icon = <Clock className="h-3 w-3" />
  
  if (isPaid) {
    variant = "default"
    icon = <CheckCircle className="h-3 w-3" />
  } else if (normalizedStatus.includes('cancel') || normalizedStatus.includes('void')) {
    variant = "destructive"
    icon = <XCircle className="h-3 w-3" />
  } else if (normalizedStatus.includes('pending') || normalizedStatus.includes('draft')) {
    variant = "secondary"
    icon = <Clock className="h-3 w-3" />
  }

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      {icon}
      {isPaid ? 'Paid' : status || 'Unknown'}
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
                  {order.orderNumber}
                </TableCell>
                <TableCell>
                  <div className="max-w-[200px] truncate">
                    {order.customer}
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
                  ${parseFloat(order.totalAmount).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}