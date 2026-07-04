'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import type { ChannelRevenue, MonthlyChannelRevenue } from '@/lib/queries/marketing';

interface ChannelRevenueChartProps {
  data: ChannelRevenue[];
  monthlyData: MonthlyChannelRevenue[];
}

export function ChannelRevenueChart({ data, monthlyData }: ChannelRevenueChartProps) {
  // Prepare data for bar chart
  const barChartData = data.map(channel => ({
    name: channel.acquisitionChannel,
    revenue: Number(channel.totalRevenue),
    orders: channel.orderCount,
    customers: channel.customerCount,
  }));

  // Prepare data for trend chart
  const colors = [
    '#3b82f6', // blue
    '#22c55e', // green
    '#f59e0b', // orange
    '#ef4444', // red
    '#a855f7', // purple
  ];

  const trendChartData = monthlyData.map(month => {
    const monthDate = new Date(month.month);
    const formattedMonth = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return {
      month: formattedMonth,
      ...month.channels,
    };
  });

  const channelNames = data.slice(0, 5).map(c => c.acquisitionChannel);

  return (
    <div className="grid gap-3">
      <Card className="rounded-md py-0 shadow-none">
        <CardHeader className="border-b border-slate-800 px-3 py-2">
          <CardTitle className="text-sm font-semibold">Revenue by Acquisition Channel</CardTitle>
          <CardDescription>Total revenue comparison across channels</CardDescription>
        </CardHeader>
        <CardContent className="p-3">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-md border border-slate-700 bg-[#07101d] p-3 text-slate-100 shadow-[0_10px_24px_rgba(0,0,0,0.25)]">
                        <div className="mb-2 font-medium">{payload[0].payload.name}</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Revenue:</span>
                            <span className="font-medium">{formatCurrency(payload[0].value as number)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Orders:</span>
                            <span className="font-medium">{payload[0].payload.orders}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Customers:</span>
                            <span className="font-medium">{payload[0].payload.customers}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {trendChartData.length > 0 && (
        <Card className="rounded-md py-0 shadow-none">
          <CardHeader className="border-b border-slate-800 px-3 py-2">
            <CardTitle className="text-sm font-semibold">Channel Revenue Trends</CardTitle>
            <CardDescription>Monthly revenue trends for top 5 channels</CardDescription>
          </CardHeader>
          <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-md border border-slate-700 bg-[#07101d] p-3 text-slate-100 shadow-[0_10px_24px_rgba(0,0,0,0.25)]">
                          <div className="mb-2 font-medium">{label}</div>
                          <div className="space-y-1 text-sm">
                            {payload.map((entry, index) => (
                              <div key={index} className="flex justify-between gap-4">
                                <span className="text-slate-400">{entry.name}:</span>
                                <span className="font-medium" style={{ color: entry.color }}>
                                  {formatCurrency(entry.value as number)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 11 }} />
                {channelNames.map((channel, index) => (
                  <Line
                    key={channel}
                    type="monotone"
                    dataKey={channel}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={{ fill: colors[index % colors.length], r: 4 }}
                    name={channel}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
