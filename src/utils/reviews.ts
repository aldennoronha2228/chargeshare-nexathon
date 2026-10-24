import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface Review {
  id: string;
  bookingId?: string;
  chargerId: string;
  providerId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number; // 1-5
  comment: string;
  response?: string;
  createdAt: string;
}

function toReview(snapshot: QueryDocumentSnapshot<DocumentData>): Review {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    bookingId: data.bookingId,
    chargerId: data.chargerId,
    providerId: data.providerId,
    userId: data.userId,
    userName: data.userName,
    userPhoto: data.userPhoto,
    rating: data.rating,
    comment: data.comment,
    response: data.response,
    createdAt: data.createdAt,
  };
}

/** Saves one public charger review for a completed booking. */
export async function submitBookingReview(input: {
  bookingId: string;
  chargerId: string;
  providerId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment: string;
}): Promise<void> {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error('Choose a rating from 1 to 5 stars.');
  }
  const comment = input.comment.trim().slice(0, 1000);
  const batch = writeBatch(db);
  batch.set(doc(db, 'reviews', input.bookingId), {
    bookingId: input.bookingId,
    chargerId: input.chargerId,
    providerId: input.providerId,
    userId: input.userId,
    userName: input.userName,
    ...(input.userPhoto ? { userPhoto: input.userPhoto } : {}),
    rating: input.rating,
    comment,
    createdAt: new Date().toISOString(),
  });
  batch.set(doc(db, 'bookings', input.bookingId), { reviewSubmitted: true }, { merge: true });
  await batch.commit();
}

/** Streams all reviews for a provider's chargers. */
export function subscribeToProviderReviews(
  providerId: string,
  onReviews: (reviews: Review[]) => void,
  onError: (message: string) => void
): Unsubscribe {
  const q = query(
    collection(db, 'reviews'),
    where('providerId', '==', providerId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => onReviews(snapshot.docs.map(toReview)),
    (error) => onError(error.message)
  );
}

/** Streams readable reviews for marketplace rating summaries. */
export function subscribeToPublicReviews(
  onReviews: (reviews: Review[]) => void,
  onError: (message: string) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'reviews'),
    (snapshot) => onReviews(snapshot.docs.map(toReview)),
    (error) => onError(error.message)
  );
}

/** Responds to a review. */
export async function respondToReview(reviewId: string, response: string): Promise<void> {
  const reference = doc(db, 'reviews', reviewId);
  await setDoc(reference, { response }, { merge: true });
}
