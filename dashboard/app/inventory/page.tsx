import { getInventoryPlanningPageData } from '@/lib/queries';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ReorderPlanningTable } from '@/components/dashboard/ReorderPlanningTable';
import { AlertTriangle, ClipboardList, PackageCheck, Truck } from 'lucide-react';
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export default async function InventoryPage() {
  const { summary, items, families } = await getInventoryPlanningPageData();

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

      <div className="flex-1 space-y-4 p-4 pt-6 md:p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Inventory</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Stock position, inbound supply, demand forecast, and buy recommendations
            {summary.inventoryAsOfDate ? ` as of ${summary.inventoryAsOfDate}` : ''}.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            title="Out Of Stock"
            value={summary.outOfStockCount.toLocaleString()}
            detail={`${summary.totalSkus.toLocaleString()} active planning SKUs`}
            icon={AlertTriangle}
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
            title="Inbound Supply"
            value={Number(summary.inboundQty).toLocaleString()}
            detail={`${Number(summary.futureReceiptQty).toLocaleString()} future-dated receipts separated`}
            icon={Truck}
          />
        </div>

        <ReorderPlanningTable data={items} families={families} />
      </div>
    </>
  );
}
