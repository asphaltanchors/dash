import type { ProductRevenueBarPoint } from '@/components/dashboard/ProductInventoryCharts'
import { toNumber, type Tone } from '@/components/dashboard/report-ui'
import {
  getFamilySales,
  getInventoryPlanningPageData,
  getProductMetrics,
  getProductRevenueTrend,
  getProducts,
  type Product,
} from '@/lib/queries'
import { getPeriodLabel, parseFilters, type ProductFilters } from '@/lib/filter-utils'

export type ProductsOverviewSearchParams = { [key: string]: string | string[] | undefined }
export type ProductsOverviewFilters = ProductFilters & { period: string }

export interface InventoryBucket {
  label: string
  count: number
  value: number
  tone: Tone
}

export interface ProductsOverviewPageData {
  filters: ProductsOverviewFilters
  periodLabel: string
  metrics: Awaited<ReturnType<typeof getProductMetrics>>
  products: Product[]
  familySales: Awaited<ReturnType<typeof getFamilySales>>
  planning: Awaited<ReturnType<typeof getInventoryPlanningPageData>>
  planningBySku: Map<string, Awaited<ReturnType<typeof getInventoryPlanningPageData>>['items'][number]>
  revenuePoints: ProductRevenueBarPoint[]
  buckets: InventoryBucket[]
  totals: {
    familyRevenue: number
    revenueGrowth: number
    totalMargin: number
    totalUnits: number
    marginRate: number
    topSkuShare: number
    lowStockCount: number
    averageFamilyUnitGrowth: number
  }
  metricTrends: {
    revenueValues: number[]
    familyValues: number[]
    unitValues: number[]
    inventoryValues: number[]
  }
}

function formatMonth(value: string | null | undefined) {
  if (!value) return 'n/a'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toLocaleDateString('en-US', { month: 'short' })
}

function inventoryBuckets(items: Awaited<ReturnType<typeof getInventoryPlanningPageData>>['items']): InventoryBucket[] {
  const buckets: InventoryBucket[] = [
    { label: 'Healthy', count: 0, value: 0, tone: 'green' },
    { label: 'Low Stock', count: 0, value: 0, tone: 'amber' },
    { label: 'Out of Stock', count: 0, value: 0, tone: 'red' },
    { label: 'Review', count: 0, value: 0, tone: 'purple' },
  ]

  for (const item of items) {
    const value = Math.max(toNumber(item.onHandQty), 0) * toNumber(item.purchaseCost)
    const bucket = item.action === 'OUT_OF_STOCK'
      ? buckets[2]
      : item.requiresManualReview || item.action === 'REVIEW'
        ? buckets[3]
        : item.shouldReorder || item.action === 'WATCH'
          ? buckets[1]
          : buckets[0]

    bucket.count += 1
    bucket.value += value
  }

  return buckets
}

function buildTrendPoints(points: Awaited<ReturnType<typeof getProductRevenueTrend>>): ProductRevenueBarPoint[] {
  return points.slice(-12).map((point) => ({
    date: point.date,
    label: formatMonth(point.date),
    revenue: toNumber(point.revenue),
    orders: toNumber(point.orderCount),
    units: toNumber(point.unitsSold),
  }))
}

export async function getProductsOverviewPageData(searchParams: ProductsOverviewSearchParams): Promise<ProductsOverviewPageData> {
  const parsedFilters = parseFilters<ProductFilters>(searchParams)
  const filters: ProductsOverviewFilters = {
    ...parsedFilters,
    period: parsedFilters.period || '1y',
  }

  const [metrics, products, familySales, planning, revenueTrend] = await Promise.all([
    getProductMetrics(),
    getProducts(122, filters),
    getFamilySales(filters),
    getInventoryPlanningPageData(),
    getProductRevenueTrend(filters),
  ])

  const periodLabel = getPeriodLabel(filters.period)
  const planningBySku = new Map(planning.items.map((item) => [item.sku, item]))
  const familyRevenue = familySales.reduce((sum, family) => sum + toNumber(family.currentPeriodSales), 0)
  const previousFamilyRevenue = familySales.reduce((sum, family) => sum + toNumber(family.previousPeriodSales), 0)
  const revenueGrowth = previousFamilyRevenue > 0 ? ((familyRevenue - previousFamilyRevenue) / previousFamilyRevenue) * 100 : 0
  const totalMargin = products.reduce((sum, product) => sum + toNumber(product.grossMarginAmount), 0)
  const totalUnits = familySales.reduce((sum, family) => sum + toNumber(family.currentPeriodUnits), 0)
  const marginRate = familyRevenue > 0 ? (totalMargin / familyRevenue) * 100 : toNumber(metrics.averageMargin)
  const topProduct = products[0]
  const topSkuShare = topProduct && familyRevenue > 0 ? (toNumber(topProduct.periodSales) / familyRevenue) * 100 : 0
  const buckets = inventoryBuckets(planning.items)
  const revenuePoints = buildTrendPoints(revenueTrend)
  const lowStockCount = planning.items.filter((item) => item.shouldReorder || item.action === 'WATCH').length
  const averageFamilyUnitGrowth = familySales.reduce((sum, family) => sum + family.unitsGrowth, 0) / Math.max(familySales.length, 1)

  return {
    filters,
    periodLabel,
    metrics,
    products,
    familySales,
    planning,
    planningBySku,
    revenuePoints,
    buckets,
    totals: {
      familyRevenue,
      revenueGrowth,
      totalMargin,
      totalUnits,
      marginRate,
      topSkuShare,
      lowStockCount,
      averageFamilyUnitGrowth,
    },
    metricTrends: {
      revenueValues: revenuePoints.map((point) => point.revenue),
      familyValues: familySales.map((family) => toNumber(family.currentPeriodSales)).reverse(),
      unitValues: revenuePoints.map((point) => point.units),
      inventoryValues: buckets.map((bucket) => bucket.value),
    },
  }
}
