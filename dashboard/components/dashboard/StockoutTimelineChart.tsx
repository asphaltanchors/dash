// ABOUTME: Stockout timeline chart showing when products are projected to run out of inventory
// ABOUTME: Displays next 90 days of projected stockouts grouped by date with SKU counts
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import type { StockoutTimelineItem } from "@/lib/queries"
import { format, parseISO } from "date-fns"

interface StockoutTimelineChartProps {
  data: StockoutTimelineItem[]
}

const chartConfig = {
  skuCount: {
    label: "SKUs",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig

export function StockoutTimelineChart({ data }: StockoutTimelineChartProps) {
  const chartData = data.map(item => ({
    date: format(parseISO(item.stockoutDate), 'MMM d'),
    fullDate: item.stockoutDate,
    skuCount: item.skuCount,
    totalValue: Number(item.totalValue),
    skus: item.skus,
  }));

  const totalSkus = data.reduce((sum, item) => sum + item.skuCount, 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Projected Stockouts (Next 90 Days)</CardTitle>
          <CardDescription>
            No stockouts projected in the next 90 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
            All active products have sufficient inventory for at least 90 days
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projected Stockouts (Next 90 Days)</CardTitle>
        <CardDescription>
          {totalSkus} SKUs projected to stock out in the next 90 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full h-[300px]">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent
                formatter={(value, name, item) => [
                  `${value} SKUs • $${item.payload.totalValue.toLocaleString()} value`,
                  "Stockout Date"
                ]}
                labelFormatter={(label, payload) => {
                  if (payload && payload.length > 0) {
                    return `Date: ${payload[0].payload.fullDate}`;
                  }
                  return `Date: ${label}`;
                }}
              />}
            />
            <Bar
              dataKey="skuCount"
              fill="var(--color-skuCount)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
