// ABOUTME: Top companies table component for displaying companies that purchased a specific product
// ABOUTME: Shows company spending, transaction counts, and purchase patterns with clickable company links
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { ProductTopCompany } from '@/lib/queries/companies';

interface TopCompaniesTableProps {
  data: ProductTopCompany[];
  productName: string;
}

export function TopCompaniesTable({ data, productName }: TopCompaniesTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Companies</CardTitle>
          <CardDescription>Companies that have purchased {productName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No company purchases found for this product
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Companies</CardTitle>
        <CardDescription>Companies that have purchased {productName}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Avg Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Purchase</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((company, index) => (
              <TableRow key={`${company.companyDomainKey || company.companyName}-${index}`}>
                <TableCell>
                  <Link 
                    href={`/companies/${encodeURIComponent(company.companyDomainKey)}`}
                    className="hover:underline text-blue-600 font-medium"
                  >
                    {company.companyName}
                  </Link>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(Number(company.totalAmountSpent))}
                </TableCell>
                <TableCell className="text-right">
                  {company.totalTransactions}
                </TableCell>
                <TableCell className="text-right">
                  {Number(company.totalQuantityPurchased).toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(Number(company.avgUnitPrice))}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={company.buyerStatus === 'Active' ? 'default' : 'secondary'}
                  >
                    {company.buyerStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {company.lastPurchaseDate ? 
                    new Date(company.lastPurchaseDate).toLocaleDateString() : 
                    'Never'
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}