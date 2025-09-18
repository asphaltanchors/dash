// ABOUTME: Product price distribution histogram component showing price spread and frequency
// ABOUTME: Displays min/max prices, price ranges, and statistical summaries with interactive charts
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ProductPriceDistribution } from "@/lib/queries"
import { formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface ProductPriceDistributionChartProps {
  data: ProductPriceDistribution
}

const chartConfig = {
  count: {
    label: "Units Sold",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function ProductPriceDistributionChart({ data }: ProductPriceDistributionChartProps) {
  if (data.totalSales === 0 || data.priceRanges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No sales data available for the selected period
          </div>
        </CardContent>
      </Card>
    )
  }

  // Transform data for recharts
  const chartData = data.priceRanges.map(range => ({
    range: range.rangeLabel,
    count: range.count,
    percentage: range.percentage,
    fullRange: `${range.rangeLabel} (${range.count} units, ${range.percentage.toFixed(1)}%)`
  }))

  const priceRange = Number(data.maxPrice) - Number(data.minPrice)
  const priceSpread = priceRange > 0 ? ((priceRange / Number(data.avgPrice)) * 100).toFixed(1) : '0'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Distribution Analysis</CardTitle>
        <CardDescription>
          Distribution of selling prices over {data.totalSales.toLocaleString()} units sold
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Lowest Price</div>
            <div className="text-lg font-semibold text-green-600">
              {formatCurrency(data.minPrice)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Highest Price</div>
            <div className="text-lg font-semibold text-red-600">
              {formatCurrency(data.maxPrice)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Average Price</div>
            <div className="text-lg font-semibold">
              {formatCurrency(data.avgPrice)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Median Price</div>
            <div className="text-lg font-semibold">
              {formatCurrency(data.medianPrice)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            Price Spread: {priceSpread}% of avg price
          </Badge>
          <Badge variant="outline">
            Range: {formatCurrency(priceRange.toFixed(2))}
          </Badge>
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-medium mb-3">Distribution by Price Range</h4>
          <ChartContainer config={chartConfig} className="w-full h-[300px]">
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 20,
                right: 12,
                top: 20,
                bottom: 40,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="range"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                angle={-45}
                textAnchor="end"
                height={60}
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                label={{ value: 'Units Sold', angle: -90, position: 'insideLeft' }}
              />
              <ChartTooltip
                cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                content={<ChartTooltipContent
                  formatter={(value, name, props) => [
                    `${Number(value).toLocaleString()} units`,
                    ""
                  ]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      const data = payload[0].payload
                      return `${data.range} • ${data.percentage.toFixed(1)}% of sales`
                    }
                    return label
                  }}
                />}
              />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}