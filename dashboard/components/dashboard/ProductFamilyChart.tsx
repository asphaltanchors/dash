'use client';

import { ProductFamilyBreakdown } from '@/lib/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ProductFamilyChartProps {
  data: ProductFamilyBreakdown[];
}

const chartConfig = {
  productCount: {
    label: "Products",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

// Define colors for pie chart slices
const pieColors = [
  "var(--chart-1)",
  "var(--chart-2)", 
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)"
];

export function ProductFamilyChart({ data }: ProductFamilyChartProps) {
  const totalProducts = data.reduce((sum, item) => sum + item.productCount, 0);
  const totalValue = data.reduce((sum, item) => sum + Number(item.totalValue), 0);

  const chartData = data.map((item) => ({
    ...item,
    percentage: ((item.productCount / totalProducts) * 100).toFixed(1),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Families</CardTitle>
        <CardDescription>
          Distribution by product family ({totalProducts} products, ${totalValue.toFixed(2)} total value)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[280px] min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={false}
                outerRadius="70%"
                dataKey="productCount"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid gap-2">
                        <div className="font-medium">{data.productFamily}</div>
                        <div className="text-sm text-muted-foreground">
                          {data.productCount} products ({data.percentage}%)
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Avg margin: {data.averageMargin}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total value: ${data.totalValue}
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}