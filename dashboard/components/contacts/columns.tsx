// ABOUTME: Column definitions for contacts data table
// ABOUTME: Defines how contact records are displayed in the table component

"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Contact } from "@/lib/queries/contacts"
import { ServerSortButton } from "@/components/contacts/server-sort-button"

function formatRevenue(revenue: number | null): string {
  if (!revenue) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(revenue)
}

function formatOrders(orders: string | null): string {
  if (!orders) return '0'
  return Number(orders).toLocaleString()
}

export const columns: ColumnDef<Contact>[] = [
  {
    accessorKey: "fullName",
    header: () => (
      <ServerSortButton column="fullName" label="Name" />
    ),
    cell: ({ row }) => {
      const fullName = row.getValue("fullName") as string
      const jobTitle = row.original.jobTitle
      const isPrimary = row.original.isPrimaryCompanyContact
      
      return (
        <div className="space-y-1">
          <div className="font-medium flex items-center gap-2">
            {fullName || 'Unknown'}
            {isPrimary && (
              <Badge variant="outline" className="text-xs">Primary</Badge>
            )}
          </div>
          {jobTitle && (
            <div className="text-sm text-muted-foreground">{jobTitle}</div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "primaryEmail",
    header: () => (
      <ServerSortButton column="primaryEmail" label="Email" />
    ),
    cell: ({ row }) => {
      const email = row.getValue("primaryEmail") as string
      const emailMarketable = row.original.emailMarketable
      
      return (
        <div className="space-y-1">
          <div className="font-mono text-sm">{email || 'No email'}</div>
          {emailMarketable && (
            <Badge variant="secondary" className="text-xs">Marketable</Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "companyName",
    header: () => (
      <ServerSortButton column="companyName" label="Company" />
    ),
    cell: ({ row }) => {
      const companyName = row.getValue("companyName") as string
      const businessSize = row.original.businessSizeCategory
      
      return (
        <div className="space-y-1">
          <div className="font-medium">{companyName || 'Unknown'}</div>
          {businessSize && (
            <div className="text-sm text-muted-foreground">{businessSize}</div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "contactRole",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("contactRole") as string
      const tier = row.original.contactTier
      const keyAccount = row.original.keyAccountContact
      
      return (
        <div className="space-y-1">
          <div className="capitalize">{role || 'Unknown'}</div>
          <div className="flex gap-1">
            {tier && (
              <Badge variant="outline" className="text-xs capitalize">{tier}</Badge>
            )}
            {keyAccount && (
              <Badge variant="default" className="text-xs">Key Account</Badge>
            )}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "companyTotalRevenue",
    header: () => (
      <ServerSortButton column="companyTotalRevenue" label="Company Revenue" />
    ),
    cell: ({ row }) => {
      const revenue = row.getValue("companyTotalRevenue") as number
      const orders = row.original.companyTotalOrders
      const revenueCategory = row.original.revenueCategory
      
      return (
        <div className="space-y-1 text-right">
          <div className="font-medium">{formatRevenue(revenue)}</div>
          <div className="text-sm text-muted-foreground">
            {formatOrders(orders)} orders
          </div>
          {revenueCategory && (
            <Badge variant="secondary" className="text-xs">{revenueCategory}</Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "contactDataQuality",
    header: "Data Quality",
    cell: ({ row }) => {
      const quality = row.getValue("contactDataQuality") as string
      const phone = row.original.primaryPhone
      
      let variant: "default" | "secondary" | "destructive" | "outline" = "outline"
      if (quality === 'complete') variant = "default"
      if (quality === 'partial') variant = "secondary"
      if (quality === 'minimal') variant = "destructive"
      
      return (
        <div className="space-y-1">
          <Badge variant={variant} className="text-xs capitalize">
            {quality || 'Unknown'}
          </Badge>
          {phone && (
            <div className="text-xs text-muted-foreground font-mono">{phone}</div>
          )}
        </div>
      )
    },
  },
]