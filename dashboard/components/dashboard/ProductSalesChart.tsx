"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { WeeklyRevenue } from "@/lib/queries"
import { formatCurrency } from "@/lib/utils"

interface ProductSalesChartProps {
  data: WeeklyRevenue[]
}

const chartConfig = {
  revenue: {
    label: "Sales",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function ProductSalesChart({ data }: ProductSalesChartProps) {
  // Transform data for recharts
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      year: '2-digit' 
    }),
    revenue: Number(item.revenue),
    orderCount: item.orderCount,
  }))

  const totalSales = data.reduce((sum, item) => sum + Number(item.revenue), 0)
  const totalOrders = data.reduce((sum, item) => sum + Number(item.orderCount), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Time Sales Trend</CardTitle>
        <CardDescription>
          Monthly breakdown • {formatCurrency(totalSales, { showCents: false })} total sales • {totalOrders.toLocaleString()} orders
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
              tickFormatter={(value) => value}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent 
                formatter={(value) => [
                  `$${Number(value).toLocaleString()}`,
                  ""
                ]}
                labelFormatter={(label) => `Month: ${label}`}
              />}
            />
            <Bar
              dataKey="revenue"
              fill="var(--color-revenue)"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}