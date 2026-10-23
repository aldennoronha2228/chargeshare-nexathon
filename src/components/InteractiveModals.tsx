import React, { useState } from 'react';
import { X, CheckCircle2, Trash2, Zap } from 'lucide-react';
import type { ChargerListing, ConnectorType, IndianCity } from '../data/demoChargers';
import { validateHostListingForm } from '../utils/marketplaceLogic';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#F6F3E9] border-2 border-[#22251F] rounded-lg max-w-lg w-full p-4 sm:p-7 relative my-auto max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#D8D5CA] shrink-0">
          <div>
            <h2 id="host-modal-title" className="text-lg sm:text-xl font-bold font-display text-[#22251F]">
              List your private EV charger on ChargeShare
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close host onboarding dialog"
            className="p-1.5 rounded border border-[#D8D5CA] text-[#22251F] hover:bg-[#EDE8D8] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto pr-1 py-1 flex-1">

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
    </div>
  );
};

interface SignInAndBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  confirmedBookings: ConfirmedDemoBooking[];
  onCancelBooking: (bookingId: string) => void;
}

export const SignInAndBookingsModal: React.FC<SignInAndBookingsModalProps> = ({
  isOpen,
  onClose,
  confirmedBookings,
  onCancelBooking,
}) => {
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [signedInUser, setSignedInUser] = useState<string | null>(null);
  const [authError, setAuthError] = useState('');

  if (!isOpen) return null;

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOrEmail || phoneOrEmail.trim().length < 4) {
      setAuthError('Enter your email or 10-digit Indian mobile number to sign in to the demo session.');
      return;
    }
    setAuthError('');
    setSignedInUser(phoneOrEmail.trim());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#F6F3E9] border-2 border-[#22251F] rounded-lg max-w-lg w-full p-4 sm:p-7 relative my-auto max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#D8D5CA] shrink-0">
          <div>
            <h2 id="signin-modal-title" className="text-lg sm:text-xl font-bold font-display text-[#22251F]">
              {signedInUser ? `Signed in as ${signedInUser}` : 'Sign in to manage bookings'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in dialog"
            className="p-1.5 rounded border border-[#D8D5CA] text-[#22251F] hover:bg-[#EDE8D8] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto pr-1 py-2 flex-1 space-y-4">

        {!signedInUser ? (
          <form onSubmit={handleSignIn} noValidate className="space-y-3 text-xs">
            <div>
              <label htmlFor="signin-identifier" className="block font-semibold text-[#22251F] mb-1">
                Mobile Number or Email Address
              </label>
              <input
                id="signin-identifier"
                type="text"
                value={phoneOrEmail}
                onChange={(e) => setPhoneOrEmail(e.target.value)}
                placeholder="e.g., +91 98450 12345 or driver@example.in"
                className="w-full px-3 py-2.5 bg-white border border-[#D8D5CA] rounded text-[#22251F]"
              />
              {authError && <p className="text-[#B42318] mt-1">{authError}</p>}
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 font-semibold text-[#173D2C] bg-[#D8F36A] border border-[#173D2C] rounded hover:bg-[#c9e854] cursor-pointer"
            >
              Continue with Demo Account
            </button>
          </form>
        ) : (
          <div className="p-3.5 bg-[#173D2C] text-[#F6F3E9] rounded text-xs flex items-center justify-between">
            <span>Active Demo Profile: {signedInUser}</span>
            <button
              type="button"
              onClick={() => setSignedInUser(null)}
              className="text-[#D8F36A] underline cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        )}

        {/* Active Session Demo Bookings List */}
        <div className="pt-3 border-t border-[#D8D5CA] space-y-3">
          <div className="text-sm font-bold font-display text-[#22251F]">
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#F6F3E9] border-2 border-[#22251F] rounded-lg max-w-lg w-full p-5 sm:p-7 relative my-auto max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#D8D5CA] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded bg-[#173D2C] p-1 inline-flex items-center justify-center shrink-0">
              <img
                src="/logo-square-lime.png"
                alt="ChargeShare logo mark"
                className="w-full h-full object-contain"
              />
            </span>
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
            className="p-1.5 rounded border border-[#D8D5CA] text-[#22251F] hover:bg-[#EDE8D8] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto pr-1 py-2 flex-1">

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
        </div>

        <div className="pt-3 border-t border-[#D8D5CA] flex justify-end shrink-0">
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
