import { Suspense } from 'react';
import { getCompaniesWithHealth } from '@/lib/queries';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DataTable } from "@/components/companies/data-table";
import { SearchInput } from "@/components/companies/search-input";

interface CompaniesPageProps {
  searchParams: Promise<{ 
    search?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    page?: string
    activityStatus?: string
    businessSize?: string
    revenueCategory?: string
    healthCategory?: string
  }>
}

async function CompaniesTable({ 
  searchTerm, 
  sortBy, 
  sortOrder,
  page,
  filters
}: { 
  searchTerm: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  page: number
  filters: {
    activityStatus?: string
    businessSize?: string
    revenueCategory?: string
    healthCategory?: string
  }
}) {
  // Server-side search and sorting - only fetch relevant results
  const { companies, totalCount } = await getCompaniesWithHealth(page, 50, searchTerm, sortBy, sortOrder, filters)
  
  return (
    <DataTable 
      data={companies}
      totalCount={totalCount}
      currentPage={page}
      pageSize={50}
      searchInput={<SearchInput initialValue={searchTerm} />}
      searchResults={searchTerm ? `${totalCount} companies found for "${searchTerm}"` : undefined}
      sortBy={sortBy}
      sortOrder={sortOrder}
    />
  )
}

function LoadingTable() {
  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <div className="h-10 bg-muted rounded w-80 animate-pulse"></div>
        <div className="ml-auto h-10 bg-muted rounded w-24 animate-pulse"></div>
      </div>
      <div className="rounded-md border bg-card">
        <div className="h-12 bg-muted/20 border-b animate-pulse"></div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex space-x-4">
              <div className="h-4 bg-muted rounded flex-1 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="h-8 bg-muted rounded w-32 animate-pulse"></div>
        <div className="h-8 bg-muted rounded w-20 animate-pulse"></div>
        <div className="h-8 bg-muted rounded w-16 animate-pulse"></div>
      </div>
    </div>
  )
}

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const { search, sortBy, sortOrder, page, activityStatus, businessSize, revenueCategory, healthCategory } = await searchParams
  const searchTerm = search || ''
  const currentSortBy = sortBy || 'totalRevenue'
  const currentSortOrder = sortOrder || 'desc'
  const currentPage = parseInt(page || '1', 10)
  
  const filters = {
    activityStatus: activityStatus || undefined,
    businessSize: businessSize || undefined,
    revenueCategory: revenueCategory || undefined,
    healthCategory: healthCategory || undefined,
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Companies</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
            <p className="text-muted-foreground">
              Search and manage all corporate customers (excludes individual email domains)
            </p>
          </div>
        </div>
        
        <Suspense fallback={<LoadingTable />} key={`${searchTerm}-${currentSortBy}-${currentSortOrder}-${JSON.stringify(filters)}`}>
          <CompaniesTable 
            searchTerm={searchTerm}
            sortBy={currentSortBy}
            sortOrder={currentSortOrder}
            page={currentPage}
            filters={filters}
          />
        </Suspense>
      </div>
    </>
  );
}