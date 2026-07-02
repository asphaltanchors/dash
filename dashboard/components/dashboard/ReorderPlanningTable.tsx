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
import { formatCurrency } from '@/lib/utils';

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

const WWD_LAYER_MULTIPLES: Record<string, number> = {};

function getWwdLayerMultiple(item: InventoryPlanningItem): number | null {
  return WWD_LAYER_MULTIPLES[item.sku] ?? null;
}

function getRoundedLayerBuyQty(item: InventoryPlanningItem): string {
  const suggestedBuyQty = Number(item.suggestedBuyQty || 0);
  const layerMultiple = getWwdLayerMultiple(item);

  if (suggestedBuyQty <= 0) return '0';
  if (!layerMultiple) return 'layer TBD';

  return (Math.ceil(suggestedBuyQty / layerMultiple) * layerMultiple).toFixed(0);
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

function sectionSummary(items: InventoryPlanningItem[]): string {
  const buyItems = items.filter((item) => item.shouldReorder);
  const buyQty = buyItems.reduce((sum, item) => sum + Number(item.suggestedBuyQty), 0);
  const buyCost = buyItems.reduce((sum, item) => sum + Number(item.suggestedBuyCost), 0);

  return `${items.length} SKUs, ${buyItems.length} buys, ${buyQty.toLocaleString()} units, ${formatCurrency(buyCost, { showCents: false })}`;
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
      description: 'WWD vendor SKUs, including WWD brush accessories. Layer multiples are ready to fill in.',
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
          <span className={Number(item.suggestedBuyQty) > 0 ? 'text-blue-600' : 'text-muted-foreground'}>
            {formatInteger(item.suggestedBuyQty)}
          </span>
          {options.showLayerPlanning && (
            <div className="text-xs font-normal text-muted-foreground">
              layer {getRoundedLayerBuyQty(item)}
            </div>
          )}
        </TableCell>
        <TableCell className="text-right font-mono text-sm font-semibold hidden lg:table-cell">
          <span className={Number(item.suggestedBuyCost) > 0 ? 'text-blue-600' : 'text-muted-foreground'}>
            {formatCurrency(item.suggestedBuyCost, { showCents: false })}
          </span>
        </TableCell>
        <TableCell className="hidden xl:table-cell">
          <div className="text-xs text-muted-foreground">
            <div>{forecastBasis(item)}</div>
            {options.showLayerPlanning && (
              <div>
                WWD layer multiple {getWwdLayerMultiple(item) ?? 'TBD'}
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
              {sectionSummary(section.items)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
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
              </TableHeader>
              <TableBody>
                {renderRows(section.items, { showLayerPlanning: section.key === 'wwd' })}
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
