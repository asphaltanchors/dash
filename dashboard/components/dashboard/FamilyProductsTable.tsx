// ABOUTME: Family products table component showing products within a specific product family
// ABOUTME: Displays product metrics including sales, margin, and links to individual product pages
import { FamilyProduct } from '@/lib/queries';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface FamilyProductsTableProps {
  products: FamilyProduct[];
  period?: string;
}

export function FamilyProductsTable({ products }: FamilyProductsTableProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No products found in this family for the selected period</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Product Name</TableHead>
            <TableHead className="hidden lg:table-cell w-auto max-w-60">Description</TableHead>
            <TableHead className="hidden sm:table-cell">Material</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Margin %</TableHead>
            <TableHead className="text-right hidden md:table-cell">Period Sales</TableHead>
            <TableHead className="text-right hidden lg:table-cell">Units Sold</TableHead>
            <TableHead className="text-right hidden xl:table-cell">Orders</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product, index) => (
            <TableRow key={`${product.itemName}-${index}`}>
              <TableCell className="font-medium min-w-[200px]">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Link 
                      href={`/products/${encodeURIComponent(product.itemName)}`}
                      className="truncate hover:underline text-blue-600 hover:text-blue-800"
                    >
                      {product.itemName}
                    </Link>
                  </div>
                  <div className="flex gap-1 sm:hidden lg:hidden">
                    <Badge variant="outline" className="text-xs">
                      {product.materialType}
                    </Badge>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-60">
                <div className="truncate">
                  {product.salesDescription || '-'}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant="outline" className="text-xs">
                  {product.materialType}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(parseFloat(product.salesPrice))}
              </TableCell>
              <TableCell className="text-right font-mono">
                <span 
                  className={`font-medium ${
                    Number(product.marginPercentage) >= 70 
                      ? 'text-green-600' 
                      : Number(product.marginPercentage) >= 50 
                      ? 'text-yellow-600' 
                      : 'text-red-600'
                  }`}
                >
                  {product.marginPercentage}%
                </span>
              </TableCell>
              <TableCell className="text-right font-mono hidden md:table-cell">
                {formatCurrency(parseFloat(product.periodRevenue))}
              </TableCell>
              <TableCell className="text-right font-mono hidden lg:table-cell">
                <span className={`${Number(product.periodUnits) > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                  {Number(product.periodUnits).toLocaleString()}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono hidden xl:table-cell">
                <span className={`${product.periodOrders > 0 ? 'text-purple-600' : 'text-muted-foreground'}`}>
                  {product.periodOrders}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}