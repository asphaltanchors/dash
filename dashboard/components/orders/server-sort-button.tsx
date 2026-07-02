"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

interface ServerSortButtonProps {
  column: string
  children: React.ReactNode
  currentSortBy?: string
  currentSortOrder?: 'asc' | 'desc'
}

export function ServerSortButton({ 
  column, 
  children, 
  currentSortBy, 
  currentSortOrder 
}: ServerSortButtonProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSort = () => {
    const params = new URLSearchParams(searchParams)
    
    // Determine new sort order
    let newSortOrder: 'asc' | 'desc' = 'desc'
    if (currentSortBy === column) {
      // If clicking the same column, toggle the order
      newSortOrder = currentSortOrder === 'desc' ? 'asc' : 'desc'
    }
    
    params.set('sortBy', column)
    params.set('sortOrder', newSortOrder)
    
    router.replace(`/orders?${params.toString()}`)
  }

  // Determine which icon to show
  const getSortIcon = () => {
    if (currentSortBy !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />
    }
    return currentSortOrder === 'desc' 
      ? <ArrowDown className="ml-2 h-4 w-4" />
      : <ArrowUp className="ml-2 h-4 w-4" />
  }

  return (
    <Button
      variant="ghost"
      onClick={handleSort}
      className={currentSortBy === column ? 'text-accent-foreground' : ''}
    >
      {children}
      {getSortIcon()}
    </Button>
  )
}