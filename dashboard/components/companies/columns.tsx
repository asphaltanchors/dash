"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { TopCompany } from "@/lib/queries"

export const createColumns = (sortBy?: string, sortOrder?: 'asc' | 'desc'): ColumnDef<TopCompany>[] => [
  {
    accessorKey: "companyName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Company Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return (
        <Link 
          href={`/companies/${encodeURIComponent(row.original.companyDomainKey)}`}
          className="hover:underline text-blue-600 font-medium"
        >
          {row.getValue("companyName")}
        </Link>
      )
    },
  },
  {
    accessorKey: "businessSizeCategory",
    header: "Business Size",
    cell: ({ row }) => {
      return (
        <Badge variant="secondary">
          {row.getValue("businessSizeCategory")}
        </Badge>
      )
    },
  },
  {
    accessorKey: "revenueCategory",
    header: "Revenue Category",
    cell: ({ row }) => {
      const category = row.getValue("revenueCategory") as string
      return (
        <Badge 
          variant={
            category.includes('High') ? 'default' :
            category.includes('Medium') ? 'secondary' : 'outline'
          }
        >
          {category}
        </Badge>
      )
    },
  },
  {
    accessorKey: "totalRevenue",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="justify-end"
        >
          Total Revenue
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalRevenue"))
      return <div className="text-right font-medium">{formatCurrency(amount)}</div>
    },
  },
  {
    accessorKey: "totalOrders",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="justify-end"
        >
          Orders
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="text-right">{row.getValue("totalOrders")}</div>
    },
  },
  {
    accessorKey: "customerCount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="justify-end"
        >
          Customers
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="text-right">{row.getValue("customerCount")}</div>
    },
  },
  {
    accessorKey: "latestOrderDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Latest Order
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div>{row.getValue("latestOrderDate") || 'N/A'}</div>
    },
  },
]