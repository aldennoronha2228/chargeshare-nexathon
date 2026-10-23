import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, Trash2, Zap } from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import type { ChargerListing, ConnectorType, IndianCity } from '../data/demoChargers';
import { validateHostListingForm } from '../utils/marketplaceLogic';
import { describeAuthError } from '../utils/authErrors';
import { auth } from '../firebase';

export interface ConfirmedDemoBooking {
  bookingId: string;
  chargerId: string;
  chargerTitle: string;
  locality: string;
  city: string;
  slotWindow: string;
  driverName: string;
  vehicleModel: string;
  estimatedKwh: number;
  estimatedTotalInr: number;
}

interface HostOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddHostListing: (newCharger: ChargerListing) => void;
}

export const HostOnboardingModal: React.FC<HostOnboardingModalProps> = ({
  isOpen,
  onClose,
  onAddHostListing,
}) => {
  const [hostName, setHostName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState<Exclude<IndianCity, 'All Cities'>>('Bengaluru');
  const [locality, setLocality] = useState('');
  const [connector, setConnector] = useState<ConnectorType>('Type 2 AC');
  const [powerKw, setPowerKw] = useState<number>(7.4);
  const [pricePerKwh, setPricePerKwh] = useState<number>(15);
  const [parkingType, setParkingType] = useState('Private Gated Driveway');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedCharger, setSubmittedCharger] = useState<ChargerListing | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateHostListingForm({
      hostName,
      phone,
      city,
      locality,
      connector,
      powerKw,
      pricePerKwh,
      parkingType,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const created: ChargerListing = {
      id: `cs-host-${Date.now()}`,
      title: `${locality.trim()} Residential Charger`,
      locality: locality.trim(),
      city,
      addressCue: `Listed by ${hostName.trim()} (${parkingType})`,
      distanceKm: 0.9,
      connector,
      powerKw,
      pricePerKwh,
      parkingType,
      operatingHours: '08:30 – 21:30 Daily',
      availableNow: true,
      availabilityLabel: 'Newly listed · 2 demo slots open',
      hostName: hostName.trim(),
      hostTenure: 'New Host (Demo Listing)',
      rating: 5.0,
      reviewCount: 1,
      completedSessions: 1,
      hardwareModel: `${powerKw.toFixed(1)} kW ${connector} Home Unit`,
      cableLengthMeters: 5.0,
      accessNotes: `${parkingType}. Contact host on confirmation for driveway entry instructions.`,
      compatibleVehicles: ['Tata Nexon EV', 'MG ZS EV', 'BYD Atto 3', 'Mahindra XUV400'],
      mapPosition: { x: 50, y: 46 },
      coordinates: { lat: '12.97° N', lng: '77.60° E' },
      visualTheme: 'driveway-canopy',
      slots: [
        { id: `slot-a-${Date.now()}`, label: 'Daytime Window', window: '10:00 – 15:00', available: true },
        { id: `slot-b-${Date.now()}`, label: 'Evening Window', window: '18:00 – 22:00', available: true },
      ],
    };

    setErrors({});
    setSubmittedCharger(created);
    onAddHostListing(created);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="host-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 overflow-y-auto"
    >
      <div className="bg-[#F6F3E9] border-2 border-[#22251F] rounded max-w-lg w-full p-6 sm:p-7 relative my-8">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#D8D5CA]">
          <div>
            <span className="text-xs font-mono uppercase text-[#173D2C] font-semibold">
              BECOME A HOST · DEMO LISTING CREATOR
            </span>
            <h2 id="host-modal-title" className="text-xl font-bold font-display text-[#22251F] mt-1">
              List your private EV charger on ChargeShare
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close host onboarding dialog"
            className="p-1.5 rounded border border-[#D8D5CA] text-[#22251F] hover:bg-[#EDE8D8] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submittedCharger ? (
          <div className="py-6 space-y-4">
            <div className="p-4 bg-[#173D2C] text-[#F6F3E9] rounded border border-[#22251F] space-y-2">
              <div className="flex items-center gap-2 text-[#D8F36A] font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Your demo charger is now live on the discovery map!</span>
              </div>
              <p className="text-xs text-[#E2ECE7]">
                <strong>{submittedCharger.title}</strong> ({submittedCharger.city}) has been added at{' '}
                <strong>₹{submittedCharger.pricePerKwh}/kWh</strong> ({submittedCharger.powerKw} kW{' '}
                {submittedCharger.connector}).
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSubmittedCharger(null);
                  onClose();
                  document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-5 py-2.5 text-xs font-semibold text-[#173D2C] bg-[#D8F36A] border border-[#173D2C] rounded cursor-pointer"
              >
                View Your Listing on Map
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="pt-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="host-name-input" className="block font-semibold text-[#22251F] mb-1">
                  Host Name
                </label>
                <input
                  id="host-name-input"
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="e.g.,Vikram Nair"
                  className="w-full px-3 py-2 bg-white border border-[#D8D5CA] rounded text-[#22251F]"
                />
                {errors.hostName && <p className="text-[#B42318] mt-1">{errors.hostName}</p>}
              </div>

              <div>
                <label htmlFor="host-phone-input" className="block font-semibold text-[#22251F] mb-1">
                  10-Digit Mobile (India)
                </label>
                <input
                  id="host-phone-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., 98201 54321"
                  className="w-full px-3 py-2 bg-white border border-[#D8D5CA] rounded text-[#22251F]"
                />
                {errors.phone && <p className="text-[#B42318] mt-1">{errors.phone}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="host-city-input" className="block font-semibold text-[#22251F] mb-1">
                  City
                </label>
                <select
                  id="host-city-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value as Exclude<IndianCity, 'All Cities'>)}
                  className="w-full px-3 py-2 bg-white border border-[#D8D5CA] rounded text-[#22251F]"
                >
                  <option value="Bengaluru">Bengaluru</option>
                  <option value="Pune">Pune</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Delhi NCR">Delhi NCR</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Chennai">Chennai</option>
                </select>
              </div>

              <div>
                <label htmlFor="host-locality-input" className="block font-semibold text-[#22251F] mb-1">
                  Neighbourhood / Locality
                </label>
                <input
                  id="host-locality-input"
                  type="text"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="e.g., HSR Layout Sector 2"
                  className="w-full px-3 py-2 bg-white border border-[#D8D5CA] rounded text-[#22251F]"
                />
                {errors.locality && <p className="text-[#B42318] mt-1">{errors.locality}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="host-connector-input" className="block font-semibold text-[#22251F] mb-1">
                  Connector
                </label>
                <select
                  id="host-connector-input"
                  value={connector}
                  onChange={(e) => setConnector(e.target.value as ConnectorType)}
                  className="w-full px-3 py-2 bg-white border border-[#D8D5CA] rounded text-[#22251F]"
                >
                  <option value="Type 2 AC">Type 2 AC</option>
                  <option value="15A 3-Pin Socket">15A 3-Pin Socket</option>
                  <option value="Bharat AC001">Bharat AC001</option>
                  <option value="CCS2 DC">CCS2 DC</option>
                </select>
              </div>

              <div>
                <label htmlFor="host-power-input" className="block font-semibold text-[#22251F] mb-1">
                  Power Rating (kW)
                </label>
                <input
                  id="host-power-input"
                  type="number"
                  step="0.1"
                  value={powerKw}
                  onChange={(e) => setPowerKw(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-[#D8D5CA] rounded text-[#22251F] font-mono"
                />
                {errors.powerKw && <p className="text-[#B42318] mt-1">{errors.powerKw}</p>}
              </div>

              <div>
                <label htmlFor="host-price-input" className="block font-semibold text-[#22251F] mb-1">
                  Tariff (₹/kWh)
                </label>
                <input
                  id="host-price-input"
                  type="number"
                  value={pricePerKwh}
                  onChange={(e) => setPricePerKwh(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-[#D8D5CA] rounded text-[#22251F] font-mono"
                />
                {errors.pricePerKwh && <p className="text-[#B42318] mt-1">{errors.pricePerKwh}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="host-parking-input" className="block font-semibold text-[#22251F] mb-1">
                Parking Bay Type
              </label>
              <select
                id="host-parking-input"
                value={parkingType}
                onChange={(e) => setParkingType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#D8D5CA] rounded text-[#22251F]"
              >
                <option value="Private Gated Driveway">Private Gated Driveway (Independent Home)</option>
                <option value="Covered Apartment Stilt Bay">Covered Apartment Stilt Bay (RWA Approved)</option>
                <option value="Ground Floor Carport">Ground Floor Carport</option>
              </select>
            </div>

            <div className="pt-3 border-t border-[#D8D5CA] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 font-medium text-[#22251F] border border-[#D8D5CA] rounded hover:bg-[#EDE8D8] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 font-semibold text-[#173D2C] bg-[#D8F36A] border border-[#173D2C] rounded hover:bg-[#c9e854] cursor-pointer"
              >
                Publish Demo Charger Listing
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

interface SignInAndBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  confirmedBookings: ConfirmedDemoBooking[];
  onCancelBooking: (bookingId: string) => void;
  onOpenEditProfile: () => void;
}

export const SignInAndBookingsModal: React.FC<SignInAndBookingsModalProps> = ({
  isOpen,
  onClose,
  confirmedBookings,
  onCancelBooking,
  onOpenEditProfile,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState('');
  const [authPending, setAuthPending] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
  }, []);

  if (!isOpen) return null;

  const displayName = currentUser?.displayName || currentUser?.email || '';

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthPending(true);
    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      setEmail('');
      setPassword('');
    } catch (error) {
      setAuthError(describeAuthError(error));
    } finally {
      setAuthPending(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setAuthPending(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      setAuthError(describeAuthError(error));
    } finally {
      setAuthPending(false);
    }
  };

  const handleSignOut = async () => {
    setAuthError('');
    await signOut(auth);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 overflow-y-auto"
    >
      <div className="bg-[#F6F3E9] border-2 border-[#22251F] rounded max-w-lg w-full p-6 sm:p-7 relative my-8 space-y-5">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#D8D5CA]">
          <div>
            <span className="text-xs font-mono uppercase text-[#173D2C] font-semibold">
              DRIVER & HOST SESSION ACCOUNT
            </span>
            <h2 id="signin-modal-title" className="text-xl font-bold font-display text-[#22251F] mt-1">
              {currentUser ? `Signed in as ${displayName}` : 'Sign in to manage bookings'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in dialog"
            className="p-1.5 rounded border border-[#D8D5CA] text-[#22251F] hover:bg-[#EDE8D8] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!currentUser ? (
          <div className="space-y-4 text-xs">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={authPending}
              className="w-full py-2.5 px-4 font-semibold text-[#22251F] bg-white border border-[#D8D5CA] rounded hover:bg-[#EDE8D8] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              Continue with Google
            </button>

            <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-[#565A52]">
              <span className="h-px flex-1 bg-[#D8D5CA]" />
              <span>or</span>
              <span className="h-px flex-1 bg-[#D8D5CA]" />
            </div>

            <form onSubmit={handleEmailAuth} noValidate className="space-y-3">
              <div>
                <label htmlFor="signin-email" className="block font-semibold text-[#22251F] mb-1">
                  Email Address
                </label>
                <input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="driver@example.in"
                  className="w-full px-3 py-2.5 bg-white border border-[#D8D5CA] rounded text-[#22251F]"
                />
              </div>

              <div>
                <label htmlFor="signin-password" className="block font-semibold text-[#22251F] mb-1">
                  Password
                </label>
                <input
                  id="signin-password"
                  type="password"
                  autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2.5 bg-white border border-[#D8D5CA] rounded text-[#22251F]"
                />
              </div>

              {authError && <p className="text-[#B42318]">{authError}</p>}

              <button
                type="submit"
                disabled={authPending}
                className="w-full py-2.5 px-4 font-semibold text-[#173D2C] bg-[#D8F36A] border border-[#173D2C] rounded hover:bg-[#c9e854] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {authPending ? 'Please wait…' : authMode === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setAuthMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
                setAuthError('');
              }}
              className="text-[#173D2C] underline underline-offset-4 cursor-pointer"
            >
              {authMode === 'signup'
                ? 'Already have an account? Sign in'
                : 'New to ChargeShare? Create an account'}
            </button>
          </div>
        ) : (
          <div className="p-3.5 bg-[#173D2C] text-[#F6F3E9] rounded text-xs flex items-center justify-between gap-3">
            <span className="truncate">Signed in as {displayName}</span>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => { onClose(); onOpenEditProfile(); }}
                className="text-[#D8F36A] underline cursor-pointer"
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-[#D8F36A] underline cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Active Session Demo Bookings List */}
        <div className="pt-3 border-t border-[#D8D5CA] space-y-3">
          <div className="text-xs font-mono uppercase text-[#22251F] font-semibold">
            Your Reserved Demo Slots ({confirmedBookings.length})
          </div>
          {confirmedBookings.length === 0 ? (
            <p className="text-xs text-[#565A52] bg-white border border-[#D8D5CA] p-4 rounded">
              You have not reserved any demo slots in this session yet. Select any charger in the discovery
              map to test reserving a time window.
            </p>
          ) : (
            <div className="space-y-2.5">
              {confirmedBookings.map((b) => (
                <div
                  key={b.bookingId}
                  className="p-3.5 bg-white border border-[#D8D5CA] rounded text-xs flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold text-[#22251F]">{b.chargerTitle}</div>
                    <div className="text-[#565A52]">
                      {b.slotWindow} · {b.estimatedKwh} kWh · Est. ₹{b.estimatedTotalInr}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCancelBooking(b.bookingId)}
                    aria-label={`Cancel reservation ${b.bookingId}`}
                    className="p-1.5 text-[#B42318] hover:bg-[#FEE4E2] rounded cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface InfoPolicyModalProps {
  topic: 'support' | 'terms' | null;
  onClose: () => void;
}

export const InfoPolicyModal: React.FC<InfoPolicyModalProps> = ({ topic, onClose }) => {
  if (!topic) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="policy-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 overflow-y-auto"
    >
      <div className="bg-[#F6F3E9] border-2 border-[#22251F] rounded max-w-lg w-full p-6 sm:p-7 relative my-8 space-y-4">
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#D8D5CA]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#173D2C]" />
            <h2 id="policy-modal-title" className="text-lg font-bold font-display text-[#22251F]">
              {topic === 'support'
                ? 'ChargeShare Help & Support'
                : 'Terms of Use & Privacy Notice (MVP Demo)'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close information dialog"
            className="p-1.5 rounded border border-[#D8D5CA] text-[#22251F] hover:bg-[#EDE8D8] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {topic === 'support' ? (
          <div className="space-y-3 text-xs text-[#3D423A] leading-relaxed">
            <p>
              <strong>How do I verify connector compatibility?</strong> Every listing specifies whether it
              offers a tethered Type 2 AC cable, a 15A 3-pin industrial socket (where you bring your portable
              charger), Bharat AC001, or CCS2 DC.
            </p>
            <p>
              <strong>What if I live in a gated apartment society?</strong> Hosts in apartment complexes
              should obtain Resident Welfare Association (RWA) permission before listing a stilt or visitor
              parking bay, and include gate entry instructions in their listing notes.
            </p>
            <p>
              <strong>Support Contact:</strong> For marketplace inquiries or issue reports, reach the
              ChargeShare operations desk at <span className="font-mono">support@chargeshare.in</span>.
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-[#3D423A] leading-relaxed">
            <p>
              <strong>1. MVP Demonstration Scope:</strong> This web application demonstrates ChargeShare’s
              peer-to-peer EV charger discovery, slot reservation, and host earnings estimation workflows.
              Listings, bookings, and proceeds displayed on this landing page are simulated for demonstration.
            </p>
            <p>
              <strong>2. Electrical & Site Safety Responsibility:</strong> Hosts and drivers are solely
              responsible for verifying that charging equipment, earthing, circuit protection (MCB/RCCB), and
              parking bays meet applicable electrical and property safety standards.
            </p>
            <p>
              <strong>3. Data Privacy:</strong> Any sample inputs entered into the discovery filter, slot
              booking form, or earnings calculator remain in your local browser session.
            </p>
          </div>
        )}

        <div className="pt-3 border-t border-[#D8D5CA] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#F6F3E9] bg-[#173D2C] rounded cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
