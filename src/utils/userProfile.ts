import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../firebase';

/** Fixed account PIN used for gate access and client arrival confirmation. */
export function getGatePin(uid: string): string {
  return `#${uid.slice(0, 4).toUpperCase()}`;
}

/** Keeps a readable user profile alongside the UID used as the secure document key. */
export async function syncUserProfile(user: User): Promise<void> {
  const reference = doc(db, 'users', user.uid);
  const existing = await getDoc(reference);
  const existingName = existing.data()?.displayName;
  const displayName = user.displayName?.trim()
    || (typeof existingName === 'string' ? existingName.trim() : '')
    || user.email?.split('@')[0]
    || 'ChargeShare User';

  await setDoc(reference, {
    uid: user.uid,
    displayName,
    email: user.email ?? '',
    photoURL: user.photoURL ?? '',
    updatedAt: new Date().toISOString(),
    ...(!existing.exists() ? { createdAt: new Date().toISOString() } : {}),
  }, { merge: true });
}
