// ABOUTME: Dense contact coverage report for account outreach readiness
// ABOUTME: Keeps the existing searchable contact table while surfacing queue-level insight

import type { ComponentType, ReactNode } from 'react';
import {
  Building2,
  MailCheck,
  ShieldCheck,
  Star,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { getContacts, type Contact } from '@/lib/queries/contacts';
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
import { DataTable } from '@/components/contacts/data-table';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

interface ContactsPageProps {
  searchParams: Promise<{
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: string;
    contactRole?: string;
    businessSize?: string;
    revenueCategory?: string;
    contactTier?: string;
    emailMarketable?: string;
    keyAccountContact?: string;
  }>;
}

function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function compactCurrency(value: number) {
  return formatCurrency(value, { showCents: false });
}

function percent(part: number, total: number) {
  if (total <= 0) return '0.0%';
  return `${formatNumber((part / total) * 100, 1)}%`;
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

function InlineBar({ value, tone = 'blue' }: { value: number; tone?: 'blue' | 'green' | 'amber' | 'red' }) {
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
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function countBy(contacts: Contact[], key: keyof Contact) {
  return contacts.reduce((map, contact) => {
    const label = String(contact[key] || 'Unknown');
    map.set(label, (map.get(label) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
}

function mapRows(map: Map<string, number>, toneFor: (label: string) => 'blue' | 'green' | 'amber' | 'red', limit = 5) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count, tone: toneFor(label) }));
}

function MixPanel({
  title,
  description,
  rows,
  total,
}: {
  title: string;
  description: string;
  rows: Array<{ label: string; count: number; tone: 'blue' | 'green' | 'amber' | 'red' }>;
  total: number;
}) {
  const maxCount = Math.max(...rows.map((row) => row.count), 1);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            <p className="text-xs text-slate-400">{description}</p>
          </div>
          <CompactBadge tone="blue">{total} queued</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[8rem_minmax(0,1fr)_2.5rem] items-center gap-2">
            <p className="truncate text-xs text-slate-400" title={row.label}>{row.label}</p>
            <InlineBar value={(row.count / maxCount) * 100} tone={row.tone} />
            <p className="text-right font-mono text-xs">{row.count}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ContactPriorityPanel({ contacts }: { contacts: Contact[] }) {
  const leaders = [...contacts]
    .sort((a, b) => {
      const aScore = (a.keyAccountContact ? 1000000 : 0) + toNumber(a.companyTotalRevenue);
      const bScore = (b.keyAccountContact ? 1000000 : 0) + toNumber(b.companyTotalRevenue);
      return bScore - aScore;
    })
    .slice(0, 8);
  const maxRevenue = Math.max(...leaders.map((contact) => toNumber(contact.companyTotalRevenue)), 1);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Priority Contact Queue</CardTitle>
            <p className="text-xs text-slate-400">Key account and high-revenue contacts visible in this result set</p>
          </div>
          <CompactBadge tone="warn">{leaders.filter((contact) => contact.keyAccountContact).length} key</CompactBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leaders.map((contact, index) => {
          const revenue = toNumber(contact.companyTotalRevenue);
          return (
            <div key={`${contact.contactDimKey || contact.primaryEmail || contact.fullName}-${index}`} className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-3 border-b border-slate-800 px-3 py-2 last:border-b-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{contact.fullName || 'Unknown contact'}</p>
                  {contact.isPrimaryCompanyContact && <CompactBadge tone="good">primary</CompactBadge>}
                  {contact.keyAccountContact && <CompactBadge tone="warn">key</CompactBadge>}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                  {contact.jobTitle || contact.contactRole || 'Role unknown'} · {contact.companyName || 'Unknown company'}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="font-mono text-xs font-semibold">{compactCurrency(revenue)}</p>
                <div className="flex items-center gap-2">
                  <InlineBar value={(revenue / maxRevenue) * 100} tone={contact.emailMarketable ? 'green' : 'amber'} />
                  <span className="w-12 text-[11px] text-slate-400">{contact.emailMarketable ? 'email' : 'review'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const {
    search,
    sortBy,
    sortOrder,
    page,
    contactRole,
    businessSize,
    revenueCategory,
    contactTier,
    emailMarketable,
    keyAccountContact,
  } = await searchParams;

  const searchTerm = search || '';
  const currentSortBy = sortBy || 'companyTotalRevenue';
  const currentSortOrder = sortOrder || 'desc';
  const currentPage = parseInt(page || '1', 10);
  const filters = {
    contactRole: contactRole || undefined,
    businessSize: businessSize || undefined,
    revenueCategory: revenueCategory || undefined,
    contactTier: contactTier || undefined,
    emailMarketable: emailMarketable === 'true' ? true : emailMarketable === 'false' ? false : undefined,
    keyAccountContact: keyAccountContact === 'true' ? true : keyAccountContact === 'false' ? false : undefined,
  };

  const { contacts, totalCount } = await getContacts(currentPage, 50, searchTerm, currentSortBy, currentSortOrder, filters);
  const visibleCount = contacts.length;
  const marketableCount = contacts.filter((contact) => contact.emailMarketable).length;
  const primaryCount = contacts.filter((contact) => contact.isPrimaryCompanyContact).length;
  const keyCount = contacts.filter((contact) => contact.keyAccountContact).length;
  const completeCount = contacts.filter((contact) => contact.contactDataQuality === 'complete').length;
  const visibleCompanies = new Map<string, number>();
  contacts.forEach((contact) => {
    const companyName = contact.companyName || 'Unknown company';
    visibleCompanies.set(companyName, Math.max(visibleCompanies.get(companyName) ?? 0, toNumber(contact.companyTotalRevenue)));
  });
  const visibleAccountValue = Array.from(visibleCompanies.values()).reduce((sum, value) => sum + value, 0);
  const roleRows = mapRows(countBy(contacts, 'contactRole'), () => 'blue');
  const qualityRows = mapRows(countBy(contacts, 'contactDataQuality'), (label) => {
    if (label === 'complete') return 'green';
    if (label === 'minimal') return 'red';
    return 'amber';
  });
  const tierRows = mapRows(countBy(contacts, 'contactTier'), (label) => (label.toLowerCase().includes('key') ? 'amber' : 'blue'));

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-800 bg-[#07101d]/95 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Contacts</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex-1 space-y-4 bg-[#07101d] p-4 text-slate-100 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Contact Coverage</h1>
              <CompactBadge tone="blue">page {currentPage}</CompactBadge>
              {searchTerm && <CompactBadge tone="warn">search: {searchTerm}</CompactBadge>}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Reachability, key-account coverage, and data quality for the current contact queue.
            </p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          <MetricTile
            label="Filtered Contacts"
            value={formatNumber(totalCount, 0)}
            detail={`${visibleCount} visible on this page`}
            icon={Users}
            tone="blue"
          />
          <MetricTile
            label="Visible Account Value"
            value={compactCurrency(visibleAccountValue)}
            detail={`${visibleCompanies.size} companies represented`}
            icon={Building2}
            tone="good"
          />
          <MetricTile
            label="Marketable Emails"
            value={percent(marketableCount, visibleCount)}
            detail={`${marketableCount} of ${visibleCount} visible contacts`}
            icon={MailCheck}
            tone={marketableCount >= visibleCount * 0.7 ? 'good' : 'warn'}
          />
          <MetricTile
            label="Primary Contacts"
            value={formatNumber(primaryCount, 0)}
            detail={`${percent(primaryCount, visibleCount)} of visible queue`}
            icon={UserRoundCheck}
            tone="blue"
          />
          <MetricTile
            label="Complete Records"
            value={percent(completeCount, visibleCount)}
            detail={`${keyCount} key-account contacts visible`}
            icon={ShieldCheck}
            tone={completeCount >= visibleCount * 0.7 ? 'good' : 'warn'}
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
          <ContactPriorityPanel contacts={contacts} />
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
            <MixPanel title="Role Mix" description="Buyer, owner, accounting, and unknown roles" rows={roleRows} total={visibleCount} />
            <MixPanel title="Data Quality" description="Completeness of usable outreach fields" rows={qualityRows} total={visibleCount} />
            <MixPanel title="Contact Tier" description="Current tier classification for queueing" rows={tierRows} total={visibleCount} />
          </div>
        </div>

        <Card className="rounded-md py-0 shadow-none">
          <CardHeader className="border-b border-slate-800 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Star className="h-4 w-4 text-amber-300" />
                  Contact Detail
                </CardTitle>
                <p className="text-xs text-slate-400">Search, sort, and filter the operational contact queue</p>
              </div>
              <CompactBadge tone="blue">50 per page</CompactBadge>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <DataTable
              data={contacts}
              totalCount={totalCount}
              currentPage={currentPage}
              pageSize={50}
              searchTerm={searchTerm}
              searchResults={searchTerm ? `${totalCount} contacts found for "${searchTerm}"` : undefined}
              sortBy={currentSortBy}
              sortOrder={currentSortOrder}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
