import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase';

export interface ProviderProfile {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  payoutUpiId?: string;
  accountType?: 'Individual Residential' | 'Apartment RWA' | 'Commercial Host';
  address?: string;
  propertyAddress?: string;
  electricityBillPublicId?: string;
  electricityBillVersion?: number;
  electricityBillFormat?: string;
  ownershipProofPublicId?: string;
  ownershipProofVersion?: number;
  ownershipProofFormat?: string;
  applicationStatus?: 'under_review' | 'approved' | 'declined';
  applicationReviewedAt?: string;
  applicationReviewedBy?: string;
  registrationCompletedAt?: string;
  city?: string;
  updatedAt?: string;
}

/** Streams the provider's Firestore profile document. */
export function subscribeToProviderProfile(
  uid: string,
  onProfile: (profile: ProviderProfile | null) => void,
  onError?: (error: string) => void
): Unsubscribe {
  const ref = doc(db, 'providers', uid);
  return onSnapshot(
    ref,
    (snapshot) => {
      if (snapshot.exists()) {
        onProfile(snapshot.data() as ProviderProfile);
      } else {
        onProfile(null);
      }
    },
    (err) => {
      onError?.(err.message);
    }
  );
}

/** Updates or initializes the provider profile in Firestore. */
export async function saveProviderProfile(
  uid: string,
  profile: Partial<ProviderProfile>
): Promise<void> {
  const ref = doc(db, 'providers', uid);
  await setDoc(
    ref,
    {
      ...profile,
      uid,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
