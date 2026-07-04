// ABOUTME: Dense inventory planning cockpit with WWD layer buys and full SKU review sections.
// ABOUTME: Keeps the operational ordering view separate from product sales analytics.
import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  ClipboardList,
  Filter,
  MoreHorizontal,
  PackageCheck,
  Share2,
  ShipWheel,
  Warehouse,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getInventoryPlanningPageData, type InventoryPlanningItem } from '@/lib/queries'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan' | 'neutral'

const toneStyles: Record<Tone, {
  icon: string
  text: string
  border: string
  bg: string
  fill: string
  stroke: string
}> = {
  blue: { icon: 'text-blue-300', text: 'text-blue-300', border: 'border-blue-500/30', bg: 'bg-blue-500/10', fill: '#3b82f6', stroke: '#60a5fa' },
  green: { icon: 'text-emerald-300', text: 'text-emerald-300', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', fill: '#10b981', stroke: '#34d399' },
  amber: { icon: 'text-amber-300', text: 'text-amber-300', border: 'border-amber-500/30', bg: 'bg-amber-500/10', fill: '#f59e0b', stroke: '#fbbf24' },
  red: { icon: 'text-red-300', text: 'text-red-300', border: 'border-red-500/30', bg: 'bg-red-500/10', fill: '#ef4444', stroke: '#f87171' },
  purple: { icon: 'text-violet-300', text: 'text-violet-300', border: 'border-violet-500/30', bg: 'bg-violet-500/10', fill: '#8b5cf6', stroke: '#a78bfa' },
  cyan: { icon: 'text-cyan-300', text: 'text-cyan-300', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', fill: '#06b6d4', stroke: '#22d3ee' },
  neutral: { icon: 'text-slate-300', text: 'text-slate-300', border: 'border-slate-700', bg: 'bg-slate-800/70', fill: '#64748b', stroke: '#94a3b8' },
}

const actionLabels: Record<InventoryPlanningItem['action'], string> = {
  OUT_OF_STOCK: 'Out',
  BUY: 'Buy',
  REVIEW: 'Review',
  WATCH: 'Watch',
  OK: 'OK',
}

function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

function compactCurrency(value: number | string | null | undefined, digits = 1) {
  const numeric = toNumber(value)
  const abs = Math.abs(numeric)
  if (abs >= 1_000_000) return `$${formatNumber(numeric / 1_000_000, digits)}M`
  if (abs >= 1_000) return `$${formatNumber(numeric / 1_000, 0)}K`
  return formatCurrency(numeric, { showCents: false })
}

function formatIsoDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : 'n/a'
}

function actionTone(action: InventoryPlanningItem['action']): Tone {
  if (action === 'OUT_OF_STOCK') return 'red'
  if (action === 'BUY') return 'blue'
  if (action === 'REVIEW') return 'amber'
  if (action === 'WATCH') return 'purple'
  return 'green'
}

function Panel({ className, id, children }: { className?: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className={cn('rounded-md border border-slate-800/90 bg-[#0b1322] shadow-[0_10px_24px_rgba(0,0,0,0.16)]', className)}>
      {children}
    </section>
  )
}

function PanelHeader({ title, eyebrow, action }: { title: string; eyebrow?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 border-b border-slate-800 px-3 py-2">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold text-slate-100">{title}</h2>
        {eyebrow ? <p className="mt-0.5 truncate text-xs text-slate-400">{eyebrow}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

function CompactBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return (
    <Badge
      variant="outline"
      className={cn('h-5 rounded-sm border-slate-700 bg-slate-900/80 px-1.5 text-[11px] font-medium text-slate-300', toneStyles[tone].border, toneStyles[tone].bg, toneStyles[tone].text)}
    >
      {children}
    </Badge>
  )
}

function IconButton({ icon: Icon, label }: { icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex size-8 items-center justify-center rounded-md border border-slate-700 bg-slate-950/30 text-slate-300 transition hover:border-slate-500 hover:text-slate-50"
    >
      <Icon className="size-4" />
    </button>
  )
}

function InlineBar({ value, tone = 'blue' }: { value: number; tone?: Tone }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
      <div className="h-full rounded-full" style={{ width: `${clampPercent(value)}%`, backgroundColor: toneStyles[tone].fill }} />
    </div>
  )
}

function Sparkline({ values, tone = 'blue' }: { values: Array<number | string | null | undefined>; tone?: Tone }) {
  const series = values.map(toNumber)
  const safeSeries = series.length < 2 ? [0, ...series] : series
  const width = 144
  const height = 38
  const min = Math.min(...safeSeries)
  const max = Math.max(...safeSeries)
  const range = max - min || 1
  const points = safeSeries.map((value, index) => {
    const x = 2 + (index / Math.max(safeSeries.length - 1, 1)) * (width - 4)
    const y = height - 2 - ((value - min) / range) * (height - 4)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const areaPoints = [`2,${height - 2}`, ...points, `${width - 2},${height - 2}`].join(' ')

  return (
    <svg className="mt-1 h-9 w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <polygon points={areaPoints} fill={toneStyles[tone].fill} opacity="0.12" />
      <polyline points={points.join(' ')} fill="none" stroke={toneStyles[tone].stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  trend,
}: {
  label: string
  value: string
  detail: ReactNode
  icon: ComponentType<{ className?: string }>
  tone: Tone
  trend: Array<number | string | null | undefined>
}) {
  return (
    <Panel className={cn('min-h-36 p-3', toneStyles[tone].border)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase text-slate-400">
            <Icon className={cn('size-3.5 shrink-0', toneStyles[tone].icon)} />
            <span className="truncate">{label}</span>
          </div>
          <div className="mt-1 truncate text-2xl font-semibold tabular-nums text-slate-50">{value}</div>
        </div>
      </div>
      <div className="mt-1 min-h-8 text-xs leading-4 text-slate-400">{detail}</div>
      <Sparkline values={trend} tone={tone} />
    </Panel>
  )
}

function conicStops<T>(
  items: T[],
  total: number,
  getValue: (item: T) => number,
  getColor: (item: T, index: number) => string,
) {
  return items.reduce<{ cursor: number; stops: string[] }>((acc, item, index) => {
    const start = acc.cursor
    const size = total > 0 ? (getValue(item) / total) * 100 : 0
    const end = start + size

    return {
      cursor: end,
      stops: [...acc.stops, `${getColor(item, index)} ${start}% ${end}%`],
    }
  }, { cursor: 0, stops: [] }).stops.join(', ')
}

function inboundLabel(item: InventoryPlanningItem) {
  const parts = []
  if (toNumber(item.inboundOpenPoQty) > 0) parts.push(`${formatNumber(item.inboundOpenPoQty, 0)} PO`)
  if (toNumber(item.futureReceiptQty) > 0) parts.push(`${formatNumber(item.futureReceiptQty, 0)} future`)
  return parts.length > 0 ? parts.join(' + ') : 'none'
}

function buyPlanPrimary(item: InventoryPlanningItem, useLayerPlan: boolean) {
  if (!useLayerPlan || !item.sixPackUnitsPerLayer || toNumber(item.suggestedBuyQty) <= 0) {
    return formatNumber(item.suggestedBuyQty, 0)
  }

  return `${formatNumber(item.reorderLayerCount, 0)} layer${toNumber(item.reorderLayerCount) === 1 ? '' : 's'}`
}

function buyPlanDetail(item: InventoryPlanningItem, useLayerPlan: boolean) {
  if (toNumber(item.suggestedBuyQty) <= 0) return 'no buy recommended'
  if (!useLayerPlan || !item.sixPackUnitsPerLayer) return `${formatNumber(item.suggestedBuyQty, 0)} model units`
  return `${formatNumber(item.layerRoundedBuyQty, 0)} units; model ${formatNumber(item.suggestedBuyQty, 0)}, +${formatNumber(item.layerRoundingExtraQty, 0)}`
}

function operationalBuyQty(item: InventoryPlanningItem, useLayerPlan: boolean) {
  if (useLayerPlan && item.sixPackUnitsPerLayer && toNumber(item.suggestedBuyQty) > 0) {
    return toNumber(item.layerRoundedBuyQty)
  }
  return toNumber(item.suggestedBuyQty)
}

function operationalBuyCost(item: InventoryPlanningItem, useLayerPlan: boolean) {
  if (useLayerPlan && item.sixPackUnitsPerLayer && toNumber(item.suggestedBuyQty) > 0) {
    return operationalBuyQty(item, true) * toNumber(item.purchaseCost)
  }
  return toNumber(item.suggestedBuyCost)
}

function sortPlanningItems(items: InventoryPlanningItem[]) {
  return [...items].sort((a, b) => {
    const actionOrder: Record<InventoryPlanningItem['action'], number> = { OUT_OF_STOCK: 0, BUY: 1, REVIEW: 2, WATCH: 3, OK: 4 }
    const actionCompare = actionOrder[a.action] - actionOrder[b.action]
    if (actionCompare !== 0) return actionCompare

    const costCompare = toNumber(b.suggestedBuyCost) - toNumber(a.suggestedBuyCost)
    if (costCompare !== 0) return costCompare

    return a.sku.localeCompare(b.sku)
  })
}

function isWwd(item: InventoryPlanningItem) {
  return item.preferredVendor === 'WWD'
}

function isFba(item: InventoryPlanningItem) {
  return item.policyBucket === 'FBA_REPLENISHMENT_MODEL' || item.sku.toUpperCase().includes('FBA')
}

function isAdhesive(item: InventoryPlanningItem) {
  const searchable = `${item.productFamily} ${item.materialType} ${item.salesDescription}`.toLowerCase()
  return searchable.includes('adhesive') || searchable.includes('epx')
}

function isAccessory(item: InventoryPlanningItem) {
  const searchable = `${item.productFamily} ${item.salesDescription} ${item.sku}`.toLowerCase()
  return item.productFamily === 'Accessories' || searchable.includes('brush') || searchable.includes('drill bit') || searchable.includes('eyebolt')
}

function sectionSummary(items: InventoryPlanningItem[], useLayerPlan = false) {
  const buyItems = items.filter((item) => item.shouldReorder)
  const buyQty = buyItems.reduce((sum, item) => sum + operationalBuyQty(item, useLayerPlan), 0)
  const buyCost = buyItems.reduce((sum, item) => sum + operationalBuyCost(item, useLayerPlan), 0)
  return `${formatNumber(items.length, 0)} SKUs | ${formatNumber(buyItems.length, 0)} buys | ${formatNumber(buyQty, 0)} units | ${compactCurrency(buyCost, 0)}`
}

function inventoryBuckets(items: InventoryPlanningItem[]) {
  const buckets = [
    { label: 'Buy', count: 0, cost: 0, tone: 'blue' as Tone },
    { label: 'Review', count: 0, cost: 0, tone: 'amber' as Tone },
    { label: 'Out', count: 0, cost: 0, tone: 'red' as Tone },
    { label: 'Watch', count: 0, cost: 0, tone: 'purple' as Tone },
    { label: 'OK', count: 0, cost: 0, tone: 'green' as Tone },
  ]

  for (const item of items) {
    const bucket = item.action === 'BUY'
      ? buckets[0]
      : item.action === 'REVIEW'
        ? buckets[1]
        : item.action === 'OUT_OF_STOCK'
          ? buckets[2]
          : item.action === 'WATCH'
            ? buckets[3]
            : buckets[4]
    bucket.count += 1
    bucket.cost += toNumber(item.suggestedBuyCost)
  }

  return buckets
}

function PlanningMixPanel({ buckets, totalSkus }: { buckets: ReturnType<typeof inventoryBuckets>; totalSkus: number }) {
  const total = Math.max(totalSkus, 1)
  const gradient = `conic-gradient(${conicStops(buckets, total, (bucket) => bucket.count, (bucket) => toneStyles[bucket.tone].fill)})`

  return (
    <Panel>
      <PanelHeader title="Planning Mix" eyebrow="Current action distribution across planning SKUs" />
      <div className="grid gap-4 p-3 md:grid-cols-[9rem_minmax(0,1fr)]">
        <div className="relative size-32 place-self-center rounded-full" style={{ background: gradient }}>
          <div className="absolute inset-5 grid place-items-center rounded-full bg-[#0b1322] text-center">
            <div>
              <p className="text-lg font-semibold tabular-nums text-slate-50">{formatNumber(totalSkus, 0)}</p>
              <p className="text-[10px] uppercase text-slate-500">SKUs</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {buckets.map((bucket) => (
            <div key={bucket.label} className="grid grid-cols-[minmax(0,1fr)_3rem_4.5rem] items-center gap-2 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: toneStyles[bucket.tone].fill }} />
                <span className="truncate text-slate-300">{bucket.label}</span>
              </div>
              <span className="text-right font-mono text-slate-100">{formatNumber(bucket.count, 0)}</span>
              <span className="text-right font-mono text-slate-500">{formatNumber((bucket.count / total) * 100, 1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

function BuyCostPanel({ buckets }: { buckets: ReturnType<typeof inventoryBuckets> }) {
  const actionable = buckets.filter((bucket) => bucket.label !== 'OK')
  const maxCost = Math.max(...actionable.map((bucket) => bucket.cost), 1)

  return (
    <Panel>
      <PanelHeader title="Buy Cost by Action" eyebrow="Model recommended spend by planning action" />
      <div className="grid h-40 grid-cols-4 items-end gap-3 px-3 pb-3 pt-8">
        {actionable.map((bucket) => (
          <div key={bucket.label} className="flex h-full min-w-0 flex-col justify-end gap-2 text-center">
            <div className="text-xs font-semibold tabular-nums text-slate-100">{compactCurrency(bucket.cost, 0)}</div>
            <div className="mx-auto w-10 rounded-t-sm" style={{ height: `${Math.max((bucket.cost / maxCost) * 100, bucket.cost > 0 ? 8 : 2)}%`, backgroundColor: toneStyles[bucket.tone].fill, opacity: 0.85 }} />
            <div className="truncate text-[11px] text-slate-500">{bucket.label}</div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function WwdLayerPanel({ items }: { items: InventoryPlanningItem[] }) {
  const rows = sortPlanningItems(items).slice(0, 12)
  const maxCost = Math.max(...rows.map((item) => operationalBuyCost(item, true)), 1)

  return (
    <Panel id="wwd-layers" className="border-blue-500/30">
      <PanelHeader
        title="WWD Layer Planning"
        eyebrow="Layer-aware buy plan for WWD vendor SKUs"
        action={<CompactBadge tone="blue">{sectionSummary(items, true)}</CompactBadge>}
      />
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 bg-slate-950/30 hover:bg-slate-950/30">
            <TableHead className="h-8 px-3 text-[11px] uppercase text-slate-500">SKU</TableHead>
            <TableHead className="h-8 text-[11px] uppercase text-slate-500">Item</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">On Hand</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Inbound</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Model Qty</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Layer Plan</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Cost</TableHead>
            <TableHead className="h-8 text-[11px] uppercase text-slate-500">Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((item) => {
            const cost = operationalBuyCost(item, true)
            const tone = actionTone(item.action)
            return (
              <TableRow key={item.sku} className="h-10 border-slate-800 hover:bg-slate-900/50">
                <TableCell className="max-w-[8rem] px-3 py-1.5">
                  <Link href={`/products/${encodeURIComponent(item.sku)}`} className="block truncate font-mono text-xs font-semibold text-blue-300 hover:text-blue-200">{item.sku}</Link>
                  <CompactBadge tone={tone}>{actionLabels[item.action]}</CompactBadge>
                </TableCell>
                <TableCell className="max-w-[20rem] py-1.5">
                  <p className="truncate text-xs font-medium text-slate-200">{item.salesDescription || item.productFamily}</p>
                  <p className="truncate text-[11px] text-slate-500">{item.productFamily} | {item.confidenceLevel} confidence | {item.sixPackUnitsPerLayer ? `${item.sixPackUnitsPerLayer}/layer` : 'layer TBD'}</p>
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">
                  <p className={toNumber(item.onHandQty) <= 0 ? 'text-red-300' : 'text-slate-100'}>{formatNumber(item.onHandQty, 0)}</p>
                  <p className="text-[11px] text-slate-500">{item.positionDays || '-'}d</p>
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">
                  <p>{inboundLabel(item)}</p>
                  <p className="text-[11px] text-slate-500">{item.nextOpenPoDate || 'no date'}</p>
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">{formatNumber(item.suggestedBuyQty, 0)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-100">
                  <p className={operationalBuyQty(item, true) > 0 ? 'text-blue-300' : 'text-slate-500'}>{buyPlanPrimary(item, true)}</p>
                  <p className="text-[11px] text-slate-500">{buyPlanDetail(item, true)}</p>
                </TableCell>
                <TableCell className="py-1.5 text-right">
                  <div className="ml-auto w-20 space-y-1">
                    <p className="font-mono text-xs text-slate-100">{compactCurrency(cost, 0)}</p>
                    <InlineBar value={(cost / maxCost) * 100} tone={tone} />
                  </div>
                </TableCell>
                <TableCell className="max-w-[16rem] py-1.5">
                  <p className="truncate text-xs text-slate-400" title={item.recommendationReason}>{item.recommendationReason || item.policyAssignmentReason || '-'}</p>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Panel>
  )
}

function SectionTable({
  title,
  description,
  items,
  tone = 'neutral',
}: {
  title: string
  description: string
  items: InventoryPlanningItem[]
  tone?: Tone
}) {
  const rows = sortPlanningItems(items)
  const maxCost = Math.max(...rows.map((item) => toNumber(item.suggestedBuyCost)), 1)

  if (rows.length === 0) return null

  return (
    <Panel className={toneStyles[tone].border}>
      <PanelHeader title={title} eyebrow={description} action={<CompactBadge tone={tone}>{sectionSummary(rows)}</CompactBadge>} />
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 bg-slate-950/30 hover:bg-slate-950/30">
            <TableHead className="h-8 px-3 text-[11px] uppercase text-slate-500">SKU</TableHead>
            <TableHead className="h-8 text-[11px] uppercase text-slate-500">Item</TableHead>
            <TableHead className="h-8 text-[11px] uppercase text-slate-500">Action</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">On Hand</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Position</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Inbound</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Forecast</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Buy Qty</TableHead>
            <TableHead className="h-8 text-right text-[11px] uppercase text-slate-500">Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((item) => {
            const rowTone = actionTone(item.action)
            const cost = toNumber(item.suggestedBuyCost)
            return (
              <TableRow key={item.sku} className="h-10 border-slate-800 hover:bg-slate-900/50">
                <TableCell className="max-w-[8rem] px-3 py-1.5">
                  <Link href={`/products/${encodeURIComponent(item.sku)}`} className="block truncate font-mono text-xs font-semibold text-blue-300 hover:text-blue-200">{item.sku}</Link>
                  <p className="truncate text-[11px] text-slate-500">{item.preferredVendor}</p>
                </TableCell>
                <TableCell className="max-w-[20rem] py-1.5">
                  <p className="truncate text-xs font-medium text-slate-200">{item.salesDescription || item.productFamily}</p>
                  <p className="truncate text-[11px] text-slate-500">{item.productFamily} | {item.materialType} | {item.confidenceLevel}</p>
                </TableCell>
                <TableCell className="py-1.5"><CompactBadge tone={rowTone}>{actionLabels[item.action]}</CompactBadge></TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">{formatNumber(item.onHandQty, 0)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">
                  <p>{item.positionDays || '-'}</p>
                  <p className="text-[11px] text-slate-500">{item.stockoutDate || item.reorderByDate || '-'}</p>
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">{inboundLabel(item)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">{formatNumber(item.forecastDailyQty, 1)}/d</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-100">
                  <p className={toNumber(item.suggestedBuyQty) > 0 ? 'text-blue-300' : 'text-slate-500'}>{formatNumber(item.suggestedBuyQty, 0)}</p>
                  <p className="text-[11px] text-slate-500">{formatNumber(item.layerRoundedBuyQty, 0)} layer</p>
                </TableCell>
                <TableCell className="py-1.5 text-right">
                  <div className="ml-auto w-20 space-y-1">
                    <p className="font-mono text-xs text-slate-100">{compactCurrency(cost, 0)}</p>
                    <InlineBar value={(cost / maxCost) * 100} tone={rowTone} />
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Panel>
  )
}

export default async function InventoryPage() {
  const { summary, items } = await getInventoryPlanningPageData()
  const wwdItems = items.filter(isWwd)
  const fbaItems = items.filter((item) => !isWwd(item) && isFba(item))
  const adhesiveItems = items.filter((item) => !isWwd(item) && !isFba(item) && isAdhesive(item))
  const accessoryItems = items.filter((item) => !isWwd(item) && !isFba(item) && !isAdhesive(item) && isAccessory(item))
  const otherItems = items.filter((item) => !isWwd(item) && !isFba(item) && !isAdhesive(item) && !isAccessory(item))
  const buckets = inventoryBuckets(items)
  const reviewItems = items.filter((item) => item.requiresManualReview || item.action === 'REVIEW')
  const outItems = items.filter((item) => item.action === 'OUT_OF_STOCK')
  const buyItems = items.filter((item) => item.shouldReorder)
  const stockoutCosts = outItems.map((item) => item.suggestedBuyCost)
  const buyCosts = buyItems.map((item) => item.suggestedBuyCost)
  const onHandValues = items.slice(0, 30).map((item) => toNumber(item.onHandQty) * toNumber(item.purchaseCost))

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center border-b border-slate-800 bg-[#07101d]/95 text-slate-100 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-3 px-3">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="-ml-1 text-slate-300 hover:bg-slate-800 hover:text-slate-50" />
            <Separator orientation="vertical" className="hidden bg-slate-800 data-[orientation=vertical]:h-5 sm:block" />
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-5 text-slate-50">Inventory Planning</h1>
              <p className="hidden truncate text-xs text-slate-400 sm:block">Layer-aware buys, inbound coverage, forecast posture, and full SKU review</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-1 rounded-md border border-slate-700 bg-slate-950/40 px-2 py-1 text-xs text-slate-200 md:flex">
              <CalendarDays className="size-3.5 text-slate-400" />
              <span className="font-mono">{formatIsoDate(summary.inventoryAsOfDate)}</span>
            </div>
            <CompactBadge tone="blue">WWD first</CompactBadge>
            <div className="hidden items-center gap-2 md:flex">
              <IconButton icon={Share2} label="Share inventory dashboard" />
              <IconButton icon={Filter} label="Filter inventory dashboard" />
              <IconButton icon={MoreHorizontal} label="More inventory dashboard actions" />
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-[calc(100svh-3.5rem)] space-y-2 bg-[#08111f] p-2 text-slate-100 sm:p-3">
        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
          <MetricTile label="WWD Planning" value={formatNumber(summary.wwdBuyCount, 0)} detail={`${formatNumber(summary.wwdSuggestedBuyQty, 0)} units | ${compactCurrency(summary.wwdSuggestedBuyCost, 0)}`} icon={ShipWheel} tone="blue" trend={wwdItems.map((item) => item.suggestedBuyCost)} />
          <MetricTile label="Suggested Buys" value={formatNumber(summary.buyCount, 0)} detail={`${formatNumber(summary.suggestedBuyQty, 0)} model units recommended`} icon={ClipboardList} tone="green" trend={buyCosts} />
          <MetricTile label="Buy Cost" value={compactCurrency(summary.suggestedBuyCost, 0)} detail={`${formatNumber(summary.reviewCount, 0)} SKUs need review`} icon={PackageCheck} tone="amber" trend={buyCosts} />
          <MetricTile label="Out Of Stock" value={formatNumber(summary.outOfStockCount, 0)} detail={`${formatNumber(summary.totalSkus, 0)} active planning SKUs`} icon={AlertTriangle} tone={summary.outOfStockCount > 0 ? 'red' : 'green'} trend={stockoutCosts} />
          <MetricTile label="Inbound PO Qty" value={formatNumber(summary.inboundQty, 0)} detail={`${formatNumber(summary.futureReceiptQty, 0)} future receipt units`} icon={Warehouse} tone="cyan" trend={items.map((item) => item.inboundOpenPoQty).slice(0, 30)} />
          <MetricTile label="Manual Review" value={formatNumber(reviewItems.length, 0)} detail={`${formatNumber((reviewItems.length / Math.max(items.length, 1)) * 100, 1)}% of planning SKUs`} icon={Boxes} tone={reviewItems.length > 0 ? 'purple' : 'green'} trend={reviewItems.map((item) => item.suggestedBuyCost)} />
        </section>

        <section className="grid gap-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(22rem,0.7fr)]">
          <WwdLayerPanel items={wwdItems} />
          <div className="grid content-start gap-2">
            <PlanningMixPanel buckets={buckets} totalSkus={summary.totalSkus} />
            <BuyCostPanel buckets={buckets} />
          </div>
        </section>

        <section className="grid gap-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Panel>
            <PanelHeader title="Inventory Exposure" eyebrow="On-hand value and ordering pressure in current planning set" action={<CompactBadge tone="cyan">{formatNumber(items.length, 0)} SKUs</CompactBadge>} />
            <div className="grid gap-3 p-3 md:grid-cols-2">
              <MiniStat label="Current on-hand value" value={compactCurrency(onHandValues.reduce((sum, value) => sum + value, 0), 1)} detail="estimated from on-hand quantity and purchase cost" tone="cyan" />
              <MiniStat label="Open inbound" value={formatNumber(summary.inboundQty, 0)} detail="open PO quantity from planning mart" tone="green" />
              <MiniStat label="Future receipts" value={formatNumber(summary.futureReceiptQty, 0)} detail="future receipt quantity after anchor" tone="blue" />
              <MiniStat label="Out-of-stock buy cost" value={compactCurrency(outItems.reduce((sum, item) => sum + toNumber(item.suggestedBuyCost), 0), 0)} detail={`${formatNumber(outItems.length, 0)} SKUs at zero on hand`} tone={outItems.length > 0 ? 'red' : 'green'} />
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Priority Queue" eyebrow="Highest risk items across all buckets" action={<Link href="#all-skus" className="text-xs font-medium text-blue-300 hover:text-blue-200">All SKUs <ArrowUpRight className="inline size-3" /></Link>} />
            <div className="space-y-2 p-3">
              {sortPlanningItems(items).slice(0, 10).map((item) => {
                const tone = actionTone(item.action)
                return (
                  <div key={item.sku} className="grid grid-cols-[auto_7rem_minmax(0,1fr)_4rem_5rem] items-center gap-2 text-xs">
                    <AlertTriangle className={cn('size-3.5', toneStyles[tone].icon)} />
                    <Link href={`/products/${encodeURIComponent(item.sku)}`} className="truncate font-mono font-semibold text-blue-300 hover:text-blue-200">{item.sku}</Link>
                    <span className="truncate text-slate-400">{item.salesDescription || item.productFamily}</span>
                    <span className="text-right font-mono text-slate-100">{formatNumber(item.onHandQty, 0)}</span>
                    <CompactBadge tone={tone}>{actionLabels[item.action]}</CompactBadge>
                  </div>
                )
              })}
            </div>
          </Panel>
        </section>

        <section id="all-skus" className="space-y-2">
          <SectionTable title="Other Vendor Work" description="Non-WWD items that are not FBA, adhesive, or accessory planning buckets." items={otherItems} tone="neutral" />
          <SectionTable title="FBA Review" description="FBA replenishment logic and marketplace stock context." items={fbaItems} tone="purple" />
          <SectionTable title="Adhesives And Packaging Review" description="Adhesive SKUs and packaging with MOQ nuance." items={adhesiveItems} tone="amber" />
          <SectionTable title="Non-WWD Accessories Review" description="Accessory SKUs outside the WWD order path." items={accessoryItems} tone="cyan" />
        </section>
      </main>
    </>
  )
}

function MiniStat({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: Tone }) {
  return (
    <div className={cn('rounded-md border p-3', toneStyles[tone].border, toneStyles[tone].bg)}>
      <p className="text-[11px] uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-50">{value}</p>
      <p className="mt-1 truncate text-xs text-slate-400">{detail}</p>
    </div>
  )
}
