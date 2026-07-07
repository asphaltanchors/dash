import type { CockpitRevenuePoint } from '@/components/dashboard/CockpitCharts'
import { toNumber, type Tone } from '@/components/dashboard/report-ui'
import {
  getARAgingDetails,
  getBusinessCockpitData,
  getCurrentDSO,
  getLargeRecentOrders,
  getInventoryPlanningPageData,
  getSalesPerformanceHighlights,
  getWeeklyRevenue,
  type ARAgingDetail,
  type BusinessCockpitSummary,
  type LargeRecentOrder,
  type SalesPerformanceHighlight,
} from '@/lib/queries'

export interface AgingBucket {
  label: string
  amount: number
  invoices: number
}

export type CurrentDso = Awaited<ReturnType<typeof getCurrentDSO>>

export interface BusinessCockpitPageData {
  summary: BusinessCockpitSummary | null
  dataQualityFlags: Awaited<ReturnType<typeof getBusinessCockpitData>>['dataQualityFlags']
  productQuality: Awaited<ReturnType<typeof getBusinessCockpitData>>['productQuality']
  largeRecentOrders: LargeRecentOrder[]
  revenuePoints: CockpitRevenuePoint[]
  agingBuckets: AgingBucket[]
  salesHighlights: SalesPerformanceHighlight[]
  currentDso: CurrentDso
  wwdPalletPlan: Awaited<ReturnType<typeof getInventoryPlanningPageData>>['wwdPalletPlan']
  health: {
    criticalFlags: number
    warningFlags: number
    healthTone: Tone
  }
  metricTrends: {
    revenueValues: number[]
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
    largeRecentOrders,
    salesHighlights,
    currentDso,
    arAgingDetails,
    inventoryPlanning,
  ] = await Promise.all([
    getBusinessCockpitData(),
    getWeeklyRevenue({ period: '1y' }),
    getLargeRecentOrders(6),
    getSalesPerformanceHighlights(5),
    getCurrentDSO(),
    getARAgingDetails(),
    getInventoryPlanningPageData(),
  ])

  const { summary, dataQualityFlags, productQuality } = cockpit
  const visibleDataQualityFlags = dataQualityFlags.filter((flag) => !['future_orders', 'future_line_items', 'attribution_coverage'].includes(flag.flagKey))
  const criticalFlags = visibleDataQualityFlags.filter((flag) => flag.severity === 'critical').length
  const warningFlags = visibleDataQualityFlags.filter((flag) => flag.severity === 'warn').length
  const healthTone: Tone = criticalFlags > 0 ? 'red' : warningFlags > 0 ? 'amber' : 'green'
  const revenuePoints = buildRevenuePoints(revenueTrend)
  const agingBuckets = summary ? buildAgingBuckets(arAgingDetails, toNumber(summary.openArAmount)) : []

  return {
    summary,
    dataQualityFlags,
    productQuality,
    largeRecentOrders,
    revenuePoints,
    agingBuckets,
    salesHighlights,
    currentDso,
    wwdPalletPlan: inventoryPlanning.wwdPalletPlan,
    health: {
      criticalFlags,
      warningFlags,
      healthTone,
    },
    metricTrends: {
      revenueValues: revenuePoints.map((point) => point.revenue),
    },
  }
}
