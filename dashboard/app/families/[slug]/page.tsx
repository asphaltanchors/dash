import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getFamilyDetail, getFamilyProducts, getFamilyTopCustomers } from '@/lib/queries';
import { parseFilters, type FamilyFilters } from '@/lib/filter-utils';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { FamilyMetrics } from '@/components/dashboard/FamilyMetrics';
import { FamilyProductsTable } from '@/components/dashboard/FamilyProductsTable';
import { FamilyCustomersTable } from '@/components/dashboard/FamilyCustomersTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface FamilyPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Family Overview Section
async function FamilyOverview({ familyName, filters }: { familyName: string; filters: FamilyFilters }) {
  const familyDetail = await getFamilyDetail(familyName, filters);
  
  if (!familyDetail) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <FamilyMetrics familyDetail={familyDetail} period={filters.period} />
    </div>
  );
}

// Family Products Section
async function FamilyProductsSection({ familyName, filters }: { familyName: string; filters: FamilyFilters }) {
  const products = await getFamilyProducts(familyName, filters);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Products in Family ({products.length})</CardTitle>
        <CardDescription>
          Products in the {familyName} family with period performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FamilyProductsTable products={products} period={filters.period} />
      </CardContent>
    </Card>
  );
}

// Family Customers Section
async function FamilyCustomersSection({ familyName, filters }: { familyName: string; filters: FamilyFilters }) {
  const customers = await getFamilyTopCustomers(familyName, filters);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Customers ({customers.length})</CardTitle>
        <CardDescription>
          Companies with highest spending on {familyName} family products
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FamilyCustomersTable customers={customers} period={filters.period} />
      </CardContent>
    </Card>
  );
}

// Loading Skeletons
function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function FamilyPage({ params, searchParams }: FamilyPageProps) {
  const { slug } = await params;
  const searchParamsData = await searchParams;
  
  const familyName = decodeURIComponent(slug);
  const filters = parseFilters<FamilyFilters>(searchParamsData);
  
  // Default to 1 year period if no period specified
  if (!filters.period) {
    filters.period = '1y';
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
                <BreadcrumbLink href="/products">Products</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{familyName} Family</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      
      <div className="flex-1 space-y-4 p-4 md:p-6 pt-6 min-w-0">
        {/* Header with Period Selector */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{familyName}</h2>
            <p className="text-muted-foreground">Product family performance and analytics</p>
          </div>
          <PeriodSelector 
            currentPeriod={filters.period || '1y'} 
            filters={filters as Record<string, string | number | boolean | undefined>} 
          />
        </div>

        {/* Family Overview */}
        <Suspense fallback={<MetricsSkeleton />}>
          <FamilyOverview familyName={familyName} filters={filters} />
        </Suspense>
        
        {/* Main Content - Full Width Stacked */}
        <div className="space-y-8">
          {/* Products List */}
          <Suspense fallback={<SectionSkeleton />}>
            <FamilyProductsSection familyName={familyName} filters={filters} />
          </Suspense>
          
          {/* Top Customers */}
          <Suspense fallback={<SectionSkeleton />}>
            <FamilyCustomersSection familyName={familyName} filters={filters} />
          </Suspense>
        </div>
      </div>
    </>
  );
}