import { getInventoryPlanningPageData } from '@/lib/queries';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ReorderPlanningTable } from '@/components/dashboard/ReorderPlanningTable';
import { AlertTriangle, ClipboardList, PackageCheck, ShipWheel } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

function SummaryCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: typeof AlertTriangle;
}) {
  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              <span className="truncate">{title}</span>
            </div>
            <div className="mt-1 truncate text-xl font-semibold tabular-nums">{value}</div>
          </div>
        </div>
        <p className="mt-2 text-xs leading-4 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export default async function InventoryPage() {
  const { summary, items, families } = await getInventoryPlanningPageData();

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background/95">
        <div className="flex w-full items-center justify-between gap-3 px-3">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Inventory</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
            <span>{summary.inventoryAsOfDate ? `Snapshot ${summary.inventoryAsOfDate}` : 'Current snapshot'}</span>
            <span className="rounded-sm border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-800">
              WWD first
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-3 overflow-x-hidden bg-muted/20 p-3 md:p-4">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="WWD Planning"
            value={summary.wwdBuyCount.toLocaleString()}
            detail={`${Number(summary.wwdSuggestedBuyQty).toLocaleString()} units, ${formatCurrency(summary.wwdSuggestedBuyCost, { showCents: false })}`}
            icon={ShipWheel}
          />
          <SummaryCard
            title="Suggested Buys"
            value={summary.buyCount.toLocaleString()}
            detail={`${Number(summary.suggestedBuyQty).toLocaleString()} boxes recommended`}
            icon={ClipboardList}
          />
          <SummaryCard
            title="Buy Cost"
            value={formatCurrency(summary.suggestedBuyCost, { showCents: false })}
            detail={`${summary.reviewCount.toLocaleString()} SKUs need review`}
            icon={PackageCheck}
          />
          <SummaryCard
            title="Out Of Stock"
            value={summary.outOfStockCount.toLocaleString()}
            detail={`${summary.totalSkus.toLocaleString()} active planning SKUs`}
            icon={AlertTriangle}
          />
        </div>

        <ReorderPlanningTable data={items} families={families} />
      </main>
    </>
  );
}
