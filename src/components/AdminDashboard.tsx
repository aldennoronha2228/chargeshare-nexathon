import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BatteryCharging,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Download,
  LayoutDashboard,
  ListFilter,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import type { Booking, BookingStatus } from '../utils/bookings';
import type { ProviderProfile } from '../utils/providerProfile';
import type { PublicProviderCharger } from '../utils/providerChargers';
import { getAdminApiError } from '../utils/adminApi';

type Section = 'overview' | 'accounts' | 'bookings' | 'clients' | 'providers' | 'chargers' | 'reviews' | 'transactions' | 'refunds' | 'payouts' | 'audit' | 'settings';
type UserProfile = { id?: string; uid?: string; displayName?: string; email?: string; phoneNumber?: string; createdAt?: string; lastSignInAt?: string; accountStatus?: string; emailVerified?: boolean; disabled?: boolean; authProviders?: string[] };
type AdminBooking = Booking;
type AdminProvider = ProviderProfile & { id: string };
type AdminCharger = PublicProviderCharger;
type AdminAuthAccount = UserProfile & { uid: string; authProviders: string[] };
type AdminReview = { id: string; chargerId?: string; providerId?: string; userId?: string; userName?: string; rating?: number; comment?: string; response?: string; createdAt?: string };
type AdminRecord = Record<string, unknown> & { id: string };
type DataState = {
  users: UserProfile[];
  authAccounts: AdminAuthAccount[];
  providers: AdminProvider[];
  bookings: AdminBooking[];
  chargers: AdminCharger[];
  reviews: AdminReview[];
  transactions: AdminRecord[];
  refunds: AdminRecord[];
  payouts: AdminRecord[];
  auditLogs: AdminRecord[];
  platformSettings: AdminRecord[];
};

const EMPTY_DATA: DataState = { users: [], authAccounts: [], providers: [], bookings: [], chargers: [], reviews: [], transactions: [], refunds: [], payouts: [], auditLogs: [], platformSettings: [] };
const SECTIONS: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'accounts', label: 'Auth accounts', icon: Users },
  { id: 'bookings', label: 'Bookings', icon: CalendarDays },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'providers', label: 'Providers', icon: ShieldCheck },
  { id: 'chargers', label: 'Charger listings', icon: BatteryCharging },
  { id: 'reviews', label: 'Reviews', icon: Activity },
  { id: 'transactions', label: 'Transactions', icon: CreditCard },
  { id: 'refunds', label: 'Refunds', icon: MapPin },
  { id: 'payouts', label: 'Provider payouts', icon: CircleDollarSign },
  { id: 'audit', label: 'Admin audit logs', icon: Check },
  { id: 'settings', label: 'Platform settings', icon: Menu },
];

function displayDate(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function currency(value: unknown): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function getName(record: { displayName?: string; name?: string; email?: string; uid?: string; id?: string }): string {
  return record.displayName?.trim() || record.name?.trim() || record.email || record.uid || record.id || 'Unnamed account';
}

function statusTone(status: string): string {
  if (['active', 'accepted', 'approved', 'completed', 'successful', 'paid'].includes(status.toLowerCase())) return 'bg-[#E8F2EC] text-[#24543B]';
  if (['pending', 'processing', 'under review'].includes(status.toLowerCase())) return 'bg-[#F4F0E6] text-[#765D22]';
  if (['inactive', 'rejected', 'declined', 'cancelled', 'failed'].includes(status.toLowerCase())) return 'bg-[#F5E9E7] text-[#87463D]';
  return 'bg-[#F0F0EE] text-[#555]';
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${statusTone(value)}`}>{value || 'unknown'}</span>;
}

function MetricCard({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof Users }) {
  return (
    <article className="flex min-h-[102px] flex-col rounded-xl border border-black/10 bg-white p-3 sm:min-h-[112px] sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-[11px] font-medium leading-4 text-black/55 sm:text-xs">{label}</p>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F2F2F0] text-black/70 sm:h-8 sm:w-8"><Icon size={15} aria-hidden="true" /></span>
      </div>
      <p className="mt-1 text-[22px] font-semibold leading-none tracking-tight text-[#171717] sm:text-2xl">{value}</p>
      <p className="mt-1.5 line-clamp-2 text-[10px] leading-3.5 text-black/45 sm:text-[11px] sm:leading-4">{detail}</p>
    </article>
  );
}

function TableFrame({ title, description, children, count }: { title: string; description: string; children: React.ReactNode; count?: number }) {
  return (
    <section className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-black/50">{description}</p>
        </div>
        {count !== undefined && <span className="rounded-full bg-[#F2F2F0] px-2.5 py-1 text-xs font-semibold text-black/60">{count} records</span>}
      </div>
      {children}
    </section>
  );
}

function EmptyTable({ message }: { message: string }) {
  return <div className="px-5 py-12 text-center text-sm text-black/45">{message}</div>;
}

const PAGE_SIZE = 10;

function PageControls({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div className="flex items-center justify-between border-t border-black/[0.06] px-4 py-3 text-[10px] text-black/50">
      <span>{total === 0 ? 'No records' : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-md border border-black/10 p-1.5 hover:bg-black/5 disabled:opacity-35"><ChevronLeft size={14} /></button>
        <span className="min-w-12 text-center">{page} / {pages}</span>
        <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1)} className="rounded-md border border-black/10 p-1.5 hover:bg-black/5 disabled:opacity-35"><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

function exportCsv(filename: string, rows: Record<string, string | number | null | undefined>[]) {
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const encode = (value: unknown) => {
    let text = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const csv = [columns, ...rows.map((row) => columns.map((column) => row[column]))]
    .map((line) => line.map(encode).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function DataTable({ children, headers }: { children: React.ReactNode; headers: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-xs">
        <thead className="bg-[#F8F8F6] text-[10px] uppercase tracking-[0.1em] text-black/45">
          <tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-black/[0.06]">{children}</tbody>
      </table>
    </div>
  );
}

function Cell({ children, secondary }: { children: React.ReactNode; secondary?: React.ReactNode }) {
  return <td className="px-4 py-3.5 align-middle"><div className="font-medium text-[#242424]">{children}</div>{secondary && <div className="mt-1 max-w-56 truncate text-[10px] text-black/45">{secondary}</div>}</td>;
}

function ActivityBars({ bookings }: { bookings: AdminBooking[] }) {
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      const count = bookings.filter((booking) => {
        const created = new Date(booking.createdAt).getTime();
        return Number.isFinite(created) && created >= date.getTime() && created < nextDay.getTime();
      }).length;
      return { label: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date), count };
    });
  }, [bookings]);
  const peak = Math.max(...days.map(({ count }) => count), 1);
  return (
    <div className="flex h-44 items-end justify-between gap-3 px-1 pb-1" aria-label="Booking requests over the last seven days">
      {days.map(({ label, count }) => (
        <div key={label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className="text-[10px] font-medium text-black/45">{count}</span>
          <div className="flex w-full flex-1 items-end"><div className="mx-auto w-full max-w-8 rounded-t-md bg-[#171717]" style={{ height: `${Math.max(8, (count / peak) * 100)}%` }} /></div>
          <span className="text-[10px] text-black/45">{label}</span>
        </div>
      ))}
    </div>
  );
}

export const AdminDashboard: React.FC<{ onSignOut: () => void }> = ({ onSignOut }) => {
  const [section, setSection] = useState<Section>('overview');
  const [data, setData] = useState<DataState>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [bookingFilter, setBookingFilter] = useState<'all' | BookingStatus>('all');
  const [page, setPage] = useState(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reviewingProviderId, setReviewingProviderId] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const response = await fetch('/api/admin/data', { credentials: 'same-origin' });
        if (!(response.headers.get('content-type') || '').includes('application/json')) {
          throw new Error('The admin API is not running. Stop the old server and restart this app with npm run dev from the chargeshare-nexathon folder.');
        }
        const payload = await response.json() as Partial<DataState> & { error?: string; sourceErrors?: string[] };
        if (!response.ok) throw new Error(payload.error || 'Admin records could not be loaded.');
        if (!active) return;
        setData({
          users: payload.users ?? [],
          authAccounts: payload.authAccounts ?? [],
          providers: payload.providers ?? [],
          bookings: (payload.bookings ?? []).sort((a, b) => Date.parse(String(b.createdAt ?? '')) - Date.parse(String(a.createdAt ?? ''))),
          chargers: payload.chargers ?? [],
          reviews: payload.reviews ?? [],
          transactions: payload.transactions ?? [],
          refunds: payload.refunds ?? [],
          payouts: payload.payouts ?? [],
          auditLogs: payload.auditLogs ?? [],
          platformSettings: payload.platformSettings ?? [],
        });
        setError(payload.sourceErrors?.join(' ') ?? '');
      } catch (loadError) {
        if (active) setError(getAdminApiError(loadError, 'Admin records could not be loaded.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadData();
    const refreshTimer = window.setInterval(loadData, 60_000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [refreshKey]);

  useEffect(() => { setSearch(''); setPage(1); setBookingFilter('all'); }, [section]);
  useEffect(() => { setPage(1); }, [search, bookingFilter]);

  const providerIds = useMemo(() => new Set(data.providers.map((provider) => provider.uid || provider.id)), [data.providers]);
  const clients = useMemo(() => data.users.filter((user) => !providerIds.has(user.uid || user.id || '')), [data.users, providerIds]);
  const statusCounts = useMemo(() => data.bookings.reduce<Record<string, number>>((counts, booking) => {
    counts[booking.status] = (counts[booking.status] ?? 0) + 1;
    return counts;
  }, {}), [data.bookings]);
  const recentBookings = data.bookings.slice(0, 6);
  const matchingBookings = data.bookings.filter((booking) => {
    const statusMatches = bookingFilter === 'all' || booking.status === bookingFilter;
    const needle = search.trim().toLowerCase();
    const textMatches = !needle || [booking.id, booking.userName, booking.userId, booking.providerId, booking.chargerTitle, booking.chargerId, booking.chargerLocality]
      .some((value) => String(value ?? '').toLowerCase().includes(needle));
    return statusMatches && textMatches;
  });
  const matchingClients = clients.filter((client) => [getName(client), client.email, client.uid]
    .some((value) => String(value ?? '').toLowerCase().includes(search.trim().toLowerCase())));
  const matchingAccounts = data.authAccounts.filter((account) => [getName(account), account.email, account.uid, ...(account.authProviders ?? [])]
    .some((value) => String(value ?? '').toLowerCase().includes(search.trim().toLowerCase())));
  const matchingProviders = data.providers.filter((provider) => [getName(provider), provider.email, provider.uid, provider.city]
    .some((value) => String(value ?? '').toLowerCase().includes(search.trim().toLowerCase())));
  const pendingProviderApplications = data.providers.filter((provider) => provider.applicationStatus === 'under_review');
  const matchingChargers = data.chargers.filter((charger) => [charger.id, charger.title, charger.locality, charger.city, charger.providerId]
    .some((value) => String(value ?? '').toLowerCase().includes(search.trim().toLowerCase())));
  const matchingReviews = data.reviews.filter((review) => [review.id, review.userName, review.userId, review.providerId, review.chargerId, review.comment]
    .some((value) => String(value ?? '').toLowerCase().includes(search.trim().toLowerCase())));
  const pageSlice = <T,>(rows: T[]) => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const registeredCount = new Set([...data.users.map((user) => user.uid || user.id), ...data.providers.map((provider) => provider.uid || provider.id)].filter(Boolean)).size;
  const activeChargers = data.chargers.filter((charger) => charger.status === 'active').length;
  const pageTitle = SECTIONS.find((item) => item.id === section)?.label ?? 'Overview';

  const decideProviderApplication = async (providerId: string, decision: 'approved' | 'declined') => {
    setReviewingProviderId(providerId);
    setReviewMessage('');
    setReviewError('');
    try {
      const response = await fetch(`/api/admin/providers/${encodeURIComponent(providerId)}/review`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Could not save the provider decision.');
      setReviewMessage(`Provider application ${decision}.`);
      setRefreshKey((value) => value + 1);
    } catch (decisionError) {
      setReviewError(decisionError instanceof Error ? decisionError.message : 'Could not save the provider decision.');
    } finally {
      setReviewingProviderId('');
    }
  };

  const navItems = (
    <>
      <p className="px-3 pb-2 pt-5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">Workspace</p>
      {SECTIONS.map(({ id, label, icon: Icon }) => (
        <button
          type="button"
          key={id}
          onClick={() => { setSection(id); setMobileMenuOpen(false); }}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${section === id ? 'bg-white text-[#141414]' : 'text-white/65 hover:bg-white/10 hover:text-white'}`}
        >
          <Icon size={16} aria-hidden="true" />
          <span className="flex-1">{label}</span>
          {id === 'bookings' && statusCounts.pending > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${section === id ? 'bg-black/10' : 'bg-white/15'}`}>{statusCounts.pending}</span>}
          {id === 'providers' && pendingProviderApplications.length > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${section === id ? 'bg-black/10' : 'bg-white/15'}`}>{pendingProviderApplications.length}</span>}
        </button>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#171717] lg:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto bg-[#111] px-4 py-5 text-white lg:flex">
        <div className="flex items-center gap-2 px-3 pb-5">
          <span className="text-[13px] font-black tracking-[0.14em]">CHARGESHARE</span>
          <span className="rounded border border-white/20 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-white/65">ADMIN</span>
        </div>
        <div className="border-t border-white/10">{navItems}</div>
        <div className="mt-auto border-t border-white/10 pt-4">
          <div className="mb-3 flex items-center gap-2 px-2 text-[10px] text-white/45"><span className="h-1.5 w-1.5 rounded-full bg-white" /> Secure admin session</div>
          <button type="button" onClick={onSignOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold text-white/65 hover:bg-white/10 hover:text-white"><LogOut size={16} />Sign out</button>
        </div>
      </aside>

      {mobileMenuOpen && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-y-auto bg-[#111] px-4 py-5 text-white shadow-2xl transition-transform lg:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-white/10 px-3 pb-5">
          <span className="text-[13px] font-black tracking-[0.14em]">CHARGESHARE <span className="text-white/50">ADMIN</span></span>
          <button type="button" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} className="rounded p-1 text-white/70 hover:bg-white/10"><X size={19} /></button>
        </div>
        <div>{navItems}</div>
        <button type="button" onClick={onSignOut} className="mt-auto flex items-center gap-3 rounded-lg px-3 py-3 text-xs font-semibold text-white/65 hover:bg-white/10"><LogOut size={16} />Sign out</button>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-black/10 bg-white/95 px-3 backdrop-blur sm:h-16 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Open navigation" onClick={() => setMobileMenuOpen(true)} className="rounded-md p-2 hover:bg-black/5 lg:hidden"><Menu size={19} /></button>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{pageTitle}</p><p className="hidden text-[10px] text-black/45 sm:block">ChargeShare administration</p></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden items-center gap-1.5 text-[10px] text-black/45 sm:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-[#315b44]" /> Live Firestore data</span>
            <button type="button" onClick={onSignOut} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-2.5 py-1.5 text-[10px] font-semibold hover:bg-black/5 sm:gap-2 sm:px-3 sm:py-2 sm:text-[11px] lg:hidden"><LogOut size={13} />Sign out</button>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] space-y-4 px-3 py-4 sm:space-y-5 sm:px-6 sm:py-7 lg:px-8">
          {error && <div className="flex items-start gap-3 rounded-xl border border-[#D9B8B3] bg-[#F9EFED] px-4 py-3 text-xs text-[#743B33]" role="alert"><AlertCircle size={17} className="mt-0.5 shrink-0" /><p>{error}</p></div>}

          {section === 'accounts' && (
            <>
              <PageHeading title="Firebase Auth accounts" subtitle="Every registered Firebase Authentication account, including sign-in providers and recent activity." />
              <SearchBox value={search} onChange={setSearch} placeholder="Search account name, email, UID, or provider" />
              <TableFrame title="Authentication directory" description="Auth records are joined with profile documents when available." count={matchingAccounts.length}>
                {loading ? <EmptyTable message="Loading Firebase accounts…" /> : matchingAccounts.length === 0 ? <EmptyTable message="No Firebase Auth accounts match this search." /> : (
                  <DataTable headers={['Account', 'Email', 'Sign-in provider', 'Verified', 'Created', 'Last sign-in', 'Status']}>
                    {pageSlice(matchingAccounts).map((account) => <tr key={account.uid} className="hover:bg-black/[0.02]"><Cell secondary={account.uid}>{getName(account)}</Cell><Cell>{account.email || '—'}</Cell><Cell>{account.authProviders?.join(', ') || '—'}</Cell><Cell>{account.emailVerified ? 'Verified' : 'Unverified'}</Cell><Cell>{displayDate(account.createdAt)}</Cell><Cell>{displayDate(account.lastSignInAt)}</Cell><td className="px-4 py-3.5"><StatusBadge value={account.disabled ? 'disabled' : 'active'} /></td></tr>)}
                  </DataTable>
                )}
                <PageControls page={page} total={matchingAccounts.length} onChange={setPage} />
              </TableFrame>
            </>
          )}

          {section === 'overview' && (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">Platform summary</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Overview</h1><p className="mt-1 text-xs text-black/50">Live totals from registered profiles, listings, and booking records.</p></div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[10px] text-black/55"><Activity size={13} /> Updates automatically</span>
              </div>

              {loading ? <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 9 }, (_, i) => <div key={i} className="min-h-[102px] animate-pulse rounded-xl border border-black/10 bg-white sm:min-h-[112px]" />)}</div> : (
                <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
                  <MetricCard label="Firebase accounts" value={data.authAccounts.length} detail={`${registeredCount} linked user and provider profiles`} icon={Users} />
                  <MetricCard label="Clients" value={clients.length} detail="Client profile records" icon={CarFront} />
                  <MetricCard label="Providers" value={data.providers.length} detail="Provider profile records" icon={ShieldCheck} />
                  <MetricCard label="Charger listings" value={data.chargers.length} detail={`${activeChargers} accepting requests`} icon={BatteryCharging} />
                  <MetricCard label="Booking requests" value={data.bookings.length} detail={`${statusCounts.pending ?? 0} pending provider review`} icon={CalendarDays} />
                  <MetricCard label="Reviews" value={data.reviews.length} detail="Driver feedback and provider replies" icon={Activity} />
                  <MetricCard label="Accepted" value={statusCounts.accepted ?? 0} detail="Bookings accepted by providers" icon={Check} />
                  <MetricCard label="Completed" value={statusCounts.completed ?? 0} detail="Marked completed in booking records" icon={Zap} />
                  <MetricCard label="Unavailable bays" value={data.chargers.length - activeChargers} detail="Paused or inactive listings" icon={MapPin} />
                </div>
              )}

              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <section className="rounded-xl border border-black/10 bg-white p-4 sm:p-5">
                  <div className="mb-4 flex items-start justify-between"><div><h2 className="text-sm font-semibold">Booking activity</h2><p className="mt-1 text-xs text-black/45">Requests created each day over the last 7 days</p></div><CalendarDays size={17} className="text-black/45" /></div>
                  {loading ? <div className="h-44 animate-pulse rounded-lg bg-[#F4F4F2]" /> : <ActivityBars bookings={data.bookings} />}
                </section>
                <section className="rounded-xl border border-black/10 bg-white p-4 sm:p-5">
                  <div className="mb-4 flex items-start justify-between"><div><h2 className="text-sm font-semibold">Payment and settlement status</h2><p className="mt-1 text-xs text-black/45">Data availability in this app</p></div><CircleDollarSign size={18} className="text-black/45" /></div>
                  <div className="rounded-lg border border-dashed border-black/15 bg-[#FAFAF8] p-4">
                    <p className="text-xs font-semibold">{data.transactions.length || data.refunds.length || data.payouts.length ? 'Payment records found' : 'No payment integration is connected'}</p>
                    <p className="mt-1.5 text-xs leading-5 text-black/55">{data.transactions.length || data.refunds.length || data.payouts.length ? `${data.transactions.length} transactions · ${data.refunds.length} refunds · ${data.payouts.length} payouts. Booking totals are not treated as verified payments.` : 'Booking totals and estimated fee fields are not verified payments. Revenue, refunds, and provider payouts are not reported as financial results.'}</p>
                  </div>
                  <button type="button" onClick={() => setSection('transactions')} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4">View transaction status <ChevronRight size={14} /></button>
                </section>
              </div>

              <TableFrame title="Recent bookings" description="Latest booking requests from Firestore" count={data.bookings.length}>
                {loading ? <EmptyTable message="Loading booking records…" /> : recentBookings.length === 0 ? <EmptyTable message="No booking records yet." /> : (
                  <DataTable headers={['Booking', 'Client', 'Provider', 'Charger', 'Created', 'Status']}>
                    {recentBookings.map((booking) => <tr key={booking.id} className="hover:bg-black/[0.02]"><Cell secondary={booking.userId}>#{booking.id.slice(0, 8)}</Cell><Cell>{booking.userName || 'Unknown client'}</Cell><Cell secondary={booking.providerId}>{data.providers.find((provider) => provider.uid === booking.providerId)?.displayName || booking.providerId.slice(0, 10)}</Cell><Cell secondary={booking.chargerLocality}>{booking.chargerTitle || booking.chargerId}</Cell><Cell>{displayDate(booking.createdAt)}</Cell><td className="px-4 py-3.5"><StatusBadge value={booking.status} /></td></tr>)}
                  </DataTable>
                )}
              </TableFrame>
            </>
          )}

          {section === 'bookings' && (
            <>
              <PageHeading title="Bookings" subtitle="Review booking requests and their current lifecycle status." />
              <div className="flex flex-col gap-3 sm:flex-row">
                <SearchBox value={search} onChange={setSearch} placeholder="Search booking, client, provider, or charger" />
                <button type="button" disabled={!matchingBookings.length} onClick={() => exportCsv('chargeshare-bookings.csv', matchingBookings.map((booking) => ({ bookingId: booking.id, clientName: booking.userName, clientId: booking.userId, providerId: booking.providerId, chargerId: booking.chargerId, charger: booking.chargerTitle || '', scheduledStart: booking.startTime, scheduledEnd: booking.endTime, requestedAmountINR: booking.totalPrice, bookingStatus: booking.status, createdAt: booking.createdAt })))} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold hover:bg-black/5 disabled:opacity-40"><Download size={14} />Export CSV</button>
                <label className="relative flex shrink-0 items-center">
                  <ListFilter size={14} className="pointer-events-none absolute left-3 text-black/40" />
                  <select value={bookingFilter} onChange={(event) => setBookingFilter(event.target.value as 'all' | BookingStatus)} className="h-10 appearance-none rounded-lg border border-black/10 bg-white py-2 pl-9 pr-9 text-xs font-medium outline-none focus:border-black/40">
                    {['all', 'pending', 'accepted', 'completed', 'rejected', 'cancelled'].map((status) => <option key={status} value={status}>{status === 'all' ? 'All statuses' : status[0].toUpperCase() + status.slice(1)}</option>)}
                  </select><ChevronDown size={14} className="pointer-events-none absolute right-3 text-black/40" />
                </label>
              </div>
              <TableFrame title="All booking requests" description="Records are read-only here; payment status is not available in the current platform." count={matchingBookings.length}>
                {loading ? <EmptyTable message="Loading booking records…" /> : matchingBookings.length === 0 ? <EmptyTable message="No bookings match these filters." /> : (
                  <DataTable headers={['Booking ID', 'Client', 'Provider ID', 'Charger', 'Scheduled', 'Requested amount', 'Status']}>
                    {pageSlice(matchingBookings).map((booking) => <tr key={booking.id} className="hover:bg-black/[0.02]"><Cell secondary={booking.userId}>#{booking.id}</Cell><Cell>{booking.userName || 'Unknown client'}</Cell><Cell>{booking.providerId}</Cell><Cell secondary={booking.chargerLocality}>{booking.chargerTitle || booking.chargerId}</Cell><Cell>{displayDate(booking.startTime)}</Cell><Cell>{currency(booking.totalPrice)}</Cell><td className="px-4 py-3.5"><StatusBadge value={booking.status} /></td></tr>)}
                  </DataTable>
                )}
                <PageControls page={page} total={matchingBookings.length} onChange={setPage} />
              </TableFrame>
              <p className="text-[11px] leading-5 text-black/45">Requested amounts are booking data only. They do not indicate that a client has paid or that a provider has been settled.</p>
            </>
          )}

          {section === 'clients' && (
            <>
              <PageHeading title="Clients" subtitle="Firebase accounts and user profiles linked to client booking activity." />
              <div className="flex flex-col gap-3 sm:flex-row"><SearchBox value={search} onChange={setSearch} placeholder="Search by client name, email, or ID" /><button type="button" disabled={!matchingClients.length} onClick={() => exportCsv('chargeshare-clients.csv', matchingClients.map((client) => ({ clientName: getName(client), email: client.email || '', userId: client.uid || client.id || '', bookingCount: data.bookings.filter((booking) => booking.userId === (client.uid || client.id)).length, registeredAt: client.createdAt || '' })))} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold hover:bg-black/5 disabled:opacity-40"><Download size={14} />Export CSV</button></div>
              <TableFrame title="Client directory" description="Names and contact details saved in user profiles." count={matchingClients.length}>
                {loading ? <EmptyTable message="Loading client profiles…" /> : matchingClients.length === 0 ? <EmptyTable message="No client profiles match this search." /> : (
                  <DataTable headers={['Client', 'Email', 'User ID', 'Bookings', 'Registered']}>
                    {pageSlice(matchingClients).map((client) => { const uid = client.uid || client.id || ''; const count = data.bookings.filter((booking) => booking.userId === uid).length; return <tr key={uid} className="hover:bg-black/[0.02]"><Cell>{getName(client)}</Cell><Cell>{client.email || '—'}</Cell><Cell>{uid}</Cell><Cell>{count}</Cell><Cell>{displayDate(client.createdAt)}</Cell></tr>; })}
                  </DataTable>
                )}
                <PageControls page={page} total={matchingClients.length} onChange={setPage} />
              </TableFrame>
            </>
          )}

          {section === 'providers' && (
            <>
              <PageHeading title="Providers" subtitle="Review new provider applications, then manage provider profiles and marketplace activity." />
              {reviewMessage && <p role="status" className="rounded-lg border border-[#D5D5D5] bg-white px-4 py-3 text-xs font-semibold">{reviewMessage}</p>}
              {reviewError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">{reviewError}</p>}
              <TableFrame title="Applications awaiting review" description="Review the submitted property details and documents before accepting or declining." count={pendingProviderApplications.length}>
                {loading ? <EmptyTable message="Loading provider applications…" /> : pendingProviderApplications.length === 0 ? <EmptyTable message="There are no provider applications waiting for review." /> : (
                  <div className="grid gap-4 p-4 lg:grid-cols-2">
                    {pendingProviderApplications.map((provider) => {
                      const uid = provider.uid || provider.id;
                      const documents = [
                        { key: 'electricityBill', label: 'Electricity bill', publicId: provider.electricityBillPublicId },
                        { key: 'ownershipProof', label: 'Ownership confirmation', publicId: provider.ownershipProofPublicId },
                      ];
                      return (
                        <article key={uid} className="rounded-xl border border-black/10 bg-[#FCFCFB] p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-bold">{getName(provider)}</h3>
                              <p className="mt-1 break-all text-xs text-black/55">{provider.email || 'No email provided'}</p>
                            </div>
                            <StatusBadge value="under review" />
                          </div>
                          <p className="mt-3 text-xs leading-5 text-black/65"><span className="font-semibold text-black">Property:</span> {provider.propertyAddress || provider.address || 'No address provided'}</p>
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            {documents.map(({ key, label, publicId }) => (
                              <div key={label} className="overflow-hidden rounded-lg border border-black/10 bg-white">
                                {publicId ? (
                                  <a href={`/api/admin/providers/${encodeURIComponent(uid)}/documents/${key}`} target="_blank" rel="noreferrer" className="block" aria-label={`Open ${label}`}>
                                    <img src={`/api/admin/providers/${encodeURIComponent(uid)}/documents/${key}`} alt={label} className="h-36 w-full object-cover" />
                                  </a>
                                ) : <div className="flex h-36 items-center justify-center px-3 text-center text-[11px] text-black/45">Document not available</div>}
                                <p className="border-t border-black/5 px-2.5 py-2 text-[10px] font-semibold">{label}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex gap-2">
                            <button type="button" disabled={reviewingProviderId === uid} onClick={() => void decideProviderApplication(uid, 'approved')} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-black px-3 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"><Check size={14} />Accept</button>
                            <button type="button" disabled={reviewingProviderId === uid} onClick={() => void decideProviderApplication(uid, 'declined')} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-3 text-xs font-semibold text-black hover:bg-black/5 disabled:opacity-50"><X size={14} />Decline</button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </TableFrame>
              <div className="flex flex-col gap-3 sm:flex-row"><SearchBox value={search} onChange={setSearch} placeholder="Search by provider name, email, city, or ID" /><button type="button" disabled={!matchingProviders.length} onClick={() => exportCsv('chargeshare-providers.csv', matchingProviders.map((provider) => ({ providerName: getName(provider), email: provider.email || '', providerId: provider.uid || provider.id, location: [provider.city, provider.propertyAddress || provider.address].filter(Boolean).join(', '), applicationStatus: provider.applicationStatus || 'existing provider', chargerCount: data.chargers.filter((charger) => charger.providerId === (provider.uid || provider.id)).length, bookingCount: data.bookings.filter((booking) => booking.providerId === (provider.uid || provider.id)).length })))} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold hover:bg-black/5 disabled:opacity-40"><Download size={14} />Export CSV</button></div>
              <TableFrame title="Provider directory" description="Provider profiles and linked marketplace activity." count={matchingProviders.length}>
                {loading ? <EmptyTable message="Loading provider profiles…" /> : matchingProviders.length === 0 ? <EmptyTable message="No provider profiles match this search." /> : (
                  <DataTable headers={['Provider', 'Email', 'Location', 'Application', 'Account', 'Chargers', 'Bookings', 'Provider ID']}>
                    {pageSlice(matchingProviders).map((provider) => { const uid = provider.uid || provider.id || ''; const account = data.authAccounts.find((item) => item.uid === uid); const chargers = data.chargers.filter((charger) => charger.providerId === uid).length; const bookings = data.bookings.filter((booking) => booking.providerId === uid).length; return <tr key={uid} className="hover:bg-black/[0.02]"><Cell>{getName(provider)}</Cell><Cell>{provider.email || account?.email || '—'}</Cell><Cell>{[provider.city, provider.address].filter(Boolean).join(', ') || provider.address || '—'}</Cell><td className="px-4 py-3.5">{provider.applicationStatus ? <StatusBadge value={provider.applicationStatus.replace('_', ' ')} /> : 'Existing provider'}</td><td className="px-4 py-3.5">{account ? <StatusBadge value={account.disabled ? 'disabled' : account.emailVerified ? 'verified' : 'unverified'} /> : 'No Auth account'}</td><Cell>{chargers}</Cell><Cell>{bookings}</Cell><Cell>{uid}</Cell></tr>; })}
                  </DataTable>
                )}
                <PageControls page={page} total={matchingProviders.length} onChange={setPage} />
              </TableFrame>
            </>
          )}

          {section === 'chargers' && (
            <>
              <PageHeading title="Charger listings" subtitle="Public marketplace listings and provider-owned bays, including paused listings." />
              <div className="flex flex-col gap-3 sm:flex-row"><SearchBox value={search} onChange={setSearch} placeholder="Search charger, provider, area, or city" /><button type="button" disabled={!matchingChargers.length} onClick={() => exportCsv('chargeshare-chargers.csv', matchingChargers.map((charger) => ({ chargerId: charger.id, title: charger.title || '', providerId: charger.providerId, address: charger.addressLine || '', locality: charger.locality || '', city: charger.city || '', connector: charger.connector || '', powerKw: charger.powerKw || '', tariff: charger.price || '', pricingType: charger.pricingType || '', availability: charger.status || '' })))} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold hover:bg-black/5 disabled:opacity-40"><Download size={14} />Export CSV</button></div>
              <TableFrame title="Marketplace listings" description="Public listing records from Firestore." count={matchingChargers.length}>
                {loading ? <EmptyTable message="Loading charger listings…" /> : matchingChargers.length === 0 ? <EmptyTable message="No charger listings match this search." /> : (
                  <DataTable headers={['Charger', 'Provider', 'Location', 'Connector', 'Power', 'Tariff', 'Availability']}>
                    {pageSlice(matchingChargers).map((charger) => <tr key={charger.id} className="hover:bg-black/[0.02]"><Cell secondary={`#${charger.id}`}>{charger.title || 'Untitled bay'}</Cell><Cell>{data.providers.find((provider) => provider.uid === charger.providerId)?.displayName || charger.providerId}</Cell><Cell secondary={charger.addressLine}>{[charger.locality, charger.city].filter(Boolean).join(', ') || '—'}</Cell><Cell>{charger.connector || '—'}</Cell><Cell>{charger.powerKw ? `${charger.powerKw} kW` : '—'}</Cell><Cell>{charger.pricingType === 'per_session' ? `${currency(charger.price)} / session` : charger.price ? `${currency(charger.price)} / kWh` : '—'}</Cell><td className="px-4 py-3.5"><StatusBadge value={charger.status || 'unknown'} /></td></tr>)}
                  </DataTable>
                )}
                <PageControls page={page} total={matchingChargers.length} onChange={setPage} />
              </TableFrame>
            </>
          )}

          {section === 'reviews' && (
            <>
              <PageHeading title="Reviews" subtitle="Driver reviews, ratings, and provider responses across all charger listings." />
              <SearchBox value={search} onChange={setSearch} placeholder="Search review, driver, provider, charger, or comment" />
              <TableFrame title="Marketplace reviews" description="Reviews written by clients and responses from providers." count={matchingReviews.length}>
                {loading ? <EmptyTable message="Loading reviews…" /> : matchingReviews.length === 0 ? <EmptyTable message="No reviews match this search." /> : (
                  <DataTable headers={['Driver', 'Rating', 'Review', 'Provider response', 'Charger', 'Date']}>
                    {pageSlice(matchingReviews).map((review) => <tr key={review.id} className="hover:bg-black/[0.02]"><Cell secondary={`#${review.id}`}>{review.userName || data.users.find((user) => user.uid === review.userId)?.displayName || review.userId || 'Unknown client'}</Cell><Cell>{review.rating ? `${review.rating} / 5` : '—'}</Cell><Cell secondary={`Provider: ${review.providerId || '—'}`}>{review.comment || '—'}</Cell><Cell>{review.response || 'No response'}</Cell><Cell secondary={review.chargerId}>{data.chargers.find((charger) => charger.id === review.chargerId)?.title || review.chargerId || '—'}</Cell><Cell>{displayDate(review.createdAt)}</Cell></tr>)}
                  </DataTable>
                )}
                <PageControls page={page} total={matchingReviews.length} onChange={setPage} />
              </TableFrame>
            </>
          )}

          {section === 'transactions' && <AdminRecordsSection title="Transactions" description="Payment records written by any connected payment provider." records={data.transactions} loading={loading} search={search} onSearch={setSearch} page={page} onPageChange={setPage} emptyMessage="No transaction records exist yet. Booking totals are requests, not verified payments." />}
          {section === 'refunds' && <AdminRecordsSection title="Refunds" description="Refund records from connected payment processing." records={data.refunds} loading={loading} search={search} onSearch={setSearch} page={page} onPageChange={setPage} emptyMessage="No refund records exist." />}
          {section === 'payouts' && <AdminRecordsSection title="Provider payouts" description="Provider settlement records from connected payment processing." records={data.payouts} loading={loading} search={search} onSearch={setSearch} page={page} onPageChange={setPage} emptyMessage="No provider payout records exist." />}
          {section === 'audit' && <AdminRecordsSection title="Admin audit logs" description="Administrative actions recorded by backend services." records={data.auditLogs} loading={loading} search={search} onSearch={setSearch} page={page} onPageChange={setPage} emptyMessage="No admin audit records exist." />}
          {section === 'settings' && <AdminRecordsSection title="Platform settings" description="Server-managed platform configuration records. Sensitive fields are redacted." records={data.platformSettings} loading={loading} search={search} onSearch={setSearch} page={page} onPageChange={setPage} emptyMessage="No platform settings documents exist." />}

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 py-4 text-[10px] text-black/40">
            <span>ChargeShare · Admin workspace</span>
            <span>Financial values are not inferred from booking requests.</span>
          </footer>
        </main>
      </div>
    </div>
  );
};

function PageHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">Platform management</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-1 text-xs text-black/50">{subtitle}</p></div>;
}

function redactRecord(value: unknown, fieldName = ''): unknown {
  if (/(password|secret|token|api.?key|credential|private.?key|card.?number|cvv)/i.test(fieldName)) return '[redacted]';
  if (Array.isArray(value)) return value.map((item) => redactRecord(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactRecord(item, key)]));
  }
  return value;
}

function AdminRecordsSection({ title, description, records, loading, search, onSearch, page, onPageChange, emptyMessage }: {
  title: string;
  description: string;
  records: AdminRecord[];
  loading: boolean;
  search: string;
  onSearch: (value: string) => void;
  page: number;
  onPageChange: (value: number) => void;
  emptyMessage: string;
}) {
  const safeRecords = records.map((record) => ({ record, safeText: JSON.stringify(redactRecord(record)) }));
  const matching = safeRecords.filter(({ safeText, record }) => `${record.id} ${safeText}`.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <>
      <PageHeading title={title} subtitle={description} />
      <SearchBox value={search} onChange={onSearch} placeholder={`Search ${title.toLowerCase()} records`} />
      <TableFrame title={title} description="Sensitive fields are hidden in record details." count={matching.length}>
        {loading ? <EmptyTable message={`Loading ${title.toLowerCase()}…`} /> : matching.length === 0 ? <EmptyTable message={emptyMessage} /> : (
          <DataTable headers={['Record ID', 'Status / type', 'Date', 'Safe record details']}>
            {matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(({ record }) => {
              const summary = Object.entries(redactRecord(record) as Record<string, unknown>)
                .filter(([key]) => key !== 'id')
                .slice(0, 6)
                .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}`)
                .join(' · ');
              const state = String(record.status ?? record.state ?? record.type ?? 'recorded');
              const date = record.createdAt ?? record.updatedAt ?? record.date ?? '';
              return <tr key={record.id} className="hover:bg-black/[0.02]"><Cell>{record.id}</Cell><td className="px-4 py-3.5"><StatusBadge value={state} /></td><Cell>{displayDate(date)}</Cell><Cell>{summary || 'No additional fields'}</Cell></tr>;
            })}
          </DataTable>
        )}
        <PageControls page={page} total={matching.length} onChange={onPageChange} />
      </TableFrame>
    </>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="relative block w-full sm:max-w-md"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-lg border border-black/10 bg-white pl-9 pr-3 text-xs outline-none placeholder:text-black/35 focus:border-black/40" /></label>;
}

