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

function compactSectionSummary(items: InventoryPlanningItem[], options: { useLayerPlan?: boolean } = {}): string {
  const useLayerPlan = options.useLayerPlan ?? false;
  const buyItems = items.filter((item) => item.shouldReorder);
  const buyQty = buyItems.reduce((sum, item) => sum + operationalBuyQty(item, useLayerPlan), 0);
  const buyCost = buyItems.reduce((sum, item) => sum + operationalBuyCost(item, useLayerPlan), 0);

  return `${items.length} SKUs · ${buyItems.length} buys · ${buyQty.toLocaleString()} units · ${formatCurrency(buyCost, { showCents: false })}`;
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

  function renderWwdSection(section: SectionDefinition) {
    return (
      <Card key={section.key} className="rounded-md border-blue-200 py-0 shadow-none">
        <CardHeader className="border-b px-3 py-2">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
              <CardDescription className="text-xs">{section.description}</CardDescription>
            </div>
            <Badge variant="outline" className="max-w-[min(100%,28rem)] truncate border-blue-300 bg-blue-50 text-xs text-blue-800">
              {compactSectionSummary(section.items, { useLayerPlan: true })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[7rem_minmax(12rem,1fr)_5rem_8rem_8rem_6rem_2rem] gap-3 border-b bg-muted/30 px-3 py-2 text-[11px] font-medium uppercase text-muted-foreground">
                <div>SKU</div>
                <div>Item</div>
                <div className="text-right">Inventory</div>
                <div className="text-right">Inbound</div>
                <div className="text-right">Buy Plan</div>
                <div className="text-right">Cost</div>
                <div className="text-right">Details</div>
              </div>
              {section.items.map((item) => (
                <div
                  key={item.sku}
                  className="grid grid-cols-[7rem_minmax(12rem,1fr)_5rem_8rem_8rem_6rem_2rem] items-start gap-3 border-b px-3 py-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/products/${encodeURIComponent(item.sku)}`}
                      className="block truncate font-mono text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {item.sku}
                    </Link>
                    <div className="mt-1 flex items-center gap-1">
                      <Badge variant="outline" className={`text-xs ${actionClasses[item.action]}`}>
                        {actionLabels[item.action]}
                      </Badge>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{item.salesDescription || '-'}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="outline" className="h-5 rounded-sm px-1.5 text-[11px]">
                        {item.productFamily}
                      </Badge>
                      <Badge variant="outline" className="h-5 rounded-sm px-1.5 text-[11px]">
                        {item.confidenceLevel}
                      </Badge>
                      {item.policyValidationStatus === 'review' && (
                        <Badge variant="outline" className="h-5 rounded-sm border-amber-300 bg-amber-50 px-1.5 text-[11px] text-amber-800">
                          policy review
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right font-mono text-sm">
                    <div className={Number(item.onHandQty) <= 0 ? 'font-semibold text-red-600' : 'font-semibold'}>
                      {formatInteger(item.onHandQty)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{item.positionDays || '-'}d</div>
                  </div>
                  <div className="min-w-0 text-right font-mono text-sm">
                    <div className="truncate">{inboundLabel(item)}</div>
                    <div className="truncate text-[11px] text-muted-foreground" title={inboundDetail(item)}>
                      {inboundDetail(item)}
                    </div>
                  </div>
                  <div className="min-w-0 text-right font-mono text-sm font-semibold">
                    <div className={operationalBuyQty(item, true) > 0 ? 'text-blue-600' : 'text-muted-foreground'}>
                      {buyPlanPrimary(item, true)}
                    </div>
                    <div className="truncate text-[11px] font-normal text-muted-foreground" title={buyPlanDetail(item, true)}>
                      {buyPlanDetail(item, true)}
                    </div>
                  </div>
                  <div className="text-right font-mono text-sm font-semibold">
                    <span className={operationalBuyCost(item, true) > 0 ? 'text-blue-600' : 'text-muted-foreground'}>
                      {formatCurrency(operationalBuyCost(item, true), { showCents: false })}
                    </span>
                  </div>
                  <div className="text-right">
                    <PlanningDetailsTooltip item={item} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderSection(section: SectionDefinition) {
    const showLayerPlanning = section.key === 'wwd';

    if (showLayerPlanning) {
      return renderWwdSection(section);
    }

    return (
      <Card key={section.key} className="rounded-md py-0 shadow-none">
        <CardHeader className="border-b px-3 py-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
              <CardDescription className="text-xs">
                {section.description}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {compactSectionSummary(section.items)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[7rem_minmax(12rem,1fr)_5rem_5rem_9rem_8rem] gap-3 border-b bg-muted/30 px-3 py-2 text-[11px] font-medium uppercase text-muted-foreground">
                <div>SKU</div>
                <div>Item</div>
                <div>Action</div>
                <div className="text-right">On Hand</div>
                <div className="text-right">Inbound</div>
                <div className="text-right">Suggested Buy</div>
              </div>
              {section.items.map((item) => (
                <div
                  key={item.sku}
                  className="grid grid-cols-[7rem_minmax(12rem,1fr)_5rem_5rem_9rem_8rem] items-start gap-3 border-b px-3 py-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/products/${encodeURIComponent(item.sku)}`}
                      className="block truncate font-mono text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {item.sku}
                    </Link>
                    <div className="truncate text-[11px] text-muted-foreground">{item.preferredVendor}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{item.salesDescription || '-'}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="outline" className="h-5 rounded-sm px-1.5 text-[11px]">
                        {item.productFamily}
                      </Badge>
                      <Badge variant="outline" className="h-5 rounded-sm px-1.5 text-[11px]">
                        {item.confidenceLevel}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Badge variant="outline" className={`h-5 rounded-sm px-1.5 text-[11px] ${actionClasses[item.action]}`}>
                      {actionLabels[item.action]}
                    </Badge>
                  </div>
                  <div className="text-right font-mono text-sm">
                    <div className={Number(item.onHandQty) <= 0 ? 'font-semibold text-red-600' : 'font-semibold'}>
                      {formatInteger(item.onHandQty)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{item.positionDays || '-'}d</div>
                  </div>
                  <div className="min-w-0 text-right font-mono text-sm">
                    <div className="truncate">{inboundLabel(item)}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{formatDaily(item.forecastDailyQty)}/d</div>
                  </div>
                  <div className="min-w-0 text-right font-mono text-sm font-semibold">
                    <div className={operationalBuyQty(item, false) > 0 ? 'text-blue-600' : 'text-muted-foreground'}>
                      {buyPlanPrimary(item, false)}
                    </div>
                    <div className="truncate text-[11px] font-normal text-muted-foreground">
                      {formatCurrency(operationalBuyCost(item, false), { showCents: false })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const wwdSection = sections.find((section) => section.key === 'wwd');
  const reviewSections = sections.filter((section) => section.key !== 'wwd');

  return (
    <div className="space-y-4">
      {wwdSection && renderSection(wwdSection)}

      <div className="rounded-md border bg-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Planning Buckets Under Review</h3>
            <p className="text-xs text-muted-foreground">
              {filteredData.length} SKUs grouped by vendor and current planning focus; WWD remains the primary vetted section
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

      {reviewSections.map(renderSection)}
    </div>
  );
}
