import {
  getProductByName,
  getProductInboundLines,
  getProductInventoryStatus,
  getProductInventoryTrend,
  getProductMonthlyRevenue,
  getProductPriceDistribution,
  getProductReorderPlanningDetail,
} from '@/lib/queries'
import { getTopCompaniesForProduct } from '@/lib/queries/companies'
import { getPeriodLabel, parseFilters, type ProductDetailFilters } from '@/lib/filter-utils'
import { operationalBuyQty, toNumber } from './helpers'

export type ProductDetailSearchParams = { [key: string]: string | string[] | undefined }
export type ProductDetailFiltersWithPeriod = ProductDetailFilters & { period: string }
export type ProductDetailProduct = NonNullable<Awaited<ReturnType<typeof getProductByName>>>

export interface ProductDetailPageData {
  productName: string
  product: ProductDetailProduct
  filters: ProductDetailFiltersWithPeriod
  periodLabel: string
  planning: Awaited<ReturnType<typeof getProductReorderPlanningDetail>>
  salesData: Awaited<ReturnType<typeof getProductMonthlyRevenue>>
  topCompanies: Awaited<ReturnType<typeof getTopCompaniesForProduct>>
  priceDistribution: Awaited<ReturnType<typeof getProductPriceDistribution>>
  inventoryStatus: Awaited<ReturnType<typeof getProductInventoryStatus>>
  inboundLines: Awaited<ReturnType<typeof getProductInboundLines>>
  inventoryTrend: Awaited<ReturnType<typeof getProductInventoryTrend>>
  metrics: {
    periodRevenue: number
    periodOrders: number
    periodUnits: number
    marginPct: number
    marginDollars: number
    topBuyerShare: number
    buyQty: number
    buyCost: number
    positionQty: number
    positionDays: string | number
  }
}

export async function getProductDetailPageData(
  productName: string,
  searchParams: ProductDetailSearchParams,
): Promise<ProductDetailPageData | null> {
  const product = await getProductByName(productName)

  if (!product) {
    return null
  }

  const parsedFilters = parseFilters<ProductDetailFilters>(searchParams)
  const filters: ProductDetailFiltersWithPeriod = {
    ...parsedFilters,
    period: parsedFilters.period || '1y',
  }

  const [
    planning,
    salesData,
    topCompanies,
    priceDistribution,
    inventoryStatus,
    inboundLines,
    inventoryTrend,
  ] = await Promise.all([
    getProductReorderPlanningDetail(productName),
    getProductMonthlyRevenue(productName, filters),
    getTopCompaniesForProduct(productName, 10, filters),
    getProductPriceDistribution(productName, filters),
    getProductInventoryStatus(productName),
    getProductInboundLines(productName),
    getProductInventoryTrend(productName),
  ])

  const periodLabel = getPeriodLabel(filters.period)
  const periodRevenue = salesData.reduce((sum, item) => sum + toNumber(item.revenue), 0)
  const periodOrders = salesData.reduce((sum, item) => sum + Number(item.orderCount || 0), 0)
  const periodUnits = priceDistribution.totalSales || topCompanies.reduce((sum, company) => sum + toNumber(company.totalQuantityPurchased), 0)
  const marginPct = toNumber(product.actualMarginPercentage || product.marginPercentage)
  const marginDollars = periodRevenue * (marginPct / 100)
  const topBuyer = topCompanies[0]
  const topBuyerShare = topBuyer ? toNumber(topBuyer.totalAmountSpent) / Math.max(periodRevenue, 1) : 0
  const buyQty = planning ? operationalBuyQty(planning) : 0
  const buyCost = planning ? buyQty * toNumber(planning.purchaseCost) : 0
  const positionQty = planning ? toNumber(planning.availablePositionQty) : toNumber(inventoryStatus?.estimatedAvailableQuantity)
  const positionDays = planning?.positionDays || inventoryStatus?.daysRemaining90DVelocity || ''

  return {
    productName,
    product,
    filters,
    periodLabel,
    planning,
    salesData,
    topCompanies,
    priceDistribution,
    inventoryStatus,
    inboundLines,
    inventoryTrend,
    metrics: {
      periodRevenue,
      periodOrders,
      periodUnits,
      marginPct,
      marginDollars,
      topBuyerShare,
      buyQty,
      buyCost,
      positionQty,
      positionDays,
    },
  }
}
