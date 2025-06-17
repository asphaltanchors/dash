'use client';

import { MarginDistribution } from '@/lib/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

interface MarginDistributionChartProps {
  data: MarginDistribution[];
}

const chartConfig = {
  productCount: {
    label: "Product Count",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function MarginDistributionChart({ data }: MarginDistributionChartProps) {
  const totalProducts = data.reduce((sum, item) => sum + item.productCount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Margin Distribution</CardTitle>
        <CardDescription>
          Products by margin percentage ranges ({totalProducts} total products)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="marginRange" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload?.[0]) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid gap-2">
                        <div className="font-medium">{data.marginRange}</div>
                        <div className="text-sm text-muted-foreground">
                          {data.productCount} products ({data.percentage.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar 
                dataKey="productCount" 
                fill="var(--color-productCount)" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}