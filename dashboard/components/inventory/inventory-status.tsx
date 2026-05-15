import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CalendarClock, Clock, Package, ShoppingCart, TrendingDown } from 'lucide-react';
import { InventorySnapshot } from '@/lib/queries';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

interface InventoryStatusProps {
  inventory: InventorySnapshot;
}

const statusClasses: Record<string, string> = {
  NEGATIVE_OR_ZERO: 'bg-red-100 text-red-800 border-red-300',
  CRITICAL: 'bg-red-100 text-red-800 border-red-300',
  LOW: 'bg-orange-100 text-orange-800 border-orange-300',
  MODERATE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  SUFFICIENT: 'bg-green-100 text-green-800 border-green-300',
  NO_RECENT_SALES: 'bg-slate-100 text-slate-800 border-slate-300',
};

function formatDate(date: string) {
  return format(new Date(`${date}T00:00:00`), 'MMM d, yyyy');
}

export function InventoryStatus({ inventory }: InventoryStatusProps) {
  const daysRemaining = inventory.daysRemaining90DVelocity;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Estimated Inventory</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={statusClasses[inventory.inventoryStatus] || statusClasses.NO_RECENT_SALES}>
            {inventory.inventoryStatus.replaceAll('_', ' ')}
          </Badge>
          <span className="text-sm text-muted-foreground">
            As of {formatDate(inventory.inventoryDate)}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated On Hand</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(inventory.estimatedEndingInventory).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Anchor: {Number(inventory.anchorQuantityOnHand).toLocaleString()} on {formatDate(inventory.anchorDate)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">90D Velocity</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.avgDailySales90D}</div>
            <div className="text-xs text-muted-foreground mt-1">
              boxes per day
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Remaining</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{daysRemaining ?? '-'}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {inventory.estimatedStockoutDate ? `Stockout ${formatDate(inventory.estimatedStockoutDate)}` : 'No recent sales'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open PO Inbound</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(inventory.openPoQuantity).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {inventory.nextOpenPoDate ? `Next PO ${formatDate(inventory.nextOpenPoDate)}` : 'No open PO flagged'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anchor Age</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium">{inventory.daysSinceAnchor} days</div>
              <div className="text-xs text-muted-foreground">since QuickBooks quantity update</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">At cost</span>
              <span className="font-medium">{formatCurrency(inventory.inventoryValueAtCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">At sales price</span>
              <span className="font-medium">{formatCurrency(inventory.inventoryValueAtSalesPrice)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Movement</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <span className="text-muted-foreground">Receipts:</span>
                <span className="font-medium">{Number(inventory.receiptQty).toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground">Sales/holds:</span>
                <span className="font-medium">{Number(inventory.salesQty).toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground">Adjustments:</span>
                <span className="font-medium">{Number(inventory.adjustmentQty).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
