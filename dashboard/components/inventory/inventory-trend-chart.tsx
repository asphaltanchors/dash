'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryTrend } from '@/lib/queries';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format } from 'date-fns';

interface InventoryTrendChartProps {
  data: InventoryTrend[];
}

export function InventoryTrendChart({ data }: InventoryTrendChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Trend (30 Days)</CardTitle>
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
    date: format(new Date(item.date), 'MMM d'),
    fullDate: item.date,
    quantityOnHand: Number(item.quantityOnHand),
    quantityChange: Number(item.quantityChange),
    inventoryValue: Number(item.inventoryValueAtCost),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Trend (All Time)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-md">
                        <p className="font-medium">{format(new Date(data.fullDate), 'MMM d, yyyy')}</p>
                        <p className="text-sm">
                          <span className="text-blue-600">Quantity on Hand: </span>
                          <span className="font-medium">{data.quantityOnHand}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-green-600">Inventory Value: </span>
                          <span className="font-medium">${data.inventoryValue}</span>
                        </p>
                        {data.quantityChange !== 0 && (
                          <p className="text-sm">
                            <span className="text-purple-600">Change: </span>
                            <span className={`font-medium ${data.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {data.quantityChange > 0 ? '+' : ''}{data.quantityChange}
                            </span>
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line 
                type="monotone" 
                dataKey="quantityOnHand" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#3b82f6" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}