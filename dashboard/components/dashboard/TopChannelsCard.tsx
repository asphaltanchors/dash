// ABOUTME: Top Sales Channels Card showing revenue breakdown by sales channel
// ABOUTME: Displays top 3 channels with revenue amounts and percentages for executive summary
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import { SalesChannelMetric } from "@/lib/queries"
import { formatCurrency } from "@/lib/utils"

interface Props {
  channelMetrics: SalesChannelMetric[]
}

export default function TopChannelsCard({ channelMetrics }: Props) {
  // Calculate total revenue and get top 3 channels
  const channelsWithRevenue = channelMetrics
    .filter(channel => channel.periods.length > 0)
    .map(channel => ({
      name: channel.sales_channel,
      revenue: Number(channel.periods[0].total_revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue)

  const totalRevenue = channelsWithRevenue.reduce((sum, channel) => sum + channel.revenue, 0)
  const topChannels = channelsWithRevenue.slice(0, 3)

  if (topChannels.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Sales Channels</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">—</div>
          <p className="text-xs text-muted-foreground">
            No channel data available
          </p>
        </CardContent>
      </Card>
    )
  }

  const formatChannelName = (name: string) => {
    if (name?.startsWith('Amazon Combined:')) {
      return name.split(':')[1].trim()
    }
    return name || 'Unknown'
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Top Sales Channels</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {topChannels.map((channel, index) => {
            const percentage = totalRevenue > 0 ? (channel.revenue / totalRevenue) * 100 : 0
            
            return (
              <div key={channel.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    index === 0 ? 'bg-blue-500' :
                    index === 1 ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  <span className="text-sm font-medium">
                    {formatChannelName(channel.name)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {formatCurrency(channel.revenue, { showCents: false })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="mt-3 pt-3 border-t">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="text-sm font-bold">
              {formatCurrency(totalRevenue, { showCents: false })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}