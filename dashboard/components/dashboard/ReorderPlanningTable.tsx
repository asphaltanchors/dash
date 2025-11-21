// ABOUTME: Reorder planning table component displaying inventory forecast and reorder recommendations
// ABOUTME: Shows SKU details, current inventory, forecast demand, and calculated reorder quantities
'use client';

import { useState } from 'react';
import type { ReorderItem } from '@/lib/queries';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parseISO } from "date-fns";

interface ReorderPlanningTableProps {
  data: ReorderItem[];
  families: string[];
  targetDays: number;
}

const statusColors = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-300',
  LOW: 'bg-orange-100 text-orange-800 border-orange-300',
  MODERATE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  SUFFICIENT: 'bg-green-100 text-green-800 border-green-300',
};

const trendIcons = {
  Accelerating: '↗',
  Stable: '→',
  Declining: '↘',
};

export function ReorderPlanningTable({ data, families, targetDays }: ReorderPlanningTableProps) {
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredData = data.filter((item) => {
    if (familyFilter !== 'all' && item.productFamily !== familyFilter) return false;
    if (statusFilter !== 'all' && item.inventoryStatus !== statusFilter) return false;
    return true;
  });

  const reorderQty = (item: ReorderItem) =>
    targetDays === 90 ? item.reorderQtyFor90DTarget : item.reorderQtyFor180DTarget;

  const reorderValue = (item: ReorderItem) =>
    targetDays === 90 ? item.reorderValueFor90DTarget : item.reorderValueFor180DTarget;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Reorder Planning Data</CardTitle>
            <CardDescription>
              {filteredData.length} active SKUs sorted by reorder priority
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={familyFilter} onValueChange={setFamilyFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by family" />
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MODERATE">Moderate</SelectItem>
                <SelectItem value="SUFFICIENT">Sufficient</SelectItem>
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
                <TableHead className="min-w-[120px]">SKU</TableHead>
                <TableHead className="min-w-[200px]">Description</TableHead>
                <TableHead className="hidden sm:table-cell">Family</TableHead>
                <TableHead className="text-right hidden md:table-cell">On Hand</TableHead>
                <TableHead className="text-right hidden md:table-cell">Available</TableHead>
                <TableHead className="text-right hidden lg:table-cell">Daily Demand</TableHead>
                <TableHead className="text-right">Days Left</TableHead>
                <TableHead className="hidden xl:table-cell">Stockout Date</TableHead>
                <TableHead className="text-right font-semibold">Reorder Qty</TableHead>
                <TableHead className="text-right font-semibold hidden lg:table-cell">Reorder Value</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
                <TableHead className="hidden xl:table-cell text-center">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={item.sku}>
                  <TableCell className="font-medium font-mono text-sm">
                    {item.sku}
                  </TableCell>
                  <TableCell className="min-w-[200px]">
                    <div className="flex flex-col gap-1">
                      <div className="text-sm">{item.salesDescription || '-'}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.packagingType} • {item.unitsPerSku} units/SKU
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="text-xs">
                      {item.productFamily}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm hidden md:table-cell">
                    {Number(item.quantityOnHand).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm hidden md:table-cell">
                    {Number(item.availableQty).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm hidden lg:table-cell">
                    {Number(item.forecastDailyQty).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    <span
                      className={`font-medium ${
                        Number(item.daysRemainingAvailable) < 30
                          ? 'text-red-600'
                          : Number(item.daysRemainingAvailable) < 60
                          ? 'text-orange-600'
                          : 'text-green-600'
                      }`}
                    >
                      {Number(item.daysRemainingAvailable).toFixed(0)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm hidden xl:table-cell">
                    {item.estimatedStockoutDate
                      ? format(parseISO(item.estimatedStockoutDate), 'MMM d, yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    <span
                      className={`${
                        Number(reorderQty(item)) > 0 ? 'text-blue-600' : 'text-muted-foreground'
                      }`}
                    >
                      {Number(reorderQty(item)).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold hidden lg:table-cell">
                    <span
                      className={`${
                        Number(reorderValue(item)) > 0 ? 'text-blue-600' : 'text-muted-foreground'
                      }`}
                    >
                      {formatCurrency(reorderValue(item), { showCents: false })}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge
                      variant="outline"
                      className={`text-xs ${statusColors[item.inventoryStatus as keyof typeof statusColors]}`}
                    >
                      {item.inventoryStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center hidden xl:table-cell">
                    <span className="text-lg" title={item.demandTrend}>
                      {trendIcons[item.demandTrend as keyof typeof trendIcons] || '→'}
                    </span>
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
