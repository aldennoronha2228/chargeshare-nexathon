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
 * Data still comes from the same source as the rest of the app (App state seeded with
 * the existing listings), so no second search system or data collection is introduced.
 * Fields the model does not carry (photo, amenities, favourites, notifications) are
 * handled explicitly instead of being faked — see the comments at each usage site.
 */

import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  Bell,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  Compass,
  Heart,
  List,
  Map as MapIcon,
  MapPin,
  Navigation,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  UserRound,
  X,
  Zap,
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
    'id', 'title', 'locality', 'city', 'connector', 'powerKw', 'pricePerKwh', 'distanceKm',
  ];
  return required.filter((k) => c[k] === undefined || c[k] === null || c[k] === '');
}

/** The seed listings are simulated; the UI says so rather than implying live inventory. */
function isDevSeedRecord(c: ChargerListing): boolean {
  return /^cs-(blr|pun|mum|del|hyd|maa)-/.test(c.id);
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
    (charger.availableNow ? 'Available now' : 'Currently busy')
  );
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
      available ? 'bg-[#D8F36A] text-[#173D2C]' : 'bg-[#EDE8D8] text-[#565A52]'
    } ${className}`}
  >
    {available ? '● Available' : '○ Busy'}
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
    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
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
      className={`overflow-hidden rounded-2xl border bg-white transition-shadow ${
        isSelected ? 'border-[#173D2C] shadow-md ring-2 ring-[#D8F36A]' : 'border-[#D8D5CA] shadow-sm'
      }`}
      aria-label={`${charger.title}, ${charger.powerKw} kW ${charger.connector}, ₹${charger.pricePerKwh} per kWh`}
    >
      {/* Thumbnail — the model has no photo field, so the existing illustration is the fallback */}
      <div className="relative h-40 overflow-hidden bg-[#173D2C]">
        <ChargerThumbPlate
          theme={charger.visualTheme ?? 'driveway-canopy'}
          powerKw={charger.powerKw ?? 0}
          connector={charger.connector ?? ''}
        />
        <AvailabilityBadge available={charger.availableNow} className="absolute left-2.5 top-2.5" />
        <FavouriteButton
          active={isFavourite}
          label={charger.title}
          onToggle={onToggleFavourite}
          className="absolute right-2.5 top-2.5"
        />
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-[15px] font-bold leading-snug text-[#22251F]">
              {charger.title || <span className="italic text-[#888]">Unnamed charger</span>}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-[#565A52]">
              <MapPin className="h-3 w-3 shrink-0" />
              {[charger.locality, charger.city].filter(Boolean).join(', ') || '—'}
            </p>
            {charger.addressCue && (
              <p className="mt-0.5 truncate text-[11px] text-[#888]">{charger.addressCue}</p>
            )}
          </div>
          <span className="shrink-0 rounded-lg border border-[#D8D5CA] bg-[#EDE8D8] px-2 py-1 font-mono text-[11px] font-bold text-[#173D2C]">
            {charger.distanceKm} km
          </span>
        </div>

        {/* Host trust row — rating, review count and real completed-session history */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-[#565A52]">
          {charger.rating > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-[#F0A500] text-[#F0A500]" />
              <span className="font-mono font-bold text-[#22251F]">{charger.rating.toFixed(1)}</span>
              ({charger.reviewCount ?? 0})
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full border border-[#D8D5CA] bg-[#F6F3E9] px-2 py-0.5 font-semibold text-[#173D2C]">
            <ShieldCheck className="h-3 w-3" />
            {charger.completedSessions} sessions completed
          </span>
        </div>

        {/* SPEED / TARIFF / AVAILABILITY */}
        <div className="grid grid-cols-3 gap-2">
          <SpecTile label="Speed" value={`${charger.powerKw} kW`} />
          <SpecTile label="Tariff" value={`₹${charger.pricePerKwh}/kWh`} />
          <SpecTile label="Availability" value={availabilityValue(charger)} compact />
        </div>

        {/* Host info row */}
        <div className="rounded-xl border border-[#D8D5CA] bg-[#F6F3E9] p-3">
          <p className="truncate text-[12px] font-bold text-[#22251F]">
            {charger.hostName} <span className="font-normal text-[#565A52]">· {charger.hostTenure}</span>
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-[#565A52]">
            {charger.parkingType} · {charger.accessNotes}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenDetails}
            className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#173D2C] bg-[#D8F36A] px-4 py-2.5 text-[13px] font-bold text-[#173D2C] transition-colors hover:bg-[#c9e854] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
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
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D8D5CA] bg-white text-[#173D2C] transition-colors hover:border-[#173D2C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
            >
              <Navigation className="h-4 w-4" />
            </a>
          ) : (
            <span
              aria-hidden="true"
              title="Directions unavailable — no coordinates on this listing"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D8D5CA] bg-[#EDE8D8] text-[#AAA]"
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
      className={`relative rounded-2xl border bg-white p-3 transition-shadow ${
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
          <ChargerThumbPlate
            theme={charger.visualTheme ?? 'driveway-canopy'}
            powerKw={charger.powerKw ?? 0}
            connector={charger.connector ?? ''}
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate pr-9 text-[13px] font-bold text-[#22251F]">
            {charger.title || 'Unnamed charger'}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-[#565A52]">
            {[charger.locality, charger.city].filter(Boolean).join(', ')}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] font-semibold text-[#173D2C]">
            <span>₹{charger.pricePerKwh}/kWh</span>
            <span aria-hidden="true" className="text-[#D8D5CA]">·</span>
            <span>{charger.powerKw} kW</span>
            <span aria-hidden="true" className="text-[#D8D5CA]">·</span>
            <span>{charger.distanceKm} km</span>
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
    <div className="flex items-center gap-2.5 rounded-2xl border border-[#D8D5CA] bg-white p-2.5 shadow-sm">
      <button
        type="button"
        onClick={onOpenDetails}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
        aria-label={`View details for ${charger.title}`}
      >
        <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#173D2C]">
          <ChargerThumbPlate
            theme={charger.visualTheme ?? 'driveway-canopy'}
            powerKw={charger.powerKw ?? 0}
            connector={charger.connector ?? ''}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-bold text-[#22251F]">
            {charger.title || 'Unnamed charger'}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-[#565A52]">
            ₹{charger.pricePerKwh}/kWh · {charger.powerKw} kW · {charger.distanceKm} km
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
  /** Signed-in account — supplied by App so there is a single auth listener. */
  user: FirebaseUser | null;
  onOpenDetail: (charger: ChargerListing) => void;
  onOpenProfile: (view: ProfileMenuView) => void;
  /** Opens the existing bookings list (SignInAndBookingsModal). */
  onOpenBookings: () => void;
  activeReservationCount: number;
}

export const FindChargersPage: React.FC<FindChargersPageProps> = ({
  chargers,
  user,
  onOpenDetail,
  onOpenProfile,
  onOpenBookings,
  activeReservationCount,
}) => {
  const [filters, setFilters] = useState<ChargerFilterCriteria>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortKey>('distance');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const [locationDialogOpen, setLocationDialogOpen] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [focusLocation, setFocusLocation] = useState<{ lat: number; lng: number; zoom: number } | undefined>();
  const mapSectionRef = useRef<HTMLElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const { favouriteIds, toggleFavourite } = useFavourites(user?.uid ?? null);

  // Keep typing responsive while filtering over the full list
  const deferredQuery = useDeferredValue(filters.searchQuery);
  const effectiveFilters = useMemo(
    () => ({ ...filters, searchQuery: deferredQuery }),
    [filters, deferredQuery],
  );

  const results = useMemo(
    () => sortChargers(filterChargers(chargers, effectiveFilters), sortBy),
    [chargers, effectiveFilters, sortBy],
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
    setFocusLocation({ lat: location.latitude, lng: location.longitude, zoom: 12 });
    setFilters((previous) => ({ ...previous, searchQuery: location.area }));
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

  const focusSearch = useCallback(() => {
    setLocationDialogOpen(true);
  }, []);

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
    const hosts = new Set(results.map((c) => c.hostName)).size;
    return { availableCount, minPrice, maxPrice, hosts };
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
    <div className="min-h-screen bg-[#F6F3E9] pb-28 lg:pb-12">
      {/* ── Compact top navigation ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[#D8D5CA] bg-[#F6F3E9]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1360px] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6">
          {/* Lightning brand → landing page */}
          <button
            type="button"
            onClick={goHome}
            aria-label="ChargeShare home"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#173D2C] text-[#D8F36A] transition-colors hover:bg-[#285641] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
          >
            <Zap className="h-4 w-4 fill-current" />
          </button>
          <span className="hidden shrink-0 font-display text-base font-bold text-[#173D2C] sm:inline">
            ChargeShare
          </span>

          {/* Current search area — focuses the location search bar */}
          <button
            type="button"
            onClick={focusSearch}
            aria-label={`Current search area: ${locationLabel}. Edit location search`}
            className="inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-[#D8D5CA] bg-white px-3 py-2 text-left transition-colors hover:border-[#173D2C] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#173D2C]" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#22251F]">
              {locationLabel}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#888]" />
          </button>

          {/* Notifications — shows real session state, never a fabricated count */}
          <div ref={notifRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setNotifOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={notifOpen}
              aria-label={hasUnread ? `Notifications, ${activeReservationCount} unread` : 'Notifications'}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D8D5CA] bg-white text-[#22251F] transition-colors hover:border-[#173D2C] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
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
      <section className="mx-auto max-w-[1360px] px-3 pt-4 sm:px-6" aria-label="Search and filters">
        <div className="flex items-center gap-2">
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
          className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                  aria-label="Available now only"
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
                <span className="font-semibold text-[#22251F]">Available now only</span>
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

      {/* ── Map ─────────────────────────────────────────────────────────────── */}
      <section ref={mapSectionRef} className="mx-auto max-w-[1360px] px-3 pt-4 sm:px-6" aria-label="Charger map">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[11px] text-[#565A52]">
            {results.length} charger{results.length !== 1 ? 's' : ''} on the map
            {selectedId ? ' · 1 selected' : ''}
          </p>
          <div className="flex shrink-0 overflow-hidden rounded-full border border-[#D8D5CA]">
            <button
              type="button"
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                view === 'list' ? 'bg-[#173D2C] text-[#D8F36A]' : 'bg-white text-[#565A52] hover:bg-[#EDE8D8]'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setView('map')}
              aria-pressed={view === 'map'}
              className={`inline-flex items-center gap-1.5 border-l border-[#D8D5CA] px-3 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                view === 'map' ? 'bg-[#173D2C] text-[#D8F36A]' : 'bg-white text-[#565A52] hover:bg-[#EDE8D8]'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              Map
            </button>
          </div>
        </div>

        <ChargerMap
          chargers={results}
          focusLocation={focusLocation}
          selectedChargerId={selectedId}
          onSelectCharger={handleSelect}
          onViewDetails={handleOpenDetails}
          className={
            view === 'map'
              ? 'h-[440px] sm:h-[540px] lg:h-[640px]'
              : 'h-[220px] sm:h-[300px] lg:h-[420px]'
          }
        />
      </section>

      <section className="mx-auto max-w-[1360px] px-3 pt-5 sm:px-6">
        {/* ── Nearby Chargers header ───────────────────────────────────────── */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold tracking-tight text-[#22251F]">
                Nearby Chargers
              </h2>
              <span
                aria-label={`${results.length} chargers`}
                className="rounded-full bg-[#173D2C] px-2 py-0.5 font-mono text-[11px] font-bold text-[#D8F36A]"
              >
                {results.length}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-[#565A52]">
              {locationLabel}
              {summary.hosts > 0 ? ` · ${summary.hosts} host${summary.hosts !== 1 ? 's' : ''}` : ''}
              {' · '}
              {isDefaultFilters ? 'nearest first' : `sorted by ${sortBy}`}
            </p>
          </div>

          {view === 'list' && !showAll && results.length > INITIAL_VISIBLE && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="shrink-0 cursor-pointer text-[12px] font-bold text-[#173D2C] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
            >
              View all ({results.length})
            </button>
          )}
        </div>

        {/* Seed-data honesty notice (kept from the previous page) */}
        {results.length > 0 && results.every(isDevSeedRecord) && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#FEC84B] bg-[#FFFAEB] px-3 py-2.5 text-[11px] text-[#7A4F00]">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <strong>Development seed data</strong> — these listings are simulated for the demo. No
              real inventory, live availability or actual bookings are represented.
            </span>
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {results.length === 0 ? (
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
            {view === 'list' && primaryCharger && (
              <PrimaryChargerCard {...cardProps(primaryCharger)} />
            )}

            {view === 'list' && compactChargers.map((charger) => (
              <CompactChargerCard key={charger.id} {...cardProps(charger)} />
            ))}

            {view === 'list' && miniChargers.map((charger) => (
              <MiniChargerRow key={charger.id} {...cardProps(charger)} />
            ))}

            {view === 'list' && !showAll && results.length > visibleResults.length && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="w-full cursor-pointer rounded-2xl border border-[#D8D5CA] bg-white py-3 text-[13px] font-bold text-[#173D2C] transition-colors hover:border-[#173D2C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
              >
                Show {results.length - visibleResults.length} more charger
                {results.length - visibleResults.length !== 1 ? 's' : ''}
              </button>
            )}

            {view === 'map' && (
              <p className="rounded-2xl border border-[#D8D5CA] bg-white px-4 py-3 text-center text-[12px] text-[#565A52]">
                Map view — tap a price marker to preview a charger, or switch to List to browse the
                full details.
              </p>
            )}
          </div>
        )}

        {/* ── Community availability banner (real aggregates only) ─────────── */}
        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#173D2C] p-4 text-[#F6F3E9]">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D8F36A] text-[#173D2C]">
            <Zap className="h-5 w-5 fill-current" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[14px] font-bold leading-snug">
              {summary.availableCount > 0
                ? `${summary.availableCount} neighbourhood charger${
                    summary.availableCount !== 1 ? 's are' : ' is'
                  } online right now in ${locationLabel}`
                : `No chargers are online right now in ${locationLabel}`}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-[#C7D6CD]">
              {summary.minPrice !== null
                ? `${summary.hosts} host${summary.hosts !== 1 ? 's' : ''} offering slots from ₹${summary.minPrice}/kWh${
                    summary.maxPrice !== null && summary.maxPrice !== summary.minPrice
                      ? ` up to ₹${summary.maxPrice}/kWh`
                      : ''
                  } · prices set by the hosts themselves.`
                : 'Adjust your filters to see host pricing for this area.'}
            </p>
          </div>
        </div>
      </section>

      {/* ── Fixed mobile bottom navigation ─────────────────────────────────── */}
      <nav
        aria-label="Primary mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#D8D5CA] bg-[#F6F3E9] lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-[520px] items-stretch justify-around px-2 py-1.5">
          <button
            type="button"
            aria-current="page"
            className="flex flex-1 cursor-pointer flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-bold text-[#173D2C] focus-visible:outline-2 focus-visible:outline-[#173D2C]"
          >
            <Compass className="h-5 w-5" />
            Explore
          </button>
          <button
            type="button"
            onClick={onOpenBookings}
            className="flex flex-1 cursor-pointer flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold text-[#565A52] transition-colors hover:text-[#173D2C] focus-visible:outline-2 focus-visible:outline-[#173D2C]"
          >
            <CalendarCheck className="h-5 w-5" />
            Bookings
          </button>
          <button
            type="button"
            onClick={() => onOpenProfile('view')}
            className="flex flex-1 cursor-pointer flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold text-[#565A52] transition-colors hover:text-[#173D2C] focus-visible:outline-2 focus-visible:outline-[#173D2C]"
          >
            <UserRound className="h-5 w-5" />
            Profile
          </button>
        </div>
      </nav>
    </div>
  );
};
