// ABOUTME: Dense account attention report for revenue-risk and outreach prioritization
// ABOUTME: Surfaces highest-value account exceptions before the detailed queue
import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDownRight,
  Building2,
  CircleDollarSign,
  Clock3,
  MailCheck,
  Target,
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
import { getAccountAttentionQueue } from '@/lib/queries';
import type { AccountAttentionItem } from '@/lib/queries/account-attention';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function compactCurrency(value: number | string) {
  return formatCurrency(value, { showCents: false });
}

function attentionTone(score: number): 'bad' | 'warn' | 'blue' | 'good' {
  if (score >= 85) return 'bad';
  if (score >= 65) return 'warn';
  if (score >= 40) return 'blue';
  return 'good';
}

function healthTone(score: string | number): 'bad' | 'warn' | 'blue' | 'good' {
  const numeric = toNumber(score);
  if (numeric < 35) return 'bad';
  if (numeric < 60) return 'warn';
  if (numeric < 80) return 'blue';
  return 'good';
}

function CompactBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'good' | 'blue' | 'warn' | 'bad';
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-5 rounded-sm px-1.5 text-[11px] font-medium',
        tone === 'good' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
        tone === 'blue' && 'border-blue-500/30 bg-blue-500/10 text-blue-200',
        tone === 'warn' && 'border-amber-500/30 bg-amber-500/10 text-amber-200',
        tone === 'bad' && 'border-red-500/30 bg-red-500/10 text-red-200',
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
  tone?: 'blue' | 'green' | 'amber' | 'red';
}) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
      <div
        className={cn(
          'h-full rounded-full',
          tone === 'blue' && 'bg-blue-500',
          tone === 'green' && 'bg-emerald-500',
          tone === 'amber' && 'bg-amber-500',
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

function contactLabel(account: AccountAttentionItem) {
  if (!account.bestContactEmail) return 'No email';
  if (account.bestContactIsLikelyHuman) return 'Human contact';
  if (account.bestContactIsBilling) return 'Billing contact';
  if (account.bestContactIsGeneric) return 'Generic inbox';
  if (account.bestContactIsInternal) return 'Internal';
  return 'Contact found';
}

function contactTone(account: AccountAttentionItem): 'good' | 'blue' | 'warn' | 'bad' {
  if (!account.bestContactEmail) return 'bad';
  if (account.bestContactIsLikelyHuman) return 'good';
  if (account.bestContactIsBilling) return 'blue';
  return 'warn';
}

function reasonTone(reason: string): 'bad' | 'warn' | 'blue' | 'neutral' {
  const lower = reason.toLowerCase();
  if (lower.includes('critical') || lower.includes('lost') || lower.includes('declin')) return 'bad';
  if (lower.includes('stale') || lower.includes('inactive') || lower.includes('risk') || lower.includes('past')) return 'warn';
  if (lower.includes('growth') || lower.includes('opportun') || lower.includes('high')) return 'blue';
  return 'neutral';
}

function TopAccountsPanel({ accounts }: { accounts: AccountAttentionItem[] }) {
  const leaders = accounts.slice(0, 8);
  const maxScore = Math.max(...leaders.map((account) => account.attentionScore), 1);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Priority Queue</CardTitle>
            <p className="text-xs text-slate-400">Highest combined attention score with revenue context</p>
          </div>
          <CompactBadge tone="bad">{leaders.length} shown</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leaders.map((account) => {
          const tone = attentionTone(account.attentionScore);
          const barTone = tone === 'bad' ? 'red' : tone === 'warn' ? 'amber' : tone === 'good' ? 'green' : 'blue';

          return (
            <div key={account.companyDomainKey} className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3 border-b border-slate-800 px-3 py-2 last:border-b-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      tone === 'bad' && 'bg-red-500',
                      tone === 'warn' && 'bg-amber-500',
                      tone === 'blue' && 'bg-blue-500',
                      tone === 'good' && 'bg-emerald-500',
                    )}
                  />
                  <Link href={`/companies/${account.companyDomainKey}`} className="truncate text-sm font-medium hover:underline">
                    {account.companyName}
                  </Link>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                  {compactCurrency(account.totalRevenue)} total · {account.daysSinceLastOrder}d since order · {account.activityStatus}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="font-mono text-xs font-semibold">{formatNumber(account.attentionScore, 0)}</p>
                <InlineBar value={(account.attentionScore / maxScore) * 100} tone={barTone} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ReasonMixPanel({ accounts }: { accounts: AccountAttentionItem[] }) {
  const reasons = accounts
    .flatMap((account) => account.reasonCodes)
    .reduce((map, reason) => {
      map.set(reason, (map.get(reason) ?? 0) + 1);
      return map;
    }, new Map<string, number>());
  const leaders = Array.from(reasons.entries()).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const maxCount = Math.max(...leaders.map(([, count]) => count), 1);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Why Accounts Are Here</CardTitle>
            <p className="text-xs text-slate-400">Reason code concentration across the queue</p>
          </div>
          <CompactBadge tone="blue">{reasons.size} codes</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-3">
        {leaders.map(([reason, count]) => {
          const tone = reasonTone(reason);
          return (
            <div key={reason} className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-xs font-medium" title={reason}>{reason}</p>
                <CompactBadge tone={tone === 'neutral' ? 'blue' : tone}>{count}</CompactBadge>
              </div>
              <InlineBar value={(count / maxCount) * 100} tone={tone === 'bad' ? 'red' : tone === 'warn' ? 'amber' : 'blue'} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ContactReadinessPanel({ accounts }: { accounts: AccountAttentionItem[] }) {
  const human = accounts.filter((account) => account.bestContactIsLikelyHuman).length;
  const billing = accounts.filter((account) => account.bestContactIsBilling).length;
  const generic = accounts.filter((account) => account.bestContactIsGeneric).length;
  const missing = accounts.filter((account) => !account.bestContactEmail).length;
  const total = Math.max(accounts.length, 1);
  const rows = [
    { label: 'Human contact', count: human, tone: 'green' as const },
    { label: 'Billing contact', count: billing, tone: 'blue' as const },
    { label: 'Generic inbox', count: generic, tone: 'amber' as const },
    { label: 'Missing email', count: missing, tone: 'red' as const },
  ];

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Contact Readiness</CardTitle>
            <p className="text-xs text-slate-400">How reachable the current queue appears</p>
          </div>
          <CompactBadge tone={missing > 0 ? 'warn' : 'good'}>{formatNumber((human / total) * 100, 0)}% human</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[7.5rem_minmax(0,1fr)_2rem] items-center gap-2">
            <p className="truncate text-xs text-slate-400">{row.label}</p>
            <InlineBar value={(row.count / total) * 100} tone={row.tone} />
            <p className="text-right font-mono text-xs">{row.count}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default async function AccountAttentionPage() {
  const accounts = await getAccountAttentionQueue(100);
  const highPriority = accounts.filter((account) => account.attentionScore >= 75);
  const staleAccounts = accounts.filter((account) => account.daysSinceLastOrder >= 90);
  const lowHealth = accounts.filter((account) => toNumber(account.healthScore) < 60);
  const revenueAtRisk = highPriority.reduce((sum, account) => sum + toNumber(account.totalRevenue), 0);
  const totalQueueRevenue = accounts.reduce((sum, account) => sum + toNumber(account.totalRevenue), 0);
  const humanContacts = accounts.filter((account) => account.bestContactIsLikelyHuman).length;
  const topAccount = accounts[0] ?? null;

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-800 bg-[#07101d]/95 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex w-full items-center justify-between gap-3 px-3">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Account Attention</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <CompactBadge tone="warn">{accounts.length} queued</CompactBadge>
          </div>
          {topAccount ? (
            <div className="hidden min-w-0 items-center gap-2 text-xs text-slate-400 lg:flex">
              <Target className="h-3.5 w-3.5 text-red-300" />
              <span className="truncate">Top account: {topAccount.companyName}</span>
            </div>
          ) : null}
        </div>
      </header>

      <main className="flex-1 space-y-4 overflow-x-hidden bg-[#07101d] p-3 md:p-4">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Revenue at Risk"
            value={compactCurrency(revenueAtRisk)}
            detail={<>{highPriority.length} high-priority accounts · {formatNumber(totalQueueRevenue > 0 ? (revenueAtRisk / totalQueueRevenue) * 100 : 0, 1)}% of queue revenue</>}
            icon={CircleDollarSign}
            tone="bad"
          />
          <MetricTile
            label="Stale Accounts"
            value={formatNumber(staleAccounts.length, 0)}
            detail={<>{lowHealth.length} accounts also below 60 health score</>}
            icon={Clock3}
            tone="warn"
          />
          <MetricTile
            label="Reachable Contacts"
            value={`${formatNumber(accounts.length > 0 ? (humanContacts / accounts.length) * 100 : 0, 0)}%`}
            detail={<>{humanContacts} likely human contacts · {accounts.length - humanContacts} need review</>}
            icon={MailCheck}
            tone={humanContacts / Math.max(accounts.length, 1) >= 0.6 ? 'good' : 'warn'}
          />
          <MetricTile
            label="Top Account"
            value={topAccount ? formatNumber(topAccount.attentionScore, 0) : '0'}
            detail={topAccount ? <>{topAccount.companyName} · {compactCurrency(topAccount.totalRevenue)} total</> : <>No queued account data</>}
            icon={AlertTriangle}
            tone={topAccount && topAccount.attentionScore >= 85 ? 'bad' : 'warn'}
          />
        </section>

        <section className="grid gap-3 xl:grid-cols-[1.35fr_.65fr]">
          <TopAccountsPanel accounts={accounts} />
          <div className="space-y-3">
            <ReasonMixPanel accounts={accounts} />
            <ContactReadinessPanel accounts={accounts} />
          </div>
        </section>

        <Card className="rounded-md py-0 shadow-none">
          <CardHeader className="border-b border-slate-800 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold">Detailed Account Queue</CardTitle>
                <p className="text-xs text-slate-400">Prioritized current-safe company risk and opportunity queue</p>
              </div>
              <CompactBadge tone="blue">{accounts.length} rows</CompactBadge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-950/40">
                    <TableHead className="h-8 min-w-64 px-3 text-[11px] uppercase text-slate-400">Company</TableHead>
                    <TableHead className="h-8 text-right text-[11px] uppercase text-slate-400">Score</TableHead>
                    <TableHead className="h-8 text-right text-[11px] uppercase text-slate-400">1Y Revenue</TableHead>
                    <TableHead className="h-8 text-right text-[11px] uppercase text-slate-400">90D Revenue</TableHead>
                    <TableHead className="h-8 text-right text-[11px] uppercase text-slate-400">Days</TableHead>
                    <TableHead className="h-8 text-[11px] uppercase text-slate-400">Health</TableHead>
                    <TableHead className="h-8 min-w-72 text-[11px] uppercase text-slate-400">Reasons</TableHead>
                    <TableHead className="h-8 min-w-72 text-[11px] uppercase text-slate-400">Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => {
                    const scoreTone = attentionTone(account.attentionScore);
                    const accountHealthTone = healthTone(account.healthScore);

                    return (
                      <TableRow key={account.companyDomainKey} className="h-12">
                        <TableCell className="px-3 py-2">
                          <div className="min-w-0">
                            <Link href={`/companies/${account.companyDomainKey}`} className="block truncate text-sm font-medium hover:underline">
                              {account.companyName}
                            </Link>
                            <div className="mt-1 flex min-w-0 items-center gap-1">
                              <CompactBadge tone="blue">{account.revenueCategory}</CompactBadge>
                              <span className="truncate text-[11px] text-slate-400">{account.combinedGrowthTrend}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <CompactBadge tone={scoreTone}>{formatNumber(account.attentionScore, 0)}</CompactBadge>
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono text-xs">{compactCurrency(account.trailing1yRevenue)}</TableCell>
                        <TableCell className="py-2 text-right font-mono text-xs">{compactCurrency(account.trailing90dRevenue)}</TableCell>
                        <TableCell className="py-2 text-right font-mono text-xs">{formatNumber(account.daysSinceLastOrder, 0)}</TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <CompactBadge tone={accountHealthTone}>{account.healthScore}</CompactBadge>
                            <span className="truncate text-xs text-slate-400">{account.activityStatus}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex max-w-[24rem] flex-wrap gap-1">
                            {account.reasonCodes.slice(0, 4).map((reason) => {
                              const tone = reasonTone(reason);
                              return (
                                <CompactBadge key={reason} tone={tone === 'neutral' ? 'blue' : tone}>
                                  {reason}
                                </CompactBadge>
                              );
                            })}
                            {account.reasonCodes.length > 4 ? <CompactBadge>+{account.reasonCodes.length - 4}</CompactBadge> : null}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <Users className="h-3.5 w-3.5 text-slate-400" />
                              <span className="truncate text-sm">{account.bestContactName || 'No named contact'}</span>
                              <CompactBadge tone={contactTone(account)}>{contactLabel(account)}</CompactBadge>
                            </div>
                            <p className="mt-0.5 truncate text-[11px] text-slate-400">{account.bestContactEmail || account.bestContactRole || 'No contact detail'}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-3 md:grid-cols-3">
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="flex items-center gap-3 p-3">
              <Building2 className="h-4 w-4 text-blue-300" />
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Queue Revenue</p>
                <p className="text-sm font-semibold">{compactCurrency(totalQueueRevenue)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="flex items-center gap-3 p-3">
              <ArrowDownRight className="h-4 w-4 text-red-300" />
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Low Health Accounts</p>
                <p className="text-sm font-semibold">{formatNumber(lowHealth.length, 0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-md py-0 shadow-none">
            <CardContent className="grid grid-cols-3 gap-3 p-3 text-xs">
              <div>
                <p className="text-slate-400">High</p>
                <p className="font-semibold tabular-nums">{formatNumber(highPriority.length, 0)}</p>
              </div>
              <div>
                <p className="text-slate-400">Stale</p>
                <p className="font-semibold tabular-nums">{formatNumber(staleAccounts.length, 0)}</p>
              </div>
              <div>
                <p className="text-slate-400">Human</p>
                <p className="font-semibold tabular-nums">{formatNumber(humanContacts, 0)}</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
