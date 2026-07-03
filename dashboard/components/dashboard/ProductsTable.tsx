import { Product } from '@/lib/queries';
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

interface ProductsTableProps {
  products: Product[];
}

export function ProductsTable({ products }: ProductsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Product Name</TableHead>
            <TableHead className="hidden lg:table-cell w-auto max-w-60">Description</TableHead>
            <TableHead className="hidden sm:table-cell">Family</TableHead>
            <TableHead className="hidden lg:table-cell">Material</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Margin %</TableHead>
            <TableHead className="text-right hidden md:table-cell">Margin $</TableHead>
            <TableHead className="text-right hidden lg:table-cell">Discount</TableHead>
            <TableHead className="text-right hidden lg:table-cell">Units</TableHead>
            <TableHead className="text-right hidden xl:table-cell">Customers</TableHead>
            <TableHead className="hidden xl:table-cell">Inventory</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.quickBooksInternalId}>
              <TableCell className="font-medium min-w-[200px]">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Link 
                      href={`/products/${encodeURIComponent(product.itemName)}`}
                      className="truncate hover:underline text-blue-600 hover:text-blue-800"
                    >
                      {product.itemName}
                    </Link>
                    {product.isKit && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Kit
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 sm:hidden lg:hidden">
                    <Badge variant="outline" className="text-xs">
                      {product.productFamily}
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
                  {product.productFamily}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                {product.materialType}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(product.periodSales, { showCents: false })}
              </TableCell>
              <TableCell className="text-right font-mono">
                <span
                  className={`font-medium ${
                    Number(product.actualMarginPercentage || product.marginPercentage) >= 70
                      ? 'text-green-600'
                      : Number(product.actualMarginPercentage || product.marginPercentage) >= 50
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}
                >
                  {product.actualMarginPercentage || product.marginPercentage}%
                </span>
              </TableCell>
              <TableCell className="text-right font-mono hidden md:table-cell">
                {product.grossMarginAmount ? formatCurrency(product.grossMarginAmount, { showCents: false }) : 'n/a'}
              </TableCell>
              <TableCell className="text-right font-mono hidden lg:table-cell">
                {formatCurrency(product.discountLeakageAmount || '0', { showCents: false })}
              </TableCell>
              <TableCell className="text-right font-mono hidden lg:table-cell">
                <span className={`${product.periodUnits > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                  {product.periodUnits.toLocaleString()}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono hidden xl:table-cell">
                <span className={`${product.customerCount && product.customerCount > 0 ? 'text-purple-600' : 'text-muted-foreground'}`}>
                  {product.customerCount || 0}
                </span>
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <div className="flex gap-1">
                  {product.inventoryStatus && <Badge variant="outline" className="text-xs">{product.inventoryStatus}</Badge>}
                  {product.shouldReorder && <Badge variant="secondary" className="text-xs">buy</Badge>}
                  {product.requiresManualReview && <Badge variant="outline" className="text-xs">review</Badge>}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
