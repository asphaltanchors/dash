// ABOUTME: Server-side sort button component for contacts table
// ABOUTME: Handles column sorting with visual indicators for current sort state

"use client"

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"

interface ServerSortButtonProps {
  column: string
  label: string
}

export function ServerSortButton({ column, label }: ServerSortButtonProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const currentSortBy = searchParams.get('sortBy')
  const currentSortOrder = searchParams.get('sortOrder') || 'desc'
  const isCurrentColumn = currentSortBy === column

  const handleSort = () => {
    const params = new URLSearchParams(searchParams)
    
    let newSortOrder: 'asc' | 'desc' = 'desc'
    
    if (isCurrentColumn) {
      // Toggle sort order if clicking the same column
      newSortOrder = currentSortOrder === 'desc' ? 'asc' : 'desc'
    } else {
      // Default to desc for new column (revenue-focused)
      newSortOrder = column === 'fullName' || column === 'primaryEmail' || column === 'companyName' ? 'asc' : 'desc'
    }
    
    params.set('sortBy', column)
    params.set('sortOrder', newSortOrder)
    params.delete('page') // Reset to page 1 when sorting
    
    router.push(`/contacts?${params.toString()}`)
  }

  const getSortIcon = () => {
    if (!isCurrentColumn) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />
    }
    
    return currentSortOrder === 'desc' 
      ? <ArrowDown className="ml-2 h-4 w-4" />
      : <ArrowUp className="ml-2 h-4 w-4" />
  }

  return (
    <Button
      variant="ghost"  
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={handleSort}
    >
      <span>{label}</span>
      {getSortIcon()}
    </Button>
  )
}