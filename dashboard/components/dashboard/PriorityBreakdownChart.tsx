// ABOUTME: Priority breakdown chart showing count of SKUs by inventory status
// ABOUTME: Displays CRITICAL, LOW, MODERATE, and SUFFICIENT status distribution with color coding
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import type { PriorityBreakdown } from "@/lib/queries"

interface PriorityBreakdownChartProps {
  data: PriorityBreakdown[]
}

const chartConfig = {
  CRITICAL: {
    label: "Critical",
    color: "hsl(var(--destructive))",
  },
  LOW: {
    label: "Low",
    color: "hsl(var(--warning))",
  },
  MODERATE: {
    label: "Moderate",
    color: "hsl(var(--chart-3))",
  },
  SUFFICIENT: {
    label: "Sufficient",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

// Define sort order
const statusOrder = ['CRITICAL', 'LOW', 'MODERATE', 'SUFFICIENT'];

export function PriorityBreakdownChart({ data }: PriorityBreakdownChartProps) {
  // Sort data by predefined order
  const sortedData = [...data].sort((a, b) => {
    return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
  });

  const chartData = sortedData.map(item => ({
    status: item.status,
    count: item.count,
    percentage: item.percentage,
    fill: chartConfig[item.status as keyof typeof chartConfig]?.color || "hsl(var(--chart-1))",
  }));

  const totalSkus = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Status Breakdown</CardTitle>
        <CardDescription>
          Distribution of {totalSkus} active SKUs by reorder priority
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
              dataKey="status"
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
                  `${value} SKUs (${item.payload.percentage}%)`,
                  chartConfig[item.dataKey as keyof typeof chartConfig]?.label || item.dataKey
                ]}
              />}
            />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
