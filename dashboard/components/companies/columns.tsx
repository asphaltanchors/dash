"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { CompanyWithHealth } from "@/lib/queries"

export const createColumns = (): ColumnDef<CompanyWithHealth>[] => [
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
          className="hover:underline text-blue-300 font-medium"
        >
          {row.getValue("companyName")}
        </Link>
      )
    },
  },
  {
    accessorKey: "healthScore",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Health Score
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const score = parseInt(row.getValue("healthScore"))
      return (
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline"
            className={
              score >= 80 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' :
              score >= 50 ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' :
              'border-red-500/30 bg-red-500/10 text-red-200'
            }
          >
            {score}/100
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: "activityStatus",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Activity Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const status = row.getValue("activityStatus") as string
      const atRisk = row.original.atRiskFlag
      const growthOpp = row.original.growthOpportunityFlag
      
      return (
        <div className="flex flex-wrap items-center gap-1">
          <Badge 
            variant={status === 'Active' || status === 'Highly Active' ? 'outline' : 'secondary'}
            className={
              status === 'Active' || status === 'Highly Active' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : ''
            }
          >
            {status}
          </Badge>
          {atRisk && <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-200">risk</Badge>}
          {growthOpp && <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200">growth</Badge>}
        </div>
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
          variant="outline"
          className={
            category.includes('High') ? 'border-violet-500/30 bg-violet-500/10 text-violet-200' :
            category.includes('Medium') ? 'border-blue-500/30 bg-blue-500/10 text-blue-200' :
            'border-slate-700 bg-slate-900/80 text-slate-300'
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
