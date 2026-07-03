import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getProductByName,
  getProductInboundLines,
  getProductInventoryStatus,
  getProductInventoryTrend,
  getProductMonthlyRevenue,
  getProductPriceDistribution,
  getProductReorderPlanningDetail,
  type ProductInboundLine,
  type ProductReorderPlanningDetail,
} from '@/lib/queries';
import { getTopCompaniesForProduct } from '@/lib/queries/companies';
import { parseFilters, type ProductDetailFilters } from '@/lib/filter-utils';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  ClipboardList,
  DollarSign,
  Package,
  ShoppingCart,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { InventoryStatus } from '@/components/inventory/inventory-status';
import { InventoryTrendChart } from '@/components/inventory/inventory-trend-chart';
import { ProductSalesChart } from '@/components/dashboard/ProductSalesChart';
import { TopCompaniesTable } from '@/components/dashboard/TopCompaniesTable';
import { ProductPriceDistributionChart } from '@/components/dashboard/ProductPriceDistributionChart';

interface ProductDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

type ProductView = 'planning' | 'sales' | 'customers' | 'pricing' | 'details';

const views: Array<{ key: ProductView; label: string }> = [
  { key: 'planning', label: 'Planning' },
  { key: 'sales', label: 'Sales' },
  { key: 'customers', label: 'Customers' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'details', label: 'Details' },
];

const actionClasses = {
  OUT_OF_STOCK: 'border-red-300 bg-red-50 text-red-800',
  BUY: 'border-blue-300 bg-blue-50 text-blue-800',
  REVIEW: 'border-amber-300 bg-amber-50 text-amber-800',
  WATCH: 'border-orange-300 bg-orange-50 text-orange-800',
  OK: 'border-green-300 bg-green-50 text-green-800',
};

function searchValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function selectedView(value: string | undefined): ProductView {
  return views.some((view) => view.key === value) ? value as ProductView : 'planning';
}

function formatInteger(value: string | number | null | undefined): string {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatDecimal(value: string | number | null | undefined, digits = 1): string {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function readableCode(value: string): string {
  if (!value) return '-';
  return value.replaceAll('_', ' ').replace(/\bsku\b/gi, 'SKU').replace(/\bfba\b/gi, 'FBA');
}

function buildHref(view: ProductView, filters: ProductDetailFilters): string {
  const params = new URLSearchParams();
  params.set('view', view);

  if (filters.period) {
    params.set('period', filters.period);
  }

  return `?${params.toString()}`;
}

function metricTone(value: number): string {
  if (value <= 0) return 'text-red-600';
  return '';
}

function compactInboundLabel(planning: ProductReorderPlanningDetail | null): string {
  if (!planning) return 'none';

  const labels = [];
  if (Number(planning.inboundOpenPoQty) > 0) {
    labels.push(`${formatInteger(planning.inboundOpenPoQty)} PO`);
  }
  if (Number(planning.futureReceiptQty) > 0) {
    labels.push(`${formatInteger(planning.futureReceiptQty)} future receipt`);
  }

  return labels.length > 0 ? labels.join(' + ') : 'none';
}

function operationalBuyQty(planning: ProductReorderPlanningDetail): number {
  if (planning.sixPackUnitsPerLayer && Number(planning.layerRoundedBuyQty) > 0) {
    return Number(planning.layerRoundedBuyQty);
  }

  return Number(planning.suggestedBuyQty);
}

function operationalBuyLabel(planning: ProductReorderPlanningDetail): string {
  if (Number(planning.suggestedBuyQty) <= 0) return 'No buy';

  if (planning.sixPackUnitsPerLayer) {
    return `${formatInteger(planning.reorderLayerCount)} layer${Number(planning.reorderLayerCount) === 1 ? '' : 's'}`;
  }

  return `${formatInteger(planning.suggestedBuyQty)} units`;
}

function operationalBuyDetail(planning: ProductReorderPlanningDetail): string {
  if (Number(planning.suggestedBuyQty) <= 0) return planning.recommendationReason;

  if (!planning.sixPackUnitsPerLayer) {
    return `${formatInteger(planning.suggestedBuyQty)} model units`;
  }

  return `${formatInteger(planning.layerRoundedBuyQty)} units after ${planning.sixPackUnitsPerLayer}-unit layer rounding`;
}

function HeaderMetric({
  label,
  value,
  detail,
  icon: Icon,
  valueClassName,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: typeof Package;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-md border bg-card px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-xs text-muted-foreground">{label}</div>
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </div>
      <div className={`mt-1 truncate font-mono text-lg font-semibold ${valueClassName || ''}`}>
        {value}
      </div>
      {detail && <div className="truncate text-xs text-muted-foreground">{detail}</div>}
    </div>
  );
}

function ViewTabs({ currentView, filters }: { currentView: ProductView; filters: ProductDetailFilters }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-md border bg-muted/40 p-1">
      {views.map((view) => (
        <Link
          key={view.key}
          href={buildHref(view.key, filters)}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            currentView === view.key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
          }`}
        >
          {view.label}
        </Link>
      ))}
    </div>
  );
}

function ProductCommandHeader({
  product,
  planning,
}: {
  product: Awaited<ReturnType<typeof getProductByName>>;
  planning: ProductReorderPlanningDetail | null;
}) {
  if (!product) return null;

  const onHand = planning?.onHandQty ?? '0';
  const action = planning?.action ?? 'OK';
  const buyQty = planning ? operationalBuyQty(planning) : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h2 className="break-words font-mono text-2xl font-bold tracking-tight md:text-3xl">
            {product.itemName}
          </h2>
          <p className="max-w-4xl text-sm text-muted-foreground">
            {product.salesDescription || 'No product description available'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{product.productFamily}</Badge>
            <Badge variant="outline">{product.materialType}</Badge>
            <Badge variant="outline">{product.itemType}</Badge>
            {product.isKit && <Badge variant="secondary">Kit</Badge>}
            {planning && (
              <Badge variant="outline" className={actionClasses[action]}>
                {readableCode(action)}
              </Badge>
            )}
          </div>
        </div>
        {planning && (
          <div className="rounded-md border bg-card px-3 py-2 text-right">
            <div className="text-xs text-muted-foreground">Recommendation</div>
            <div className={buyQty > 0 ? 'font-semibold text-blue-700' : 'font-semibold'}>
              {operationalBuyLabel(planning)}
            </div>
            <div className="text-xs text-muted-foreground">{operationalBuyDetail(planning)}</div>
          </div>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <HeaderMetric
          label="On Hand"
          value={formatInteger(onHand)}
          detail={planning?.inventoryAsOfDate ? `as of ${planning.inventoryAsOfDate}` : undefined}
          icon={Package}
          valueClassName={metricTone(Number(onHand))}
        />
        <HeaderMetric
          label="Position"
          value={planning ? formatInteger(planning.availablePositionQty) : '-'}
          detail={planning?.positionDays ? `${planning.positionDays} days` : undefined}
          icon={Boxes}
        />
        <HeaderMetric
          label="Inbound"
          value={compactInboundLabel(planning)}
          detail={planning?.nextOpenPoDate ? `next ${planning.nextOpenPoDate}` : undefined}
          icon={ShoppingCart}
        />
        <HeaderMetric
          label="Forecast"
          value={planning ? `${formatDecimal(planning.forecastDailyQty)}/day` : '-'}
          detail={planning ? `${formatInteger(planning.forecastMonthlyQty)}/mo` : undefined}
          icon={BarChart3}
        />
        <HeaderMetric
          label="Reorder By"
          value={planning?.reorderByDate || '-'}
          detail={planning?.expectedReceiptDate ? `receipt ${planning.expectedReceiptDate}` : undefined}
          icon={ClipboardList}
        />
        <HeaderMetric
          label="Buy Cost"
          value={planning ? formatCurrency(operationalBuyQty(planning) * Number(planning.purchaseCost), { showCents: false }) : '-'}
          detail={planning ? `${formatCurrency(planning.purchaseCost)} each` : undefined}
          icon={DollarSign}
        />
      </div>
    </div>
  );
}

function PlanningSummary({ planning }: { planning: ProductReorderPlanningDetail }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Buy Decision</CardTitle>
          <CardDescription>{planning.recommendationReason}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HeaderMetric
            label="Recommended Buy"
            value={operationalBuyLabel(planning)}
            detail={operationalBuyDetail(planning)}
            icon={ClipboardList}
            valueClassName={operationalBuyQty(planning) > 0 ? 'text-blue-700' : ''}
          />
          <HeaderMetric
            label="Model Quantity"
            value={formatInteger(planning.suggestedBuyQty)}
            detail={`${formatInteger(planning.rawReorderQty)} raw model units`}
            icon={Package}
          />
          <HeaderMetric
            label="Reorder Point"
            value={formatInteger(planning.reorderPointQty)}
            detail={`${formatInteger(planning.safetyStockQty)} safety stock`}
            icon={AlertTriangle}
          />
          <HeaderMetric
            label="Target Coverage"
            value={`${planning.targetCoverageDays} days`}
            detail={`${planning.assumedLeadTimeDays}d lead time`}
            icon={BarChart3}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Forecast Basis</CardTitle>
          <CardDescription>{readableCode(planning.forecastModelDetail)}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Baseline</div>
            <div className="font-mono font-medium">{formatInteger(planning.skuBaselineMonthlyQty)}/mo</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Seasonality</div>
            <div className="font-mono font-medium">{planning.appliedSeasonalityIndex}x</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Growth</div>
            <div className="font-mono font-medium">{planning.appliedGrowthFactor}x</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Confidence</div>
            <div className="font-medium">{readableCode(planning.confidenceLevel)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">90D Sales</div>
            <div className="font-mono font-medium">{formatInteger(planning.totalSalesQty90d)} units</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Sales Days</div>
            <div className="font-mono font-medium">{planning.daysWithSales90d} of 90</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReorderReasoning({ planning }: { planning: ProductReorderPlanningDetail }) {
  const layerText = planning.sixPackUnitsPerLayer
    ? `Because this SKU has a ${planning.sixPackUnitsPerLayer}-unit layer multiple, ${formatInteger(planning.suggestedBuyQty)} model units rounds to ${formatInteger(planning.layerRoundedBuyQty)} units, or ${formatInteger(planning.reorderLayerCount)} layer${Number(planning.reorderLayerCount) === 1 ? '' : 's'}.`
    : `No layer multiple is configured, so the operational buy remains ${formatInteger(planning.suggestedBuyQty)} units.`;

  const steps = [
    `Start with ${formatInteger(planning.onHandQty)} units on hand from the ${planning.inventoryAsOfDate} inventory snapshot.`,
    `Add inbound supply for planning: ${formatInteger(planning.inboundOpenPoQty)} open PO units and ${formatInteger(planning.futureReceiptQty)} future receipt units. Only ${formatInteger(planning.inboundQtyByExpectedReceiptDate)} inbound units are expected by the modeled receipt date.`,
    `Subtract committed future demand: ${formatInteger(planning.committedDemandQty)} total units, including ${formatInteger(planning.committedDemandBeforeExpectedReceiptQty)} units due before the expected receipt date.`,
    `Forecast demand at ${formatDecimal(planning.forecastDailyQty)} units/day using ${readableCode(planning.forecastModelDetail)}. That is built from a ${formatInteger(planning.skuBaselineMonthlyQty)}/month baseline, ${planning.appliedSeasonalityIndex}x seasonality, and ${planning.appliedGrowthFactor}x growth factor.`,
    `Use ${planning.assumedLeadTimeDays} lead-time days from ${readableCode(planning.leadTimeSource)}, making the expected receipt date ${planning.expectedReceiptDate || 'unknown'}. Lead-time demand is ${formatInteger(planning.forecastLeadTimeQty)} units.`,
    `Set safety stock to ${formatInteger(planning.safetyStockQty)} units and reorder point to ${formatInteger(planning.reorderPointQty)} units.`,
    `Project the position at expected receipt before a new order at ${formatInteger(planning.projectedPositionAtExpectedReceiptQty)} units. The model sees ${formatInteger(planning.uncoveredLeadTimeDemandQty)} units of possible lead-time gap.`,
    `Target ${planning.targetCoverageDays} days of coverage after receipt, which produces ${formatInteger(planning.rawReorderQty)} raw units and ${formatInteger(planning.suggestedBuyQty)} recommended model units.`,
    layerText,
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Why This Recommendation</CardTitle>
        <CardDescription>A step-by-step readout of the reorder calculation.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2 text-sm">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-muted font-mono text-xs">
                {index + 1}
              </span>
              <span className="pt-0.5 text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function InboundDetails({ planning, inboundLines }: { planning: ProductReorderPlanningDetail; inboundLines: ProductInboundLine[] }) {
  const openPoLines = inboundLines.filter((line) => line.inboundType === 'OPEN_PO');
  const futureReceiptLines = inboundLines.filter((line) => line.inboundType === 'FUTURE_RECEIPT');

  function renderRows(lines: ProductInboundLine[]) {
    if (lines.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
            No lines found.
          </TableCell>
        </TableRow>
      );
    }

    return lines.map((line) => (
      <TableRow key={line.inboundLineId}>
        <TableCell className="font-mono text-sm">{line.documentNumber || '-'}</TableCell>
        <TableCell>{line.vendor || '-'}</TableCell>
        <TableCell>{line.documentDate || '-'}</TableCell>
        <TableCell>{line.expectedOrReceiptDate || '-'}</TableCell>
        <TableCell className="text-right font-mono">{formatInteger(line.quantity)}</TableCell>
        <TableCell className="text-right font-mono">{Number(line.rate) ? formatCurrency(line.rate) : '-'}</TableCell>
        <TableCell className="text-right font-mono">{Number(line.amount) ? formatCurrency(line.amount) : '-'}</TableCell>
      </TableRow>
    ));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Inbound Detail</CardTitle>
            <CardDescription>
              {compactInboundLabel(planning)} across {planning.openPoLineCount + planning.futureReceiptLineCount} source lines.
            </CardDescription>
          </div>
          <Badge variant="outline">
            {formatInteger(planning.availablePositionQty)} available position
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold">Open Purchase Orders</h4>
            <span className="text-xs text-muted-foreground">
              {formatInteger(planning.inboundOpenPoQty)} units, {planning.openPoLineCount} lines
            </span>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>PO Date</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderRows(openPoLines)}</TableBody>
            </Table>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold">Future Receipts</h4>
            <span className="text-xs text-muted-foreground">
              {formatInteger(planning.futureReceiptQty)} units, {planning.futureReceiptLineCount} lines
            </span>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Doc Date</TableHead>
                  <TableHead>Receipt Date</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderRows(futureReceiptLines)}</TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NoPlanningData() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Planning</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="py-8 text-center text-muted-foreground">
          No inventory planning recommendation exists for this SKU.
        </div>
      </CardContent>
    </Card>
  );
}

async function PlanningView({ productName, planning }: { productName: string; planning: ProductReorderPlanningDetail | null }) {
  if (!planning) return <NoPlanningData />;

  const [inboundLines, inventoryTrend] = await Promise.all([
    getProductInboundLines(productName),
    getProductInventoryTrend(productName),
  ]);

  return (
    <div className="space-y-4">
      <PlanningSummary planning={planning} />
      <ReorderReasoning planning={planning} />
      <InboundDetails planning={planning} inboundLines={inboundLines} />
      <InventoryTrendChart data={inventoryTrend} />
    </div>
  );
}

async function SalesView({ productName, filters }: { productName: string; filters: ProductDetailFilters }) {
  const salesData = await getProductMonthlyRevenue(productName, filters);
  return <ProductSalesChart data={salesData} />;
}

async function CustomersView({ productName, filters }: { productName: string; filters: ProductDetailFilters }) {
  const topCompanies = await getTopCompaniesForProduct(productName, 10, filters);
  return <TopCompaniesTable data={topCompanies} productName={productName} />;
}

async function PricingView({ productName, filters }: { productName: string; filters: ProductDetailFilters }) {
  const priceDistribution = await getProductPriceDistribution(productName, filters);
  return <ProductPriceDistributionChart data={priceDistribution} />;
}

async function DetailsView({
  productName,
  product,
}: {
  productName: string;
  product: NonNullable<Awaited<ReturnType<typeof getProductByName>>>;
}) {
  const inventoryStatus = await getProductInventoryStatus(productName);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Product Data</CardTitle>
          <CardDescription>Catalog fields and current pricing from QuickBooks.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">QuickBooks ID</div>
            <div className="font-mono font-medium">{product.quickBooksInternalId}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Sales Price</div>
            <div className="font-mono font-medium">{formatCurrency(product.salesPrice)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Purchase Cost</div>
            <div className="font-mono font-medium">{formatCurrency(product.purchaseCost)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Margin</div>
            <div className="font-mono font-medium">
              {product.actualMarginPercentage || product.marginPercentage}% / {formatCurrency(product.actualMarginAmount || product.marginAmount)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Product Family</div>
            <div className="font-medium">{product.productFamily}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Material Type</div>
            <div className="font-medium">{product.materialType}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Item Type</div>
            <div className="font-medium">{product.itemType}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Trailing Sales</div>
            <div className="font-mono font-medium">
              {formatCurrency(product.periodSales, { showCents: false })}, {product.periodUnits.toLocaleString()} units
            </div>
          </div>
        </CardContent>
      </Card>

      {inventoryStatus ? <InventoryStatus inventory={inventoryStatus} /> : (
        <Card>
          <CardHeader>
            <CardTitle>Inventory Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center text-muted-foreground">
              No inventory data available for this product.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default async function ProductDetailPage({ params, searchParams }: ProductDetailPageProps) {
  const { slug } = await params;
  const productName = decodeURIComponent(slug);
  const product = await getProductByName(productName);

  if (!product) {
    notFound();
  }

  const searchParamsObj = await searchParams;
  const filters = parseFilters<ProductDetailFilters>(searchParamsObj);
  filters.period ||= '1y';
  const currentView = selectedView(searchValue(searchParamsObj.view));

  const planning = await getProductReorderPlanningDetail(productName);

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
        <div className="ml-auto px-4">
          <PeriodSelector currentPeriod={filters.period || '1y'} filters={filters as Record<string, string | number | boolean | undefined>} />
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 pt-6 md:p-6">
        <ProductCommandHeader product={product} planning={planning} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ViewTabs currentView={currentView} filters={filters} />
          {planning?.policyReviewFlags && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
              {readableCode(planning.policyReviewFlags)}
            </Badge>
          )}
        </div>

        {currentView === 'planning' && <PlanningView productName={productName} planning={planning} />}
        {currentView === 'sales' && <SalesView productName={productName} filters={filters} />}
        {currentView === 'customers' && <CustomersView productName={productName} filters={filters} />}
        {currentView === 'pricing' && <PricingView productName={productName} filters={filters} />}
        {currentView === 'details' && <DetailsView productName={productName} product={product} />}
      </div>
    </>
  );
}
