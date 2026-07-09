import type { ProductReorderPlanningDetail } from '@/lib/queries'
import { formatCurrency, formatNumber } from '@/lib/utils'

export type ProductDetailTone = 'neutral' | 'good' | 'blue' | 'warn' | 'bad'
export type ProductDetailBarTone = 'blue' | 'green' | 'amber' | 'red' | 'slate'

export function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

export function compactCurrency(value: number | string | null | undefined) {
  return formatCurrency(value || 0, { showCents: false })
}

export function formatInteger(value: string | number | null | undefined): string {
  return formatNumber(toNumber(value), 0)
}

export function formatDecimal(value: string | number | null | undefined, digits = 1): string {
  return formatNumber(toNumber(value), digits)
}

function parseReportDate(value: string | null | undefined): Date | null {
  if (!value) return null

  const dateParts = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateParts) {
    return new Date(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3]))
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: string | null | undefined): string {
  const date = parseReportDate(value)
  if (!date) return value || '-'

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function compactDate(value: string | null | undefined): string {
  const date = parseReportDate(value)
  if (!date) return value || '-'

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function monthAxisLabel(value: string) {
  const date = parseReportDate(value)
  if (!date) {
    return {
      short: value.slice(0, 10),
      long: value.slice(0, 10),
    }
  }

  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const year = date.toLocaleDateString('en-US', { year: '2-digit' })

  return {
    short: month,
    long: `${month} '${year}`,
  }
}

export function readableCode(value: string | null | undefined): string {
  if (!value) return '-'
  return value.replaceAll('_', ' ').replace(/\bsku\b/gi, 'SKU').replace(/\bfba\b/gi, 'FBA')
}

export function safePercent(part: number, total: number, digits = 1) {
  if (total <= 0) return '0'
  return formatNumber((part / total) * 100, digits)
}

export function marginTone(value: number): ProductDetailTone {
  if (value >= 65) return 'good'
  if (value >= 50) return 'blue'
  if (value >= 35) return 'warn'
  return 'bad'
}

export function actionTone(action: string | null | undefined): ProductDetailTone {
  if (action === 'OUT_OF_STOCK' || action === 'REVIEW') return 'bad'
  if (action === 'BUY' || action === 'WATCH') return 'warn'
  if (action === 'OK') return 'good'
  return 'blue'
}

export function inventoryTone(status: string | null | undefined): ProductDetailTone {
  if (!status) return 'neutral'
  if (['NEGATIVE_OR_ZERO', 'CRITICAL'].includes(status)) return 'bad'
  if (['LOW', 'MODERATE'].includes(status)) return 'warn'
  if (status === 'SUFFICIENT') return 'good'
  return 'blue'
}

export function barToneFromTone(tone: ProductDetailTone): ProductDetailBarTone {
  if (tone === 'good') return 'green'
  if (tone === 'warn') return 'amber'
  if (tone === 'bad') return 'red'
  if (tone === 'neutral') return 'slate'
  return 'blue'
}

export function compactInboundLabel(planning: ProductReorderPlanningDetail | null): string {
  if (!planning) return 'none'

  const labels = []
  if (toNumber(planning.inboundOpenPoQty) > 0) {
    labels.push(`${formatInteger(planning.inboundOpenPoQty)} PO`)
  }
  if (toNumber(planning.futureReceiptQty) > 0) {
    labels.push(`${formatInteger(planning.futureReceiptQty)} future`)
  }

  return labels.length > 0 ? labels.join(' + ') : 'none'
}

export function operationalBuyQty(planning: ProductReorderPlanningDetail): number {
  if (planning.sixPackUnitsPerLayer && toNumber(planning.layerRoundedBuyQty) > 0) {
    return toNumber(planning.layerRoundedBuyQty)
  }

  return toNumber(planning.suggestedBuyQty)
}

export function operationalBuyLabel(planning: ProductReorderPlanningDetail): string {
  if (toNumber(planning.suggestedBuyQty) <= 0) return 'No buy'

  if (planning.sixPackUnitsPerLayer) {
    return `${formatInteger(planning.reorderLayerCount)} layer${toNumber(planning.reorderLayerCount) === 1 ? '' : 's'}`
  }

  return `${formatInteger(planning.suggestedBuyQty)} units`
}

export function operationalBuyDetail(planning: ProductReorderPlanningDetail): string {
  if (toNumber(planning.suggestedBuyQty) <= 0) {
    if (planning.demandSpikeRiskLevel !== 'none' && toNumber(planning.growthCaseReorderQty) > 0) {
      return `Growth case ${formatInteger(planning.growthCaseReorderQty)} units; actionable buy dampened for ${planning.demandSpikeRiskLevel} spike risk`
    }

    return planning.recommendationReason
  }

  if (!planning.sixPackUnitsPerLayer) {
    return `${formatInteger(planning.suggestedBuyQty)} model units`
  }

  return `${formatInteger(planning.layerRoundedBuyQty)} units after ${planning.sixPackUnitsPerLayer}-unit layer rounding`
}
