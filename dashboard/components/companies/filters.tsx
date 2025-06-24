// ABOUTME: Filter component for companies table with dropdowns for activity status, business size, revenue category, and health category
// ABOUTME: Manages URL parameters for filter state and provides reset functionality

"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Filter, RotateCcw } from 'lucide-react'

interface FiltersProps {
  className?: string
}

const ACTIVITY_STATUS_OPTIONS = [
  'Highly Active',
  'Moderately Active',
  'Active',
  'Dormant',
  'Inactive'
]

const BUSINESS_SIZE_OPTIONS = [
  'Single Location',
  'Small Multi-Location',
  'Medium Multi-Location', 
  'Large Multi-Location'
]

const REVENUE_CATEGORY_OPTIONS = [
  'No Revenue',
  'Low Value (<$5K)',
  'Growing Value ($5K-$25K)',
  'Medium Value ($25K-$100K)',
  'High Value ($100K+)'
]

const HEALTH_CATEGORY_OPTIONS = [
  'Critical Health',
  'Poor Health', 
  'Fair Health',
  'Good Health',
  'Excellent Health'
]

const COUNTRY_OPTIONS = [
  'Australia',
  'Canada', 
  'Germany',
  'Israel',
  'Italy',
  'Lithuania',
  'New Zealand',
  'Norway',
  'Romania',
  'Saudi Arabia',
  'Slovenia',
  'Spain',
  'Sweden',
  'Trinidad',
  'UAE',
  'United Kingdom',
  'United States'
]

const HEALTH_CATEGORY_COLORS = {
  'Critical Health': 'destructive',
  'Poor Health': 'destructive',
  'Fair Health': 'secondary',
  'Good Health': 'default',
  'Excellent Health': 'default'
} as const

export function CompaniesFilters({ className }: FiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activityStatus = searchParams.get('activityStatus') || ''
  const businessSize = searchParams.get('businessSize') || ''
  const revenueCategory = searchParams.get('revenueCategory') || ''
  const healthCategory = searchParams.get('healthCategory') || ''
  const country = searchParams.get('country') || ''

  const hasActiveFilters = activityStatus || businessSize || revenueCategory || healthCategory || country

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams)
    
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    
    // Reset to page 1 when filtering
    params.delete('page')
    
    router.push(`/companies?${params.toString()}`)
  }

  const clearAllFilters = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('activityStatus')
    params.delete('businessSize')
    params.delete('revenueCategory')
    params.delete('healthCategory')
    params.delete('country')
    params.delete('page')
    router.push(`/companies?${params.toString()}`)
  }

  const removeFilter = (key: string) => {
    updateFilter(key, null)
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        <Select value={activityStatus} onValueChange={(value) => updateFilter('activityStatus', value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Activity Status" />
          </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {ACTIVITY_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        <Select value={businessSize} onValueChange={(value) => updateFilter('businessSize', value)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Business Size" />
          </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sizes</SelectItem>
              {BUSINESS_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        <Select value={revenueCategory} onValueChange={(value) => updateFilter('revenueCategory', value)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Revenue Category" />
          </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Revenue</SelectItem>
              {REVENUE_CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        <Select value={healthCategory} onValueChange={(value) => updateFilter('healthCategory', value)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Health Score" />
          </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Health</SelectItem>
              {HEALTH_CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        <Select value={country} onValueChange={(value) => updateFilter('country', value)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {COUNTRY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="h-9"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">Active:</span>
          
          {activityStatus && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {activityStatus}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => removeFilter('activityStatus')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {businessSize && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {businessSize}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => removeFilter('businessSize')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {revenueCategory && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {revenueCategory}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => removeFilter('revenueCategory')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {healthCategory && (
            <Badge 
              variant={HEALTH_CATEGORY_COLORS[healthCategory as keyof typeof HEALTH_CATEGORY_COLORS] || 'secondary'} 
              className="gap-1 text-xs"
            >
              {healthCategory}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => removeFilter('healthCategory')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {country && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {country}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => removeFilter('country')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}