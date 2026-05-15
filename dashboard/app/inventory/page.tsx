import {
  getReorderMetrics,
  getPriorityBreakdown,
  getStockoutTimeline,
  getReorderPlanningData,
  getProductFamiliesForReorder,
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
import { Package, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PriorityBreakdownChart } from '@/components/dashboard/PriorityBreakdownChart';
import { StockoutTimelineChart } from '@/components/dashboard/StockoutTimelineChart';
import { ReorderPlanningTable } from '@/components/dashboard/ReorderPlanningTable';
import { TargetDaysSelector } from '@/components/dashboard/TargetDaysSelector';

async function InventoryMetrics({ targetDays }: { targetDays: number }) {
  const metrics = await getReorderMetrics();

  const reorderUnits = targetDays === 90 ? metrics.totalReorderUnits90d : metrics.totalReorderUnits180d;
  const reorderValue = targetDays === 90 ? metrics.totalReorderValue90d : metrics.totalReorderValue180d;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <MetricCard
        title="SKUs Needing Attention"
        value={metrics.totalSkusNeedingReorder.toString()}
        icon={AlertTriangle}
        formatValue={(value) => value}
        subtitle={`${metrics.criticalCount} critical, ${metrics.lowCount} low`}
      />
      <MetricCard
        title="Target Reorder Boxes"
        value={reorderUnits}
        icon={Package}
        formatValue={(value) => Number(value).toLocaleString()}
        subtitle={`to reach ${targetDays} days`}
      />
      <MetricCard
        title="Target Reorder Value"
        value={reorderValue}
        icon={DollarSign}
        formatValue={(value) => formatCurrency(value, { showCents: false })}
        subtitle="at purchase cost"
      />
      <MetricCard
        title="Avg Days Remaining"
        value={metrics.avgDaysUntilStockout}
        icon={Clock}
        formatValue={(value) => `${value} days`}
        subtitle="for attention items"
      />
    </div>
  );
}

async function PrioritySection() {
  const breakdown = await getPriorityBreakdown();

  return <PriorityBreakdownChart data={breakdown} />;
}

async function StockoutSection() {
  const timeline = await getStockoutTimeline();

  return <StockoutTimelineChart data={timeline} />;
}

async function InventoryDataSection({ targetDays }: { targetDays: number }) {
  const data = await getReorderPlanningData();
  const families = await getProductFamiliesForReorder();

  return <ReorderPlanningTable data={data} families={families} targetDays={targetDays} />;
}

interface InventoryPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const params = await searchParams;
  const targetDays = params.target === '180' ? 180 : 90;

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
                <BreadcrumbPage>Inventory</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex-1 space-y-4 p-4 md:p-6 pt-6 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Inventory</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Daily levels estimated from QuickBooks anchors and sales depletion
            </p>
          </div>
          <TargetDaysSelector currentTarget={targetDays} />
        </div>

        <InventoryMetrics targetDays={targetDays} />

        <div className="grid gap-4 md:grid-cols-2">
          <PrioritySection />
          <StockoutSection />
        </div>

        <InventoryDataSection targetDays={targetDays} />
      </div>
    </>
  );
}
