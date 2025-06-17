"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { DailyRevenue } from "@/lib/queries"

interface RevenueChartProps {
  data: DailyRevenue[]
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function RevenueChart({ data }: RevenueChartProps) {
  // Transform data for recharts
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    revenue: parseFloat(item.revenue),
    orderCount: item.orderCount,
  }))

  const totalRevenue = data.reduce((sum, item) => sum + parseFloat(item.revenue), 0)
  const totalOrders = data.reduce((sum, item) => sum + item.orderCount, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Revenue Trend</CardTitle>
        <CardDescription>
          Last 30 days • ${totalRevenue.toLocaleString()} total revenue • {totalOrders} orders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
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
                  `$${parseFloat(value as string).toLocaleString()}`,
                  "Revenue"
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />}
            />
            <Area
              dataKey="revenue"
              type="natural"
              fill="var(--color-revenue)"
              fillOpacity={0.4}
              stroke="var(--color-revenue)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}