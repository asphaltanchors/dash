import { 
  getProductMetrics, 
  getProducts,
  getFamilySales
} from '@/lib/queries';
import { parseFilters, type ProductFilters } from '@/lib/filter-utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Package, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ProductsTable } from '@/components/dashboard/ProductsTable';
import { FamilySalesCard } from '@/components/dashboard/FamilySalesCard';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

async function ProductMetrics() {
  const metrics = await getProductMetrics();
  
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MetricCard
        title="Total Products"
        value={metrics.totalProducts.toString()}
        icon={Package}
        formatValue={(value) => value}
      />
      <MetricCard
        title="Average Margin"
        value={metrics.averageMargin}
        icon={TrendingUp}
        formatValue={(value) => `${value}%`}
      />
      <MetricCard
        title="Inventory Value"
        value={metrics.totalInventoryValue}
        icon={DollarSign}
        formatValue={(value) => formatCurrency(value, { showCents: false })}
      />
    </div>
  );
}


async function FamilySalesSection({ filters }: { filters: ProductFilters }) {
  const familySales = await getFamilySales(filters);
  
  return <FamilySalesCard familySales={familySales} period={filters.period} />;
}

async function ProductsList({ filters }: { filters: ProductFilters }) {
  const products = await getProducts(50, filters);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Products</CardTitle>
        <CardDescription>
          Top products by revenue in selected period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProductsTable products={products} />
      </CardContent>
    </Card>
  );
}


interface ProductsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const filters = parseFilters<ProductFilters>(params);
  
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
                <BreadcrumbPage>Products</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex-1 space-y-4 p-4 md:p-6 pt-6 min-w-0">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Products</h2>
          <PeriodSelector currentPeriod={filters.period || '1y'} filters={filters as Record<string, string | number | boolean | undefined>} />
        </div>

        <ProductMetrics />
        <FamilySalesSection filters={filters} />
        <ProductsList filters={filters} />
      </div>
    </>
  );
}