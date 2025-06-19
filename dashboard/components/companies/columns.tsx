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
          className="hover:underline text-blue-600 font-medium"
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
              score >= 80 ? 'bg-health-excellent text-health-excellent-foreground border-health-excellent' :
              score >= 50 ? 'bg-health-good text-health-good-foreground border-health-good' :
              'bg-health-poor text-health-poor-foreground border-health-poor'
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
      const growthTrend = row.original.growthTrendDirection as string
      const atRisk = row.original.atRiskFlag
      const growthOpp = row.original.growthOpportunityFlag
      
      return (
        <div className="flex items-center gap-1">
          <Badge 
            variant={status === 'Active' || status === 'Highly Active' ? 'outline' : 'secondary'}
            className={
              status === 'Active' || status === 'Highly Active' ? 'bg-status-active text-status-active-foreground border-status-active' : ''
            }
          >
            {status}
          </Badge>
          {growthTrend === 'Growing' && <span className="text-green-600" title="Growing trend">↗️</span>}
          {growthTrend === 'Declining' && <span className="text-red-600" title="Declining trend">↘️</span>}
          {growthTrend === 'Stable' && <span className="text-blue-600" title="Stable trend">➡️</span>}
          {growthTrend === 'New Customer' && <span className="text-purple-600" title="New customer">✨</span>}
          {atRisk && <span className="text-red-600" title="At Risk">⚠️</span>}
          {growthOpp && <span className="text-green-600" title="Growth Opportunity">🎯</span>}
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
            category.includes('High') ? 'bg-revenue-high text-revenue-high-foreground border-revenue-high' :
            category.includes('Medium') ? 'bg-revenue-medium text-revenue-medium-foreground border-revenue-medium' :
            'bg-revenue-low text-revenue-low-foreground border-revenue-low'
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