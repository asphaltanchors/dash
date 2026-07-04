import type { CockpitRevenuePoint } from '@/components/dashboard/CockpitCharts'
import { toNumber, type Tone } from '@/components/dashboard/report-ui'
import {
  getARAgingDetails,
  getBusinessCockpitData,
  getCurrentDSO,
  getSalesPerformanceHighlights,
  getWeeklyRevenue,
  type ARAgingDetail,
  type BusinessCockpitSummary,
  type SalesPerformanceHighlight,
} from '@/lib/queries'
import { getChannelRevenue, type ChannelRevenue } from '@/lib/queries/marketing'
import { formatNumber } from '@/lib/utils'

export interface ChannelMixRow {
  label: string
  value: number
  percent: number
  detail: string
}

export interface AgingBucket {
  label: string
  amount: number
  invoices: number
}

export type CurrentDso = Awaited<ReturnType<typeof getCurrentDSO>>

export interface BusinessCockpitPageData {
  summary: BusinessCockpitSummary | null
  dataQualityFlags: Awaited<ReturnType<typeof getBusinessCockpitData>>['dataQualityFlags']
  accountQueue: Awaited<ReturnType<typeof getBusinessCockpitData>>['accountQueue']
  productQuality: Awaited<ReturnType<typeof getBusinessCockpitData>>['productQuality']
  revenuePoints: CockpitRevenuePoint[]
  channelRows: ChannelMixRow[]
  agingBuckets: AgingBucket[]
  salesHighlights: SalesPerformanceHighlight[]
  currentDso: CurrentDso
  health: {
    criticalFlags: number
    warningFlags: number
    healthTone: Tone
  }
  metricTrends: {
    revenueValues: number[]
    accountRevenueValues: number[]
    inventoryValues: number[]
    reorderValues: number[]
    attributionValues: number[]
    openArValues: number[]
  }
}

function formatDate(value: string | null | undefined, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  if (!value) return 'n/a'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)

  return date.toLocaleDateString('en-US', options)
}

function buildRevenuePoints(revenueTrend: Awaited<ReturnType<typeof getWeeklyRevenue>>): CockpitRevenuePoint[] {
  return revenueTrend.slice(-12).map((point) => ({
    date: point.date,
    label: formatDate(point.date, { month: 'short' }),
    revenue: toNumber(point.revenue),
    orders: toNumber(point.orderCount),
  }))
}

function buildChannelRows(channels: ChannelRevenue[], highlights: SalesPerformanceHighlight[]): ChannelMixRow[] {
  if (channels.length > 0) {
    return channels.slice(0, 5).map((channel) => ({
      label: channel.acquisitionChannel,
      value: toNumber(channel.totalRevenue),
      percent: channel.revenuePercentage,
      detail: `${formatNumber(channel.orderCount, 0)} orders`,
    }))
  }

  const total = highlights.reduce((sum, row) => sum + toNumber(row.totalRevenue), 0)
  return highlights.slice(0, 5).map((row) => ({
    label: row.salesChannel,
    value: toNumber(row.totalRevenue),
    percent: total > 0 ? (toNumber(row.totalRevenue) / total) * 100 : 0,
    detail: `${formatNumber(row.orderCount, 0)} orders`,
  }))
}

function agingSort(label: string) {
  if (/current|0-?30|not due/i.test(label)) return 0
  if (/31|60/i.test(label)) return 1
  if (/61|90/i.test(label)) return 2
  if (/90|over/i.test(label)) return 3
  return 4
}

function buildAgingBuckets(details: ARAgingDetail[], fallbackOpenAr: number): AgingBucket[] {
  const individualRows = details.filter((row) => row.analysisLevel === 'Individual Invoices')
  const grouped = new Map<string, AgingBucket>()

  for (const row of individualRows) {
    const label = row.agingBucket || 'Unbucketed'
    const current = grouped.get(label) || { label, amount: 0, invoices: 0 }
    current.amount += toNumber(row.totalAmount)
    current.invoices += 1
    grouped.set(label, current)
  }

  const buckets = Array.from(grouped.values()).sort((a, b) => agingSort(a.label) - agingSort(b.label))
  if (buckets.length > 0) return buckets

  return fallbackOpenAr > 0 ? [{ label: 'Open A/R', amount: fallbackOpenAr, invoices: 0 }] : []
}

export async function getBusinessCockpitPageData(): Promise<BusinessCockpitPageData> {
  const [
    cockpit,
    revenueTrend,
    channelRevenue,
    salesHighlights,
    currentDso,
    arAgingDetails,
  ] = await Promise.all([
    getBusinessCockpitData(),
    getWeeklyRevenue({ period: '1y' }),
    getChannelRevenue({ period: '1y' }),
    getSalesPerformanceHighlights(5),
    getCurrentDSO(),
    getARAgingDetails(),
  ])

  const { summary, dataQualityFlags, accountQueue, productQuality } = cockpit
  const criticalFlags = dataQualityFlags.filter((flag) => flag.severity === 'critical').length
  const warningFlags = dataQualityFlags.filter((flag) => flag.severity === 'warn').length
  const healthTone: Tone = criticalFlags > 0 ? 'red' : warningFlags > 0 ? 'amber' : 'green'
  const revenuePoints = buildRevenuePoints(revenueTrend)
  const channelRows = buildChannelRows(channelRevenue, salesHighlights)
  const agingBuckets = summary ? buildAgingBuckets(arAgingDetails, toNumber(summary.openArAmount)) : []

  return {
    summary,
    dataQualityFlags,
    accountQueue,
    productQuality,
    revenuePoints,
    channelRows,
    agingBuckets,
    salesHighlights,
    currentDso,
    health: {
      criticalFlags,
      warningFlags,
      healthTone,
    },
    metricTrends: {
      revenueValues: revenuePoints.map((point) => point.revenue),
      accountRevenueValues: accountQueue.map((account) => toNumber(account.totalRevenue)).reverse(),
      inventoryValues: productQuality.map((product) => toNumber(product.estimatedAvailableQuantity)).reverse(),
      reorderValues: productQuality.map((product) => toNumber(product.reorderValueAtCost)).reverse(),
      attributionValues: channelRows.map((row) => row.percent),
      openArValues: summary
        ? [toNumber(summary.overdueArAmount), Math.max(toNumber(summary.openArAmount) - toNumber(summary.overdueArAmount), 0)]
        : [],
    },
  }
}
