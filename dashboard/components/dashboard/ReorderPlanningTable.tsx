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

export function ReorderPlanningTable({ data, families }: InventoryPlanningTableProps) {
  const [familyFilter, setFamilyFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredData = data.filter((item) => {
    if (familyFilter !== 'all' && item.productFamily !== familyFilter) return false;
    if (actionFilter !== 'all' && item.action !== actionFilter) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Inventory Worklist</CardTitle>
            <CardDescription>
              {filteredData.length} SKUs ordered by stock risk, buy need, and recommendation value
            </CardDescription>
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
              {filteredData.map((item) => (
                <TableRow key={item.sku}>
                  <TableCell className="font-mono text-sm font-medium">
                    <Link
                      href={`/products/${encodeURIComponent(item.sku)}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {item.sku}
                    </Link>
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
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold hidden lg:table-cell">
                    <span className={Number(item.suggestedBuyCost) > 0 ? 'text-blue-600' : 'text-muted-foreground'}>
                      {formatCurrency(item.suggestedBuyCost, { showCents: false })}
                    </span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="text-xs text-muted-foreground">
                      <div>{forecastBasis(item)}</div>
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
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
