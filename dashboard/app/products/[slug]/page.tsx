import { notFound } from 'next/navigation';
import { getProductByName, getProductInventoryStatus, getProductInventoryTrend, getProductMonthlyRevenue } from '@/lib/queries';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, DollarSign, Percent, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { InventoryStatus } from '@/components/inventory/inventory-status';
import { InventoryTrendChart } from '@/components/inventory/inventory-trend-chart';
import { ProductSalesChart } from '@/components/dashboard/ProductSalesChart';
import { Suspense } from 'react';

interface ProductDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Sales trend component
async function ProductSalesSection({ productName }: { productName: string }) {
  const salesData = await getProductMonthlyRevenue(productName);
  return <ProductSalesChart data={salesData} />;
}

// Inventory components
async function ProductInventorySection({ productName }: { productName: string }) {
  const [inventoryStatus, inventoryTrend] = await Promise.all([
    getProductInventoryStatus(productName),
    getProductInventoryTrend(productName)
  ]);

  if (!inventoryStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No inventory data available for this product
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <InventoryStatus inventory={inventoryStatus} />
      <InventoryTrendChart data={inventoryTrend} />
    </div>
  );
}

function SalesChartLoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 bg-gray-200 rounded w-48 animate-pulse mb-2" />
        <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] bg-gray-100 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

function InventoryLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-12 animate-pulse mb-2" />
                <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-gray-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const productName = decodeURIComponent(slug);
  const product = await getProductByName(productName);
  
  if (!product) {
    notFound();
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
                <BreadcrumbPage>{product.itemName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex-1 space-y-4 p-4 md:p-6 pt-6 min-w-0">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{product.itemName}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{product.productFamily}</Badge>
              <Badge variant="outline">{product.itemType}</Badge>
              {product.isKit && (
                <Badge variant="secondary">Kit</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales Price</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(product.salesPrice)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Purchase Cost</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(product.purchaseCost)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Margin %</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                Number(product.marginPercentage) >= 30 
                  ? 'text-green-600' 
                  : Number(product.marginPercentage) >= 15 
                  ? 'text-yellow-600' 
                  : 'text-red-600'
              }`}>
                {product.marginPercentage}%
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Margin Amount</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(product.marginAmount)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium">QuickBooks ID</h4>
                <p className="text-sm text-muted-foreground font-mono">{product.quickBooksInternalId}</p>
              </div>
              <div>
                <h4 className="font-medium">Material Type</h4>
                <p className="text-sm text-muted-foreground">{product.materialType}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Suspense fallback={<SalesChartLoadingSkeleton />}>
          <ProductSalesSection productName={productName} />
        </Suspense>

        <Suspense fallback={<InventoryLoadingSkeleton />}>
          <ProductInventorySection productName={productName} />
        </Suspense>
      </div>
    </>
  );
}