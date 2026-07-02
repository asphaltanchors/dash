// ABOUTME: Search input component for contacts table
// ABOUTME: Handles search functionality with debounced input for contact filtering

"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface SearchInputProps {
  initialValue?: string
}

export function SearchInput({ initialValue = '' }: SearchInputProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(initialValue)

  useEffect(() => {
    setSearchTerm(initialValue)
  }, [initialValue])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      const params = new URLSearchParams(searchParams)
      
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim())
      } else {
        params.delete('search')
      }
      
      // Reset to page 1 when searching
      params.delete('page')
      
      router.push(`/contacts?${params.toString()}`)
    }, 300) // 300ms debounce

    return () => clearTimeout(delayedSearch)
  }, [searchTerm, router, searchParams])

  return (
    <div className="relative w-80">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search contacts by name, email, or company..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-10"
      />
    </div>
  )
}