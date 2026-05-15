'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryTrend } from '@/lib/queries';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';

interface InventoryTrendChartProps {
  data: InventoryTrend[];
}

function formatDate(date: string) {
  return format(new Date(`${date}T00:00:00`), 'MMM d, yyyy');
}

export function InventoryTrendChart({ data }: InventoryTrendChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Estimate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No inventory history data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(item => ({
    date: format(new Date(`${item.date}T00:00:00`), 'MMM d'),
    fullDate: item.date,
    estimatedInventory: Number(item.estimatedEndingInventory),
    salesQty: Number(item.salesQty),
    receiptQty: Number(item.receiptQty),
    adjustmentQty: Number(item.adjustmentQty),
    netMovement: Number(item.netInventoryMovement),
    inventoryValue: Number(item.inventoryValueAtCost),
    isAnchorDay: item.isAnchorDay,
    isProjectedDay: item.isProjectedDay,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Inventory Estimate</CardTitle>
        <CardDescription>
          QuickBooks anchors with sales-based depletion between updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => Number(value).toLocaleString()}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload;
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-md">
                      <p className="font-medium">{formatDate(row.fullDate)}</p>
                      <p className="text-sm">
                        <span className="text-blue-600">Estimated inventory: </span>
                        <span className="font-medium">{row.estimatedInventory.toLocaleString()}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-slate-600">Sales/holds: </span>
                        <span className="font-medium">{row.salesQty.toLocaleString()}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-emerald-600">Receipts: </span>
                        <span className="font-medium">{row.receiptQty.toLocaleString()}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-purple-600">Adjustments: </span>
                        <span className="font-medium">{row.adjustmentQty.toLocaleString()}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-green-600">Value at cost: </span>
                        <span className="font-medium">${row.inventoryValue.toLocaleString()}</span>
                      </p>
                      {row.isAnchorDay && <p className="text-xs text-muted-foreground mt-1">QuickBooks anchor day</p>}
                      {row.isProjectedDay && <p className="text-xs text-muted-foreground mt-1">Includes immediate future-dated depletion</p>}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="estimatedInventory"
                fill="#dbeafe"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="estimatedInventory"
                stroke="#1d4ed8"
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (!payload.isAnchorDay) return <g />;
                  return <circle cx={cx} cy={cy} r={4} fill="#111827" stroke="#fff" strokeWidth={1.5} />;
                }}
                activeDot={{ r: 4, fill: "#2563eb" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
