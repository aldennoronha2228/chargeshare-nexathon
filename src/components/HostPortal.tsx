import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import {
  ArrowLeft,
  BadgeCheck,
  BatteryCharging,
  Calendar,
  Clock,
  Fingerprint,
  ImagePlus,
  Inbox,
  LayoutGrid,
  LogOut,
  Mail,
  MapPin,
  Plus,
  ShieldCheck,
  Wallet,
  Zap,
} from 'lucide-react';
import { auth } from '../firebase';
import { ROUTES, navigateTo } from '../utils/appRoute';
import { AddChargerForm, type ProviderCharger } from './AddChargerForm';

type ProviderNavId = 'overview' | 'chargers' | 'bookings' | 'earnings';

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

const NAV_ITEMS: {
  id: ProviderNavId;
  label: string;
  Icon: IconComponent;
}[] = [
  { id: 'overview', label: 'Overview', Icon: LayoutGrid },
  { id: 'chargers', label: 'Chargers', Icon: BatteryCharging },
  { id: 'bookings', label: 'Bookings', Icon: Calendar },
  { id: 'earnings', label: 'Earnings', Icon: Wallet },
];

const CARD = 'rounded-2xl border border-[#DFD9CC] bg-white shadow-[0_2px_8px_rgba(19,62,46,0.04)]';

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not available';
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function signInMethodLabel(user: User): string {
  const providerId = user.providerData[0]?.providerId;
  if (providerId === 'google.com') return 'Google';
  if (providerId === 'password') return 'Email & password';
  return providerId ?? 'Email & password';
}

function initialsOf(user: User): string {
  const source = user.displayName?.trim() || user.email?.split('@')[0] || 'Provider';
  return source.slice(0, 2).toUpperCase();
}

const EmptyState: React.FC<{
  Icon: IconComponent;
  title: string;
  body: string;
  action?: React.ReactNode;
}> = ({ Icon, title, body, action }) => (
  <div className={`${CARD} flex flex-col items-center gap-2 px-6 py-10 text-center`}>
    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#DFD9CC] bg-[#FAF7F0] text-[#546500]">
      <Icon size={22} />
    </div>
    <h3 className="font-sans text-[16px] font-bold text-[#0A261C]">{title}</h3>
    <p className="max-w-[46ch] text-[12px] leading-relaxed text-[#414944]">{body}</p>
    {action}
  </div>
);

const ADD_BUTTON =
  'flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#b2d40f] bg-[#D2F24E] px-4 py-2.5 text-[13px] font-extrabold text-[#133E2E] shadow-sm transition-colors hover:bg-[#caee34]';

function formatWindow(from: string, to: string): string {
  return `${from} – ${to}`;
}

const ChargerCard: React.FC<{ charger: ProviderCharger }> = ({ charger }) => (
  <article className={`${CARD} flex flex-col gap-3 p-4`}>
    <div className="grid grid-cols-2 gap-2">
      <figure className="overflow-hidden rounded-xl border border-[#EFECE4]">
        <img
          src={charger.chargerPhoto.dataUrl}
          alt={`Charger unit at ${charger.title}`}
          className="h-28 w-full object-cover"
        />
        <figcaption className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#717974]">
          Charger
        </figcaption>
      </figure>
      <figure className="overflow-hidden rounded-xl border border-[#EFECE4]">
        <img
          src={charger.spacePhoto.dataUrl}
          alt={`Charging space at ${charger.title}`}
          className="h-28 w-full object-cover"
        />
        <figcaption className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#717974]">
          Charging space
        </figcaption>
      </figure>
    </div>

    <div className="flex flex-col gap-1">
      <h3 className="font-sans text-[16px] font-bold leading-snug text-[#0A261C]">
        {charger.title}
      </h3>
      <span className="flex items-start gap-1.5 text-[12px] text-[#414944]">
        <MapPin size={14} className="mt-0.5 shrink-0 text-[#717974]" />
        <span>
          {charger.addressLine}, {charger.locality}, {charger.city}
        </span>
      </span>
    </div>

    <div className="grid grid-cols-3 gap-2 border-t border-[#EFECE4] pt-3">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#717974]">Power</span>
        <span className="font-mono text-[13px] font-bold text-[#0A261C]">
          {charger.powerKw} kW
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#717974]">Tariff</span>
        <span className="font-mono text-[13px] font-bold text-[#0A261C]">
          ₹{charger.pricePerKwh}/kWh
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#717974]">Plug</span>
        <span className="text-[12px] font-bold text-[#0A261C]">{charger.connector}</span>
      </div>
    </div>

    <div className="flex flex-col gap-1.5 border-t border-[#EFECE4] pt-3">
      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#133E2E]">
        <Clock size={14} className="text-[#717974]" />
        {formatWindow(charger.availableFrom, charger.availableTo)}
      </span>
      <p className="text-[12px] leading-relaxed text-[#414944]">{charger.accessNotes}</p>
    </div>

    <span className="flex items-center gap-1.5 text-[11px] text-[#717974]">
      <ImagePlus size={13} />
      Added {formatTimestamp(charger.createdAt)}
    </span>
  </article>
);

interface AccountRowProps {
  Icon: IconComponent;
  label: string;
  value: string;
  mono?: boolean;
}

const AccountRow: React.FC<AccountRowProps> = ({ Icon, label, value, mono }) => (
  <div className="flex items-center justify-between gap-3 border-b border-[#EFECE4] py-2.5 last:border-b-0">
    <div className="flex items-center gap-2 text-[12px] font-semibold text-[#414944]">
      <Icon size={15} className="text-[#717974]" />
      <span>{label}</span>
    </div>
    <span
      className={`min-w-0 truncate text-right text-[12px] font-bold text-[#0A261C] ${
        mono ? 'font-mono' : ''
      }`}
    >
      {value}
    </span>
  </div>
);

export interface HostPortalProps {
  user: User;
}

export const HostPortal: React.FC<HostPortalProps> = ({ user }) => {
  const [activeNav, setActiveNav] = useState<ProviderNavId>('overview');
  const [chargers, setChargers] = useState<ProviderCharger[]>([]);
  const [addingCharger, setAddingCharger] = useState(false);

  const displayName = user.displayName?.trim() || user.email?.split('@')[0] || 'Provider';
  const activeLabel = NAV_ITEMS.find((item) => item.id === activeNav)?.label ?? 'Overview';

  const openAddCharger = () => {
    setActiveNav('chargers');
    setAddingCharger(true);
  };

  const avatar = user.photoURL ? (
    <img
      src={user.photoURL}
      alt=""
      referrerPolicy="no-referrer"
      className="h-full w-full rounded-full object-cover"
    />
  ) : (
    <span className="text-[12px] font-extrabold">{initialsOf(user)}</span>
  );

  const handleSignOut = async () => {
    await signOut(auth);
    navigateTo(ROUTES.login);
  };

  const accountCard = (
    <section className={`${CARD} flex flex-col gap-4 p-4 lg:col-span-2`}>
      <div className="flex items-center justify-between border-b border-[#EFECE4] pb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#414944]">
          Provider Account
        </span>
        <span
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
            user.emailVerified
              ? 'border-[#D2F24E] bg-[#D2F24E]/30 text-[#133E2E]'
              : 'border-[#DFD9CC] bg-[#F4F1EA] text-[#717974]'
          }`}
        >
          <BadgeCheck size={12} />
          {user.emailVerified ? 'Email verified' : 'Email unverified'}
        </span>
      </div>

      <div className="flex items-center gap-3.5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#133E2E] bg-[#0A261C] text-[#D2F24E]">
          {avatar}
        </div>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate font-sans text-[19px] font-extrabold leading-tight tracking-tight text-[#0A261C]">
            {displayName}
          </h1>
          <span className="truncate text-[12px] text-[#414944]">
            {user.email ?? 'No email on this account'}
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        <AccountRow Icon={Mail} label="Email" value={user.email ?? 'Not available'} />
        <AccountRow Icon={ShieldCheck} label="Sign-in method" value={signInMethodLabel(user)} />
        <AccountRow Icon={Fingerprint} label="Provider ID" value={user.uid} mono />
        <AccountRow Icon={Calendar} label="Account created" value={formatTimestamp(user.metadata.creationTime)} />
        <AccountRow Icon={Zap} label="Last sign-in" value={formatTimestamp(user.metadata.lastSignInTime)} />
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#DFD9CC] bg-[#FAF7F0] px-4 py-2.5 text-[13px] font-bold text-[#ba1a1a] transition-colors hover:bg-[#ffdad6]/40 sm:w-auto sm:self-start"
      >
        <LogOut size={16} />
        <span>Sign out</span>
      </button>
    </section>
  );

  const emptyStates: Record<'bookings' | 'earnings', React.ReactElement> = {
    bookings: (
      <EmptyState
        Icon={Inbox}
        title="No booking requests yet"
        body="Incoming driver requests will show up here for you to approve or decline, along with the requested slot and vehicle details."
      />
    ),
    earnings: (
      <EmptyState
        Icon={Wallet}
        title="No earnings recorded yet"
        body="Completed charging sessions and your payout breakdown will be summarised here once your first session is delivered."
      />
    ),
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] font-body text-[#1c1c18] selection:bg-[#D2F24E] selection:text-[#0A261C]">
      <div className="mx-auto flex min-h-screen w-full flex-col lg:flex-row lg:gap-6 lg:px-6 lg:py-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:sticky lg:top-6 lg:flex lg:h-[calc(100vh-3rem)] lg:w-64 lg:shrink-0 lg:flex-col lg:gap-4 lg:rounded-2xl lg:border lg:border-[#DFD9CC] lg:bg-white lg:p-4 lg:shadow-[0_2px_8px_rgba(19,62,46,0.04)]">
          <div className="flex items-center gap-2.5 px-1 pt-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0A261C] shadow-sm">
              <Zap size={19} className="text-[#D2F24E]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-sans text-[18px] font-extrabold leading-none tracking-tight text-[#0A261C]">
                ChargeShare
              </span>
              <span className="rounded-full bg-[#133E2E] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#D2F24E]">
                Provider
              </span>
            </div>
          </div>

          <nav className="flex flex-col gap-1 border-t border-[#EFECE4] pt-3">
            {NAV_ITEMS.map(({ id, label, Icon }) => {
              const active = activeNav === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveNav(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-bold transition-colors ${
                    active
                      ? 'bg-[#0A261C] text-[#D2F24E]'
                      : 'text-[#414944] hover:bg-[#F4F1EA] hover:text-[#0A261C]'
                  }`}
                >
                  <Icon size={18} />
                  <span className="flex-1">{label}</span>
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => navigateTo(ROUTES.landing)}
            className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold text-[#717974] transition-colors hover:bg-[#F4F1EA] hover:text-[#0A261C]"
          >
            <ArrowLeft size={15} />
            <span>Back to home</span>
          </button>

          <div className="mt-auto flex flex-col gap-3 border-t border-[#EFECE4] pt-3">
            <div className="flex items-center gap-2.5 px-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#133E2E] bg-[#0A261C] text-[#D2F24E]">
                {avatar}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-bold text-[#0A261C]">{displayName}</span>
                <span className="truncate text-[11px] text-[#717974]">{user.email ?? 'No email'}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#DFD9CC] bg-[#FAF7F0] px-3 py-2 text-[12px] font-bold text-[#ba1a1a] transition-colors hover:bg-[#ffdad6]/40"
            >
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#FAF7F0] lg:mx-0 lg:min-h-0 lg:max-w-none lg:flex-1">
          {/* Header */}
          <header className="sticky top-0 z-50 border-b border-[#DFD9CC] bg-[#FAF7F0]/95 backdrop-blur-md shadow-[0_1px_6px_rgba(19,62,46,0.03)] lg:top-6 lg:rounded-2xl lg:border lg:bg-white/95">
            <div className="flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A261C] shadow-sm lg:hidden">
                  <Zap size={18} className="text-[#D2F24E]" />
                </div>
                <div className="flex items-center gap-1.5 lg:hidden">
                  <span className="font-sans text-[18px] font-extrabold leading-none tracking-tight text-[#0A261C]">
                    ChargeShare
                  </span>
                  <span className="rounded-full bg-[#133E2E] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#D2F24E]">
                    Provider
                  </span>
                </div>
                <div className="hidden flex-col lg:flex">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717974]">
                    Provider Portal
                  </span>
                  <h2 className="font-sans text-[20px] font-extrabold leading-tight tracking-tight text-[#0A261C]">
                    {activeLabel}
                  </h2>
                </div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#133E2E] bg-[#0A261C] text-[#D2F24E] lg:hidden">
                {avatar}
              </div>
            </div>
          </header>

          <main className="relative flex flex-1 flex-col gap-4 px-4 pb-6 pt-4 lg:grid lg:grid-cols-3 lg:items-start lg:gap-4 lg:px-0 lg:pb-10">
            {activeNav === 'overview' ? (
              <>
                {accountCard}
                <div className="lg:col-span-1">
                  {chargers.length === 0 ? (
                    <EmptyState
                      Icon={BatteryCharging}
                      title="No charging bay configured"
                      body="Your provider account is ready. Add your first charger so drivers nearby can book it."
                      action={
                        <button type="button" onClick={openAddCharger} className={`${ADD_BUTTON} mt-2`}>
                          <Plus size={16} />
                          <span>Add a charger</span>
                        </button>
                      }
                    />
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className={`${CARD} flex items-center justify-between gap-3 p-4`}>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#717974]">
                            Chargers listed
                          </span>
                          <span className="font-sans text-[22px] font-extrabold leading-tight text-[#0A261C]">
                            {chargers.length}
                          </span>
                        </div>
                        <button type="button" onClick={openAddCharger} className={ADD_BUTTON}>
                          <Plus size={16} />
                          <span>Add a charger</span>
                        </button>
                      </div>
                      {chargers.map((charger) => (
                        <ChargerCard key={charger.id} charger={charger} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : activeNav === 'chargers' ? (
              <div className="flex flex-col gap-4 lg:col-span-3">
                {addingCharger ? (
                  <AddChargerForm
                    onCancel={() => setAddingCharger(false)}
                    onSubmit={(charger) => {
                      setChargers((prev) => [charger, ...prev]);
                      setAddingCharger(false);
                    }}
                  />
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-col">
                        <h2 className="font-sans text-[18px] font-extrabold leading-tight tracking-tight text-[#0A261C]">
                          {chargers.length > 0
                            ? `${chargers.length} charger${chargers.length > 1 ? 's' : ''} listed`
                            : 'Add your charging bay'}
                        </h2>
                        <p className="mt-1 text-[12px] text-[#414944]">
                          These are the chargers drivers can book at your address.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAddingCharger(true)}
                        className={ADD_BUTTON}
                      >
                        <Plus size={16} />
                        <span>Add charger</span>
                      </button>
                    </div>

                    {chargers.length === 0 ? (
                      <EmptyState
                        Icon={BatteryCharging}
                        title="No charger listed yet"
                        body="Answer a few questions about your charger and upload two photos — it will appear here straight away."
                        action={
                          <button
                            type="button"
                            onClick={() => setAddingCharger(true)}
                            className={`${ADD_BUTTON} mt-2`}
                          >
                            <Plus size={16} />
                            <span>Add a charger</span>
                          </button>
                        }
                      />
                    ) : (
                      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:gap-4">
                        {chargers.map((charger) => (
                          <ChargerCard key={charger.id} charger={charger} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="lg:col-span-3">{emptyStates[activeNav]}</div>
            )}
          </main>

          {/* Bottom Navigation (mobile only) */}
          <nav className="sticky bottom-0 z-50 border-t border-[#DFD9CC] bg-[#FAF7F0]/95 backdrop-blur-md shadow-[0_-2px_10px_rgba(19,62,46,0.04)] lg:hidden">
            <div className="flex h-16 items-center justify-around px-1">
              {NAV_ITEMS.map(({ id, label, Icon }) => {
                const active = activeNav === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveNav(id)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex h-12 min-w-[64px] cursor-pointer flex-col items-center justify-center gap-1 transition-colors ${
                      active ? 'font-bold text-[#0A261C]' : 'text-[#414944] hover:text-[#0A261C]'
                    }`}
                  >
                    <Icon size={22} />
                    <span className="text-[11px] tracking-tight">{label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
};
