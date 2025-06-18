"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock } from "lucide-react"
import { ServerSortButton } from "./server-sort-button"
import { formatCurrency } from "@/lib/utils"

// This type should match your order data structure
export type OrderTableItem = {
  orderNumber: string
  customer: string
  orderDate: string
  totalAmount: string
  status: string
  isPaid: boolean
  dueDate: string | null
  shipDate: string | null
}

function StatusBadge({ status, isPaid }: { status: string; isPaid: boolean }) {
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

export const createColumns = (
  currentSortBy?: string, 
  currentSortOrder?: 'asc' | 'desc'
): ColumnDef<OrderTableItem>[] => [
  {
    accessorKey: "orderNumber",
    header: () => (
      <ServerSortButton 
        column="orderNumber" 
        currentSortBy={currentSortBy}
        currentSortOrder={currentSortOrder}
      >
        Order Number
      </ServerSortButton>
    ),
    cell: ({ row }) => {
      const orderNumber = row.getValue("orderNumber") as string
      return (
        <Link 
          href={`/orders/${encodeURIComponent(orderNumber)}`}
          className="text-blue-600 hover:underline font-medium"
        >
          {orderNumber}
        </Link>
      )
    },
  },
  {
    accessorKey: "customer",
    header: () => (
      <ServerSortButton 
        column="customer" 
        currentSortBy={currentSortBy}
        currentSortOrder={currentSortOrder}
      >
        Customer
      </ServerSortButton>
    ),
    cell: ({ row }) => {
      const customer = row.getValue("customer") as string
      return (
        <div className="max-w-[200px] truncate">
          {customer}
        </div>
      )
    },
  },
  {
    accessorKey: "orderDate",
    header: () => (
      <ServerSortButton 
        column="orderDate" 
        currentSortBy={currentSortBy}
        currentSortOrder={currentSortOrder}
      >
        Order Date
      </ServerSortButton>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("orderDate"))
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const isPaid = row.original.isPaid
      return <StatusBadge status={status} isPaid={isPaid} />
    },
  },
  {
    accessorKey: "isPaid",
    header: "Payment",
    cell: ({ row }) => {
      const isPaid = row.getValue("isPaid") as boolean
      return (
        <Badge variant={isPaid ? "default" : "secondary"}>
          {isPaid ? "Paid" : "Unpaid"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "totalAmount",
    header: () => (
      <div className="text-right">
        <ServerSortButton 
          column="totalAmount" 
          currentSortBy={currentSortBy}
          currentSortOrder={currentSortOrder}
        >
          Amount
        </ServerSortButton>
      </div>
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalAmount"))
      return <div className="text-right font-medium">{formatCurrency(amount)}</div>
    },
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => {
      const dueDate = row.getValue("dueDate") as string | null
      if (!dueDate) return <span className="text-muted-foreground">-</span>
      
      const date = new Date(dueDate)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    },
  },
  {
    accessorKey: "shipDate",
    header: "Ship Date",
    cell: ({ row }) => {
      const shipDate = row.getValue("shipDate") as string | null
      if (!shipDate) return <span className="text-muted-foreground">-</span>
      
      const date = new Date(shipDate)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const order = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(order.orderNumber)}
            >
              Copy order number
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/orders/${encodeURIComponent(order.orderNumber)}`}>
                View order details
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]