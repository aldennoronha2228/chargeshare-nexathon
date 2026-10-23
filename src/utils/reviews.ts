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

export interface Review {
  id: string;
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

/** Responds to a review. */
export async function respondToReview(reviewId: string, response: string): Promise<void> {
  const reference = doc(db, 'reviews', reviewId);
  await setDoc(reference, { response }, { merge: true });
}
