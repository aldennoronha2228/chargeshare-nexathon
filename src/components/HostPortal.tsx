import React, { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import {
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Edit2,
  Fingerprint,
  House,
  Inbox,
  LayoutGrid,
  LoaderCircle,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Pause,
  Phone,
  Plus,
  Power,
  Save,
  Server,
  ShieldCheck,
  Star,
  Timer,
  User as UserIcon,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { auth } from '../firebase';
import { ROUTES, navigateTo } from '../utils/appRoute';
import { AddChargerForm } from './AddChargerForm';
import { BookingLiveLocationMap } from './BookingLiveLocationMap';
import {
  saveProviderCharger,
  subscribeToProviderChargers,
  publishProviderCharger,
  toggleChargerStatus,
  updateProviderCharger,
  type ProviderCharger,
} from '../utils/providerChargers';
import {
  acceptBooking,
  cancelBooking,
  completeBooking,
  hashArrivalCode,
  rejectBooking,
  startChargingSession,
  subscribeToProviderBookings,
  type Booking,
} from '../utils/bookings';
import { ChargingSessionTimer } from './ChargingSessionTimer';
import {
  respondToReview,
  subscribeToProviderReviews,
  type Review,
} from '../utils/reviews';
import {
  saveProviderProfile,
  subscribeToProviderProfile,
  type ProviderProfile,
} from '../utils/providerProfile';
import { getGatePin } from '../utils/userProfile';

type ProviderNavId = 'overview' | 'bookings' | 'chargers' | 'earnings' | 'account';

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

const NAV_ITEMS: {
  id: ProviderNavId;
  label: string;
  Icon: IconComponent;
}[] = [
  { id: 'overview', label: 'Overview', Icon: LayoutGrid },
  { id: 'bookings', label: 'Bookings', Icon: Calendar },
  { id: 'chargers', label: 'Chargers', Icon: BatteryCharging },
  { id: 'earnings', label: 'Earnings', Icon: Wallet },
  { id: 'account', label: 'Account', Icon: UserIcon },
];

export interface HostPortalProps {
  user: User;
}

export const HostPortal: React.FC<HostPortalProps> = ({ user }) => {
  const [activeNav, setActiveNav] = useState<ProviderNavId>('overview');
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [chargers, setChargers] = useState<ProviderCharger[]>([]);
  const [chargersLoading, setChargersLoading] = useState(true);
  const [chargersError, setChargersError] = useState('');
  const publicIndexBackfilled = useRef(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState('');
  const [bookingNotice, setBookingNotice] = useState('');
  const previousPendingBookingIds = useRef<Set<string> | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');
  const [editingCharger, setEditingCharger] = useState<ProviderCharger | null>(null);
  const [addingCharger, setAddingCharger] = useState(false);
  const [chargerSaveConfirmation, setChargerSaveConfirmation] = useState<{
    title: string;
    action: 'saved' | 'updated';
    coordinates?: { lat: number; lng: number } | null;
  } | null>(null);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);

  // Profile edit state
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editUpi, setEditUpi] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);

  // Telemetry interactive states
  const [cableLocked, setCableLocked] = useState(true);
  const [feedPaused, setFeedPaused] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  // Live view of this provider's profile in Firestore
  useEffect(() => {
    const unsubscribe = subscribeToProviderProfile(user.uid, (data) => {
      setProfile(data);
      if (data) {
        setEditDisplayName(data.displayName || '');
        setEditPhone(data.phoneNumber || '');
        setEditUpi(data.payoutUpiId || '');
      } else {
        setEditDisplayName(user.displayName || user.email?.split('@')[0] || '');
      }
    });
    return unsubscribe;
  }, [user.uid, user.displayName, user.email]);

  // Live view of this provider's chargers in Firestore
  useEffect(() => {
    publicIndexBackfilled.current = false;
    setChargersLoading(true);
    setChargersError('');
    const unsubscribe = subscribeToProviderChargers(
      user.uid,
      (next) => {
        setChargers(next);
        setChargersLoading(false);
        if (!publicIndexBackfilled.current) {
          publicIndexBackfilled.current = true;
          void Promise.all(next.map((charger) => publishProviderCharger(user.uid, charger)))
            .catch((error) => console.error('Could not publish provider chargers for discovery', error));
        }
      },
      (message) => {
        setChargersError(message);
        setChargersLoading(false);
      }
    );
    return unsubscribe;
  }, [user.uid]);

  // Live view of this provider's bookings in Firestore
  useEffect(() => {
    setBookingsLoading(true);
    setBookingsError('');
    previousPendingBookingIds.current = null;
    const unsubscribe = subscribeToProviderBookings(
      user.uid,
      (next) => {
        const pending = next.filter((booking) => booking.status === 'pending');
        const pendingIds = new Set(pending.map((booking) => booking.id));
        const previousIds = previousPendingBookingIds.current;
        if (previousIds) {
          const newBooking = pending.find((booking) => !previousIds.has(booking.id));
          if (newBooking) {
            setBookingNotice(`New booking request from ${newBooking.userName || 'a driver'}.`);
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('New ChargeShare booking', {
                body: `${newBooking.userName || 'A driver'} requested ${newBooking.chargerTitle || 'your charger'}.`,
              });
            }
          }
        }
        previousPendingBookingIds.current = pendingIds;
        setBookings(next);
        setBookingsLoading(false);
      },
      (message) => {
        setBookingsError(message);
        setBookingsLoading(false);
      }
    );
    return unsubscribe;
  }, [user.uid]);

  // Live view of reviews
  useEffect(() => {
    setReviewsLoading(true);
    setReviewsError('');
    const unsubscribe = subscribeToProviderReviews(
      user.uid,
      (next) => {
        setReviews(next);
        setReviewsLoading(false);
      },
      (message) => {
        setReviewsError(message);
        setReviewsLoading(false);
      }
    );
    return unsubscribe;
  }, [user.uid]);

  const displayName =
    profile?.displayName?.trim() ||
    user.displayName?.trim() ||
    user.email?.split('@')[0] ||
    (user.isAnonymous ? 'Demo Host' : 'Host');

  const activeCharger = chargers[0];
  const isBayOnline = activeCharger ? activeCharger.status === 'active' : false;

  const handleSignOut = async () => {
    await signOut(auth);
    navigateTo(ROUTES.login);
  };

  const gatePin = getGatePin(user.uid);

  const copyGatePin = () => {
    navigator.clipboard?.writeText(gatePin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const copyUid = () => {
    navigator.clipboard?.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await saveProviderProfile(user.uid, {
        displayName: editDisplayName.trim(),
        email: user.email || '',
        phoneNumber: editPhone.trim(),
        payoutUpiId: editUpi.trim(),
      });
      setProfileSavedMsg(true);
      setTimeout(() => setProfileSavedMsg(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const acceptedBookings = bookings.filter((b) => b.status === 'accepted');
  const liveSession = acceptedBookings.find((booking) => booking.sessionStartedAt !== undefined);

  const totalRevenue = completedBookings.reduce((acc, b) => acc + b.providerEarnings, 0);
  const totalKwh = completedBookings.reduce((acc, b) => acc + (b.totalKwh || 0), 0);

  const togglePrimaryCharger = async () => {
    if (!activeCharger) {
      setAddingCharger(true);
      setActiveNav('chargers');
      return;
    }
    await toggleChargerStatus(user.uid, activeCharger.id, activeCharger.status);
  };

  const authMethodLabel = user.isAnonymous
    ? 'Verified Demo Host'
    : user.providerData[0]?.providerId === 'google.com'
    ? 'Google Authentication'
    : 'Email & Password';

  return (
    <div className="provider-portal min-h-screen bg-[#FAF8F7] font-body text-[#111111] antialiased flex flex-col selection:bg-black selection:text-white pb-24 lg:pb-12">
      {/* Responsive Fixed Masthead Header */}
      <header className="fixed top-0 w-full z-50 bg-[#141414] text-white border-b border-neutral-800">
        <div className="h-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <span className="font-sans text-sm uppercase tracking-[0.16em] font-bold text-white">
              CHARGESHARE
            </span>
            <span className="font-sans text-[10px] text-white/80 font-medium tracking-widest uppercase bg-white/10 px-1.5 py-0.5 rounded border border-white/10">
              HOST
            </span>
          </div>

          {/* Desktop Nav Tabs (Seamlessly integrated into masthead) */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1">
            {NAV_ITEMS.map(({ id, label, Icon }) => {
              const active = activeNav === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveNav(id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-sans uppercase tracking-wider font-semibold transition-all ${
                    active
                      ? 'bg-white text-black shadow-sm'
                      : 'text-neutral-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon size={14} className={active ? 'text-black' : 'text-neutral-400'} />
                  <span>{label}</span>
                  {id === 'bookings' && pendingBookings.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Actions & Profile */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              aria-label={pendingBookings.length ? `${pendingBookings.length} pending booking requests` : 'Booking notifications'}
              title={pendingBookings.length ? `${pendingBookings.length} pending booking requests` : 'Booking notifications'}
              onClick={async () => {
                if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                  await Notification.requestPermission();
                }
                setBookingNotice('');
                setActiveNav('bookings');
              }}
              className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Bell size={15} />
              {pendingBookings.length > 0 && (
                <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[9px] font-bold leading-4 text-white">
                  {pendingBookings.length > 9 ? '9+' : pendingBookings.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigateTo(ROUTES.landing)}
              aria-label="Go to home page"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <House size={14} />
              <span>Home</span>
            </button>

            {/* Profile Drawer Toggle Button */}
            <button
              aria-label="Host Profile"
              onClick={() => setAccountDrawerOpen(true)}
              className="flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 px-2.5 py-1 border border-white/10 transition-colors"
              title="View Account Details"
            >
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-[11px] font-bold font-sans">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-xs font-sans text-white font-medium max-w-[120px] truncate hidden md:inline">
                {displayName}
              </span>
            </button>

            <button
              aria-label="Sign out"
              onClick={handleSignOut}
              className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Account Details Modal / Drawer */}
      {accountDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-xl border border-[#E2E5E5] bg-white p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between border-b border-[#EBE7E5] pb-4">
              <div>
                <span className="font-sans text-[10px] uppercase tracking-wider font-semibold text-[#636563]">
                  Firebase Backend &amp; Identity
                </span>
                <h3 className="font-sans text-xl font-bold text-black mt-0.5">
                  Host Account Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAccountDrawerOpen(false)}
                className="rounded p-1 text-[#636563] hover:bg-[#F5F3F1] hover:text-black transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Account Credentials & Identifiers */}
            <div className="space-y-3 bg-[#F5F3F1]/70 border border-[#EBE7E5] rounded-lg p-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-sans text-[10px] uppercase tracking-wider text-[#636563]">
                  Host Name
                </span>
                <span className="font-bold text-black font-sans">{displayName}</span>
              </div>

              <div className="flex items-center justify-between border-t border-[#EBE7E5] pt-2">
                <span className="font-sans text-[10px] uppercase tracking-wider text-[#636563]">
                  Email Address
                </span>
                <span className="font-medium text-black">
                  {user.email || 'Anonymous Host Session'}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-[#EBE7E5] pt-2">
                <span className="font-sans text-[10px] uppercase tracking-wider text-[#636563]">
                  Verification
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase tracking-wider ${
                    user.emailVerified
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-neutral-200 text-neutral-800'
                  }`}
                >
                  {user.emailVerified ? 'Email Verified' : 'Authenticated'}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-[#EBE7E5] pt-2">
                <span className="font-sans text-[10px] uppercase tracking-wider text-[#636563]">
                  Auth Provider
                </span>
                <span className="font-semibold text-black">{authMethodLabel}</span>
              </div>

              <div className="flex items-center justify-between border-t border-[#EBE7E5] pt-2">
                <span className="font-sans text-[10px] uppercase tracking-wider text-[#636563]">
                  Firebase UID
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[11px] text-[#636563]">
                    {user.uid.slice(0, 16)}...
                  </span>
                  <button
                    type="button"
                    onClick={copyUid}
                    className="p-1 rounded hover:bg-white text-black transition-colors"
                    title="Copy full UID"
                  >
                    {copiedUid ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Backend Connectivity Status */}
            <div className="space-y-2 border border-[#E2E5E5] rounded-lg p-3 bg-white">
              <span className="font-sans text-[10px] uppercase tracking-wider font-semibold text-[#636563] block">
                Backend Infrastructure
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 bg-[#F5F3F1] rounded">
                  <Database size={15} className="text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-black block">Firestore DB</span>
                    <span className="text-[10px] text-[#636563]">chargeshare-hack</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#F5F3F1] rounded">
                  <Server size={15} className="text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-black block">Cloud Storage</span>
                    <span className="text-[10px] text-[#636563]">dilaxjkci (Active)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Customization Form */}
            <form onSubmit={handleSaveProfile} className="space-y-3 pt-1">
              <span className="font-sans text-[10px] uppercase tracking-wider font-semibold text-[#636563] block">
                Host Payout &amp; Contact Details
              </span>

              <div className="space-y-1">
                <label className="font-sans text-[10px] font-semibold uppercase tracking-wider text-[#636563]">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="e.g., Rohan Sharma"
                  className="w-full rounded border border-[#E2E5E5] bg-[#F5F3F1] px-3 py-2 text-xs font-sans text-black outline-none focus:border-black focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-sans text-[10px] font-semibold uppercase tracking-wider text-[#636563]">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded border border-[#E2E5E5] bg-[#F5F3F1] px-3 py-2 text-xs font-mono text-black outline-none focus:border-black focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-sans text-[10px] font-semibold uppercase tracking-wider text-[#636563]">
                    UPI ID for Payouts
                  </label>
                  <input
                    type="text"
                    value={editUpi}
                    onChange={(e) => setEditUpi(e.target.value)}
                    placeholder="name@okaxis"
                    className="w-full rounded border border-[#E2E5E5] bg-[#F5F3F1] px-3 py-2 text-xs font-mono text-black outline-none focus:border-black focus:bg-white"
                  />
                </div>
              </div>

              {profileSavedMsg && (
                <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>Profile updated in Firestore!</span>
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex-1 h-9 rounded bg-black text-white hover:bg-neutral-800 text-xs font-sans uppercase tracking-wider font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <Save size={13} />
                  <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="h-9 px-4 rounded border border-[#E8E6E5] hover:bg-red-50 text-red-600 text-xs font-sans uppercase tracking-wider font-semibold flex items-center justify-center gap-1"
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Responsive Flexible Main Layout */}
      <main className="w-full max-w-7xl mx-auto pt-20 px-4 sm:px-6 lg:px-8 space-y-6">
        {bookingsError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Booking updates could not be loaded: {bookingsError}
          </div>
        )}
        {bookingNotice && (
          <div role="status" className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <span>{bookingNotice}</span>
            <button type="button" onClick={() => { setBookingNotice(''); setActiveNav('bookings'); }} className="shrink-0 font-semibold underline underline-offset-2">
              View request
            </button>
          </div>
        )}
        {/* TAB 1: OVERVIEW */}
        {activeNav === 'overview' && (
          <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
            {/* Left Column (Primary Telemetry & Live Bay & Timeline) - 7 cols on desktop */}
            <div className="space-y-6 lg:col-span-7 xl:col-span-8">
              {/* Hero Bay Section (Dark Monolith Card) */}
              <section className="bg-[#141414] text-white rounded-xl p-5 sm:p-6 shadow-sm space-y-4 border border-neutral-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h1 className="font-sans text-[1.45rem] sm:text-2xl leading-tight tracking-tight text-white font-bold">
                      {activeCharger ? activeCharger.title : `${displayName}’s Private Bay`}
                    </h1>
                    <p className="text-[12px] sm:text-sm text-neutral-400 flex items-center gap-2 font-sans">
                      {activeCharger ? (
                        <>
                          <span>{activeCharger.locality || activeCharger.city} · Bay #01</span>
                          <span className="text-white/30">•</span>
                          <span>{activeCharger.powerKw} kW {activeCharger.connector}</span>
                        </>
                      ) : (
                        <span>No active bay configured · List your first charger</span>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={togglePrimaryCharger}
                    className="cursor-pointer bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2 shrink-0 select-none active:scale-95 transition-transform"
                  >
                    <span
                      className={`w-2 h-2 rounded-full inline-block ${
                        isBayOnline ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'
                      }`}
                    ></span>
                    <span className="font-sans text-[11px] uppercase text-white tracking-wider font-semibold">
                      {activeCharger ? (isBayOnline ? 'Online' : 'Paused') : 'Setup Bay'}
                    </span>
                  </button>
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pt-1">
                  {activeCharger ? (
                    <>
                      <button
                        type="button"
                        onClick={togglePrimaryCharger}
                        className="h-8 px-3.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white font-sans text-xs uppercase tracking-wider font-medium transition-all shrink-0"
                      >
                        {isBayOnline ? 'Pause Bay' : 'Enable Bay'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCharger(activeCharger);
                          setAddingCharger(true);
                          setActiveNav('chargers');
                        }}
                        className="h-8 px-3.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white font-sans text-xs uppercase tracking-wider font-medium transition-all shrink-0"
                      >
                        Edit Bay Details
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveNav('chargers')}
                        className="h-8 px-3.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white font-sans text-xs uppercase tracking-wider font-medium transition-all shrink-0 flex items-center gap-1.5"
                      >
                        <span>Tariff Settings</span>
                        <ArrowRight size={13} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingCharger(true);
                        setActiveNav('chargers');
                      }}
                      className="h-8 px-4 rounded-full bg-white text-black font-sans text-xs uppercase tracking-wider font-semibold transition-all shrink-0 flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      <span>List Charging Bay</span>
                    </button>
                  )}
                </div>
              </section>

              {/* Dispensing Live Telemetry / Standby Section */}
              {liveSession ? (
                <section className="bg-white border border-[#E2E5E5] rounded-xl p-5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4 text-[#111111]">
                  <div className="flex items-center justify-between border-b border-[#EBE7E5]/70 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      <span className="font-sans text-xs uppercase tracking-wider font-semibold text-black">
                        {feedPaused ? 'Session Paused' : 'Dispensing Live'}
                      </span>
                    </div>
                    <span className="font-sans text-[11px] uppercase tracking-wider text-[#636563] bg-[#F5F3F1] border border-[#EBE7E5]/70 px-2.5 py-1 rounded font-mono">
                      {liveSession.vehicleName || 'EV Active'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="font-sans text-[2.75rem] font-bold leading-none tracking-tighter text-black">
                          ₹{liveSession.totalPrice}
                        </span>
                        <span className="font-sans text-sm font-medium text-[#636563]">Current Session Tab</span>
                      </div>
                      <div className="text-right">
                        <span className="font-sans text-[10px] text-[#636563] uppercase tracking-wider block">
                          Driver
                        </span>
                        <span className="font-sans text-sm font-semibold text-black">
                          {liveSession.userName || 'EV Driver'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-[#636563]">
                      {activeCharger?.title || 'Private Bay'} · {activeCharger?.powerKw || 7.4} kW Feed
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#EBE7E5]/70">
                    <button
                      type="button"
                      onClick={() => setFeedPaused((prev) => !prev)}
                      className="h-10 px-3 bg-[#F5F3F1] hover:bg-[#EBE7E5] border border-[#EBE7E5] text-black rounded font-sans text-xs uppercase tracking-wider font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Pause size={14} />
                      <span>{feedPaused ? 'Resume Feed' : 'Pause Feed'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void completeBooking(liveSession.id).catch((error) => console.error('Could not complete charging session:', error))}
                      className="h-10 px-3 bg-white hover:bg-red-50 border border-red-600 text-red-600 rounded font-sans text-xs uppercase tracking-wider font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Power size={14} />
                      <span>Complete Session</span>
                    </button>
                  </div>
                </section>
              ) : (
                <section className="bg-white border border-[#E2E5E5] rounded-xl p-5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4 text-[#111111]">
                  <div className="flex items-center justify-between border-b border-[#EBE7E5]/70 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isBayOnline ? 'bg-emerald-600' : 'bg-neutral-400'}`}></span>
                      <span className="font-sans text-xs uppercase tracking-wider font-semibold text-black">
                        Bay Telemetry · {isBayOnline ? 'Ready for Connection' : 'Offline'}
                      </span>
                    </div>
                    <span className="font-sans text-[11px] uppercase tracking-wider text-[#636563] bg-[#F5F3F1] border border-[#EBE7E5]/70 px-2.5 py-1 rounded font-mono">
                      {activeCharger?.connector || 'No Hardware'}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between py-1">
                    <div>
                      <span className="font-sans text-[3rem] font-bold leading-none tracking-tighter text-black">
                        0
                      </span>
                      <span className="font-sans text-base font-light text-[#636563] ml-1.5">kW Active Feed</span>
                      <p className="text-xs sm:text-sm text-[#636563] mt-1.5">
                        {activeCharger ? 'Wallbox in standby · Awaiting driver vehicle connection' : 'Add your charger hardware to start dispensing power'}
                      </p>
                    </div>
                    <span className="font-sans text-xs text-[#636563] font-semibold bg-[#F5F3F1] px-3 py-1 rounded">
                      {isBayOnline ? 'Grid Ready' : 'Standby'}
                    </span>
                  </div>
                </section>
              )}

              {/* Schedule Timeline Section */}
              <section className="space-y-3">
                <div className="flex items-center justify-between px-0.5">
                  <span className="font-sans text-xs uppercase tracking-[0.14em] text-[#636563] font-semibold">
                    Schedule Timeline
                  </span>
                  <span className="font-mono text-xs text-[#636563] font-medium">
                    {bookings.length} {bookings.length === 1 ? 'Booking' : 'Bookings'}
                  </span>
                </div>

                <div className="bg-white border border-[#E2E5E5] rounded-xl divide-y divide-[#EBE7E5] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  {bookings.length > 0 ? (
                    bookings.map((b) => (
                      <div
                        key={b.id}
                        className={`p-4 flex items-center justify-between ${
                          b.status === 'accepted' ? 'bg-[#F5F3F1]/50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <span className="font-mono text-xs font-semibold text-[#636563] w-14">
                            {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div>
                            <span className="font-sans text-xs sm:text-sm font-semibold text-black block">
                              {b.userName || 'Driver'}
                            </span>
                            <span className="text-[11px] text-[#636563]">
                              {b.vehicleName || 'Electric Vehicle'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-medium text-black">
                            ₹{b.totalPrice}
                          </span>
                          <span
                            className={`font-sans text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded border ${
                              b.status === 'completed'
                                ? 'text-[#636563] bg-[#F5F3F1] border-[#EBE7E5]'
                                : b.status === 'accepted'
                                ? 'bg-black text-white border-black'
                                : 'text-amber-800 bg-amber-50 border-amber-200'
                            }`}
                          >
                            {b.status === 'accepted' ? 'Live' : b.status === 'pending' ? 'Action Req.' : 'Completed'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-[#636563] space-y-1">
                      <Calendar size={22} className="mx-auto mb-2 text-neutral-400" />
                      <p className="font-semibold text-black">No scheduled bookings yet</p>
                      <p className="text-[11px]">
                        Incoming driver reservations for your charging bay will appear here in chronological order.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column (Metrics, Requests, Access & Account) - 5 cols on desktop */}
            <div className="space-y-6 lg:col-span-5 xl:col-span-4">
              {/* Today's Overview Metric Bento */}
              <section className="bg-white border border-[#E2E5E5] rounded-xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-xs uppercase tracking-[0.14em] text-[#636563] font-semibold">
                    Today’s Overview
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveNav('earnings')}
                    className="font-sans text-xs uppercase tracking-wider text-black hover:underline font-semibold flex items-center gap-0.5"
                  >
                    <span>Full Report</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-3 divide-x divide-[#EBE7E5] pt-1">
                  <div className="flex flex-col pr-3">
                    <span className="font-sans text-lg sm:text-xl font-bold text-black tracking-tight">
                      ₹{totalRevenue}
                    </span>
                    <span className="font-sans text-[10px] uppercase tracking-wider text-[#636563] mt-0.5">
                      Net Revenue
                    </span>
                  </div>
                  <div className="flex flex-col px-3">
                    <span className="font-sans text-lg sm:text-xl font-bold text-black tracking-tight">
                      {totalKwh.toFixed(1)}
                    </span>
                    <span className="font-sans text-[10px] uppercase tracking-wider text-[#636563] mt-0.5">
                      Delivered (kWh)
                    </span>
                  </div>
                  <div className="flex flex-col pl-3">
                    <span className="font-sans text-lg sm:text-xl font-bold text-black tracking-tight">
                      {completedBookings.length}
                    </span>
                    <span className="font-sans text-[10px] uppercase tracking-wider text-[#636563] mt-0.5">
                      Completed
                    </span>
                  </div>
                </div>
              </section>

              {/* Pending Requests */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-0.5">
                  <span className="font-sans text-xs uppercase tracking-[0.14em] text-[#636563] font-semibold">
                    Pending Requests
                  </span>
                  <span className="font-mono text-xs text-[#636563]">
                    {pendingBookings.length}
                  </span>
                </div>

                {pendingBookings.length > 0 ? (
                  pendingBookings.map((booking) => (
                    <section
                      key={booking.id}
                      className="bg-white border border-[#E2E5E5] rounded-xl p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-[#EBE7E5] pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-sans text-[10.5px] uppercase tracking-wider bg-black text-white font-semibold px-2 py-0.5 rounded">
                            ACTION REQ.
                          </span>
                          <span className="font-mono text-xs text-[#636563] font-medium">
                            #{booking.id.slice(0, 5)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-red-600 font-medium text-xs">
                          <Timer size={14} />
                          <span className="font-mono tracking-wide">Pending</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-sans text-sm font-bold text-[#111111] block">
                            {booking.userName || 'EV Driver'}
                          </span>
                          <span className="text-xs text-[#636563] block mt-0.5">
                            {booking.vehicleName || 'Electric Vehicle'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-sans text-base font-bold text-[#111111] tracking-tight block">
                            ₹{booking.totalPrice}
                          </span>
                          <span className="font-sans text-[10px] text-[#636563] uppercase tracking-wider">
                            NET PAYOUT
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-[#F5F3F1]/70 border border-[#EBE7E5] rounded-lg p-2.5 text-xs">
                        <div>
                          <span className="font-sans text-[9px] uppercase tracking-wider text-[#636563] block">
                            Slot Time
                          </span>
                          <span className="font-mono font-bold text-black mt-0.5 block">
                            {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div>
                          <span className="font-sans text-[9px] uppercase tracking-wider text-[#636563] block">
                            Est. Energy
                          </span>
                          <span className="font-mono font-bold text-black mt-0.5 block">
                            ~{((booking.totalPrice || 100) / (activeCharger?.price || 15)).toFixed(1)} kWh
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <button
                          onClick={() => rejectBooking(booking.id)}
                          className="h-9 px-3 rounded border border-[#E8E6E5] hover:bg-[#F5F3F1] text-[#111111] font-sans text-xs uppercase tracking-wider font-semibold active:scale-[0.99] transition-all"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => acceptBooking(booking.id)}
                          className="h-9 px-3 rounded bg-black text-white font-sans text-xs uppercase tracking-wider font-semibold hover:bg-neutral-800 active:scale-[0.99] transition-all flex items-center justify-center gap-1"
                        >
                          <span>Accept</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </section>
                  ))
                ) : (
                  <div className="bg-white border border-[#E2E5E5] rounded-xl p-4 text-center text-xs text-[#636563] flex items-center justify-between">
                    <span className="font-sans font-medium text-black">Requests status</span>
                    <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      All caught up (0)
                    </span>
                  </div>
                )}
              </div>

              {/* Automated Gate Access Section */}
              <section className="bg-white border border-[#E2E5E5] rounded-xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-xs uppercase tracking-[0.14em] text-[#636563] font-semibold">
                    Automated Gate Access
                  </span>
                  <span className="font-sans text-[10px] text-[#636563] uppercase tracking-wider">
                    Host Key
                  </span>
                </div>

                <div className="flex items-center justify-between bg-[#F5F3F1]/70 border border-[#EBE7E5] p-3 rounded-lg">
                  <div>
                    <span className="font-sans text-[10px] uppercase tracking-wider text-[#636563] block">
                      Assigned Gate PIN
                    </span>
                    <span className="font-mono text-base font-bold text-black tracking-widest mt-0.5 block">
                      {gatePin}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={copyGatePin}
                    className="h-8 px-2.5 rounded bg-white border border-[#E8E6E5] hover:bg-[#F5F3F1] text-black font-sans text-[11px] uppercase tracking-wider font-medium flex items-center gap-1.5 transition-colors"
                  >
                    {copiedPin ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedPin ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-0.5 text-xs text-[#636563]">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-black" />
                    <span>
                      {activeCharger?.accessNotes ? activeCharger.accessNotes : 'Host Liability Protection Active'}
                    </span>
                  </div>
                </div>
              </section>

              {/* Backend & Identity Summary Card */}
              <section className="bg-white border border-[#E2E5E5] rounded-xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-xs uppercase tracking-[0.14em] text-[#636563] font-semibold">
                    Backend Status
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>Live</span>
                  </span>
                </div>

                <div className="space-y-2 text-xs bg-[#F5F3F1] p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[#636563]">Database</span>
                    <span className="font-mono font-medium text-black">Firestore (chargeshare-hack)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#636563]">Storage</span>
                    <span className="font-mono font-medium text-black">Cloudinary (dilaxjkci)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#636563]">Host Account</span>
                    <span className="font-bold text-black">{displayName}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAccountDrawerOpen(true)}
                  className="w-full h-9 rounded border border-[#E8E6E5] hover:bg-[#F5F3F1] text-black font-sans text-xs uppercase tracking-wider font-semibold transition-colors"
                >
                  Manage Account &amp; Payouts
                </button>
              </section>
            </div>
          </div>
        )}

        {/* TAB 2: BOOKINGS */}
        {activeNav === 'bookings' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-sans text-xl font-bold text-black">Driver Reservations</h2>
                <p className="text-xs sm:text-sm text-[#636563]">
                  All scheduled, live and past charging reservations for your bays.
                </p>
              </div>
              <span className="font-mono text-xs text-[#636563] bg-[#F5F3F1] px-3 py-1.5 rounded border border-[#EBE7E5]">
                {bookings.length} Total
              </span>
            </div>

            {bookingsLoading ? (
              <div className="bg-white border border-[#E2E5E5] rounded-xl p-16 text-center text-xs text-[#636563]">
                <LoaderCircle className="animate-spin mx-auto mb-2 text-black" size={24} />
                Loading bookings from Firestore...
              </div>
            ) : bookings.length === 0 ? (
              <div className="bg-white border border-[#E2E5E5] rounded-xl p-16 text-center text-xs text-[#636563] space-y-2">
                <Inbox size={32} className="mx-auto text-neutral-400" />
                <p className="font-bold text-black text-sm">No bookings yet</p>
                <p>Incoming driver reservations will appear here in real time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-white border border-[#E2E5E5] rounded-xl p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-sans text-sm font-bold text-black">
                          {booking.userName || 'EV Driver'}
                        </h4>
                        <p className="text-xs text-[#636563]">{booking.vehicleName || 'Vehicle'}</p>
                      </div>
                      <span
                        className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          booking.status === 'accepted'
                            ? 'bg-black text-white'
                            : booking.status === 'completed'
                            ? 'bg-[#F5F3F1] text-black border border-[#EBE7E5]'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-[#F5F3F1] rounded p-2.5 text-xs">
                      <div>
                        <span className="font-sans text-[9px] uppercase tracking-wider text-[#636563] block">
                          Slot Time
                        </span>
                        <span className="font-mono font-bold text-black">
                          {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div>
                        <span className="font-sans text-[9px] uppercase tracking-wider text-[#636563] block">
                          Net Payout
                        </span>
                        <span className="font-mono font-bold text-black">
                          ₹{booking.totalPrice}
                        </span>
                      </div>
                    </div>

                    {booking.status === 'pending' && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => rejectBooking(booking.id)}
                          className="py-2 rounded border border-[#E8E6E5] hover:bg-[#F5F3F1] text-xs font-bold uppercase tracking-wider"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => acceptBooking(booking.id)}
                          className="py-2 rounded bg-black text-white hover:bg-neutral-800 text-xs font-bold uppercase tracking-wider"
                        >
                          Accept
                        </button>
                      </div>
                    )}

                    {booking.status === 'accepted' && (
                      <>
                      {booking.sessionStartedAt ? (
                        <ChargingSessionTimer startedAt={booking.sessionStartedAt} />
                      ) : booking.clientReached ? (
                        <ClientArrivalCodeForm booking={booking} />
                      ) : (
                        <p role="status" className="rounded-lg bg-[#F5F3F1] px-3 py-2 text-xs font-semibold text-[#636563]">Waiting for the client to confirm arrival.</p>
                      )}
                      <BookingLiveLocationMap chargerId={booking.chargerId} chargerLocation={booking.chargerLocation} location={booking.clientLocation} updatedAt={booking.clientLocationUpdatedAt} />
                      <button
                        onClick={() => cancelBooking(booking.id)}
                        className="w-full py-2 rounded border border-[#E8E6E5] hover:bg-[#F5F3F1] text-xs font-bold uppercase tracking-wider text-black"
                      >
                        Cancel Booking
                      </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CHARGERS */}
        {activeNav === 'chargers' && (
          <div className="space-y-5">
            {chargerSaveConfirmation && (
              <div role="status" aria-live="polite" className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Firebase confirmed: “{chargerSaveConfirmation.title}” {chargerSaveConfirmation.action}.</p>
                  {chargerSaveConfirmation.coordinates && (
                    <p className="mt-1 font-mono text-[11px]">
                      Saved coordinates: {chargerSaveConfirmation.coordinates.lat.toFixed(6)}, {chargerSaveConfirmation.coordinates.lng.toFixed(6)}
                    </p>
                  )}
                </div>
                <button type="button" aria-label="Dismiss save confirmation" onClick={() => setChargerSaveConfirmation(null)} className="rounded p-1 hover:bg-emerald-100"><X size={16} /></button>
              </div>
            )}
            {addingCharger ? (
              <div className="max-w-2xl mx-auto">
                <AddChargerForm
                  providerId={user.uid}
                  initialCharger={editingCharger ?? undefined}
                  onCancel={() => {
                    setAddingCharger(false);
                    setEditingCharger(null);
                  }}
                  onSubmit={async (charger) => {
                    if (editingCharger) {
                      await updateProviderCharger(user.uid, editingCharger.id, charger);
                      setChargerSaveConfirmation({
                        title: charger.title,
                        action: 'updated',
                        coordinates: charger.coordinates,
                      });
                    } else {
                      await saveProviderCharger(user.uid, charger);
                      setChargerSaveConfirmation({
                        title: charger.title,
                        action: 'saved',
                        coordinates: charger.coordinates,
                      });
                    }
                    setAddingCharger(false);
                    setEditingCharger(null);
                  }}
                />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-sans text-xl font-bold text-black">Your Charging Bays</h2>
                    <p className="text-xs sm:text-sm text-[#636563]">
                      Configure hardware, tariffs, power rating and vehicle compatibility.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddingCharger(true)}
                    className="h-9 px-4 rounded bg-black text-white font-sans text-xs uppercase tracking-wider font-semibold hover:bg-neutral-800 flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={15} />
                    <span>Add Bay</span>
                  </button>
                </div>

                {chargersLoading ? (
                  <div className="bg-white border border-[#E2E5E5] rounded-xl p-16 text-center text-xs text-[#636563]">
                    <LoaderCircle className="animate-spin mx-auto mb-2 text-black" size={24} />
                    Loading chargers from Firestore...
                  </div>
                ) : chargers.length === 0 ? (
                  <div className="bg-white border border-[#E2E5E5] rounded-xl p-16 text-center text-xs text-[#636563] space-y-3">
                    <BatteryCharging size={32} className="mx-auto text-neutral-400" />
                    <p className="font-bold text-black text-sm">No charging bay added yet</p>
                    <p>List your driveway wallbox, socket or dedicated slot to start hosting.</p>
                    <button
                      type="button"
                      onClick={() => setAddingCharger(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-black text-white font-sans text-xs uppercase tracking-wider font-semibold"
                    >
                      <Plus size={14} />
                      <span>Add First Bay</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {chargers.map((charger) => {
                      const isActive = charger.status === 'active';
                      return (
                        <article
                          key={charger.id}
                          className="bg-white border border-[#E2E5E5] rounded-xl overflow-hidden shadow-sm flex flex-col justify-between"
                        >
                          <div>
                            <div className="grid h-44 grid-cols-2 grid-rows-1 gap-[1px] overflow-hidden bg-[#EBE7E5]">
                              <img
                                src={charger.chargerPhoto.url}
                                alt="Charger Hardware"
                                className="block h-full min-h-0 w-full min-w-0 object-cover"
                              />
                              <img
                                src={charger.spacePhoto.url}
                                alt="Parking Space"
                                className="block h-full min-h-0 w-full min-w-0 object-cover"
                              />
                            </div>

                            <div className="p-4 space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-sans text-base font-bold text-black">
                                    {charger.title}
                                  </h3>
                                  <p className="text-xs text-[#636563] flex items-center gap-1 mt-0.5">
                                    <MapPin size={12} className="text-black" />
                                    <span>{charger.addressLine}, {charger.city}</span>
                                  </p>
                                </div>
                                <span
                                  className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                    isActive ? 'bg-black text-white' : 'bg-[#F5F3F1] text-[#636563]'
                                  }`}
                                >
                                  {isActive ? 'Online' : 'Paused'}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 bg-[#F5F3F1] rounded p-2.5 text-xs">
                                <div>
                                  <span className="font-sans text-[9px] uppercase tracking-wider text-[#636563] block">
                                    Power
                                  </span>
                                  <span className="font-mono font-bold text-black">
                                    {charger.powerKw} kW
                                  </span>
                                </div>
                                <div>
                                  <span className="font-sans text-[9px] uppercase tracking-wider text-[#636563] block">
                                    Tariff
                                  </span>
                                  <span className="font-mono font-bold text-black">
                                    ₹{charger.price}/{charger.pricingType === 'per_kwh' ? 'kWh' : 'sess'}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-sans text-[9px] uppercase tracking-wider text-[#636563] block">
                                    Plug
                                  </span>
                                  <span className="font-bold text-black truncate block">
                                    {charger.connector}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 pt-0">
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EBE7E5]">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCharger(charger);
                                  setAddingCharger(true);
                                }}
                                className="h-9 rounded border border-[#E8E6E5] hover:bg-[#F5F3F1] text-black font-sans text-xs uppercase tracking-wider font-semibold flex items-center justify-center gap-1"
                              >
                                <Edit2 size={13} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleChargerStatus(user.uid, charger.id, charger.status)}
                                className={`h-9 rounded font-sans text-xs uppercase tracking-wider font-semibold flex items-center justify-center gap-1 ${
                                  isActive
                                    ? 'border border-[#E8E6E5] text-black hover:bg-[#F5F3F1]'
                                    : 'bg-black text-white hover:bg-neutral-800'
                                }`}
                              >
                                <Power size={13} />
                                <span>{isActive ? 'Pause' : 'Enable'}</span>
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 4: EARNINGS */}
        {activeNav === 'earnings' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-sans text-xl font-bold text-black">Earnings & Settlements</h2>
              <p className="text-xs sm:text-sm text-[#636563]">
                Net revenues, power delivery units and payment settlements from completed sessions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E2E5E5] rounded-xl p-5 text-center sm:text-left">
                <span className="font-sans text-xs uppercase tracking-wider text-[#636563] block">
                  Total Net Payout
                </span>
                <span className="font-sans text-3xl font-bold text-black mt-1 block">
                  ₹{totalRevenue}
                </span>
                <span className="text-xs text-[#636563] mt-1 block">Direct bank transfers</span>
              </div>
              <div className="bg-white border border-[#E2E5E5] rounded-xl p-5 text-center sm:text-left">
                <span className="font-sans text-xs uppercase tracking-wider text-[#636563] block">
                  Completed Sessions
                </span>
                <span className="font-sans text-3xl font-bold text-black mt-1 block">
                  {completedBookings.length}
                </span>
                <span className="text-xs text-[#636563] mt-1 block">Successfully charged</span>
              </div>
              <div className="bg-white border border-[#E2E5E5] rounded-xl p-5 text-center sm:text-left">
                <span className="font-sans text-xs uppercase tracking-wider text-[#636563] block">
                  Energy Yield
                </span>
                <span className="font-sans text-3xl font-bold text-black mt-1 block">
                  {totalKwh.toFixed(1)} kWh
                </span>
                <span className="text-xs text-[#636563] mt-1 block">Clean energy delivered</span>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="space-y-3 pt-2">
              <h3 className="font-sans text-sm uppercase tracking-wider font-bold text-[#636563]">
                Driver Ratings &amp; Reviews ({reviews.length})
              </h3>
              {reviews.length === 0 ? (
                <div className="bg-white border border-[#E2E5E5] rounded-xl p-8 text-center text-xs text-[#636563]">
                  No reviews left by drivers yet. Reviews appear once completed sessions are rated.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="bg-white border border-[#E2E5E5] rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-black">{r.userName}</span>
                        <span className="text-xs font-semibold text-amber-600">★ {r.rating}.0</span>
                      </div>
                      <p className="text-xs text-[#636563]">"{r.comment}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: ACCOUNT */}
        {activeNav === 'account' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="font-sans text-xl font-bold text-black">Host Account Profile</h2>
              <p className="text-xs sm:text-sm text-[#636563]">
                Your authenticated Firebase credentials, database connection and payout settings.
              </p>
            </div>

            {/* Profile Card */}
            <div className="bg-white border border-[#E2E5E5] rounded-xl p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#141414] text-white flex items-center justify-center font-bold text-2xl font-sans">
                  {displayName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-sans text-xl font-bold text-black">{displayName}</h3>
                  <p className="text-xs text-[#636563]">{user.email || 'Anonymous Host Session'}</p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-sans font-bold uppercase tracking-wider border border-emerald-200">
                    {user.emailVerified ? 'Verified Host' : 'Authenticated Host'}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 bg-[#F5F3F1] rounded-lg p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[10px] uppercase tracking-wider text-[#636563]">
                    Firebase UID
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-black">{user.uid}</span>
                    <button
                      type="button"
                      onClick={copyUid}
                      className="p-1 rounded hover:bg-white text-black transition-colors"
                      title="Copy UID"
                    >
                      {copiedUid ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#EBE7E5] pt-2">
                  <span className="font-sans text-[10px] uppercase tracking-wider text-[#636563]">
                    Auth Provider
                  </span>
                  <span className="font-semibold text-black">{authMethodLabel}</span>
                </div>

                <div className="flex items-center justify-between border-t border-[#EBE7E5] pt-2">
                  <span className="font-sans text-[10px] uppercase tracking-wider text-[#636563]">
                    Database Project
                  </span>
                  <span className="font-mono text-emerald-700 font-semibold">
                    chargeshare-hack (Online)
                  </span>
                </div>
              </div>

              {/* Edit Profile Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4 pt-2 border-t border-[#EBE7E5]">
                <span className="font-sans text-xs uppercase tracking-wider font-semibold text-[#636563] block">
                  Edit Host Contact &amp; Payout Settings
                </span>

                <div className="space-y-1">
                  <label className="font-sans text-[10px] font-semibold uppercase tracking-wider text-[#636563]">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="e.g., Rohan Sharma"
                    className="w-full rounded border border-[#E2E5E5] bg-[#F5F3F1] px-3.5 py-2.5 text-xs font-sans text-black outline-none focus:border-black focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="font-sans text-[10px] font-semibold uppercase tracking-wider text-[#636563]">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded border border-[#E2E5E5] bg-[#F5F3F1] px-3.5 py-2.5 text-xs font-mono text-black outline-none focus:border-black focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[10px] font-semibold uppercase tracking-wider text-[#636563]">
                      UPI ID for Payouts
                    </label>
                    <input
                      type="text"
                      value={editUpi}
                      onChange={(e) => setEditUpi(e.target.value)}
                      placeholder="name@okaxis"
                      className="w-full rounded border border-[#E2E5E5] bg-[#F5F3F1] px-3.5 py-2.5 text-xs font-mono text-black outline-none focus:border-black focus:bg-white"
                    />
                  </div>
                </div>

                {profileSavedMsg && (
                  <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>Profile saved to Firestore database!</span>
                  </p>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex-1 h-10 rounded bg-black text-white hover:bg-neutral-800 text-xs font-sans uppercase tracking-wider font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    <Save size={13} />
                    <span>{savingProfile ? 'Saving…' : 'Save to Firestore'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="h-10 px-5 rounded border border-[#E8E6E5] hover:bg-red-50 text-red-600 text-xs font-sans uppercase tracking-wider font-semibold flex items-center justify-center gap-1"
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation (Mobile Only: lg:hidden) */}
      <nav className="fixed bottom-0 w-full z-40 bg-[#FAF8F7]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md border-t border-[#EBE7E5]/80 lg:hidden">
        <div className="flex items-center justify-around h-14 max-w-2xl mx-auto px-2">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = activeNav === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveNav(id)}
                className={`flex-1 flex flex-col items-center justify-center h-full transition-colors ${
                  active ? 'text-black font-semibold' : 'text-[#636563] hover:text-black'
                }`}
              >
                <Icon size={18} className={active ? 'text-black' : 'text-[#636563]'} />
                <span className="font-sans text-[10px] uppercase mt-0.5 tracking-wider font-semibold">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

const ClientArrivalCodeForm: React.FC<{ booking: Booking }> = ({ booking }) => {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const submittedHash = await hashArrivalCode(code);
      const accountPinHash = await hashArrivalCode(getGatePin(booking.userId));
      if (submittedHash !== accountPinHash && submittedHash !== booking.arrivalCodeHash) {
        setError('That code does not match. Ask the client to check the code on their screen.');
        return;
      }
      await startChargingSession(booking.id);
    } catch {
      setError('Could not start the charging session. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-2 rounded-lg border border-[#D5D5D5] bg-white p-3">
      <label htmlFor={`arrival-code-${booking.id}`} className="block text-xs font-semibold text-[#222]">Enter the client’s arrival code to start charging</label>
      <div className="flex gap-2">
        <input
          id={`arrival-code-${booking.id}`}
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^#A-Z0-9_-]/g, '').slice(0, 5))}
          autoComplete="off"
          maxLength={5}
          required
          placeholder="#XXXX"
          className="min-w-0 flex-1 rounded-md border border-[#B8B8B8] px-3 py-2 font-mono text-sm uppercase tracking-[0.12em]"
        />
        <button type="submit" disabled={submitting || code.length !== 5} className="rounded-md bg-black px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? 'Checking…' : 'Start timer'}
        </button>
      </div>
      {error && <p role="alert" className="text-[11px] text-[#B42318]">{error}</p>}
    </form>
  );
};
