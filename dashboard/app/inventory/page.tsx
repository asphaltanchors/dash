// ABOUTME: Dense inventory planning cockpit with WWD layer buys and full SKU review sections.
// ABOUTME: Keeps the operational ordering view separate from product sales analytics.
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  ClipboardList,
  DollarSign,
  Filter,
  MoreHorizontal,
  PackageCheck,
  Share2,
  Warehouse,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  CompactBadge,
  formatCompactCurrency as compactCurrency,
  formatIsoDate,
  MetricTile,
  ReportHeader as PanelHeader,
  ReportIconButton as IconButton,
  ReportPanel as Panel,
  type Tone,
  toneStyles,
  toNumber,
} from '@/components/dashboard/report-ui'
import {
  getInventoryPlanningPageData,
  type InventoryPlanningItem,
  type WwdPalletPlanItem,
} from '@/lib/queries'
import { cn, formatNumber } from '@/lib/utils'

const actionLabels: Record<InventoryPlanningItem['action'], string> = {
  OUT_OF_STOCK: 'Out',
  BUY: 'Buy',
  REVIEW: 'Review',
  WATCH: 'Watch',
  OK: 'OK',
}

function actionTone(action: InventoryPlanningItem['action']): Tone {
  if (action === 'OUT_OF_STOCK') return 'red'
  if (action === 'BUY') return 'blue'
  if (action === 'REVIEW') return 'amber'
  if (action === 'WATCH') return 'purple'
  return 'green'
}

function inboundLabel(item: InventoryPlanningItem) {
  const parts = []
  if (toNumber(item.inboundOpenPoQty) > 0) parts.push(`${formatNumber(item.inboundOpenPoQty, 0)} PO`)
  if (toNumber(item.futureReceiptQty) > 0) parts.push(`${formatNumber(item.futureReceiptQty, 0)} future`)
  return parts.length > 0 ? parts.join(' + ') : 'none'
}

function inboundOrderLabel(item: InventoryPlanningItem) {
  const totalOnOrder = toNumber(item.inboundOpenPoQty) + toNumber(item.futureReceiptQty)
  return totalOnOrder > 0 ? formatNumber(totalOnOrder, 0) : 'none'
}

function positionMonthsLabel(item: InventoryPlanningItem) {
  const positionDays = toNumber(item.positionDays)
  if (positionDays <= 0) return '0.0'
  return formatNumber(positionDays / 30.4375, 1)
}

function buyPlanPrimary(item: InventoryPlanningItem, useLayerPlan: boolean) {
  if (!useLayerPlan || !item.sixPackUnitsPerLayer || toNumber(item.suggestedBuyQty) <= 0) {
    return formatNumber(item.suggestedBuyQty, 0)
  }

  return `${formatNumber(item.reorderLayerCount, 0)} layer${toNumber(item.reorderLayerCount) === 1 ? '' : 's'}`
}

function buyPlanDetail(item: InventoryPlanningItem, useLayerPlan: boolean) {
  if (toNumber(item.suggestedBuyQty) <= 0) return ''
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

function urgencyDateValue(item: InventoryPlanningItem) {
  const date = item.reorderByDate || item.stockoutDate
  return date ? Date.parse(`${date}T00:00:00Z`) : Number.POSITIVE_INFINITY
}

function sortBuyItemsByUrgency(items: InventoryPlanningItem[]) {
  return [...items].sort((a, b) => {
    const actionOrder: Record<InventoryPlanningItem['action'], number> = { OUT_OF_STOCK: 0, BUY: 1, REVIEW: 2, WATCH: 3, OK: 4 }
    const actionCompare = actionOrder[a.action] - actionOrder[b.action]
    if (actionCompare !== 0) return actionCompare

    const urgencyCompare = urgencyDateValue(a) - urgencyDateValue(b)
    if (urgencyCompare !== 0) return urgencyCompare

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

function WwdLayerPanel({ items }: { items: InventoryPlanningItem[] }) {
  const rows = sortPlanningItems(items)

  return (
    <Panel id="wwd-layers" className="border-blue-500/30">
      <PanelHeader
        title="All WWD SKU Status"
        eyebrow="Current status, coverage, inbound, and model buy signal for WWD SKUs"
        action={<CompactBadge tone="blue">{sectionSummary(items, true)}</CompactBadge>}
      />
      <Table className="table-fixed [&_td]:overflow-hidden [&_th]:overflow-hidden">
        <TableHeader>
          <TableRow className="border-slate-800 bg-slate-950/30 hover:bg-slate-950/30">
            <TableHead className="h-8 w-[7%] px-3 text-[11px] uppercase text-slate-500">Action</TableHead>
            <TableHead className="h-8 w-[9%] px-3 text-[11px] uppercase text-slate-500">SKU</TableHead>
            <TableHead className="h-8 w-[37%] text-[11px] uppercase text-slate-500">Item</TableHead>
            <TableHead className="h-8 w-[8%] text-right text-[11px] uppercase text-slate-500">On Hand</TableHead>
            <TableHead className="h-8 w-[10%] text-right text-[11px] uppercase text-slate-500">Inbound</TableHead>
            <TableHead className="h-8 w-[10%] text-right text-[11px] uppercase text-slate-500">Position Months</TableHead>
            <TableHead className="h-8 w-[8%] text-right text-[11px] uppercase text-slate-500">Reorder Qty</TableHead>
            <TableHead className="h-8 w-[11%] text-right text-[11px] uppercase text-slate-500">Layer Plan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((item) => {
            const tone = actionTone(item.action)
            return (
              <TableRow key={item.sku} className="h-10 border-slate-800 hover:bg-slate-900/50">
                <TableCell className="px-3 py-1.5">
                  <CompactBadge tone={tone}>{actionLabels[item.action]}</CompactBadge>
                </TableCell>
                <TableCell className="min-w-0 px-3 py-1.5">
                  <Link href={`/products/${encodeURIComponent(item.sku)}`} className="block truncate font-mono text-xs font-semibold text-blue-300 hover:text-blue-200">{item.sku}</Link>
                </TableCell>
                <TableCell className="min-w-0 py-1.5">
                  <p className="truncate text-xs font-medium text-slate-200">{item.salesDescription || item.productFamily}</p>
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">
                  <p className={toNumber(item.onHandQty) <= 0 ? 'text-red-300' : 'text-slate-100'}>{formatNumber(item.onHandQty, 0)}</p>
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">
                  <p className="truncate">{inboundOrderLabel(item)}</p>
                  {item.nextOpenPoDate ? <p className="text-[11px] text-slate-500">{item.nextOpenPoDate}</p> : null}
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">{positionMonthsLabel(item)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">{formatNumber(item.suggestedBuyQty, 0)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-100">
                  <p className={operationalBuyQty(item, true) > 0 ? 'text-blue-300' : 'text-slate-500'}>{buyPlanPrimary(item, true)}</p>
                  <p className="truncate text-[11px] text-slate-500">{buyPlanDetail(item, true)}</p>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Panel>
  )
}

function ProposedWwdOrderPanel({
  items,
  nextOrderDate,
  targetLayerCount,
  cumulativeLayerCount,
  plannedBuyCost,
}: {
  items: WwdPalletPlanItem[]
  nextOrderDate: string | null
  targetLayerCount: number
  cumulativeLayerCount: string
  plannedBuyCost: string
}) {
  return (
    <Panel id="wwd-next-order" className="border-blue-500/30">
      <PanelHeader
        title="Next Proposed WWD Order"
        eyebrow={nextOrderDate ? `Trigger date ${formatIsoDate(nextOrderDate)}; fill to two full pallets` : 'No regular WWD layer order is currently proposed'}
        action={<CompactBadge tone="blue">{formatNumber(cumulativeLayerCount, 0)} / {targetLayerCount} layers | {compactCurrency(plannedBuyCost, 0)}</CompactBadge>}
      />
      <Table className="table-fixed [&_td]:overflow-hidden [&_th]:overflow-hidden">
        <TableHeader>
          <TableRow className="border-slate-800 bg-slate-950/30 hover:bg-slate-950/30">
            <TableHead className="h-8 w-[10%] px-3 text-[11px] uppercase text-slate-500">Role</TableHead>
            <TableHead className="h-8 w-[14%] px-3 text-[11px] uppercase text-slate-500">SKU</TableHead>
            <TableHead className="h-8 w-[38%] text-[11px] uppercase text-slate-500">Item</TableHead>
            <TableHead className="h-8 w-[12%] text-right text-[11px] uppercase text-slate-500">Order By</TableHead>
            <TableHead className="h-8 w-[9%] text-right text-[11px] uppercase text-slate-500">Layers</TableHead>
            <TableHead className="h-8 w-[9%] text-right text-[11px] uppercase text-slate-500">Buy Qty</TableHead>
            <TableHead className="h-8 w-[8%] text-right text-[11px] uppercase text-slate-500">Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow className="border-slate-800 hover:bg-slate-900/40">
              <TableCell colSpan={7} className="px-3 py-5 text-center text-xs text-slate-500">No regular WWD layer order is currently proposed.</TableCell>
            </TableRow>
          ) : items.map((item) => {
            const roleTone: Tone = item.isRideAlong ? 'cyan' : 'blue'
            return (
              <TableRow key={item.sku} className="h-10 border-slate-800 hover:bg-slate-900/50">
                <TableCell className="px-3 py-1.5">
                  <CompactBadge tone={roleTone}>{item.isRideAlong ? 'Ride-along' : 'Trigger'}</CompactBadge>
                </TableCell>
                <TableCell className="px-3 py-1.5">
                  <Link href={`/products/${encodeURIComponent(item.sku)}`} className="block truncate font-mono text-xs font-semibold text-blue-300 hover:text-blue-200">{item.sku}</Link>
                  <p className="truncate text-[11px] text-slate-500">{item.productFamily}</p>
                </TableCell>
                <TableCell className="py-1.5">
                  <p className="truncate text-xs font-medium text-slate-200">{item.salesDescription || item.productFamily}</p>
                  <p className="truncate text-[11px] text-slate-500">{item.isRideAlong ? 'Pallet filler based on demand signal' : 'Earliest regular WWD reorder trigger'}</p>
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">{formatIsoDate(item.reorderByDate)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-blue-300">{formatNumber(item.plannedLayerCount, 0)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-100">{formatNumber(item.plannedBuyQty, 0)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-100">{compactCurrency(item.plannedBuyCost, 0)}</TableCell>
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

  if (rows.length === 0) return null

  return (
    <Panel className={toneStyles[tone].border}>
      <PanelHeader title={title} eyebrow={description} action={<CompactBadge tone={tone}>{sectionSummary(rows)}</CompactBadge>} />
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 bg-slate-950/30 hover:bg-slate-950/30">
            <TableHead className="h-8 px-3 text-[11px] uppercase text-slate-500">Action</TableHead>
            <TableHead className="h-8 px-3 text-[11px] uppercase text-slate-500">SKU</TableHead>
            <TableHead className="h-8 text-[11px] uppercase text-slate-500">Item</TableHead>
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
                <TableCell className="px-3 py-1.5"><CompactBadge tone={rowTone}>{actionLabels[item.action]}</CompactBadge></TableCell>
                <TableCell className="max-w-[8rem] px-3 py-1.5">
                  <Link href={`/products/${encodeURIComponent(item.sku)}`} className="block truncate font-mono text-xs font-semibold text-blue-300 hover:text-blue-200">{item.sku}</Link>
                  <p className="truncate text-[11px] text-slate-500">{item.preferredVendor}</p>
                </TableCell>
                <TableCell className="max-w-[20rem] py-1.5">
                  <p className="truncate text-xs font-medium text-slate-200">{item.salesDescription || item.productFamily}</p>
                  <p className="truncate text-[11px] text-slate-500">{item.productFamily} | {item.materialType} | {item.confidenceLevel}</p>
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">{formatNumber(item.onHandQty, 0)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">
                  <p>{item.positionDays || '-'}</p>
                  <p className="text-[11px] text-slate-500">{item.stockoutDate || item.reorderByDate || '-'}</p>
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">{inboundLabel(item)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-300">{formatNumber(item.forecastDailyQty, 1)}/d</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-100">
                  <p className={toNumber(item.suggestedBuyQty) > 0 ? 'text-blue-300' : 'text-slate-500'}>{formatNumber(item.suggestedBuyQty, 0)}</p>
                </TableCell>
                <TableCell className="py-1.5 text-right">
                  <div className="ml-auto w-20">
                    <p className="font-mono text-xs text-slate-100">{compactCurrency(cost, 0)}</p>
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
  const { summary, items, wwdPalletPlan } = await getInventoryPlanningPageData()
  const wwdItems = items.filter(isWwd)
  const fbaItems = items.filter((item) => !isWwd(item) && isFba(item))
  const adhesiveItems = items.filter((item) => !isWwd(item) && !isFba(item) && isAdhesive(item))
  const accessoryItems = items.filter((item) => !isWwd(item) && !isFba(item) && !isAdhesive(item) && isAccessory(item))
  const otherItems = items.filter((item) => !isWwd(item) && !isFba(item) && !isAdhesive(item) && !isAccessory(item))
  const reviewItems = items.filter((item) => item.requiresManualReview || item.action === 'REVIEW')
  const buyItems = sortBuyItemsByUrgency(items.filter((item) => item.shouldReorder))

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center border-b border-slate-800 border-slate-800 bg-[#07101d]/95 text-slate-100 backdrop-blur">
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
            <div className="hidden items-center gap-1 rounded-md border border-slate-800 border-slate-700 bg-slate-950/40 px-2 py-1 text-xs text-slate-200 md:flex">
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
        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          <MetricTile className="min-h-0" label="Inventory Cost" value={compactCurrency(summary.currentOnHandValueAtCost, 1)} detail="on-hand value at purchase cost" icon={DollarSign} tone="cyan" />
          <MetricTile className="min-h-0" label="WWD Next Order" value={wwdPalletPlan.nextOrderDate ? formatIsoDate(wwdPalletPlan.nextOrderDate) : 'TBD'} detail={`${formatNumber(wwdPalletPlan.cumulativeLayerCount, 0)} of ${wwdPalletPlan.targetLayerCount} layers | ${formatNumber(wwdPalletPlan.rideAlongSkuCount, 0)} ride-alongs`} icon={CalendarDays} tone={wwdPalletPlan.nextOrderDate ? 'blue' : 'amber'} />
          <MetricTile className="min-h-0" label="Suggested Buys" value={formatNumber(summary.buyCount, 0)} detail={`${formatNumber(summary.suggestedBuyQty, 0)} model units recommended`} icon={ClipboardList} tone="green" />
          <MetricTile className="min-h-0" label="Buy Cost" value={compactCurrency(summary.suggestedBuyCost, 0)} detail={`${formatNumber(summary.reviewCount, 0)} SKUs need review`} icon={PackageCheck} tone="amber" />
          <MetricTile className="min-h-0" label="Out Of Stock" value={formatNumber(summary.outOfStockCount, 0)} detail={`${formatNumber(summary.totalSkus, 0)} active planning SKUs`} icon={AlertTriangle} tone={summary.outOfStockCount > 0 ? 'red' : 'green'} />
          <MetricTile className="min-h-0" label="Inbound Docs" value={formatNumber(summary.inboundDocumentCount, 0)} detail={`${formatNumber(summary.openPoDocumentCount, 0)} open POs | ${formatNumber(summary.futureReceiptDocumentCount, 0)} future receipts`} icon={Warehouse} tone="cyan" />
          <MetricTile className="min-h-0" label="Manual Review" value={formatNumber(reviewItems.length, 0)} detail={`${formatNumber((reviewItems.length / Math.max(items.length, 1)) * 100, 1)}% of planning SKUs`} icon={Boxes} tone={reviewItems.length > 0 ? 'purple' : 'green'} />
        </section>

        <section>
          <ProposedWwdOrderPanel
            items={wwdPalletPlan.orderItems}
            nextOrderDate={wwdPalletPlan.nextOrderDate}
            targetLayerCount={wwdPalletPlan.targetLayerCount}
            cumulativeLayerCount={wwdPalletPlan.cumulativeLayerCount}
            plannedBuyCost={wwdPalletPlan.plannedBuyCost}
          />
        </section>

        <section>
          <Panel>
            <PanelHeader
              title="Buy List"
              eyebrow="All SKUs currently flagged for reorder, earliest reorder dates first"
              action={<Link href="#all-skus" className="text-xs font-medium text-blue-300 hover:text-blue-200">All SKUs <ArrowUpRight className="inline size-3" /></Link>}
            />
            <div className="space-y-2 p-3">
              {buyItems.length === 0 ? (
                <p className="text-xs text-slate-500">No SKUs are currently flagged for reorder.</p>
              ) : buyItems.map((item) => {
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

        <section>
          <WwdLayerPanel items={wwdItems} />
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
