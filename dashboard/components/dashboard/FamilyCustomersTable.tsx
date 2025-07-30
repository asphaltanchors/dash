// ABOUTME: Family customers table component showing top customers for a specific product family
// ABOUTME: Displays customer metrics including spending, orders, and links to company detail pages
import { FamilyCustomer } from '@/lib/queries';
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

interface FamilyCustomersTableProps {
  customers: FamilyCustomer[];
  period?: string;
}

export function FamilyCustomersTable({ customers }: FamilyCustomersTableProps) {
  if (customers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No customers found for this family in the selected period</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Company</TableHead>
            <TableHead className="text-right">Period Spent</TableHead>
            <TableHead className="text-right hidden md:table-cell">Period Orders</TableHead>
            <TableHead className="text-right hidden lg:table-cell">Total Spent</TableHead>
            <TableHead className="text-right hidden lg:table-cell">Total Orders</TableHead>
            <TableHead className="hidden xl:table-cell">Last Order</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer, index) => (
            <TableRow key={`${customer.companyDomainKey}-${index}`}>
              <TableCell className="font-medium min-w-[200px]">
                <div className="flex flex-col gap-1">
                  <Link 
                    href={`/companies/${encodeURIComponent(customer.companyDomainKey)}`}
                    className="truncate hover:underline text-blue-600 hover:text-blue-800"
                  >
                    {customer.companyName}
                  </Link>
                  <div className="flex gap-2 text-xs text-muted-foreground md:hidden">
                    <span>{customer.periodOrders} orders</span>
                    <span>•</span>
                    <span>{formatCurrency(parseFloat(customer.periodSpent), { showCents: false })}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {formatCurrency(parseFloat(customer.periodSpent))}
                  </span>
                  <span className="text-xs text-muted-foreground lg:hidden">
                    {customer.periodOrders} orders
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono hidden md:table-cell">
                <span className={`${customer.periodOrders > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                  {customer.periodOrders}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono hidden lg:table-cell">
                <div className="flex flex-col">
                  <span>{formatCurrency(parseFloat(customer.totalSpent))}</span>
                  {parseFloat(customer.totalSpent) !== parseFloat(customer.periodSpent) && (
                    <span className="text-xs text-muted-foreground">
                      all time
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right font-mono hidden lg:table-cell">
                <span className={`${customer.totalOrders > 0 ? 'text-purple-600' : 'text-muted-foreground'}`}>
                  {customer.totalOrders}
                </span>
              </TableCell>
              <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                {customer.lastOrderDate ? (
                  <div className="flex flex-col">
                    <span>{new Date(customer.lastOrderDate).toLocaleDateString()}</span>
                    <span className="text-xs">
                      {Math.floor((Date.now() - new Date(customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))} days ago
                    </span>
                  </div>
                ) : (
                  'N/A'
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}