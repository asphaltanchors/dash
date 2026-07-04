'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency, formatNumber } from '@/lib/utils'

export interface CockpitRevenuePoint {
  date: string
  label: string
  revenue: number
  orders: number
}

function formatAxisCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$${formatNumber(value / 1_000_000, 1)}M`
  if (Math.abs(value) >= 1_000) return `$${formatNumber(value / 1_000, 0)}K`
  return `$${formatNumber(value, 0)}`
}

export function CockpitRevenueChart({ data }: { data: CockpitRevenuePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center rounded-md border border-slate-800 bg-slate-950/30 text-xs text-slate-500">
        No revenue trend available
      </div>
    )
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 0, left: -12 }}
        >
          <defs>
            <linearGradient id="cockpitRevenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.95} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#1e293b" strokeDasharray="2 4" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            minTickGap={20}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={formatAxisCurrency}
            width={54}
          />
          <Tooltip
            cursor={{ stroke: '#60a5fa', strokeOpacity: 0.32 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null

              const point = payload[0].payload as CockpitRevenuePoint

              return (
                <div className="rounded-md border border-slate-700 bg-[#08111f] px-3 py-2 text-xs shadow-xl">
                  <p className="mb-1 font-medium text-slate-100">{label}</p>
                  <div className="grid gap-1 text-slate-300">
                    <div className="flex min-w-40 justify-between gap-4">
                      <span>Revenue</span>
                      <span className="font-mono text-blue-300">{formatCurrency(point.revenue, { showCents: false })}</span>
                    </div>
                    <div className="flex min-w-40 justify-between gap-4">
                      <span>Orders</span>
                      <span className="font-mono text-slate-100">{formatNumber(point.orders, 0)}</span>
                    </div>
                  </div>
                </div>
              )
            }}
          />
          <Bar
            dataKey="revenue"
            fill="url(#cockpitRevenueFill)"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
