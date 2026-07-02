"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface SearchInputProps {
  initialValue: string
}

export function SearchInput({ initialValue }: SearchInputProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams)
    
    if (term) {
      params.set('search', term)
    } else {
      params.delete('search')
    }
    
    router.replace(`/companies?${params.toString()}`)
  }, 300)

  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search by company name or domain..."
        defaultValue={initialValue}
        onChange={(e) => handleSearch(e.target.value)}
        className="pl-10"
      />
    </div>
  )
}