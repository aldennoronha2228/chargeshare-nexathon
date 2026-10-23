import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { ConnectorType, IndianCity } from '../data/demoChargers';
import type { ChargerListing } from '../data/demoChargers';

/** Approximate map defaults used until the provider pins their exact location. */
export const CITY_MAP_CENTERS: Record<Exclude<IndianCity, 'All Cities'>, { lat: number; lng: number }> = {
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  'Delhi NCR': { lat: 28.6139, lng: 77.209 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
};

export interface ChargerPhoto {
  name: string;
  url: string;
  publicId: string;
}

/** A charger as the provider filled it in, before it is persisted. */
export type NewProviderCharger = Omit<ProviderCharger, 'id' | 'createdAt'>;

/** A charger as stored under providers/{uid}/chargers/{chargerId}. */
export interface ProviderCharger {
  id: string;
  title: string;
  addressLine: string;
  locality: string;
  city: Exclude<IndianCity, 'All Cities'>;
  connector: ConnectorType;
  powerKw: number;
  price: number;
  pricingType: 'per_kwh' | 'per_session';
  availableFrom: string;
  availableTo: string;
  accessNotes: string;
  chargerPhoto: ChargerPhoto;
  spacePhoto: ChargerPhoto;
  createdAt: string;
  status: 'active' | 'inactive';
  coordinates?: { lat: number; lng: number } | null;
  compatibleVehicles: string[];
}

export type PublicProviderCharger = ProviderCharger & { providerId: string };

/** Converts the provider's real listing fields to the client marketplace view. */
export function toClientListing(charger: PublicProviderCharger): ChargerListing {
  const rawCoordinates = charger.coordinates;
  // Existing records used Bangalore's center as a placeholder for every city.
  // Show those legacy listings near the selected city rather than hiding them.
  const wasLegacyPlaceholder = rawCoordinates?.lat === 12.9716 && rawCoordinates?.lng === 77.5946;
  const coordinates = rawCoordinates && !wasLegacyPlaceholder
    ? rawCoordinates
    : CITY_MAP_CENTERS[charger.city] ?? CITY_MAP_CENTERS.Bengaluru;
  const pricePerKwh = charger.price;
  const availableNow = charger.status === 'active';
  return {
    id: charger.id,
    providerId: charger.providerId,
    photoUrl: charger.chargerPhoto.url || undefined,
    title: charger.title,
    locality: charger.locality,
    city: charger.city,
    addressCue: charger.addressLine,
    distanceKm: null,
    connector: charger.connector,
    powerKw: charger.powerKw,
    pricePerKwh,
    pricingType: charger.pricingType,
    parkingType: '',
    operatingHours: `${charger.availableFrom} – ${charger.availableTo}`,
    availableFrom: charger.availableFrom,
    availableTo: charger.availableTo,
    availableNow,
    availabilityLabel: availableNow ? `${charger.availableFrom} – ${charger.availableTo}` : 'Paused by host',
    hostName: 'Community host',
    hostTenure: '',
    rating: 0,
    reviewCount: 0,
    completedSessions: 0,
    hardwareModel: '',
    cableLengthMeters: null,
    accessNotes: charger.accessNotes,
    compatibleVehicles: charger.compatibleVehicles,
    coordinates: { lat: String(coordinates.lat), lng: String(coordinates.lng) },
    visualTheme: 'driveway-canopy',
    slots: availableNow
      ? [{ id: `${charger.id}-provider-window`, label: 'Provider availability', window: `${charger.availableFrom} – ${charger.availableTo}`, available: true }]
      : [],
  };
}

const EMPTY_PHOTO: ChargerPhoto = { name: '', url: '', publicId: '' };

function chargersCollection(providerId: string) {
  return collection(db, 'providers', providerId, 'chargers');
}

function normalizePhoto(value: unknown): ChargerPhoto {
  if (!value || typeof value !== 'object') return EMPTY_PHOTO;
  const photo = value as Record<string, unknown>;
  return {
    name: typeof photo.name === 'string' ? photo.name : '',
    url: typeof photo.url === 'string' ? photo.url : '',
    publicId: typeof photo.publicId === 'string' ? photo.publicId : '',
  };
}

function toProviderCharger(snapshot: QueryDocumentSnapshot<DocumentData>): ProviderCharger {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    title: String(data.title ?? ''),
    addressLine: String(data.addressLine ?? ''),
    locality: String(data.locality ?? ''),
    city: data.city as Exclude<IndianCity, 'All Cities'>,
    connector: data.connector as ConnectorType,
    powerKw: Number(data.powerKw ?? 0),
    price: Number(data.price ?? 0),
    pricingType: (data.pricingType as 'per_kwh' | 'per_session') ?? 'per_kwh',
    availableFrom: String(data.availableFrom ?? ''),
    availableTo: String(data.availableTo ?? ''),
    accessNotes: String(data.accessNotes ?? ''),
    chargerPhoto: normalizePhoto(data.chargerPhoto),
    spacePhoto: normalizePhoto(data.spacePhoto),
    createdAt: String(data.createdAt ?? ''),
    status: (data.status as 'active' | 'inactive') ?? 'active',
    coordinates: data.coordinates,
    compatibleVehicles: Array.isArray(data.compatibleVehicles) ? data.compatibleVehicles : [],
  };
}

/**
 * Streams the signed-in provider's chargers, newest first. Denies access to
 * any other provider's documents — see firestore.rules.
 */
export function subscribeToProviderChargers(
  providerId: string,
  onChargers: (chargers: ProviderCharger[]) => void,
  onError: (message: string) => void
): Unsubscribe {
  const ordered = query(chargersCollection(providerId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    ordered,
    (snapshot) => onChargers(snapshot.docs.map(toProviderCharger)),
    (error) => onError(error.message)
  );
}

/** Streams provider listings published for driver discovery. */
export function subscribeToPublicChargers(
  onChargers: (chargers: PublicProviderCharger[]) => void,
  onError: (message: string) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'public_chargers'),
    (snapshot) => onChargers(snapshot.docs
      .map((docSnapshot) => ({
        ...toProviderCharger(docSnapshot),
        providerId: String(docSnapshot.data().providerId ?? ''),
      }))
      .filter((charger) => charger.status === 'active' && charger.providerId)),
    (error) => onError(error.message)
  );
}

/** Publishes an existing provider record to the collection used by discovery. */
export async function publishProviderCharger(
  providerId: string,
  charger: ProviderCharger
): Promise<void> {
  await setDoc(doc(db, 'public_chargers', charger.id), {
    ...charger,
    id: charger.id,
    providerId,
  });
}

/** Persists a charger under the provider's own document. */
export async function saveProviderCharger(
  providerId: string,
  charger: NewProviderCharger
): Promise<string> {
  const reference = doc(chargersCollection(providerId));
  const record = { ...charger, createdAt: new Date().toISOString() };
  // Keep the provider record and client marketplace listing in sync as one write.
  const batch = writeBatch(db);
  batch.set(reference, record);
  batch.set(doc(db, 'public_chargers', reference.id), {
    ...record,
    id: reference.id,
    providerId,
  });
  await batch.commit();
  return reference.id;
}

/** Updates an existing charger's fields. */
export async function updateProviderCharger(
  providerId: string,
  chargerId: string,
  updates: Partial<ProviderCharger>
): Promise<void> {
  const reference = doc(db, 'providers', providerId, 'chargers', chargerId);
  const batch = writeBatch(db);
  batch.set(reference, updates, { merge: true });
  batch.set(doc(db, 'public_chargers', chargerId), { ...updates, id: chargerId, providerId }, { merge: true });
  await batch.commit();
}

/** Toggles the availability status of a charger. */
export async function toggleChargerStatus(
  providerId: string,
  chargerId: string,
  currentStatus: 'active' | 'inactive'
): Promise<void> {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  await updateProviderCharger(providerId, chargerId, { status: newStatus });
}
