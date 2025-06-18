"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ArrowDown, ArrowUp } from "lucide-react"
import { SalesChannelMetric, SalesPeriodMetric } from "@/lib/queries"
import { formatCurrency, formatNumber } from "@/lib/utils"

interface Props {
  metrics: SalesChannelMetric[]
}

interface SparklineProps {
  values: number[]
  periods: Array<{
    period_start: string
    period_end: string
    total_revenue: string
  }>
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function MiniSparkline({ values, periods }: SparklineProps) {
  const height = 24
  const width = 64
  const padding = 4
  const graphHeight = height - 2 * padding

  if (values.length < 2) {
    return <span className="text-xs text-muted-foreground">N/A</span>;
  }

  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min === 0 ? 1 : max - min;
  const scale = (val: number) =>
    graphHeight - ((val - min) / range) * graphHeight + padding

  const xStep = width / (values.length - 1)
  const points = values.map((val, i) => [i * xStep, scale(val)])

  const trend = values[0] >= values[values.length - 1] ? "down" : "up"
  const color = trend === "up" ? "#22c55e" : "#ef4444"

  const pathD = points
    .map((point, i) =>
      i === 0 ? `M ${point[0]} ${point[1]}` : `L ${point[0]} ${point[1]}`
    )
    .join(" ")

  const tooltipContent = periods
    .filter(period => period.period_start && period.period_end)
    .map((period) => {
      const formattedRevenue = formatCurrency(period.total_revenue, { showCents: false })

      return `${formatDate(period.period_start)} - ${formatDate(period.period_end)}: ${formattedRevenue}`
    })
    .join('\n')

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <svg width={width} height={height} className="inline-block">
          <path d={pathD} stroke={color} strokeWidth="2" fill="none" />
          {points.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2" fill={color} />
          ))}
        </svg>
      </TooltipTrigger>
      <TooltipContent>
        <pre className="whitespace-pre">{tooltipContent}</pre>
      </TooltipContent>
    </Tooltip>
  )
}

function MiniBarChart({ percentage }: { percentage: number }) {
  return (
    <div className="w-16 h-3 bg-gray-100 rounded-sm overflow-hidden">
      <div
        className="h-full transition-all"
        style={{
          width: `${Math.min(100, Math.max(0, percentage))}%`,
          backgroundColor: percentage > 30 ? '#3b82f6' : '#93c5fd'
        }}
      />
    </div>
  )
}

function TrendIndicator({ change }: { change: number }) {
  const trend = change >= 0 ? "up" : "down"
  const Icon = trend === "up" ? ArrowUp : ArrowDown
  const color = trend === "up" ? "text-green-500" : "text-red-500"

  return (
    <div className={`flex items-center gap-1 ${color}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{Math.abs(change)}%</span>
    </div>
  )
}

export default function ChannelBreakdown({ metrics }: Props) {
  const filteredMetrics = metrics.filter(m =>
    m.sales_channel !== 'Contractor' &&
    m.sales_channel !== 'EXPORT from WWD' &&
    m.periods.length > 0 &&
    Number(m.periods[0].total_revenue) > 0
  )

  const totals = filteredMetrics.reduce(
    (acc, m) => {
      if (m.periods.length > 0) {
        acc.revenue += Number(m.periods[0].total_revenue)
        acc.orders += Number(m.periods[0].order_count)
      }
      return acc
    },
    { revenue: 0, orders: 0 }
  )

  const sortedMetrics = [...filteredMetrics].sort((a, b) =>
    a.sales_channel.localeCompare(b.sales_channel)
  )


  const getPercentageChange = (current: string | undefined, previous: string | undefined) => {
    if (current === undefined || previous === undefined) return 0;
    const curr = Number(current)
    const prev = Number(previous)
    if (prev === 0) return curr === 0 ? 0 : Infinity;
    return Math.round(((curr - prev) / prev) * 100)
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b-2">
            <TableHead className="w-[180px] font-bold">Channel</TableHead>
            <TableHead className="text-right font-bold">Revenue</TableHead>
            <TableHead className="text-right w-[80px] font-bold">Share</TableHead>
            <TableHead className="text-right w-[140px] font-bold border-r">Trend</TableHead>
            <TableHead className="text-right font-bold">Orders</TableHead>
            <TableHead className="text-right w-[80px] font-bold">Share</TableHead>
            <TableHead className="text-right font-bold">Avg Order</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedMetrics.map((metric) => {
            const currentPeriod = metric.periods[0];
            const previousPeriod = metric.periods[1];

            if (!currentPeriod) return null;

            const revenues = metric.periods.map(p => Number(p.total_revenue))
            const currentRevenue = Number(currentPeriod.total_revenue)
            const currentOrders = Number(currentPeriod.order_count)
            const avgOrderValue = currentOrders === 0 ? 0 : currentRevenue / currentOrders

            const revenuePercentage = totals.revenue === 0 ? 0 : (currentRevenue / totals.revenue) * 100
            const revenueChange = getPercentageChange(
              currentPeriod.total_revenue,
              previousPeriod?.total_revenue
            )

            const channelName = metric.sales_channel?.startsWith('Amazon Combined:')
              ? metric.sales_channel.split(':')[1].trim()
              : metric.sales_channel || "Unknown"

            return (
              <TableRow
                key={metric.sales_channel}
                className="hover:bg-gray-50 even:bg-gray-50/50"
              >
                <TableCell className="font-semibold">
                  {channelName}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(currentRevenue, { showCents: false })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm">{revenuePercentage.toFixed(1)}%</span>
                    <MiniBarChart percentage={revenuePercentage} />
                  </div>
                </TableCell>
                <TableCell className="text-right border-r">
                  <div className="flex items-center justify-end gap-2">
                    <MiniSparkline
                      values={revenues.slice().reverse()}
                      periods={[...metric.periods].reverse()}
                    />
                    {revenueChange !== Infinity && <TrendIndicator change={revenueChange} />}
                    {revenueChange === Infinity && <span className="text-xs text-green-500">(New)</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(currentOrders)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm">{(totals.orders === 0 ? 0 : (currentOrders / totals.orders * 100)).toFixed(1)}%</span>
                    <MiniBarChart percentage={(totals.orders === 0 ? 0 : (currentOrders / totals.orders * 100))} />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(avgOrderValue)}
                </TableCell>
              </TableRow>
            )
          })}

          {/* Totals row */}
          <TableRow className="border-t-2 bg-gray-50/50 font-bold">
            <TableCell>Total</TableCell>
            <TableCell className="text-right">
              {formatCurrency(totals.revenue, { showCents: false })}
            </TableCell>
            <TableCell className="text-right">
              {/* Share column - intentionally empty */}
            </TableCell>
            <TableCell className="text-right border-r">
              {/* Trend column - intentionally empty */}
            </TableCell>
            <TableCell className="text-right">
              {formatNumber(totals.orders)}
            </TableCell>
            <TableCell className="text-right">
              {/* Share column - intentionally empty */}
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(totals.orders === 0 ? 0 : totals.revenue / totals.orders, { showCents: false })}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TooltipProvider>
  )
}