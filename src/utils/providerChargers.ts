import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { ConnectorType, IndianCity } from '../data/demoChargers';

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
  coordinates?: { lat: number; lng: number };
  compatibleVehicles: string[];
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

/** Persists a charger under the provider's own document. */
export async function saveProviderCharger(
  providerId: string,
  charger: NewProviderCharger
): Promise<string> {
  const reference = doc(chargersCollection(providerId));
  await setDoc(reference, { ...charger, createdAt: new Date().toISOString() });
  return reference.id;
}

/** Updates an existing charger's fields. */
export async function updateProviderCharger(
  providerId: string,
  chargerId: string,
  updates: Partial<ProviderCharger>
): Promise<void> {
  const reference = doc(db, 'providers', providerId, 'chargers', chargerId);
  await setDoc(reference, updates, { merge: true });
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
