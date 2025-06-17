import { Product } from '@/lib/queries';
import { Badge } from '@/components/ui/badge';
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product Name</TableHead>
            <TableHead>Family</TableHead>
            <TableHead>Material</TableHead>
            <TableHead className="text-right">Sales Price</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">Margin %</TableHead>
            <TableHead className="text-right">Margin $</TableHead>
            <TableHead>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.quickBooksInternalId}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {product.itemName}
                  {product.isKit && (
                    <Badge variant="secondary" className="text-xs">
                      Kit
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {product.productFamily}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {product.materialType}
              </TableCell>
              <TableCell className="text-right font-mono">
                ${product.salesPrice}
              </TableCell>
              <TableCell className="text-right font-mono">
                ${product.purchaseCost}
              </TableCell>
              <TableCell className="text-right">
                <span 
                  className={`font-medium ${
                    Number(product.marginPercentage) >= 30 
                      ? 'text-green-600' 
                      : Number(product.marginPercentage) >= 15 
                      ? 'text-yellow-600' 
                      : 'text-red-600'
                  }`}
                >
                  {product.marginPercentage}%
                </span>
              </TableCell>
              <TableCell className="text-right font-mono">
                ${product.marginAmount}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {product.itemType}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}