// ABOUTME: Family metrics card component displaying key performance indicators for a product family
// ABOUTME: Shows revenue, products count, customers, orders, and growth metrics in a grid layout
import { FamilyDetail } from '@/lib/queries';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { getPeriodLabel } from '@/lib/filter-utils';
import { Users, ShoppingCart, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface FamilyMetricsProps {
  familyDetail: FamilyDetail;
  period?: string;
}

export function FamilyMetrics({ familyDetail, period = '1y' }: FamilyMetricsProps) {
  const periodLabel = getPeriodLabel(period);
  const growthColor = familyDetail.periodGrowth > 0 ? 'text-green-600' : 
                     familyDetail.periodGrowth < 0 ? 'text-red-600' : 'text-muted-foreground';
  const GrowthIcon = familyDetail.periodGrowth > 0 ? TrendingUp : TrendingDown;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Period Revenue */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">{periodLabel} Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(parseFloat(familyDetail.periodRevenue))}</p>
              {familyDetail.periodGrowth !== 0 && (
                <div className={`flex items-center gap-1 mt-1 ${growthColor}`}>
                  <GrowthIcon className="h-3 w-3" />
                  <span className="text-xs font-medium">
                    {Math.abs(familyDetail.periodGrowth)}% vs prev period
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Concentration */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Customer Concentration</p>
              <p className="text-2xl font-bold">
                {familyDetail.customersTo50Percent}/{familyDetail.customersTo80Percent}
              </p>
              <p className="text-xs text-muted-foreground">customers for 50%/80% revenue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Customers */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">{periodLabel} Customers</p>
              <p className="text-2xl font-bold">{formatNumber(familyDetail.totalCustomers)}</p>
              <p className="text-xs text-muted-foreground">active buyers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Orders & AOV */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">{periodLabel} Orders</p>
              <p className="text-2xl font-bold">{formatNumber(familyDetail.periodOrders)}</p>
              <p className="text-xs text-muted-foreground">
                Avg: {formatCurrency(parseFloat(familyDetail.averageOrderValue))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

