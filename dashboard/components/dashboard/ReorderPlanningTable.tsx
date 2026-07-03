// ABOUTME: Inventory planning table for stock, inbound, forecast, and buy decisions.
// ABOUTME: Prioritizes operational actions over chart-style summary metrics.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { InventoryPlanningItem } from '@/lib/queries';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/utils';
import { Info } from 'lucide-react';

interface InventoryPlanningTableProps {
  data: InventoryPlanningItem[];
  families: string[];
}

interface SectionDefinition {
  key: string;
  title: string;
  description: string;
  items: InventoryPlanningItem[];
  tone?: 'primary' | 'deferred';
}

const actionLabels = {
  OUT_OF_STOCK: 'Out',
  BUY: 'Buy',
  REVIEW: 'Review',
  WATCH: 'Watch',
  OK: 'OK',
};

const actionClasses = {
  OUT_OF_STOCK: 'bg-red-100 text-red-800 border-red-300',
  BUY: 'bg-blue-100 text-blue-800 border-blue-300',
  REVIEW: 'bg-amber-100 text-amber-800 border-amber-300',
  WATCH: 'bg-orange-100 text-orange-800 border-orange-300',
  OK: 'bg-green-100 text-green-800 border-green-300',
};

function formatInteger(value: string): string {
  return Number(value || 0).toLocaleString();
}

function formatDaily(value: string): string {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function inboundLabel(item: InventoryPlanningItem): string {
  const labels = [];

  if (Number(item.inboundOpenPoQty) > 0) {
    labels.push(`${formatInteger(item.inboundOpenPoQty)} PO`);
  }

  if (Number(item.futureReceiptQty) > 0) {
    labels.push(`${formatInteger(item.futureReceiptQty)} future receipt`);
  }

  return labels.length > 0 ? labels.join(' + ') : 'none';
}

function inboundDetail(item: InventoryPlanningItem): string {
  const details = [];

  if (item.openPoLineCount > 0) {
    details.push(`${item.openPoLineCount} open PO line${item.openPoLineCount === 1 ? '' : 's'}`);
  }

  if (item.futureReceiptLineCount > 0) {
    details.push(`${item.futureReceiptLineCount} future receipt line${item.futureReceiptLineCount === 1 ? '' : 's'}`);
  }

  if (item.nextOpenPoDate) {
    details.push(`next ${item.nextOpenPoDate}`);
  }

  return details.join(', ');
}

function forecastBasis(item: InventoryPlanningItem): string {
  const method = item.forecastModelDetail
    .replaceAll('_', ' ')
    .replace('sku ', 'SKU ')
    .replace('family material', 'family/material');

  return `${method}; baseline ${formatInteger(item.skuBaselineMonthlyQty)}/mo, seasonality ${item.appliedSeasonalityIndex}x, growth ${item.appliedGrowthFactor}x`;
}

function hasLayerBuyPlan(item: InventoryPlanningItem): boolean {
  return Number(item.suggestedBuyQty) > 0 && Boolean(item.sixPackUnitsPerLayer);
}

function operationalBuyQty(item: InventoryPlanningItem, useLayerPlan: boolean): number {
  if (useLayerPlan && hasLayerBuyPlan(item)) {
    return Number(item.layerRoundedBuyQty || 0);
  }

  return Number(item.suggestedBuyQty || 0);
}

function operationalBuyCost(item: InventoryPlanningItem, useLayerPlan: boolean): number {
  if (useLayerPlan && hasLayerBuyPlan(item)) {
    return operationalBuyQty(item, true) * Number(item.purchaseCost || 0);
  }

  return Number(item.suggestedBuyCost || 0);
}

function buyPlanPrimary(item: InventoryPlanningItem, useLayerPlan: boolean): string {
  if (!useLayerPlan) {
    return formatInteger(item.suggestedBuyQty);
  }

  if (Number(item.suggestedBuyQty) <= 0) {
    return '0';
  }

  if (!item.sixPackUnitsPerLayer) {
    return formatInteger(item.suggestedBuyQty);
  }

  return `${formatInteger(item.reorderLayerCount)} layer${Number(item.reorderLayerCount) === 1 ? '' : 's'}`;
}

function buyPlanDetail(item: InventoryPlanningItem, useLayerPlan: boolean): string {
  if (!useLayerPlan) {
    return 'model quantity';
  }

  if (Number(item.suggestedBuyQty) <= 0) {
    return 'no buy recommended';
  }

  if (!item.sixPackUnitsPerLayer) {
    return `model calls for ${formatInteger(item.suggestedBuyQty)}; layer multiple TBD`;
  }

  return `${formatInteger(item.layerRoundedBuyQty)} units; model calls for ${formatInteger(item.suggestedBuyQty)}, +${formatInteger(item.layerRoundingExtraQty)}`;
}

function layerBasisDetail(item: InventoryPlanningItem): string {
  if (!item.sixPackUnitsPerLayer) {
    return 'Layer multiple TBD';
  }

  return `Layer multiple ${item.sixPackUnitsPerLayer} units`;
}

function PlanningDetailsTooltip({ item }: { item: InventoryPlanningItem }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Show planning details for ${item.sku}`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-[360px] bg-popover text-popover-foreground shadow-md">
        <div className="space-y-1.5 text-xs">
          <div className="font-medium text-foreground">{item.sku}</div>
          <div>{forecastBasis(item)}</div>
          <div>{layerBasisDetail(item)}</div>
          <div>
            {item.targetCoverageDays}d target, {item.assumedLeadTimeDays}d lead, safety {formatInteger(item.safetyStockQty)}
          </div>
          {Number(item.cappedReductionQty12m) > 0 && (
            <div>{formatInteger(item.cappedReductionQty12m)} units capped from 12m outliers</div>
          )}
          <div>{item.policyAssignmentReason.replaceAll('_', ' ')}</div>
          {item.policyReviewFlags && (
            <div className="text-amber-700">{item.policyReviewFlags.replaceAll('_', ' ')}</div>
          )}
          <div>{item.recommendationReason}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function isWwd(item: InventoryPlanningItem): boolean {
  return item.preferredVendor === 'WWD';
}

function isFba(item: InventoryPlanningItem): boolean {
  return item.policyBucket === 'FBA_REPLENISHMENT_MODEL' || item.sku.toUpperCase().includes('FBA');
}

function isAdhesive(item: InventoryPlanningItem): boolean {
  const searchable = `${item.productFamily} ${item.materialType} ${item.salesDescription}`.toLowerCase();
  return searchable.includes('adhesive') || searchable.includes('epx');
}

function isAccessory(item: InventoryPlanningItem): boolean {
  const searchable = `${item.productFamily} ${item.salesDescription} ${item.sku}`.toLowerCase();
  return item.productFamily === 'Accessories'
    || searchable.includes('brush')
    || searchable.includes('drill bit')
    || searchable.includes('eyebolt');
}

function sortItems(items: InventoryPlanningItem[]): InventoryPlanningItem[] {
  return [...items].sort((a, b) => {
    const vendorCompare = a.preferredVendor.localeCompare(b.preferredVendor);
    if (vendorCompare !== 0) return vendorCompare;

    if (a.shouldReorder !== b.shouldReorder) return a.shouldReorder ? -1 : 1;

    const costCompare = Number(b.suggestedBuyCost) - Number(a.suggestedBuyCost);
    if (costCompare !== 0) return costCompare;

    return a.sku.localeCompare(b.sku);
  });
}

function sectionSummary(items: InventoryPlanningItem[], options: { useLayerPlan?: boolean } = {}): string {
  const useLayerPlan = options.useLayerPlan ?? false;
  const buyItems = items.filter((item) => item.shouldReorder);
  const buyQty = buyItems.reduce((sum, item) => sum + operationalBuyQty(item, useLayerPlan), 0);
  const buyCost = buyItems.reduce((sum, item) => sum + operationalBuyCost(item, useLayerPlan), 0);
  const quantityLabel = useLayerPlan ? 'layer-adjusted units' : 'units';

  return `${items.length} SKUs, ${buyItems.length} buys, ${buyQty.toLocaleString()} ${quantityLabel}, ${formatCurrency(buyCost, { showCents: false })}`;
}

export function ReorderPlanningTable({ data, families }: InventoryPlanningTableProps) {
  const [familyFilter, setFamilyFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredData = data.filter((item) => {
    if (familyFilter !== 'all' && item.productFamily !== familyFilter) return false;
    if (actionFilter !== 'all' && item.action !== actionFilter) return false;
    return true;
  });

  const wwdItems = sortItems(filteredData.filter(isWwd));
  const fbaItems = sortItems(filteredData.filter((item) => !isWwd(item) && isFba(item)));
  const adhesiveItems = sortItems(filteredData.filter((item) => !isWwd(item) && !isFba(item) && isAdhesive(item)));
  const accessoryItems = sortItems(filteredData.filter((item) => !isWwd(item) && !isFba(item) && !isAdhesive(item) && isAccessory(item)));
  const otherItems = sortItems(filteredData.filter((item) => !isWwd(item) && !isFba(item) && !isAdhesive(item) && !isAccessory(item)));

  const sectionCandidates: SectionDefinition[] = [
    {
      key: 'wwd',
      title: 'WWD Pallet Planning',
      description: 'WWD vendor SKUs, including known layer multiples for anchor SKUs.',
      items: wwdItems,
      tone: 'primary',
    },
    {
      key: 'other',
      title: 'Other Vendor Work',
      description: 'Non-WWD items that are not FBA, adhesive, or accessory planning buckets.',
      items: otherItems,
    },
    {
      key: 'fba',
      title: 'FBA Review',
      description: 'Visible for context; FBA replenishment logic is parked for now.',
      items: fbaItems,
      tone: 'deferred',
    },
    {
      key: 'adhesives',
      title: 'Adhesives And Packaging Review',
      description: 'Adhesive SKUs and adhesive packaging across vendors with separate MOQ nuance.',
      items: adhesiveItems,
      tone: 'deferred',
    },
    {
      key: 'accessories',
      title: 'Non-WWD Accessories Review',
      description: 'Accessory SKUs outside the WWD order path.',
      items: accessoryItems,
      tone: 'deferred',
    },
  ];

  const sections = sectionCandidates.filter((section) => section.items.length > 0);

  function renderCompactWwdRows(items: InventoryPlanningItem[]) {
    return items.map((item) => (
      <TableRow key={item.sku}>
        <TableCell className="align-top">
          <Link
            href={`/products/${encodeURIComponent(item.sku)}`}
            className="font-mono text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
          >
            {item.sku}
          </Link>
          <div className="mt-1 flex items-center gap-1">
            <Badge variant="outline" className={`text-xs ${actionClasses[item.action]}`}>
              {actionLabels[item.action]}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="align-top">
          <div className="max-w-[360px]">
            <div className="truncate text-sm">{item.salesDescription || '-'}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                {item.productFamily}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {item.confidenceLevel}
              </Badge>
              {item.policyValidationStatus === 'review' && (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-xs text-amber-800">
                  policy review
                </Badge>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="align-top text-right font-mono text-sm">
          <div className={Number(item.onHandQty) <= 0 ? 'font-semibold text-red-600' : 'font-semibold'}>
            {formatInteger(item.onHandQty)}
          </div>
          <div className="text-xs text-muted-foreground">
            {item.positionDays || '-'}d position
          </div>
        </TableCell>
        <TableCell className="align-top text-right font-mono text-sm">
          <div>{inboundLabel(item)}</div>
          <div className="text-xs text-muted-foreground">{inboundDetail(item)}</div>
        </TableCell>
        <TableCell className="align-top text-right font-mono text-sm font-semibold">
          <div className={operationalBuyQty(item, true) > 0 ? 'text-blue-600' : 'text-muted-foreground'}>
            {buyPlanPrimary(item, true)}
          </div>
          <div className="text-xs font-normal text-muted-foreground">
            {buyPlanDetail(item, true)}
          </div>
        </TableCell>
        <TableCell className="align-top text-right font-mono text-sm font-semibold">
          <span className={operationalBuyCost(item, true) > 0 ? 'text-blue-600' : 'text-muted-foreground'}>
            {formatCurrency(operationalBuyCost(item, true), { showCents: false })}
          </span>
        </TableCell>
        <TableCell className="align-top text-right">
          <PlanningDetailsTooltip item={item} />
        </TableCell>
      </TableRow>
    ));
  }

  function renderRows(items: InventoryPlanningItem[], options: { showLayerPlanning?: boolean } = {}) {
    return items.map((item) => (
      <TableRow key={item.sku}>
        <TableCell className="font-mono text-sm font-medium">
          <Link
            href={`/products/${encodeURIComponent(item.sku)}`}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {item.sku}
          </Link>
          <div className="mt-1 text-xs text-muted-foreground">{item.preferredVendor}</div>
        </TableCell>
        <TableCell>
          <div className="max-w-[320px]">
            <div className="truncate text-sm">{item.salesDescription || '-'}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                {item.productFamily}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {item.confidenceLevel}
              </Badge>
              {item.policyValidationStatus === 'review' && (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-xs text-amber-800">
                  policy review
                </Badge>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={`text-xs ${actionClasses[item.action]}`}>
            {actionLabels[item.action]}
          </Badge>
        </TableCell>
        <TableCell className="text-right font-mono text-sm">
          {formatInteger(item.onHandQty)}
        </TableCell>
        <TableCell className="text-right font-mono text-sm">
          <div>{inboundLabel(item)}</div>
          <div className="text-xs text-muted-foreground">{inboundDetail(item)}</div>
        </TableCell>
        <TableCell className="text-right font-mono text-sm">
          {formatDaily(item.forecastDailyQty)}
        </TableCell>
        <TableCell className="text-right font-mono text-sm">
          <span className={Number(item.onHandDays) <= 0 ? 'font-semibold text-red-600' : ''}>
            {item.onHandDays || '-'}
          </span>
        </TableCell>
        <TableCell className="text-right font-mono text-sm">
          {item.positionDays || '-'}
        </TableCell>
        <TableCell className="text-right font-mono text-sm font-semibold">
          <span className={operationalBuyQty(item, Boolean(options.showLayerPlanning)) > 0 ? 'text-blue-600' : 'text-muted-foreground'}>
            {buyPlanPrimary(item, Boolean(options.showLayerPlanning))}
          </span>
          <div className="text-xs font-normal text-muted-foreground">
            {buyPlanDetail(item, Boolean(options.showLayerPlanning))}
          </div>
        </TableCell>
        <TableCell className="text-right font-mono text-sm font-semibold hidden lg:table-cell">
          <span className={operationalBuyCost(item, Boolean(options.showLayerPlanning)) > 0 ? 'text-blue-600' : 'text-muted-foreground'}>
            {formatCurrency(operationalBuyCost(item, Boolean(options.showLayerPlanning)), { showCents: false })}
          </span>
        </TableCell>
        <TableCell className="hidden xl:table-cell">
          <div className="text-xs text-muted-foreground">
            <div>{forecastBasis(item)}</div>
            {options.showLayerPlanning && (
              <div>
                {layerBasisDetail(item)}
              </div>
            )}
            {Number(item.cappedReductionQty12m) > 0 && (
              <div>{formatInteger(item.cappedReductionQty12m)} units capped from 12m outliers</div>
            )}
            <div>
              {item.targetCoverageDays}d target, {item.assumedLeadTimeDays}d lead, safety {formatInteger(item.safetyStockQty)}
            </div>
            <div>{item.policyAssignmentReason.replaceAll('_', ' ')}</div>
            {item.policyReviewFlags && (
              <div className="text-amber-700">{item.policyReviewFlags.replaceAll('_', ' ')}</div>
            )}
            <div>{item.recommendationReason}</div>
          </div>
        </TableCell>
      </TableRow>
    ));
  }

  function renderSection(section: SectionDefinition) {
    const isPrimary = section.tone === 'primary';
    const showLayerPlanning = section.key === 'wwd';

    return (
      <Card key={section.key} className={isPrimary ? 'border-blue-200' : undefined}>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>
                {section.description}
              </CardDescription>
            </div>
            <Badge variant="outline" className={isPrimary ? 'border-blue-300 bg-blue-50 text-blue-800' : 'text-muted-foreground'}>
              {sectionSummary(section.items, { useLayerPlan: showLayerPlanning })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {showLayerPlanning ? (
                  <TableRow>
                    <TableHead className="min-w-[118px]">SKU</TableHead>
                    <TableHead className="min-w-[260px]">Item</TableHead>
                    <TableHead className="text-right">Inventory</TableHead>
                    <TableHead className="text-right">Inbound</TableHead>
                    <TableHead className="text-right">Buy Plan</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="w-[48px] text-right">Details</TableHead>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableHead className="min-w-[118px]">SKU</TableHead>
                    <TableHead className="min-w-[240px]">Item</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="text-right">On Hand</TableHead>
                    <TableHead className="text-right">Inbound</TableHead>
                    <TableHead className="text-right">Forecast/Day</TableHead>
                    <TableHead className="text-right">On-Hand Days</TableHead>
                    <TableHead className="text-right">Position Days</TableHead>
                    <TableHead className="text-right">Suggested Buy</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Buy Cost</TableHead>
                    <TableHead className="min-w-[300px] hidden xl:table-cell">Basis</TableHead>
                  </TableRow>
                )}
              </TableHeader>
              <TableBody>
                {showLayerPlanning
                  ? renderCompactWwdRows(section.items)
                  : renderRows(section.items, { showLayerPlanning })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Inventory Worklist</h3>
            <p className="text-sm text-muted-foreground">
              {filteredData.length} SKUs grouped by vendor and current planning focus
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={familyFilter} onValueChange={setFamilyFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Family" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Families</SelectItem>
                {families.map((family) => (
                  <SelectItem key={family} value={family}>
                    {family}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="OUT_OF_STOCK">Out</SelectItem>
                <SelectItem value="BUY">Buy</SelectItem>
                <SelectItem value="REVIEW">Review</SelectItem>
                <SelectItem value="WATCH">Watch</SelectItem>
                <SelectItem value="OK">OK</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {sections.map(renderSection)}
    </div>
  );
}
