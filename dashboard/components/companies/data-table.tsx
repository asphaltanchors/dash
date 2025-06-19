"use client"

import * as React from "react"
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createColumns } from "./columns"
import { TopCompany } from "@/lib/queries"

interface DataTableProps {
  data: TopCompany[]
  totalCount: number
  currentPage: number
  pageSize: number
  searchInput?: React.ReactNode
  searchResults?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function DataTable({
  data,
  totalCount,
  currentPage,
  pageSize,
  searchInput,
  searchResults,
  sortBy = 'totalRevenue',
  sortOrder = 'desc',
}: DataTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: sortBy, desc: sortOrder === 'desc' }
  ])

  const columns = createColumns(sortBy, sortOrder)

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    manualSorting: true,
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pageSize),
  })

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    router.replace(`/companies?${params.toString()}`)
  }

  const handleSort = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams)
    params.set('sortBy', newSortBy)
    params.set('sortOrder', newSortOrder)
    params.delete('page') // Reset to page 1 when sorting
    router.replace(`/companies?${params.toString()}`)
  }

  // Handle sorting changes
  React.useEffect(() => {
    if (sorting.length > 0) {
      const sort = sorting[0]
      handleSort(sort.id, sort.desc ? 'desc' : 'asc')
    }
  }, [sorting])

  const totalPages = Math.ceil(totalCount / pageSize)
  const startRow = (currentPage - 1) * pageSize + 1
  const endRow = Math.min(currentPage * pageSize, totalCount)

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        {searchInput}
        {searchResults && (
          <div className="ml-4 text-sm text-muted-foreground">
            {searchResults}
          </div>
        )}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Showing {startRow} to {endRow} of {totalCount} companies
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}