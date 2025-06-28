import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  ShoppingCart, 
  Clock, 
  Eye, 
  TrendingUp, 
  TrendingDown,
  Minus
} from 'lucide-react';
import { InventorySnapshot } from '@/lib/queries';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

interface InventoryStatusProps {
  inventory: InventorySnapshot;
}

export function InventoryStatus({ inventory }: InventoryStatusProps) {
  const quantityChange = Number(inventory.quantityChange);
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getChangeIcon = () => {
    if (quantityChange > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (quantityChange < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Current Inventory Status</h3>
        <div className="text-sm text-muted-foreground">
          As of {format(new Date(inventory.inventoryDate), 'MMM d, yyyy')}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Hand</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.quantityOnHand}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              {getChangeIcon()}
              <span>
                {quantityChange > 0 ? '+' : ''}{inventory.quantityChange} from previous
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.availableQuantity}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Visibility: {inventory.totalInventoryVisibility}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Order</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.quantityOnOrder}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Inbound inventory
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Committed</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.quantityOnSalesOrder}</div>
            <div className="text-xs text-muted-foreground mt-1">
              On sales orders
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">At Cost:</span>
              <span className="font-medium">{formatCurrency(inventory.inventoryValueAtCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">At Sales Price:</span>
              <span className="font-medium">{formatCurrency(inventory.inventoryValueAtSalesPrice)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Item Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(inventory.itemStatus)}>
                {inventory.itemStatus}
              </Badge>
              {inventory.isSeed && (
                <Badge variant="outline">Seed Item</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}