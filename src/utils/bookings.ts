import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';

export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';

export interface Booking {
  id: string;
  chargerId: string;
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
}

function toBooking(snapshot: QueryDocumentSnapshot<DocumentData>): Booking {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    chargerId: data.chargerId,
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
  };
}

/** Streams all bookings for a provider. */
export function subscribeToProviderBookings(
  providerId: string,
  onBookings: (bookings: Booking[]) => void,
  onError: (message: string) => void
): Unsubscribe {
  const q = query(
    collection(db, 'bookings'),
    where('providerId', '==', providerId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => onBookings(snapshot.docs.map(toBooking)),
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
