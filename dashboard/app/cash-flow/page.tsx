// ABOUTME: Dense cash-flow report focused on DSO, A/R aging, and collection risk
// ABOUTME: Keeps summary context and invoice-level exceptions visible together
import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  Gauge,
  ReceiptText,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getARAgingDetails, getCurrentDSO, getProblemAccounts } from '@/lib/queries';
import type { ARAgingDetail, DSOMetric } from '@/lib/queries';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function riskTone(risk: string | null | undefined): 'good' | 'warn' | 'bad' | 'critical' | 'neutral' {
  if (risk === 'Low Risk') return 'good';
  if (risk === 'Medium Risk') return 'warn';
  if (risk === 'High Risk') return 'bad';
  if (risk === 'Critical Risk') return 'critical';
  return 'neutral';
}

function assessmentTone(assessment: string | null | undefined): 'good' | 'blue' | 'warn' | 'bad' {
  if (assessment === 'Excellent') return 'good';
  if (assessment === 'Good') return 'blue';
  if (assessment === 'Fair') return 'warn';
  return 'bad';
}

function ToneDot({ tone }: { tone: 'good' | 'warn' | 'bad' | 'critical' | 'neutral' | 'blue' }) {
  return (
    <span
      className={cn(
        'h-2 w-2 rounded-full',
        tone === 'good' && 'bg-emerald-500',
        tone === 'blue' && 'bg-blue-500',
        tone === 'warn' && 'bg-amber-500',
        tone === 'bad' && 'bg-orange-500',
        tone === 'critical' && 'bg-red-500',
        tone === 'neutral' && 'bg-slate-600',
      )}
    />
  );
}

function CompactBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'good' | 'blue' | 'warn' | 'bad' | 'critical';
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-5 rounded-sm px-1.5 text-[11px] font-medium',
        tone === 'good' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
        tone === 'blue' && 'border-blue-500/30 bg-blue-500/10 text-blue-200',
        tone === 'warn' && 'border-amber-500/30 bg-amber-500/10 text-amber-200',
        tone === 'bad' && 'border-orange-500/30 bg-orange-500/10 text-orange-200',
        tone === 'critical' && 'border-red-500/30 bg-red-500/10 text-red-200',
      )}
    >
      {children}
    </Badge>
  );
}

function InlineBar({
  value,
  tone = 'blue',
}: {
  value: number;
  tone?: 'blue' | 'green' | 'amber' | 'orange' | 'red';
}) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
      <div
        className={cn(
          'h-full rounded-full',
          tone === 'blue' && 'bg-blue-500',
          tone === 'green' && 'bg-emerald-500',
          tone === 'amber' && 'bg-amber-500',
          tone === 'orange' && 'bg-orange-500',
          tone === 'red' && 'bg-red-500',
        )}
        style={{ width: `${clampPercent(value)}%` }}
      />
    </div>
  );
}

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'blue',
}: {
  label: string;
  value: string;
  detail: ReactNode;
  icon: ComponentType<{ className?: string }>;
  tone?: 'good' | 'blue' | 'warn' | 'bad';
}) {
  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-normal text-slate-400">
              <Icon
                className={cn(
                  'h-3.5 w-3.5',
                  tone === 'good' && 'text-emerald-300',
                  tone === 'blue' && 'text-blue-300',
                  tone === 'warn' && 'text-amber-300',
                  tone === 'bad' && 'text-red-300',
                )}
              />
              <span className="truncate">{label}</span>
            </div>
            <div className="mt-1 truncate text-xl font-semibold tabular-nums">{value}</div>
          </div>
        </div>
        <div className="mt-2 text-xs leading-4 text-slate-400">{detail}</div>
      </CardContent>
    </Card>
  );
}

function AgingPanel({ rows }: { rows: ARAgingDetail[] }) {
  const summaryRows = rows
    .filter((item) => item.analysisLevel === 'Aging Summary')
    .sort((a, b) => {
      const order = ['Current', 'Past Due', 'Overdue', 'Severely Overdue'];
      const aOrder = order.findIndex((bucket) => a.agingBucket?.includes(bucket));
      const bOrder = order.findIndex((bucket) => b.agingBucket?.includes(bucket));
      return (aOrder === -1 ? 999 : aOrder) - (bOrder === -1 ? 999 : bOrder);
    });
  const maxAmount = Math.max(...summaryRows.map((item) => toNumber(item.totalArAmount)), 1);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">A/R Aging Distribution</CardTitle>
            <p className="text-xs text-slate-400">Exposure by aging bucket and collection risk</p>
          </div>
          <CompactBadge tone={summaryRows.some((row) => row.collectionRisk === 'Critical Risk') ? 'critical' : 'warn'}>
            {summaryRows.length} buckets
          </CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-950/40">
              <TableHead className="h-8 px-3 text-[11px] uppercase text-slate-400">Bucket</TableHead>
              <TableHead className="h-8 text-right text-[11px] uppercase text-slate-400">Amount</TableHead>
              <TableHead className="h-8 text-right text-[11px] uppercase text-slate-400">Invoices</TableHead>
              <TableHead className="h-8 text-right text-[11px] uppercase text-slate-400">Avg Days</TableHead>
              <TableHead className="h-8 text-[11px] uppercase text-slate-400">Risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaryRows.map((item) => {
              const amount = toNumber(item.totalArAmount);
              const tone = riskTone(item.collectionRisk);
              const barTone = tone === 'critical' ? 'red' : tone === 'bad' ? 'orange' : tone === 'warn' ? 'amber' : 'green';

              return (
                <TableRow key={`${item.agingBucket}-${item.collectionRisk}`} className="h-10">
                  <TableCell className="max-w-[12rem] px-3 py-1.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <ToneDot tone={tone} />
                      <span className="truncate text-sm font-medium">{item.agingBucket}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5 text-right">
                    <div className="ml-auto w-32 space-y-1">
                      <p className="font-mono text-xs">{formatCurrency(amount, { showCents: false })}</p>
                      <InlineBar value={(amount / maxAmount) * 100} tone={barTone} />
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-xs">
                    {formatNumber(item.openInvoiceCount, 0)}
                  </TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-xs">
                    {item.avgDaysOutstanding}
                  </TableCell>
                  <TableCell className="py-1.5">
                    <CompactBadge tone={tone}>{item.collectionRisk}</CompactBadge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CollectionPosture({
  dso,
  problemAccounts,
}: {
  dso: DSOMetric;
  problemAccounts: ARAgingDetail[];
}) {
  const highRiskAmount = problemAccounts.reduce((total, account) => total + toNumber(account.totalAmount), 0);
  const totalAr = toNumber(dso.totalAccountsReceivable);
  const riskShare = totalAr > 0 ? (highRiskAmount / totalAr) * 100 : 0;
  const assessment = assessmentTone(dso.dsoAssessment);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold">Collection Posture</CardTitle>
          <CompactBadge tone={assessment}>{dso.dsoAssessment}</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-sm border border-slate-800 bg-[#07101d] p-2">
            <p className="text-[11px] font-medium uppercase text-slate-400">High-risk exposure</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(highRiskAmount, { showCents: false })}</p>
            <p className="text-xs text-slate-400">{problemAccounts.length} invoices</p>
          </div>
          <div className="rounded-sm border border-slate-800 bg-[#07101d] p-2">
            <p className="text-[11px] font-medium uppercase text-slate-400">Exposure share</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{formatNumber(riskShare, 1)}%</p>
            <p className="text-xs text-slate-400">of total A/R</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Collection efficiency</span>
            <span className="font-mono">{dso.collectionEfficiencyPct}%</span>
          </div>
          <InlineBar value={toNumber(dso.collectionEfficiencyPct)} tone={toNumber(dso.collectionEfficiencyPct) >= 80 ? 'green' : 'amber'} />
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Risk concentration</span>
            <span className="font-mono">{formatNumber(riskShare, 1)}%</span>
          </div>
          <InlineBar value={riskShare} tone={riskShare >= 30 ? 'red' : riskShare >= 12 ? 'amber' : 'green'} />
        </div>
      </CardContent>
    </Card>
  );
}

function ProblemAccountsTable({ accounts }: { accounts: ARAgingDetail[] }) {
  const maxAmount = Math.max(...accounts.map((account) => toNumber(account.totalAmount)), 1);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Collection Risk Queue</CardTitle>
            <p className="text-xs text-slate-400">Oldest high-risk open invoices ranked by days outstanding</p>
          </div>
          <CompactBadge tone={accounts.some((account) => account.collectionRisk === 'Critical Risk') ? 'critical' : 'bad'}>
            {accounts.length} invoices
          </CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {accounts.length === 0 ? (
          <div className="p-4 text-sm text-slate-400">No high-risk accounts found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-950/40">
                <TableHead className="h-8 px-3 text-[11px] uppercase text-slate-400">Customer</TableHead>
                <TableHead className="h-8 text-[11px] uppercase text-slate-400">Invoice</TableHead>
                <TableHead className="h-8 text-right text-[11px] uppercase text-slate-400">Amount</TableHead>
                <TableHead className="h-8 text-right text-[11px] uppercase text-slate-400">Outstanding</TableHead>
                <TableHead className="h-8 text-right text-[11px] uppercase text-slate-400">Past Due</TableHead>
                <TableHead className="h-8 text-[11px] uppercase text-slate-400">Risk</TableHead>
                <TableHead className="h-8 text-[11px] uppercase text-slate-400">Terms</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.slice(0, 12).map((account) => {
                const amount = toNumber(account.totalAmount);
                const tone = riskTone(account.collectionRisk);

                return (
                  <TableRow key={`${account.orderNumber}-${account.customer}`} className="h-9">
                    <TableCell className="max-w-[18rem] px-3 py-1.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <ToneDot tone={tone} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{account.customer || 'Unknown customer'}</p>
                          <p className="truncate text-[11px] text-slate-400">{account.customerSegment || 'Unsegmented'} · {account.paymentPattern || 'Unknown pattern'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="font-mono text-xs">{account.orderNumber || 'n/a'}</span>
                    </TableCell>
                    <TableCell className="py-1.5 text-right">
                      <div className="ml-auto w-28 space-y-1">
                        <p className="font-mono text-xs">{formatCurrency(amount, { showCents: false })}</p>
                        <InlineBar value={(amount / maxAmount) * 100} tone={tone === 'critical' ? 'red' : 'orange'} />
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-xs">
                      {account.daysOutstanding}d
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-xs">
                      {account.daysPastDue}d
                    </TableCell>
                    <TableCell className="py-1.5">
                      <CompactBadge tone={tone}>{account.collectionRisk}</CompactBadge>
                    </TableCell>
                    <TableCell className="max-w-[9rem] py-1.5">
                      <span className="block truncate text-xs text-slate-400">{account.terms || 'n/a'}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default async function CashFlowPage() {
  const [currentDSO, arDetails, problemAccounts] = await Promise.all([
    getCurrentDSO(),
    getARAgingDetails(),
    getProblemAccounts(),
  ]);

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-800 bg-[#07101d]/95">
        <div className="flex w-full items-center justify-between gap-3 px-3">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Cash Flow</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          {currentDSO && (
            <div className="hidden items-center gap-2 text-xs text-slate-400 md:flex">
              <span>{currentDSO.openInvoiceCount} open invoices</span>
              <CompactBadge tone={assessmentTone(currentDSO.dsoAssessment)}>{currentDSO.dsoAssessment}</CompactBadge>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 space-y-3 bg-[#07101d] p-3 md:p-4">
        {!currentDSO ? (
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="flex items-center gap-2 p-4 text-sm text-slate-400">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              DSO data is not available.
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="grid gap-3 xl:grid-cols-[1fr_1fr]">
              <div className="space-y-3">
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <MetricTile
                    label="Current DSO"
                    value={`${toNumber(currentDSO.dsoDays).toFixed(0)} days`}
                    detail={currentDSO.dsoAssessment}
                    icon={CalendarClock}
                    tone={assessmentTone(currentDSO.dsoAssessment)}
                  />
                  <MetricTile
                    label="Total A/R"
                    value={formatCurrency(currentDSO.totalAccountsReceivable, { showCents: false })}
                    detail={`${formatNumber(currentDSO.openInvoiceCount, 0)} open invoices`}
                    icon={CircleDollarSign}
                    tone="blue"
                  />
                  <MetricTile
                    label="Collection Efficiency"
                    value={`${currentDSO.collectionEfficiencyPct}%`}
                    detail="A/R as percentage of recent sales"
                    icon={Gauge}
                    tone={toNumber(currentDSO.collectionEfficiencyPct) >= 80 ? 'good' : 'warn'}
                  />
                  <MetricTile
                    label="Daily Avg Sales"
                    value={formatCurrency(currentDSO.dailyAvgSales, { showCents: false })}
                    detail="Used in DSO calculation"
                    icon={TrendingUp}
                    tone="good"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-[0.8fr_1fr]">
                  <CollectionPosture dso={currentDSO} problemAccounts={problemAccounts} />
                  <Card className="rounded-md py-0 shadow-none">
                    <CardHeader className="border-b border-slate-800 px-3 py-2">
                      <CardTitle className="text-sm font-semibold">Cash Report Read</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2 p-3 text-xs text-slate-400">
                      <div className="flex items-start gap-2">
                        <ReceiptText className="mt-0.5 h-3.5 w-3.5 text-blue-300" />
                        <span>DSO converts open receivables into days of current sales exposure.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock3 className="mt-0.5 h-3.5 w-3.5 text-amber-300" />
                        <span>Past-due age and risk flags decide where collection attention starts.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Users className="mt-0.5 h-3.5 w-3.5 text-emerald-300" />
                        <span>Invoice rows preserve the customer, terms, amount, and payment-pattern context.</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <AgingPanel rows={arDetails} />
            </section>

            {problemAccounts.length > 0 && (
              <section className="flex items-center gap-2 rounded-md border border-slate-800 border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm text-orange-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{problemAccounts.length} high-risk invoices represent {formatCurrency(problemAccounts.reduce((sum, account) => sum + toNumber(account.totalAmount), 0), { showCents: false })} in collection exposure.</span>
              </section>
            )}

            <ProblemAccountsTable accounts={problemAccounts} />

            <section className="grid gap-3 md:grid-cols-3">
              <Link href="/account-attention" className="group rounded-md border border-slate-800 bg-[#0b1322] p-3 text-slate-100 shadow-none transition-colors hover:border-blue-500/50">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-300" />
                    <span className="text-sm font-semibold">Account Attention</span>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-300" />
                </div>
                <p className="mt-1 text-xs text-slate-400">Prioritized account risk, growth, and contact context</p>
              </Link>
              <Link href="/orders" className="group rounded-md border border-slate-800 bg-[#0b1322] p-3 text-slate-100 shadow-none transition-colors hover:border-blue-500/50">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ReceiptText className="h-4 w-4 text-emerald-300" />
                    <span className="text-sm font-semibold">Orders</span>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-300" />
                </div>
                <p className="mt-1 text-xs text-slate-400">Invoice-level details, status, customer, and payment state</p>
              </Link>
              <Link href="/" className="group rounded-md border border-slate-800 bg-[#0b1322] p-3 text-slate-100 shadow-none transition-colors hover:border-blue-500/50">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-amber-300" />
                    <span className="text-sm font-semibold">Business Cockpit</span>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-300" />
                </div>
                <p className="mt-1 text-xs text-slate-400">Cash, revenue, inventory, attribution, and exception context</p>
              </Link>
            </section>
          </>
        )}
      </main>
    </>
  );
}
