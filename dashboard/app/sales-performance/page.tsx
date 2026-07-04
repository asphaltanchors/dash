// ABOUTME: Preserves the sales performance route while consolidating the report into Orders
// ABOUTME: Redirects old sales performance links to the combined order ledger
import { redirect } from 'next/navigation';

export default function SalesPerformancePage() {
  redirect('/orders');
}
