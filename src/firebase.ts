import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing Firebase environment variable "${name}". Add your web app config to .env (see .env.example).`
    );
  }
  return value;
}

const firebaseConfig: FirebaseOptions = {
  apiKey: requireEnv(import.meta.env.VITE_FIREBASE_API_KEY, 'VITE_FIREBASE_API_KEY'),
  authDomain: requireEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, 'VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: requireEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, 'VITE_FIREBASE_PROJECT_ID'),
  storageBucket: requireEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, 'VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireEnv(
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    'VITE_FIREBASE_MESSAGING_SENDER_ID'
  ),
  appId: requireEnv(import.meta.env.VITE_FIREBASE_APP_ID, 'VITE_FIREBASE_APP_ID'),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);

export const auth: Auth = getAuth(firebaseApp);

/**
 * Analytics is unavailable in some browser environments, so initialisation
 * failures resolve to null rather than rejecting.
 */
export const analytics: Promise<Analytics | null> = isSupported()
  .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
  .catch(() => null);
