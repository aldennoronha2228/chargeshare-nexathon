/**
 * FindChargersPage — the dedicated `/find-chargers` route (mobile-first redesign).
 *
 * This is the single charger-discovery page in the app. It reuses the existing
 * pieces rather than duplicating them:
 *   • filterChargers() / sortChargers()  → src/utils/marketplaceLogic.ts
 *   • chargerLatLng()                    → src/utils/geoUtils.ts
 *   • <ChargerMap>                       → interactive MapLibre map (markers, popups, Locate Me)
 *   • <ChargerThumbPlate>                → the illustration used when a listing has no photo
 *   • <ProfileMenu>                      → the existing Firebase-backed account control
 *   • onOpenDetail                       → the existing ChargerDetailDrawer / booking flow
 *
 * Listings and booking actions are connected to provider records and Firestore.
 * Optional listing details remain absent until a provider supplies them.
 */

import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import './FindChargersPage.css';
import {
  Activity,
  AlertCircle,
  Bell,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  Compass,
  Heart,
  House,
  Navigation,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { ChargerListing, ConnectorType, IndianCity } from '../data/demoChargers';
import {
  filterChargers,
  sortChargers,
  type ChargerFilterCriteria,
  type SortKey,
} from '../utils/marketplaceLogic';
import { chargerLatLng } from '../utils/geoUtils';
import { ROUTES, navigateTo } from '../utils/appRoute';
import { ChargerThumbPlate } from './EditorialIllustrations';
import { ChargerMap } from './ChargerMap';
import { ProfileMenu, type ProfileMenuView } from './ProfileMenu';
import { LocationSelectionModal, type SelectedLocation } from './LocationSelectionModal';
import { getGatePin } from '../utils/userProfile';

// ─── Constants ────────────────────────────────────────────────────────────────

const CITIES: IndianCity[] = [
  'All Cities',
  'Bengaluru',
  'Pune',
  'Mumbai',
  'Delhi NCR',
  'Hyderabad',
  'Chennai',
];

const CONNECTORS: Array<ConnectorType | 'All Connectors'> = [
  'All Connectors',
  'Type 2 AC',
  'Bharat AC001',
  '15A 3-Pin Socket',
  'CCS2 DC',
];

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'distance', label: 'Nearest first' },
  { key: 'price', label: 'Lowest price' },
  { key: 'speed', label: 'Fastest charger' },
  { key: 'rating', label: 'Top rated' },
];

const DEFAULT_FILTERS: ChargerFilterCriteria = {
  searchQuery: '',
  city: 'All Cities',
  connector: 'All Connectors',
  maxPricePerKwh: 40,
  minPowerKw: 0,
  maxDistanceKm: 25,
  availableNowOnly: false,
};

/** Cards shown before the "View all" action is used. */
const INITIAL_VISIBLE = 3;

/** Favourites live on the device only — the user model has no favourites collection. */
const FAVOURITES_STORAGE_PREFIX = 'chargeshare:favourites';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Required display fields — used to surface records that are missing data. */
function getMissingFields(c: ChargerListing): string[] {
  const required: Array<keyof ChargerListing> = [
    'id', 'title', 'locality', 'city', 'connector', 'powerKw', 'pricePerKwh',
  ];
  return required.filter((k) => c[k] === undefined || c[k] === null || c[k] === '');
}

/** Directions deep-link built from the listing's real, parsed coordinates. */
function directionsUrl(charger: ChargerListing): string | null {
  const pos = chargerLatLng(charger);
  if (!pos) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${pos.lat},${pos.lng}`;
}

/**
 * Amenity tags derived from fields that actually exist on the record
 * (parkingType / accessNotes). Nothing is invented — a tag is only shown
 * when the underlying text mentions it.
 */
function amenitiesOf(charger: ChargerListing): string[] {
  const tags: string[] = [];
  const parking = (charger.parkingType ?? '').trim();
  const notes = (charger.accessNotes ?? '').toLowerCase();

  if (parking) tags.push(parking.length > 24 ? `${parking.slice(0, 22)}…` : parking);
  if (/watchman|guard|security|rwa/.test(notes)) tags.push('Security');
  if (/covered|stilt|canopy|carport|indoor/.test(`${parking} ${notes}`.toLowerCase())) tags.push('Covered');

  return Array.from(new Set(tags)).slice(0, 3);
}

/** The next bookable window, or the host-supplied availability line. */
function availabilityValue(charger: ChargerListing): string {
  const nextSlot = charger.slots?.find((slot) => slot.available);
  return (
    nextSlot?.window ??
    charger.availabilityLabel ??
    (charger.availableNow ? 'Accepting requests' : 'Paused by host')
  );
}

function tariffLabel(charger: ChargerListing): string {
  return `₹${charger.pricePerKwh}/${charger.pricingType === 'per_session' ? 'session' : 'kWh'}`;
}

function distanceLabel(charger: ChargerListing): string {
  return charger.distanceKm === null ? 'Distance unavailable' : `${charger.distanceKm} km`;
}

function readFavourites(storageKey: string): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Device-local favourites so the bookmark control does something real. */
function useFavourites(uid: string | null) {
  const storageKey = `${FAVOURITES_STORAGE_PREFIX}:${uid ?? 'guest'}`;
  const [ids, setIds] = useState<string[]>(() => readFavourites(storageKey));

  // Re-read when the signed-in account changes
  useEffect(() => {
    setIds(readFavourites(storageKey));
  }, [storageKey]);

  const toggle = useCallback(
    (id: string) => {
      setIds((prev) => {
        const next = prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id];
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* Storage unavailable (private mode) — the toggle still works for this session. */
        }
        return next;
      });
    },
    [storageKey],
  );

  return { favouriteIds: ids, toggleFavourite: toggle };
}

// ─── Small building blocks ────────────────────────────────────────────────────

const SpecTile: React.FC<{ label: string; value: string; compact?: boolean }> = ({
  label,
  value,
  compact,
}) => (
  <div className="min-w-0 rounded-xl border border-[#D8D5CA] bg-[#EDE8D8] px-2 py-2">
    <div className="font-mono text-[9px] font-bold uppercase tracking-wide text-[#565A52]">
      {label}
    </div>
    <div
      className={`mt-0.5 font-bold text-[#22251F] ${
        compact ? 'text-[11px] leading-tight line-clamp-2' : 'text-[13px] truncate'
      }`}
    >
      {value}
    </div>
  </div>
);

const AvailabilityBadge: React.FC<{ available: boolean; className?: string }> = ({
  available,
  className = '',
}) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wide ${
      available ? 'bg-[#F6F3F2] text-[#1C1B1B]' : 'bg-[#F6F3F2] text-[#5E5F5C]'
    } ${className}`}
  >
    <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${available ? 'bg-emerald-600' : 'bg-[#9A9A96]'}`} />
    {available ? 'Accepting requests' : 'Paused'}
  </span>
);

const FavouriteButton: React.FC<{
  active: boolean;
  label: string;
  onToggle: () => void;
  className?: string;
  size?: 'sm' | 'md';
}> = ({ active, label, onToggle, className = '', size = 'md' }) => (
  <button
    type="button"
    aria-pressed={active}
    aria-label={active ? `Remove ${label} from favourites` : `Save ${label} to favourites`}
    title={active ? 'Remove from favourites' : 'Save to favourites'}
    onClick={(event) => {
      event.stopPropagation();
      onToggle();
    }}
    className={`inline-flex shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C] ${
      size === 'md' ? 'h-9 w-9' : 'h-8 w-8'
    } ${
      active
        ? 'border-[#173D2C] bg-[#173D2C] text-[#D8F36A]'
        : 'border-[#D8D5CA] bg-white/90 text-[#565A52] hover:border-[#173D2C] hover:text-[#173D2C]'
    } ${className}`}
  >
    <Heart className={`${size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} ${active ? 'fill-current' : ''}`} />
  </button>
);

/** Small pill used for both the quick-filter chips and the active-filter chips. */
const Chip: React.FC<{
  label: string;
  active?: boolean;
  onClick: () => void;
  onClear?: () => void;
  leading?: React.ReactNode;
}> = ({ label, active, onClick, onClear, leading }) => (
  <span
    className={`cs-quick-filter inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
      active
        ? 'border-[#173D2C] bg-[#173D2C] text-[#D8F36A]'
        : 'border-[#D8D5CA] bg-white text-[#22251F] hover:border-[#173D2C]'
    }`}
  >
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
    >
      {leading}
      {label}
    </button>
    {active && onClear && (
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear filter ${label}`}
        className="cursor-pointer text-[#D8F36A] hover:text-white"
      >
        <X className="h-3 w-3" />
      </button>
    )}
  </span>
);

const FilterSelect: React.FC<{
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}> = ({ label, id, value, onChange, options }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block font-semibold text-[#22251F]">
      {label}
    </label>
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-[#D8D5CA] bg-white py-2 pl-3 pr-8 text-xs text-[#22251F] focus:border-[#173D2C] focus:outline-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#888]" />
    </div>
  </div>
);

// ─── Charger cards ────────────────────────────────────────────────────────────

interface CardProps {
  charger: ChargerListing;
  isFavourite: boolean;
  isSelected: boolean;
  onToggleFavourite: () => void;
  onOpenDetails: () => void;
}

/** Primary, information-dense card for the closest / first result. */
const PrimaryChargerCard: React.FC<CardProps> = ({
  charger,
  isFavourite,
  isSelected,
  onToggleFavourite,
  onOpenDetails,
}) => {
  const missing = getMissingFields(charger);
  const directions = directionsUrl(charger);

  return (
    <article
      className={`cs-charger-card cs-charger-card--primary rounded-xl border bg-white transition-shadow ${
        isSelected ? 'border-black ring-1 ring-black/10' : 'border-[#E5E2E1]'
      }`}
      aria-label={`${charger.title}, ${charger.powerKw} kW ${charger.connector}, ${tariffLabel(charger)}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#E5E2E1] px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] text-[#5E5F5C]">
          <span className="rounded bg-black px-2 py-1 font-label-caps text-[10px] font-semibold uppercase tracking-wider text-white">Featured bay</span>
          <span className="font-mono">#{charger.id.slice(-3)}</span>
        </div>
        <AvailabilityBadge available={charger.availableNow} className="!bg-transparent !px-0 !text-[#1C1B1B]" />
      </div>

      <div className="space-y-3.5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#E5E2E1] bg-[#F6F3F2]">
              {charger.photoUrl ? <img src={charger.photoUrl} alt={`${charger.title} charger`} className="h-full w-full object-cover" /> : <ChargerThumbPlate theme={charger.visualTheme ?? 'driveway-canopy'} powerKw={charger.powerKw ?? 0} connector={charger.connector ?? ''} />}
              <span className="absolute bottom-0 right-0 rounded-tl bg-black/80 px-1 text-[8px] font-mono font-bold text-white">{charger.powerKw}kW</span>
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display text-sm font-bold leading-snug text-[#1C1B1B]">
                {charger.title || <span className="italic text-[#888]">Unnamed charger</span>}
              </h3>
              <p className="mt-0.5 truncate text-[11px] text-[#5E5F5C]">
                {[charger.locality, charger.distanceKm === null ? '' : `${charger.distanceKm} km`].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-0.5 truncate font-label-caps text-[9px] uppercase tracking-wider text-[#747878]">{charger.hostName}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="block font-display text-base font-bold tracking-tight text-[#1C1B1B]">₹{charger.pricePerKwh}</span>
            <span className="font-label-caps text-[9px] uppercase tracking-wider text-[#747878]">{charger.pricingType === 'per_session' ? 'per session' : 'per kWh'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#5E5F5C]">
          {charger.rating > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-current text-[#1C1B1B]" />
              <span className="font-mono font-bold text-[#1C1B1B]">{charger.rating.toFixed(1)}</span>
            </span>
          )}
          <span className="truncate">{charger.reviewCount ? `${charger.reviewCount} reviews` : 'No reviews yet'}</span>
          <span className="ml-auto inline-flex items-center gap-1">
            <FavouriteButton active={isFavourite} label={charger.title} onToggle={onToggleFavourite} size="sm" />
          </span>
        </div>

        <div className="grid grid-cols-3 divide-x divide-[#E5E2E1] rounded-lg border border-[#E5E2E1] bg-[#F6F3F2] py-2.5">
          <div className="px-2.5"><div className="font-label-caps text-[9px] uppercase tracking-wider text-[#5E5F5C]">Max speed</div><div className="mt-1 font-mono text-xs font-semibold text-[#1C1B1B]">{charger.powerKw} kW</div><div className="text-[10px] text-[#747878]">{charger.connector}</div></div>
          <div className="px-2.5"><div className="font-label-caps text-[9px] uppercase tracking-wider text-[#5E5F5C]">Tariff</div><div className="mt-1 font-mono text-xs font-semibold text-[#1C1B1B]">{tariffLabel(charger)}</div><div className="text-[10px] text-[#747878]">Provider set</div></div>
          <div className="px-2.5"><div className="font-label-caps text-[9px] uppercase tracking-wider text-[#5E5F5C]">Status</div><div className="mt-1 truncate font-mono text-xs font-semibold text-[#1C1B1B]">{charger.availableNow ? 'Active' : 'Paused'}</div><div className="truncate text-[10px] text-[#747878]">{availabilityValue(charger)}</div></div>
        </div>

        <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-[#5E5F5C]">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#1C1B1B]" />
          <span className="truncate">{[charger.parkingType, charger.accessNotes].filter(Boolean).join(' · ')}</span>
        </div>

        <div className="grid grid-cols-[1fr_44px] gap-2">
          <button
            type="button"
            onClick={onOpenDetails}
            className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded bg-black px-4 text-[11px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#333] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            Book Slot &amp; Details
            <ChevronRight className="h-4 w-4" />
          </button>

          {directions ? (
            <a
              href={directions}
              target="_blank"
              rel="noreferrer"
              aria-label={`Get directions to ${charger.title}`}
              title="Get directions"
              className="inline-flex h-10 w-11 shrink-0 items-center justify-center rounded border border-[#E5E2E1] bg-white text-[#1C1B1B] transition-colors hover:border-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              <Navigation className="h-4 w-4" />
            </a>
          ) : (
            <span
              aria-hidden="true"
              title="Directions unavailable — no coordinates on this listing"
              className="inline-flex h-10 w-11 shrink-0 items-center justify-center rounded border border-[#E5E2E1] bg-[#F6F3F2] text-[#AAA]"
            >
              <Navigation className="h-4 w-4" />
            </span>
          )}
        </div>

        {missing.length > 0 && (
          <div className="flex items-start gap-1.5 rounded-xl border border-[#FEC84B] bg-[#FFFAEB] px-2.5 py-2 text-[11px] text-[#7A4F00]">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Missing: {missing.join(', ')}</span>
          </div>
        )}
      </div>
    </article>
  );
};

/** Standard compact card for the following results. */
const CompactChargerCard: React.FC<CardProps> = ({
  charger,
  isFavourite,
  isSelected,
  onToggleFavourite,
  onOpenDetails,
}) => {
  const amenities = amenitiesOf(charger);

  return (
    <article
      className={`cs-charger-card cs-charger-card--compact relative rounded-xl border bg-white p-3 transition-shadow ${
        isSelected ? 'border-[#173D2C] shadow-md ring-2 ring-[#D8F36A]' : 'border-[#D8D5CA] shadow-sm'
      }`}
    >
      <button
        type="button"
        onClick={onOpenDetails}
        className="flex w-full cursor-pointer gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
        aria-label={`View details for ${charger.title}`}
      >
        <span className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-[#173D2C]">
          {charger.photoUrl ? <img src={charger.photoUrl} alt={`${charger.title} charger`} className="h-full w-full object-cover" /> : <ChargerThumbPlate
            theme={charger.visualTheme ?? 'driveway-canopy'}
            powerKw={charger.powerKw ?? 0}
            connector={charger.connector ?? ''}
          />}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate pr-9 text-[13px] font-bold text-[#22251F]">
            {charger.title || 'Unnamed charger'}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-[#565A52]">
            {[charger.locality, charger.city].filter(Boolean).join(', ')}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] font-semibold text-[#173D2C]">
            <span>{tariffLabel(charger)}</span>
            <span aria-hidden="true" className="text-[#D8D5CA]">·</span>
            <span>{charger.powerKw} kW</span>
            <span aria-hidden="true" className="text-[#D8D5CA]">·</span>
            <span>{distanceLabel(charger)}</span>
          </span>
          <span className="mt-1 block truncate text-[11px] text-[#565A52]">{charger.connector}</span>
        </span>
      </button>

      <FavouriteButton
        active={isFavourite}
        label={charger.title}
        onToggle={onToggleFavourite}
        size="sm"
        className="absolute right-3 top-3"
      />

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <AvailabilityBadge available={charger.availableNow} />
        {amenities.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[#D8D5CA] bg-[#F6F3E9] px-2 py-0.5 text-[10px] font-semibold text-[#565A52]"
          >
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
};

/** Minimal horizontal row used for the remaining results. */
const MiniChargerRow: React.FC<CardProps> = ({
  charger,
  isFavourite,
  onToggleFavourite,
  onOpenDetails,
}) => {
  const directions = directionsUrl(charger);

  return (
    <div className="cs-charger-card cs-charger-card--mini flex items-center gap-2.5 rounded-xl border border-[#E5E2E1] bg-white p-2.5 shadow-sm">
      <button
        type="button"
        onClick={onOpenDetails}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
        aria-label={`View details for ${charger.title}`}
      >
        <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#173D2C]">
          {charger.photoUrl ? <img src={charger.photoUrl} alt={`${charger.title} charger`} className="h-full w-full object-cover" /> : <ChargerThumbPlate
            theme={charger.visualTheme ?? 'driveway-canopy'}
            powerKw={charger.powerKw ?? 0}
            connector={charger.connector ?? ''}
          />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-bold text-[#22251F]">
            {charger.title || 'Unnamed charger'}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-[#565A52]">
            {tariffLabel(charger)} · {charger.powerKw} kW · {distanceLabel(charger)}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1.5">
        <FavouriteButton
          active={isFavourite}
          label={charger.title}
          onToggle={onToggleFavourite}
          size="sm"
        />
        {directions && (
          <a
            href={directions}
            target="_blank"
            rel="noreferrer"
            aria-label={`Get directions to ${charger.title}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#D8D5CA] bg-white text-[#173D2C] transition-colors hover:border-[#173D2C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
          >
            <Navigation className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

interface FindChargersPageProps {
  chargers: ChargerListing[];
  chargersLoading: boolean;
  chargersError: string;
  /** Signed-in account — supplied by App so there is a single auth listener. */
  user: FirebaseUser | null;
  onOpenDetail: (charger: ChargerListing) => void;
  onOpenProfile: (view: ProfileMenuView) => void;
  /** Navigates to the dedicated bookings page. */
  onOpenBookings: () => void;
  /** Navigates to the dedicated activity page. */
  onOpenActivity: () => void;
  activeReservationCount: number;
}

export const FindChargersPage: React.FC<FindChargersPageProps> = ({
  chargers,
  chargersLoading,
  chargersError,
  user,
  onOpenDetail,
  onOpenProfile,
  onOpenBookings,
  onOpenActivity,
  activeReservationCount,
}) => {
  const [filters, setFilters] = useState<ChargerFilterCriteria>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortKey>('distance');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDialogOpen, setLocationDialogOpen] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [focusLocation, setFocusLocation] = useState<{ lat: number; lng: number; zoom: number }>();

  const notifRef = useRef<HTMLDivElement>(null);
  const mapSectionRef = useRef<HTMLElement>(null);

  const { favouriteIds, toggleFavourite } = useFavourites(user?.uid ?? null);


  // This route can inherit the landing page's old scroll position on navigation.
  // Start at the top so the client hero/search panel is visible on every entry.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Keep typing responsive while filtering over the full list
  const deferredQuery = useDeferredValue(filters.searchQuery);
  const effectiveFilters = useMemo(
    () => ({ ...filters, searchQuery: deferredQuery }),
    [filters, deferredQuery],
  );

  const chargersWithDistance = useMemo(() => chargers.map((charger) => {
    if (!userLocation) return { ...charger, distanceKm: null };
    const position = chargerLatLng(charger);
    if (!position) return { ...charger, distanceKm: null };
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    const dLat = radians(position.lat - userLocation.lat);
    const dLng = radians(position.lng - userLocation.lng);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(radians(userLocation.lat)) * Math.cos(radians(position.lat)) * Math.sin(dLng / 2) ** 2;
    const distanceKm = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
    return { ...charger, distanceKm };
  }), [chargers, userLocation]);

  const results = useMemo(
    () => sortChargers(filterChargers(chargersWithDistance, effectiveFilters), sortBy),
    [chargersWithDistance, effectiveFilters, sortBy],
  );

  const patch = useCallback(
    <K extends keyof ChargerFilterCriteria>(key: K, value: ChargerFilterCriteria[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS, searchQuery: selectedLocation?.area ?? '' });
    setSortBy('distance');
  }, [selectedLocation]);

  const isDefaultFilters = useMemo(
    () =>
      filters.city === 'All Cities' &&
      filters.connector === 'All Connectors' &&
      filters.maxPricePerKwh === DEFAULT_FILTERS.maxPricePerKwh &&
      filters.minPowerKw === DEFAULT_FILTERS.minPowerKw &&
      filters.maxDistanceKm === DEFAULT_FILTERS.maxDistanceKm &&
      !filters.availableNowOnly &&
      sortBy === 'distance',
    [filters, sortBy],
  );

  // Close the notifications popover on an outside tap
  useEffect(() => {
    if (!notifOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [notifOpen]);

  const locationLabel = useMemo(() => {
    if (selectedLocation) return [selectedLocation.area, selectedLocation.city, selectedLocation.state, selectedLocation.country].filter(Boolean).join(', ');
    if (filters.city !== 'All Cities') return filters.city;
    const query = filters.searchQuery.trim();
    if (query) return query;
    return 'All of India';
  }, [filters.city, filters.searchQuery, selectedLocation]);

  const handleLocationSubmit = useCallback(async (location: SelectedLocation) => {
    setSelectedLocation(location);
    // The chooser resolves an area/neighbourhood point, so bring it into a
    // street-level view instead of leaving the map at a broad city zoom.
    setFocusLocation({
      lat: location.latitude,
      lng: location.longitude,
      zoom: location.area.trim() ? 15.5 : 13.5,
    });
    setSelectedId(null);
    setFilters((previous) => ({ ...previous, searchQuery: location.area.trim() || location.city }));
    setSortBy('distance');
    setView('map');
    setLocationDialogOpen(false);
    window.setTimeout(() => mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }, []);

  const handleSelect = useCallback((charger: ChargerListing) => {
    setSelectedId(charger.id);
  }, []);

  const handleOpenDetails = useCallback(
    (charger: ChargerListing) => {
      setSelectedId(charger.id);
      onOpenDetail(charger);
    },
    [onOpenDetail],
  );

  const toggleConnector = useCallback(
    (connector: ConnectorType) => {
      setFilters((prev) => ({
        ...prev,
        connector: prev.connector === connector ? 'All Connectors' : connector,
      }));
    },
    [],
  );

  // ── Derived summary (real aggregates over the filtered results) ─────────────
  const summary = useMemo(() => {
    const availableCount = results.filter((c) => c.availableNow).length;
    const prices = results.map((c) => c.pricePerKwh).filter((p) => Number.isFinite(p) && p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
    const averagePrice = prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : null;
    const hosts = new Set(results.map((c) => c.providerId).filter(Boolean)).size;
    return { availableCount, minPrice, maxPrice, averagePrice, hosts };
  }, [results]);

  const visibleResults = showAll ? results : results.slice(0, INITIAL_VISIBLE);
  const [primaryCharger, ...secondaryChargers] = visibleResults;
  const compactChargers = secondaryChargers.slice(0, 2);
  const miniChargers = secondaryChargers.slice(2);

  const cardProps = (charger: ChargerListing): CardProps => ({
    charger,
    isFavourite: favouriteIds.includes(charger.id),
    isSelected: selectedId === charger.id,
    onToggleFavourite: () => toggleFavourite(charger.id),
    onOpenDetails: () => handleOpenDetails(charger),
  });

  const goHome = () => navigateTo(ROUTES.landing);

  const hasUnread = activeReservationCount > 0;

  return (
    <div className="find-chargers-page min-h-screen bg-[#FCF9F8] pb-24 md:pb-12">
      {/* ── Compact top navigation ─────────────────────────────────────────── */}
      <header className="find-chargers-topbar sticky top-0 z-40 border-b border-[#D8D5CA] bg-[#F6F3E9]/95 backdrop-blur">
        <div className="find-chargers-topbar__inner mx-auto flex max-w-[1360px] flex-nowrap items-center gap-x-1.5 px-2 py-2 sm:gap-x-3 sm:px-6">
          <button
            type="button"
            onClick={goHome}
            aria-label="ChargeShare home"
            className="find-chargers-brand inline-flex shrink-0 items-center rounded px-1 py-1.5 text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span className="whitespace-nowrap font-display text-[12px] font-bold tracking-[0.1em] max-[360px]:text-[10px] sm:text-[13px] sm:tracking-[0.16em]">CHARGESHARE</span>
          </button>
          <span className="find-chargers-mode shrink-0 rounded border border-white/15 bg-white/10 px-1.5 py-1 font-label-caps text-[8px] font-semibold uppercase tracking-wider text-white/85 sm:px-2 sm:text-[9px] sm:tracking-widest">
            Client
          </span>
          <button
            type="button"
            onClick={goHome}
            aria-label="Home"
            title="Home"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white max-[360px]:h-8 max-[360px]:w-8 max-[360px]:justify-center max-[360px]:p-0 sm:gap-1.5 sm:px-3 sm:py-2 sm:text-[10px]"
          >
            <House className="h-3.5 w-3.5 shrink-0" />
            <span className="max-[360px]:hidden">Home</span>
          </button>

          <div className="hidden md:block md:flex-1">
            <nav aria-label="Client navigation" className="mx-auto flex w-max items-center gap-1 rounded-full border border-white/10 bg-[#1C1C1C] p-1 md:mx-auto">
              <button
                type="button"
                aria-current="page"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-black transition-colors sm:text-[10px]"
              >
                <Compass className="h-3.5 w-3.5" />
                Explore
              </button>
              <button
                type="button"
                onClick={onOpenActivity}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[9px] font-semibold uppercase tracking-wide text-white/75 transition-colors hover:bg-white/10 hover:text-white sm:text-[10px]"
              >
                <CalendarCheck className="h-3.5 w-3.5" />
                Bookings
              </button>
              <button
                type="button"
                onClick={onOpenBookings}
                title="Recent booking activity"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[9px] font-semibold uppercase tracking-wide text-white/75 transition-colors hover:bg-white/10 hover:text-white sm:text-[10px]"
              >
                <Activity className="h-3.5 w-3.5" />
                Activity
              </button>
              <button
                type="button"
                onClick={() => onOpenProfile('view')}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[9px] font-semibold uppercase tracking-wide text-white/75 transition-colors hover:bg-white/10 hover:text-white sm:text-[10px]"
              >
                <UserRound className="h-3.5 w-3.5" />
                Profile
              </button>
            </nav>
          </div>

          {/* Notifications — shows real session state, never a fabricated count */}
          <div ref={notifRef} className="relative ml-auto shrink-0 md:ml-0">
            <button
              type="button"
              onClick={() => setNotifOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={notifOpen}
              aria-label={hasUnread ? `Notifications, ${activeReservationCount} unread` : 'Notifications'}
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#D8D5CA] bg-white text-[#22251F] transition-colors hover:border-[#173D2C] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C] sm:h-9 sm:w-9"
            >
              <Bell className="h-4 w-4" />
              {hasUnread && (
                <span
                  aria-hidden="true"
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-white bg-[#B42318]"
                />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-[#D8D5CA] bg-[#F6F3E9] p-3 shadow-xl">
                <p className="font-display text-[13px] font-bold text-[#22251F]">Notifications</p>
                {hasUnread ? (
                  <>
                    <p className="mt-1.5 text-[12px] text-[#565A52]">
                      You have {activeReservationCount} confirmed booking
                      {activeReservationCount !== 1 ? 's' : ''}.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        onOpenBookings();
                      }}
                      className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#173D2C] bg-[#D8F36A] px-3 py-2 text-[12px] font-bold text-[#173D2C] transition-colors hover:bg-[#c9e854] cursor-pointer"
                    >
                      View bookings
                    </button>
                  </>
                ) : (
                  <p className="mt-1.5 text-[12px] text-[#565A52]">
                    No new notifications. Booking updates will appear here.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Profile — reuses the existing Firebase-backed menu */}
          {user && <ProfileMenu user={user} onOpenProfile={onOpenProfile} align="right" />}
        </div>
      </header>

      {locationDialogOpen && <LocationSelectionModal onSubmit={handleLocationSubmit} />}

      {/* ── Location search + filter chips ─────────────────────────────────── */}
      {user && (
        <div className="mx-auto w-full max-w-[1360px] px-3 pt-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#D5D5D5] bg-white px-4 py-2.5 text-black">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#666]">Your fixed client code</span>
            <span className="font-mono text-sm font-bold tracking-[0.16em]">{getGatePin(user.uid)}</span>
          </div>
        </div>
      )}

      <section className="find-chargers-hero mx-auto max-w-[1360px] px-3 pt-4 sm:px-6" aria-label="Search and filters">
        <div className="find-chargers-hero__heading flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-[1.35rem] font-bold leading-tight tracking-tight text-white">Find a Private Charger</h1>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-white/60"><span className="text-white/90">{locationLabel}</span><span>·</span><span>{summary.availableCount} bays available</span></p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 font-label-caps text-[9px] font-semibold uppercase tracking-wider text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Live grid</span>
        </div>
        <div className="find-chargers-search-row mt-4 flex items-center gap-2">
          <button type="button" onClick={() => setLocationDialogOpen(true)} className="inline-flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[#D8D5CA] bg-white px-4 text-left text-sm text-[#22251F] hover:border-[#173D2C]">
            <Navigation className="h-4 w-4 shrink-0 text-[#173D2C]" />
            <span className="min-w-0 flex-1 truncate">{locationLabel}</span>
            <span className="shrink-0 text-xs font-semibold text-[#173D2C]">Change area</span>
          </button>

          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            aria-expanded={filtersOpen}
            aria-controls="find-chargers-filters"
            aria-label="Open advanced filters"
            className={`relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C] ${
              filtersOpen
                ? 'border-[#173D2C] bg-[#173D2C] text-[#D8F36A]'
                : 'border-[#D8D5CA] bg-white text-[#22251F] hover:border-[#173D2C]'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {!isDefaultFilters && (
              <span aria-hidden="true" className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#D8F36A] ring-2 ring-[#173D2C]" />
            )}
          </button>
        </div>

        {/* Quick-filter chips — horizontally scrollable, combinable and clearable */}
        <div
          className="find-chargers-quick-filters mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Quick filters"
        >
          <Chip
            label="Available Now"
            active={filters.availableNowOnly}
            onClick={() => patch('availableNowOnly', !filters.availableNowOnly)}
          />
          <Chip
            label="Type-2 AC"
            active={filters.connector === 'Type 2 AC'}
            onClick={() => toggleConnector('Type 2 AC')}
          />
          <Chip
            label="CCS2 Fast"
            active={filters.connector === 'CCS2 DC'}
            onClick={() => toggleConnector('CCS2 DC')}
          />
          <Chip
            label="Price"
            leading={<span className="font-mono text-[11px]">₹</span>}
            active={filters.maxPricePerKwh < DEFAULT_FILTERS.maxPricePerKwh}
            onClick={() => setFiltersOpen(true)}
            onClear={() => patch('maxPricePerKwh', DEFAULT_FILTERS.maxPricePerKwh)}
          />
          <Chip
            label="Distance"
            active={filters.maxDistanceKm < DEFAULT_FILTERS.maxDistanceKm}
            onClick={() => setFiltersOpen(true)}
            onClear={() => patch('maxDistanceKm', DEFAULT_FILTERS.maxDistanceKm)}
          />
        </div>

        {/* Advanced filter panel */}
        {filtersOpen && (
          <div
            id="find-chargers-filters"
            role="group"
            aria-label="Charger filters"
            className="mt-3 space-y-5 rounded-2xl border border-[#D8D5CA] bg-white p-4 text-xs"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FilterSelect
                label="City"
                id="filter-city"
                value={filters.city}
                onChange={(v) => patch('city', v as IndianCity)}
                options={CITIES.map((c) => ({ value: c, label: c }))}
              />

              <FilterSelect
                label="Connector type"
                id="filter-connector"
                value={filters.connector}
                onChange={(v) => patch('connector', v as ConnectorType | 'All Connectors')}
                options={CONNECTORS.map((c) => ({ value: c, label: c }))}
              />

              <div className="space-y-1.5">
                <label htmlFor="filter-price" className="block font-semibold text-[#22251F]">
                  Max price
                  <span className="ml-1.5 font-mono text-[#173D2C]">₹{filters.maxPricePerKwh}/kWh</span>
                </label>
                <input
                  id="filter-price"
                  type="range"
                  className="cs-slider w-full"
                  disabled={!userLocation}
                  min={5}
                  max={40}
                  step={1}
                  value={filters.maxPricePerKwh}
                  onChange={(e) => patch('maxPricePerKwh', Number(e.target.value))}
                  aria-valuemin={5}
                  aria-valuemax={40}
                  aria-valuenow={filters.maxPricePerKwh}
                  aria-valuetext={`₹${filters.maxPricePerKwh} per kWh`}
                />
                {!userLocation && <p className="text-[10px] text-[#747878]">Use “Locate me” on the map to enable distance sorting and filtering.</p>}
                <div className="flex justify-between font-mono text-[10px] text-[#888]">
                  <span>₹5</span>
                  <span>₹40</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="filter-distance" className="block font-semibold text-[#22251F]">
                  Max distance
                  <span className="ml-1.5 font-mono text-[#173D2C]">
                    {filters.maxDistanceKm >= DEFAULT_FILTERS.maxDistanceKm
                      ? 'Any'
                      : `${filters.maxDistanceKm} km`}
                  </span>
                </label>
                <input
                  id="filter-distance"
                  type="range"
                  className="cs-slider w-full"
                  min={0.5}
                  max={25}
                  step={0.5}
                  value={filters.maxDistanceKm}
                  onChange={(e) => patch('maxDistanceKm', Number(e.target.value))}
                  aria-valuemin={0.5}
                  aria-valuemax={25}
                  aria-valuenow={filters.maxDistanceKm}
                  aria-valuetext={
                    filters.maxDistanceKm >= DEFAULT_FILTERS.maxDistanceKm
                      ? 'Any distance'
                      : `${filters.maxDistanceKm} km`
                  }
                />
                <div className="flex justify-between font-mono text-[10px] text-[#888]">
                  <span>0.5 km</span>
                  <span>Any</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="filter-power" className="block font-semibold text-[#22251F]">
                  Min charging speed
                  <span className="ml-1.5 font-mono text-[#173D2C]">
                    {filters.minPowerKw === 0 ? 'Any' : `≥${filters.minPowerKw} kW`}
                  </span>
                </label>
                <input
                  id="filter-power"
                  type="range"
                  className="cs-slider w-full"
                  min={0}
                  max={22}
                  step={1}
                  value={filters.minPowerKw}
                  onChange={(e) => patch('minPowerKw', Number(e.target.value))}
                  aria-valuemin={0}
                  aria-valuemax={22}
                  aria-valuenow={filters.minPowerKw}
                  aria-valuetext={
                    filters.minPowerKw === 0 ? 'Any speed' : `At least ${filters.minPowerKw} kW`
                  }
                />
                <div className="flex justify-between font-mono text-[10px] text-[#888]">
                  <span>Any</span>
                  <span>22 kW</span>
                </div>
              </div>

              <FilterSelect
                label="Sort by"
                id="filter-sort"
                value={sortBy}
                onChange={(v) => setSortBy(v as SortKey)}
                options={SORT_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
              />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={filters.availableNowOnly}
                  aria-label="Active listings only"
                  onClick={() => patch('availableNowOnly', !filters.availableNowOnly)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors focus-visible:outline-2 focus-visible:outline-[#173D2C] ${
                    filters.availableNowOnly
                      ? 'border-[#173D2C] bg-[#173D2C]'
                      : 'border-[#D8D5CA] bg-[#EDE8D8]'
                  }`}
                >
                  <span
                    className={`pointer-events-none mt-0.5 block h-4 w-4 rounded-full transition-transform ${
                      filters.availableNowOnly
                        ? 'translate-x-5 bg-[#D8F36A]'
                        : 'translate-x-0.5 bg-[#888]'
                    }`}
                  />
                </button>
                <span className="font-semibold text-[#22251F]">Active listings only</span>
              </div>
            </div>

            {(filters.searchQuery || !isDefaultFilters) && (
              <div className="flex justify-end border-t border-[#EDE8D8] pt-3">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#173D2C] underline-offset-4 hover:underline cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset all filters
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="find-chargers-desktop-layout">
      {/* ── Map ─────────────────────────────────────────────────────────────── */}
      <section ref={mapSectionRef} className="find-chargers-map-section mx-auto max-w-[1360px] px-3 pt-4 sm:px-6" aria-label="Charger map">
        <div className="find-chargers-map-heading mb-0 flex items-center justify-between gap-2 rounded-t-xl border border-[#E5E2E1] bg-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="font-label-caps text-[10px] font-semibold uppercase tracking-wider text-black">Grid view</span>
            <span className="truncate text-[11px] text-[#5E5F5C]">{locationLabel}{selectedId ? ' · 1 selected' : ''}</span>
          </div>
        </div>

        <ChargerMap
          chargers={results}
          focusLocation={focusLocation}
          onUserLocation={setUserLocation}
          selectedChargerId={selectedId}
          onSelectCharger={handleSelect}
          onViewDetails={handleOpenDetails}
          className={
            view === 'map'
              ? 'h-[440px] sm:h-[540px] lg:h-[560px]'
              : 'h-[300px] sm:h-[360px] lg:h-[420px]'
          }
        />
      </section>

      <section className="find-chargers-results mx-auto max-w-[1360px] px-3 pt-5 sm:px-6">
        {/* ── Nearby Chargers header ───────────────────────────────────────── */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5E5F5C]">
                Nearby Chargers
              </h2>
              <span
                aria-label={`${results.length} chargers`}
                className="font-mono text-xs text-[#5E5F5C]"
              >
                {results.length}
              </span>
            </div>
            <p className="sr-only">{locationLabel} · {summary.hosts} hosts · {isDefaultFilters ? 'nearest first' : `sorted by ${sortBy}`}</p>
          </div>

        </div>

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {chargersLoading ? (
          <p role="status" className="py-12 text-center text-sm text-[#565A52]">Loading live provider listings…</p>
        ) : chargersError ? (
          <p role="alert" className="py-12 text-center text-sm text-[#B42318]">Could not load provider listings: {chargersError}</p>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#D8D5CA] bg-[#EDE8D8]">
              <Search className="h-6 w-6 text-[#888]" />
            </div>
            <div>
              <p className="font-display text-base font-bold text-[#22251F]">No chargers found</p>
              <p className="mt-1 text-[13px] text-[#565A52]">
                {isDefaultFilters
                  ? 'No charger listings are available right now.'
                  : 'Try widening your filters or searching a different locality.'}
              </p>
            </div>
            {!isDefaultFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-[#173D2C] bg-[#D8F36A] px-4 py-2 text-[13px] font-bold text-[#173D2C] transition-colors hover:bg-[#c9e854] cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {primaryCharger && (
              <PrimaryChargerCard {...cardProps(primaryCharger)} />
            )}

            {compactChargers.map((charger) => (
              <CompactChargerCard key={charger.id} {...cardProps(charger)} />
            ))}

            {miniChargers.map((charger) => (
              <MiniChargerRow key={charger.id} {...cardProps(charger)} />
            ))}

            {!showAll && results.length > visibleResults.length && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="w-full cursor-pointer rounded-2xl border border-[#D8D5CA] bg-white py-3 text-[13px] font-bold text-[#173D2C] transition-colors hover:border-[#173D2C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
              >
                Show {results.length - visibleResults.length} more charger
                {results.length - visibleResults.length !== 1 ? 's' : ''}
              </button>
            )}

          </div>
        )}

        {/* ── Community availability banner (real aggregates only) ─────────── */}
        <div className="find-chargers-activity mt-5 rounded-xl border border-[#E5E2E1] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-label-caps text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5F5C]">Grid activity overview</span>
            <span className="truncate text-[11px] text-[#5E5F5C]">{locationLabel}</span>
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-[#E5E2E1]">
            <div className="pr-3"><span className="block font-display text-lg font-bold text-[#1C1B1B]">{results.length}</span><span className="font-label-caps text-[9px] uppercase tracking-wider text-[#5E5F5C]">Listed bays</span></div>
            <div className="px-3"><span className="block font-display text-lg font-bold text-[#1C1B1B]">{summary.availableCount}</span><span className="font-label-caps text-[9px] uppercase tracking-wider text-[#5E5F5C]">Accepting requests</span></div>
            <div className="pl-3"><span className="block font-display text-lg font-bold text-[#1C1B1B]">{summary.averagePrice === null ? '—' : `₹${summary.averagePrice.toFixed(1)}`}</span><span className="font-label-caps text-[9px] uppercase tracking-wider text-[#5E5F5C]">Avg tariff</span></div>
          </div>
        </div>
        <div className="py-6 text-center">
          <span className="block font-label-caps text-[9px] font-semibold uppercase tracking-[0.2em] text-[#747878]">ChargeShare · Explore Grid</span>
          <span className="mt-1 block text-[10px] text-[#747878]">Neighbourhood EV charging marketplace</span>
        </div>
      </section>
      <nav className="find-chargers-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-[#FCF9F8] pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Client navigation">
        <button type="button" aria-current="page" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex min-h-[58px] flex-col items-center justify-center gap-1 text-[#1C1B1B]">
          <Compass className="h-5 w-5" />
          <span className="font-label-caps text-[9px] font-semibold uppercase tracking-wide">Explore</span>
        </button>
        <button type="button" onClick={onOpenBookings} className="flex min-h-[58px] flex-col items-center justify-center gap-1 text-[#5E5F5C]">
          <CalendarCheck className="h-5 w-5" />
          <span className="font-label-caps text-[9px] font-medium uppercase tracking-wide">Bookings</span>
        </button>
        <button type="button" onClick={onOpenActivity} title="Recent booking activity" className="flex min-h-[58px] flex-col items-center justify-center gap-1 text-[#5E5F5C]">
          <Activity className="h-5 w-5" />
          <span className="font-label-caps text-[9px] font-medium uppercase tracking-wide">Activity</span>
        </button>
        <button type="button" onClick={() => onOpenProfile('view')} className="flex min-h-[58px] flex-col items-center justify-center gap-1 text-[#5E5F5C]">
          <UserRound className="h-5 w-5" />
          <span className="font-label-caps text-[9px] font-medium uppercase tracking-wide">Profile</span>
        </button>
      </nav>
      </div>
    </div>
  );
};
