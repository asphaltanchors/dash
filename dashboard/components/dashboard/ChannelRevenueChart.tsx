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
    <div className="grid gap-6">
      {/* Channel Revenue Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Acquisition Channel</CardTitle>
          <CardDescription>Total revenue comparison across channels</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                className="text-xs"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis
                className="text-xs"
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-sm">
                        <div className="font-medium mb-2">{payload[0].payload.name}</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Revenue:</span>
                            <span className="font-medium">{formatCurrency(payload[0].value as number)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Orders:</span>
                            <span className="font-medium">{payload[0].payload.orders}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Customers:</span>
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

      {/* Monthly Trend Chart */}
      {trendChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Channel Revenue Trends</CardTitle>
            <CardDescription>Monthly revenue trends for top 5 channels</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  className="text-xs"
                />
                <YAxis
                  className="text-xs"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-sm">
                          <div className="font-medium mb-2">{label}</div>
                          <div className="space-y-1 text-sm">
                            {payload.map((entry, index) => (
                              <div key={index} className="flex justify-between gap-4">
                                <span className="text-muted-foreground">{entry.name}:</span>
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
                <Legend />
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
