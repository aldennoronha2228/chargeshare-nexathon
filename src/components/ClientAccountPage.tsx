import React from 'react';
import type { User } from 'firebase/auth';
import { Activity, CalendarCheck, ChevronLeft, Compass, UserRound } from 'lucide-react';
import type { Booking } from '../utils/bookings';
import { ROUTES, navigateTo } from '../utils/appRoute';

export type ClientAccountSection = 'bookings' | 'activity' | 'profile';

interface ClientAccountPageProps {
  section: ClientAccountSection;
  user: User;
  bookings: Booking[];
  onCancelBooking: (bookingId: string) => void;
  onEditProfile: () => void;
}

const SECTION_INFO: Record<ClientAccountSection, { title: string; description: string }> = {
  bookings: { title: 'Your bookings', description: 'Manage your charger requests and upcoming sessions.' },
  activity: { title: 'Recent activity', description: 'Keep track of your booking requests and their status.' },
  profile: { title: 'Your profile', description: 'Your ChargeShare account details.' },
};

function statusClass(status: Booking['status']): string {
  if (status === 'accepted' || status === 'completed') return 'border-[#A9A9A9] bg-[#F0F0F0] text-black';
  if (status === 'rejected' || status === 'cancelled') return 'border-[#D5D5D5] bg-[#F7F7F7] text-[#666]';
  return 'border-black bg-black text-white';
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}

export const ClientAccountPage: React.FC<ClientAccountPageProps> = ({
  section,
  user,
  bookings,
  onCancelBooking,
  onEditProfile,
}) => {
  const info = SECTION_INFO[section];
  const displayName = user.displayName?.trim() || user.email?.split('@')[0] || 'ChargeShare driver';
  const orderedBookings = [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="min-h-screen bg-[#F7F7F7] pb-[calc(5rem+env(safe-area-inset-bottom))] text-[#111] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-[#292929] bg-[#080808] text-white">
        <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={() => navigateTo(ROUTES.findChargers)} aria-label="Back to explore chargers" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 text-white hover:bg-white/10">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="whitespace-nowrap font-display text-[11px] font-bold tracking-[0.12em] sm:text-[13px]">CHARGESHARE</span>
            <span className="rounded border border-white/20 bg-white/10 px-1.5 py-1 font-label-caps text-[8px] font-semibold uppercase tracking-wider text-white/85">Client</span>
          </div>
          <button type="button" onClick={() => navigateTo(ROUTES.findChargers)} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/90 hover:bg-white/10 md:hidden">
            <Compass className="h-3.5 w-3.5" /> Explore
          </button>
          <nav aria-label="Client account navigation" className="hidden items-center gap-1 md:flex">
            <button type="button" onClick={() => navigateTo(ROUTES.clientBookings)} aria-current={section === 'bookings' ? 'page' : undefined} className={`rounded-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wide ${section === 'bookings' ? 'bg-white text-black' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}>Bookings</button>
            <button type="button" onClick={() => navigateTo(ROUTES.clientActivity)} aria-current={section === 'activity' ? 'page' : undefined} className={`rounded-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wide ${section === 'activity' ? 'bg-white text-black' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}>Activity</button>
            <button type="button" onClick={() => navigateTo(ROUTES.clientProfile)} aria-current={section === 'profile' ? 'page' : undefined} className={`rounded-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wide ${section === 'profile' ? 'bg-white text-black' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}>Profile</button>
            <button type="button" onClick={() => navigateTo(ROUTES.findChargers)} className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/90 hover:bg-white/10"><Compass className="h-3.5 w-3.5" /> Explore</button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-9">
        <div className="mb-5">
          <p className="font-label-caps text-[10px] font-semibold uppercase tracking-[0.16em] text-[#666]">Client account</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">{info.title}</h1>
          <p className="mt-1 text-sm text-[#666]">{info.description}</p>
        </div>

        {section === 'bookings' && (
          <section aria-label="Booking requests" className="space-y-3">
            {orderedBookings.length === 0 ? (
              <div className="rounded-2xl border border-[#D5D5D5] bg-white p-6 text-center sm:p-8">
                <CalendarCheck className="mx-auto h-8 w-8 text-[#777]" />
                <h2 className="mt-3 text-base font-bold">No bookings yet</h2>
                <p className="mt-1 text-sm text-[#666]">Find a charger and send a booking request to see it here.</p>
                <button type="button" onClick={() => navigateTo(ROUTES.findChargers)} className="mt-4 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#292929]">Explore chargers</button>
              </div>
            ) : orderedBookings.map((booking) => (
              <article key={booking.id} className="rounded-2xl border border-[#D5D5D5] bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words font-display text-base font-bold">{booking.chargerTitle || `Charger ${booking.chargerId}`}</h2>
                    <p className="mt-0.5 text-sm text-[#666]">{booking.chargerLocality || 'Location unavailable'} · {booking.vehicleName}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClass(booking.status)}`}>{booking.status}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#E5E5E5] pt-3 text-xs sm:grid-cols-4">
                  <div><span className="block text-[#777]">Session</span><span className="mt-0.5 block font-semibold">{formatDate(booking.startTime)}</span></div>
                  <div><span className="block text-[#777]">Energy</span><span className="mt-0.5 block font-semibold">{booking.totalKwh ?? 0} kWh</span></div>
                  <div><span className="block text-[#777]">Total</span><span className="mt-0.5 block font-semibold">₹{booking.totalPrice}</span></div>
                  <div><span className="block text-[#777]">Requested</span><span className="mt-0.5 block font-semibold">{formatDate(booking.createdAt)}</span></div>
                </div>
                {['pending', 'accepted'].includes(booking.status) && (
                  <div className="mt-4 flex justify-end border-t border-[#E5E5E5] pt-3">
                    <button type="button" onClick={() => onCancelBooking(booking.id)} className="min-h-10 rounded-lg border border-[#B8B8B8] px-3 py-2 text-xs font-semibold text-[#333] hover:border-black hover:text-black">Cancel request</button>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}

        {section === 'activity' && (
          <section aria-label="Booking activity" className="rounded-2xl border border-[#D5D5D5] bg-white p-4 sm:p-6">
            {orderedBookings.length === 0 ? (
              <div className="py-6 text-center">
                <Activity className="mx-auto h-8 w-8 text-[#777]" />
                <h2 className="mt-3 text-base font-bold">Nothing to show yet</h2>
                <p className="mt-1 text-sm text-[#666]">Booking updates will appear here after you request a charger.</p>
              </div>
            ) : (
              <ol className="divide-y divide-[#E5E5E5]">
                {orderedBookings.map((booking) => (
                  <li key={booking.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white"><Activity className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">{booking.chargerTitle || 'Charger booking'}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase ${statusClass(booking.status)}`}>{booking.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-[#666]">Booking request created · {formatDate(booking.createdAt)}</p>
                      <p className="mt-1 text-xs text-[#666]">{booking.chargerLocality || 'Location unavailable'} · {booking.totalKwh ?? 0} kWh · ₹{booking.totalPrice}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {section === 'profile' && (
          <section className="rounded-2xl border border-[#D5D5D5] bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-4 border-b border-[#E5E5E5] pb-5">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="h-16 w-16 rounded-full border border-[#D5D5D5] object-cover" />
              ) : (
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-black text-xl font-bold text-white">{displayName.slice(0, 1).toUpperCase()}</span>
              )}
              <div className="min-w-0">
                <h2 className="break-words text-lg font-bold">{displayName}</h2>
                <p className="break-all text-sm text-[#666]">{user.email || 'No email on this account'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 pt-5 sm:grid-cols-2">
              <ProfileDetail label="Display name" value={displayName} />
              <ProfileDetail label="Email" value={user.email || '—'} />
              <ProfileDetail label="Sign-in method" value={user.providerData[0]?.providerId === 'google.com' ? 'Google' : 'Email and password'} />
              <ProfileDetail label="Email verified" value={user.emailVerified ? 'Yes' : 'Not yet'} />
            </div>
            <button type="button" onClick={onEditProfile} className="mt-5 min-h-11 w-full rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#292929] sm:w-auto">Edit profile</button>
          </section>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[#D5D5D5] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Client navigation">
        <AccountNavButton section="explore" current={false} onClick={() => navigateTo(ROUTES.findChargers)} />
        <AccountNavButton section="bookings" current={section === 'bookings'} onClick={() => navigateTo(ROUTES.clientBookings)} />
        <AccountNavButton section="activity" current={section === 'activity'} onClick={() => navigateTo(ROUTES.clientActivity)} />
        <AccountNavButton section="profile" current={section === 'profile'} onClick={() => navigateTo(ROUTES.clientProfile)} />
      </nav>
    </div>
  );
};

const ProfileDetail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-[#E2E2E2] bg-[#F8F8F8] p-3">
    <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#777]">{label}</span>
    <span className="mt-1 block break-words text-sm font-medium">{value}</span>
  </div>
);

const ACCOUNT_NAV: Array<{ section: 'explore' | ClientAccountSection; label: string; Icon: typeof Compass }> = [
  { section: 'explore', label: 'Explore', Icon: Compass },
  { section: 'bookings', label: 'Bookings', Icon: CalendarCheck },
  { section: 'activity', label: 'Activity', Icon: Activity },
  { section: 'profile', label: 'Profile', Icon: UserRound },
];

const AccountNavButton: React.FC<{
  section: 'explore' | ClientAccountSection;
  current: boolean;
  onClick: () => void;
}> = ({ section, current, onClick }) => {
  const item = ACCOUNT_NAV.find((candidate) => candidate.section === section)!;
  const Icon = item.Icon;
  return (
    <button type="button" aria-current={current ? 'page' : undefined} onClick={onClick} className={`flex min-h-[58px] flex-col items-center justify-center gap-1 ${current ? 'text-black' : 'text-[#666]'}`}>
      <Icon className="h-5 w-5" />
      <span className="font-label-caps text-[9px] font-semibold uppercase tracking-wide">{item.label}</span>
    </button>
  );
};
