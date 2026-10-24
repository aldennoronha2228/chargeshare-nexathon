import {
  collection,
  addDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { getGatePin } from './userProfile';

export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';

export interface ClientLocation {
  lat: number;
  lng: number;
}

export interface Booking {
  id: string;
  chargerId: string;
  chargerTitle?: string;
  chargerLocality?: string;
  providerId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  vehicleName: string;
  vehicleNumber: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  status: BookingStatus;
  totalKwh?: number;
  totalPrice: number;
  platformFee: number;
  providerEarnings: number;
  createdAt: string;
  clientLocation?: ClientLocation | null;
  clientLocationUpdatedAt?: number;
  clientReached?: boolean;
  clientReachedAt?: number;
  arrivalCodeHash?: string;
  sessionStartedAt?: number;
}

export interface NewBookingRequest {
  chargerId: string;
  chargerTitle: string;
  chargerLocality: string;
  providerId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  vehicleName: string;
  vehicleNumber: string;
  startTime: string;
  endTime: string;
  totalKwh: number;
  totalPrice: number;
}

export async function createBookingRequest(input: NewBookingRequest): Promise<string> {
  if (!input.userId || !input.providerId || !input.chargerId || input.userId === input.providerId) {
    throw new Error('A signed-in driver and an active provider listing are required to book.');
  }
  if (!Number.isFinite(input.totalKwh) || input.totalKwh < 2 || input.totalKwh > 100
    || !Number.isFinite(input.totalPrice) || input.totalPrice <= 0) {
    throw new Error('Check the requested energy amount and charger price, then try again.');
  }

  const listing = await getDoc(doc(db, 'public_chargers', input.chargerId));
  if (!listing.exists()
    || listing.data().status !== 'active'
    || listing.data().providerId !== input.providerId) {
    throw new Error('This charger is no longer accepting booking requests. Refresh the map and choose another listing.');
  }

  const platformFee = input.totalPrice * 0.1;
  const arrivalCodeHash = await hashArrivalCode(getGatePin(input.userId));
  const { userPhoto, ...booking } = input;
  const reference = await addDoc(collection(db, 'bookings'), {
    ...booking,
    arrivalCodeHash,
    ...(userPhoto ? { userPhoto } : {}),
    status: 'pending',
    platformFee,
    providerEarnings: input.totalPrice - platformFee,
    createdAt: new Date().toISOString(),
  });
  return reference.id;
}

function toBooking(snapshot: QueryDocumentSnapshot<DocumentData>): Booking {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    chargerId: data.chargerId,
    chargerTitle: data.chargerTitle,
    chargerLocality: data.chargerLocality,
    providerId: data.providerId,
    userId: data.userId,
    userName: data.userName,
    userPhoto: data.userPhoto,
    vehicleName: data.vehicleName,
    vehicleNumber: data.vehicleNumber,
    startTime: data.startTime,
    endTime: data.endTime,
    status: data.status as BookingStatus,
    totalKwh: data.totalKwh,
    totalPrice: data.totalPrice,
    platformFee: data.platformFee,
    providerEarnings: data.providerEarnings,
    createdAt: data.createdAt,
    clientLocation: data.clientLocation ?? null,
    clientLocationUpdatedAt: data.clientLocationUpdatedAt,
    clientReached: data.clientReached === true,
    clientReachedAt: data.clientReachedAt,
    arrivalCodeHash: data.arrivalCodeHash,
    sessionStartedAt: data.sessionStartedAt,
  };
}

/** Updates or clears a driver's live location for an accepted booking. */
export async function updateBookingClientLocation(
  bookingId: string,
  location: ClientLocation | null,
): Promise<void> {
  const reference = doc(db, 'bookings', bookingId);
  await setDoc(reference, {
    clientLocation: location,
    clientLocationUpdatedAt: location ? Date.now() : null,
  }, { merge: true });
}

/** Hashes an arrival code before the provider verifies it. */
export async function hashArrivalCode(code: string): Promise<string> {
  const normalized = code.replace(/\s/g, '').toUpperCase();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Records the driver's one-time arrival confirmation for an accepted booking. */
export async function markClientReached(bookingId: string): Promise<void> {
  const reference = doc(db, 'bookings', bookingId);
  await setDoc(reference, { clientReached: true, clientReachedAt: Date.now() }, { merge: true });
}

/** Records the provider-confirmed start after the client arrival code matches. */
export async function startChargingSession(bookingId: string): Promise<void> {
  const reference = doc(db, 'bookings', bookingId);
  await setDoc(reference, { sessionStartedAt: Date.now() }, { merge: true });
}

/** Streams all bookings for a provider. */
export function subscribeToProviderBookings(
  providerId: string,
  onBookings: (bookings: Booking[]) => void,
  onError: (message: string) => void
): Unsubscribe {
  const q = query(
    collection(db, 'bookings'),
    where('providerId', '==', providerId)
  );

  return onSnapshot(
    q,
    (snapshot) => onBookings(
      snapshot.docs
        .map(toBooking)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    ),
    (error) => onError(error.message)
  );
}

/** Streams bookings created by the signed-in driver. */
export function subscribeToUserBookings(
  userId: string,
  onBookings: (bookings: Booking[]) => void,
  onError: (message: string) => void
): Unsubscribe {
  const q = query(
    collection(db, 'bookings'),
    where('userId', '==', userId)
  );
  return onSnapshot(
    q,
    (snapshot) => onBookings(snapshot.docs.map(toBooking).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    (error) => onError(error.message)
  );
}

/** Updates the status of a booking. */
export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<void> {
  const reference = doc(db, 'bookings', bookingId);
  await setDoc(reference, { status }, { merge: true });
}

/** Accept a booking request. */
export const acceptBooking = (bookingId: string) => updateBookingStatus(bookingId, 'accepted');

/** Reject a booking request. */
export const rejectBooking = (bookingId: string) => updateBookingStatus(bookingId, 'rejected');

/** Cancel a booking. */
export const cancelBooking = (bookingId: string) => updateBookingStatus(bookingId, 'cancelled');

/** Complete a booking and record final usage. */
export async function completeBooking(
  bookingId: string,
  totalKwh: number,
  totalPrice: number
): Promise<void> {
  const platformFee = totalPrice * 0.1; // 10% platform fee
  const providerEarnings = totalPrice - platformFee;
  
  const reference = doc(db, 'bookings', bookingId);
  await setDoc(
    reference,
    {
      status: 'completed',
      totalKwh,
      totalPrice,
      platformFee,
      providerEarnings,
    },
    { merge: true }
  );
}
