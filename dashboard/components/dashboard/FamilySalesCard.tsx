// ABOUTME: Family sales summary card component displaying sales performance by product family
// ABOUTME: Shows current period vs previous period comparison with growth indicators
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { getPeriodLabel } from '@/lib/filter-utils';
import { TrendingUp, TrendingDown, Package } from 'lucide-react';
import type { FamilySales } from '@/lib/queries';

interface FamilySalesCardProps {
  familySales: FamilySales[];
  period?: string;
}

export function FamilySalesCard({ familySales, period = '1y' }: FamilySalesCardProps) {
  const periodLabel = getPeriodLabel(period);
  
  if (familySales.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Sales by Family
          </CardTitle>
          <CardDescription>
            {periodLabel} vs previous {periodLabel.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No family sales data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Sales by Family
        </CardTitle>
        <CardDescription>
          {periodLabel} vs previous {periodLabel.toLowerCase()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Family</TableHead>
              <TableHead className="text-right">Current Sales</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead className="text-right">Growth</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {familySales.map((family) => (
              <TableRow key={family.productFamily}>
                <TableCell className="font-medium">{family.productFamily}</TableCell>
                <TableCell className="text-right">
                  <div>{formatCurrency(family.currentPeriodSales, { showCents: false })}</div>
                  <div className="text-xs text-muted-foreground">
                    vs {formatCurrency(family.previousPeriodSales, { showCents: false })}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div>{family.currentPeriodOrders}</div>
                  <div className="text-xs text-muted-foreground">vs {family.previousPeriodOrders}</div>
                </TableCell>
                <TableCell className="text-right">
                  <div>{family.currentPeriodUnits}</div>
                  <div className="text-xs text-muted-foreground">vs {family.previousPeriodUnits}</div>
                </TableCell>
                <TableCell className="text-right">
                  {family.salesGrowth !== 0 && (
                    <Badge 
                      variant={family.salesGrowth > 0 ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {family.salesGrowth > 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(family.salesGrowth)}%
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}