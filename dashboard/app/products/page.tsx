import { 
  getProductMetrics, 
  getProducts, 
  getProductFamilyBreakdown, 
  getMarginDistribution 
} from '@/lib/queries';
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
import { Package, TrendingUp, DollarSign, Boxes } from 'lucide-react';
import { ProductsTable } from '@/components/dashboard/ProductsTable';
import { ProductFamilyChart } from '@/components/dashboard/ProductFamilyChart';
import { MarginDistributionChart } from '@/components/dashboard/MarginDistributionChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

async function ProductMetrics() {
  const metrics = await getProductMetrics();
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        formatValue={(value) => `$${value}`}
      />
      <MetricCard
        title="Kit Products"
        value={metrics.kitProducts.toString()}
        icon={Boxes}
        formatValue={(value) => value}
      />
    </div>
  );
}

async function ProductCharts() {
  const [familyBreakdown, marginDistribution] = await Promise.all([
    getProductFamilyBreakdown(),
    getMarginDistribution()
  ]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ProductFamilyChart data={familyBreakdown} />
      <MarginDistributionChart data={marginDistribution} />
    </div>
  );
}

async function ProductsList() {
  const products = await getProducts(50);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Products</CardTitle>
        <CardDescription>
          Top products by margin amount
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProductsTable products={products} />
      </CardContent>
    </Card>
  );
}


export default function ProductsPage() {
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
        </div>

        <ProductMetrics />
        <ProductCharts />
        <ProductsList />
      </div>
    </>
  );
}