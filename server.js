import 'dotenv/config';
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createServer as createViteServer } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3001);
const isProduction = process.env.NODE_ENV === 'production';
const sessionCookieName = 'chargeshare_admin_session';
const sessionDurationMs = 8 * 60 * 60 * 1000;
const configuredSessionSecret = process.env.ADMIN_SESSION_SECRET;
if (isProduction && (!configuredSessionSecret || configuredSessionSecret.length < 32)) {
  throw new Error('Set ADMIN_SESSION_SECRET to a random value with at least 32 characters in production.');
}
const sessionSecret = configuredSessionSecret || crypto.randomBytes(48).toString('base64url');
const app = express();
const httpServer = createServer(app);

app.disable('x-powered-by');
if (isProduction) app.set('trust proxy', 1);
// Firebase Google popup auth needs an opener relationship to monitor its popup.
app.use((_request, response, next) => {
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});
app.use(express.json({ limit: '16kb' }));
app.use('/api/admin', (_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

const reverseGeocodeCache = new Map();
let nominatimQueue = Promise.resolve();
let nextNominatimRequestAt = 0;

async function geocodeWithPositionstack(parameters, apiKey, endpoint) {
  const url = new URL(`https://api.positionstack.com/v1/${endpoint}`);
  url.searchParams.set('access_key', apiKey);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, String(value));
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  const payload = await response.json();
  const result = payload.data?.[0];
  if (!response.ok || payload.error || !result) {
    throw new Error(payload.error?.message || `Positionstack returned ${response.status}.`);
  }
  return {
    label: result.label || result.name || '',
    locality: result.neighbourhood || result.locality || result.name || result.street || '',
    city: result.locality || result.county || result.region || '',
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

async function reverseGeocodeWithOpenStreetMap(lat, lng) {
  const lookup = nominatimQueue.then(async () => {
    const wait = Math.max(0, nextNominatimRequestAt - Date.now());
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    nextNominatimRequestAt = Date.now() + 1100;
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('zoom', '18');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ChargeShareNexathon/1.0 (charger address lookup)', 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(12000),
    });
    const payload = await response.json();
    if (!response.ok || !payload.display_name) throw new Error(payload.error || 'No mapped address was found for this pin.');
    const address = payload.address || {};
    return {
      label: payload.display_name,
      locality: address.neighbourhood ?? address.suburb ?? address.quarter ?? address.city_district ?? address.village ?? address.hamlet ?? address.road ?? '',
      city: address.city ?? address.town ?? address.municipality ?? address.county ?? address.state_district ?? address.village ?? '',
    };
  });
  nominatimQueue = lookup.then(() => undefined, () => undefined);
  return lookup;
}

app.get('/api/geocoding/reverse', async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  const lat = Number(request.query.lat);
  const lng = Number(request.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return response.status(400).json({ error: 'Valid latitude and longitude are required.' });
  }

  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = reverseGeocodeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return response.json({ label: cached.label, locality: cached.locality, city: cached.city });
  }

  try {
    const apiKey = process.env.APILAYER_POSITIONSTACK_ACCESS_KEY?.trim();
    const result = apiKey
      ? await geocodeWithPositionstack({ query: `${lat},${lng}` }, apiKey, 'reverse')
      : await reverseGeocodeWithOpenStreetMap(lat, lng);
    reverseGeocodeCache.set(cacheKey, { ...result, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
    response.json(result);
  } catch (error) {
    const detail = error instanceof Error ? error.message : '';
    console.error('[geocoding] Reverse lookup failed:', detail || 'Unknown geocoding error.');
    const apiLayerConfigured = Boolean(process.env.APILAYER_POSITIONSTACK_ACCESS_KEY?.trim());
    response.status(502).json({
      error: apiLayerConfigured
        ? 'Positionstack could not resolve this pin. Check that the API Layer key is valid and Positionstack is enabled for your account.'
        : 'Could not find an address for this pin. Try moving the pin slightly or enter the address manually.',
    });
  }
});

app.get('/api/geocoding/forward', async (request, response) => {
  const query = typeof request.query.query === 'string' ? request.query.query.trim() : '';
  if (query.length < 3 || query.length > 250) {
    return response.status(400).json({ error: 'Enter a location between 3 and 250 characters.' });
  }
  const apiKey = process.env.APILAYER_POSITIONSTACK_ACCESS_KEY?.trim();
  if (!apiKey) return response.status(503).json({ error: 'Positionstack geocoding is not configured on the server.' });
  try {
    const result = await geocodeWithPositionstack({ query, limit: 1 }, apiKey, 'forward');
    if (!Number.isFinite(Number(result.latitude)) || !Number.isFinite(Number(result.longitude))) {
      return response.status(404).json({ error: 'No matching location was found.' });
    }
    response.json(result);
  } catch (error) {
    console.error('[geocoding] Forward lookup failed:', error instanceof Error ? error.message : 'Unknown Positionstack error.');
    response.status(502).json({ error: 'Positionstack could not find that location. Check the API Layer key and try again.' });
  }
});

function readAdminAccounts() {
  try {
    const parsed = JSON.parse(process.env.ADMIN_USERS || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((account) => typeof account?.email === 'string')
      .map((account) => ({
        email: account.email.trim().toLowerCase(),
        password: typeof account.password === 'string' ? account.password : '',
      }))
      .filter((account) => account.email.includes('@'));
  } catch {
    return [];
  }
}

const adminAccounts = readAdminAccounts();
const adminEmails = new Set(adminAccounts.map(({ email }) => email));
const authAttempts = new Map();
const providerUploadAttempts = new Map();

function requestIsSameOrigin(request) {
  const origin = request.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === request.get('host');
  } catch {
    return false;
  }
}

function makeSession(email) {
  const payload = Buffer.from(JSON.stringify({ email, expiresAt: Date.now() + sessionDurationMs })).toString('base64url');
  const signature = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readSession(request) {
  const cookies = Object.fromEntries((request.headers.cookie || '').split(';').map((part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return ['', ''];
    try {
      return [part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())];
    } catch {
      return ['', ''];
    }
  }).filter(([name]) => name));
  const token = cookies[sessionCookieName];
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', sessionSecret).update(payload).digest();
  let supplied;
  try { supplied = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof session.email === 'string' && adminEmails.has(session.email) && session.expiresAt > Date.now()
      ? session
      : null;
  } catch {
    return null;
  }
}

function setSessionCookie(response, email) {
  const secure = isProduction ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${sessionCookieName}=${makeSession(email)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${Math.floor(sessionDurationMs / 1000)}${secure}`);
}

function clearSessionCookie(response) {
  const secure = isProduction ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${sessionCookieName}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`);
}

function getFirebaseAdminApp() {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credential = serviceAccountJson
    ? cert(JSON.parse(serviceAccountJson))
    : applicationDefault();
  return initializeApp({ credential, ...(projectId ? { projectId } : {}) });
}

function requireAdmin(request, response, next) {
  const session = readSession(request);
  if (!session) {
    clearSessionCookie(response);
    response.status(401).json({ error: 'Your admin session expired. Sign in again.' });
    return;
  }
  request.adminSession = session;
  next();
}

function withinLoginLimit(request) {
  const key = request.ip || 'unknown';
  const now = Date.now();
  const record = authAttempts.get(key);
  if (!record || now - record.windowStartedAt > 15 * 60 * 1000) {
    authAttempts.set(key, { count: 1, windowStartedAt: now });
    return true;
  }
  if (record.count >= 8) return false;
  record.count += 1;
  return true;
}

app.get('/api/admin/session', (request, response) => {
  const session = readSession(request);
  if (!session) {
    // A signed-out visitor is a normal state for the admin login page, not an API error.
    response.json({ authenticated: false });
    return;
  }
  response.json({ authenticated: true, email: session.email });
});

app.post('/api/admin/login', (request, response) => {
  if (!requestIsSameOrigin(request)) return response.status(403).json({ error: 'Sign-in request was rejected.' });
  if (!withinLoginLimit(request)) return response.status(429).json({ error: 'Too many sign-in attempts. Wait 15 minutes and try again.' });
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body?.password === 'string' ? request.body.password : '';
  const account = adminAccounts.find((item) => item.email === email);
  const expectedPassword = crypto.createHash('sha256').update(account?.password || 'invalid-account-password').digest();
  const suppliedPassword = crypto.createHash('sha256').update(password).digest();
  if (!account?.password || !crypto.timingSafeEqual(expectedPassword, suppliedPassword)) {
    response.status(401).json({ error: 'Email or password is incorrect.' });
    return;
  }
  setSessionCookie(response, account.email);
  response.json({ authenticated: true, email: account.email });
});

app.post('/api/admin/google-session', async (request, response) => {
  if (!requestIsSameOrigin(request)) return response.status(403).json({ error: 'Sign-in request was rejected.' });
  if (!withinLoginLimit(request)) return response.status(429).json({ error: 'Too many sign-in attempts. Wait 15 minutes and try again.' });
  const idToken = typeof request.body?.idToken === 'string' ? request.body.idToken : '';
  if (!idToken) return response.status(400).json({ error: 'Google sign-in token is missing.' });
  try {
    const decoded = await getAuth(getFirebaseAdminApp()).verifyIdToken(idToken);
    const email = decoded.email?.trim().toLowerCase();
    if (!email || decoded.email_verified !== true || !adminEmails.has(email)) {
      return response.status(403).json({ error: 'This Google account is not on the admin allowlist.' });
    }
    setSessionCookie(response, email);
    response.json({ authenticated: true, email });
  } catch {
    response.status(401).json({ error: 'Google sign-in could not be verified by the server.' });
  }
});

app.post('/api/admin/logout', (request, response) => {
  if (!requestIsSameOrigin(request)) return response.status(403).json({ error: 'Sign-out request was rejected.' });
  clearSessionCookie(response);
  response.status(204).end();
});

function getCloudinaryServerConfig() {
  const configuredUrl = process.env.CLOUDINARY_URL || '';
  const match = configuredUrl.match(/^cloudinary:\/\/([^:]+):(.+)@([^/]+)\/?$/i);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || match?.[3] || '';
  const apiKey = process.env.CLOUDINARY_API_KEY || match?.[1] || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || match?.[2] || '';
  return { cloudName, apiKey, apiSecret };
}

function signCloudinaryParameters(parameters, apiSecret) {
  const payload = Object.keys(parameters).sort().map((key) => `${key}=${parameters[key]}`).join('&');
  return crypto.createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
}

async function verifyProviderUploadToken(idToken) {
  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) throw new Error('Firebase web API key is not configured on the server.');

  // Firebase Auth validates the ID token here without requiring a service-account file.
  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    signal: AbortSignal.timeout(10_000),
  });
  const result = await lookup.json().catch(() => ({}));
  const account = result?.users?.[0];
  if (!lookup.ok || !account?.localId || account.disabled === true) {
    throw new Error('The Firebase sign-in token is invalid or expired.');
  }
  return account.localId;
}

app.post('/api/cloudinary/upload-signature', async (request, response) => {
  const authorization = request.get('authorization') || '';
  const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!idToken) return response.status(401).json({ error: 'Sign in before uploading provider documents.' });
  const purpose = request.body?.purpose;
  if (!['charger', 'verification'].includes(purpose)) return response.status(400).json({ error: 'Invalid image upload purpose.' });

  try {
    const uid = await verifyProviderUploadToken(idToken);
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) return response.status(403).json({ error: 'This account cannot upload provider documents.' });
    const now = Date.now();
    const previous = providerUploadAttempts.get(uid);
    if (previous && now - previous.startedAt < 60_000 && previous.count >= 30) {
      return response.status(429).json({ error: 'Too many image uploads. Wait a minute and retry.' });
    }
    providerUploadAttempts.set(uid, !previous || now - previous.startedAt >= 60_000
      ? { startedAt: now, count: 1 }
      : { startedAt: previous.startedAt, count: previous.count + 1 });

    const cloudinary = getCloudinaryServerConfig();
    if (!cloudinary.cloudName || !cloudinary.apiKey || !cloudinary.apiSecret) {
      return response.status(503).json({ error: 'Cloudinary credentials are not configured on the server.' });
    }
    const parameters = {
      folder: purpose === 'verification'
        ? `chargeshare/providers/${uid}/verification`
        : `chargeshare/providers/${uid}`,
      timestamp: Math.floor(now / 1000),
      type: purpose === 'verification' ? 'authenticated' : 'upload',
    };
    response.setHeader('Cache-Control', 'no-store');
    response.json({
      ...parameters,
      api_key: cloudinary.apiKey,
      signature: signCloudinaryParameters(parameters, cloudinary.apiSecret),
      cloudName: cloudinary.cloudName,
    });
  } catch (error) {
    console.error('[provider-application] Could not validate upload identity:', error instanceof Error ? error.message : 'Unknown Firebase Auth error.');
    const detail = error instanceof Error ? error.message : '';
    const configurationProblem = /API key is not configured|fetch failed|ENOTFOUND|ECONNREFUSED|timed out|timeout|aborted/i.test(detail);
    response.status(configurationProblem ? 503 : 401).json({
      error: configurationProblem
        ? 'Could not verify your sign-in with Firebase. Check the Firebase web API key and server network, then restart npm run dev.'
        : 'Your sign-in could not be verified. Sign in again and retry.',
    });
  }
});

app.get('/api/admin/providers/:providerId/documents/:documentType', requireAdmin, async (request, response) => {
  const fieldMap = {
    electricityBill: ['electricityBillPublicId', 'electricityBillVersion', 'electricityBillFormat'],
    ownershipProof: ['ownershipProofPublicId', 'ownershipProofVersion', 'ownershipProofFormat'],
  };
  const fields = fieldMap[request.params.documentType];
  if (!fields) return response.status(404).json({ error: 'Provider document not found.' });

  try {
    const providerSnapshot = await getFirestore(getFirebaseAdminApp()).collection('providers').doc(request.params.providerId).get();
    if (!providerSnapshot.exists) return response.status(404).json({ error: 'Provider application not found.' });
    const [publicId, version, format] = fields.map((field) => providerSnapshot.get(field));
    if (typeof publicId !== 'string' || !Number.isInteger(version) || typeof format !== 'string'
      || !/^[a-z0-9]+$/i.test(format) || !/^[A-Za-z0-9_/-]+$/.test(publicId)) {
      return response.status(404).json({ error: 'Provider document is not available.' });
    }
    const { cloudName, apiSecret } = getCloudinaryServerConfig();
    if (!cloudName || !apiSecret) return response.status(503).json({ error: 'Cloudinary server credentials are not configured.' });
    const deliveryPath = `v${version}/${publicId}.${format}`;
    const signature = crypto.createHash('sha1').update(`${deliveryPath}${apiSecret}`).digest('base64url').slice(0, 8);
    const encodedPath = deliveryPath.split('/').map((segment) => encodeURIComponent(segment)).join('/');
    const imageUrl = `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/authenticated/s--${signature}--/${encodedPath}`;
    const upstream = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
    if (!upstream.ok) {
      console.error('[admin] Cloudinary document preview failed:', upstream.status);
      return response.status(502).json({ error: 'Could not load the provider document preview.' });
    }
    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return response.status(502).json({ error: 'The uploaded document is not an image.' });
    const image = Buffer.from(await upstream.arrayBuffer());
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    response.type(contentType).send(image);
  } catch (error) {
    console.error('[admin] Provider document preview failed:', error instanceof Error ? error.message : 'Unknown error.');
    response.status(503).json({ error: 'Could not load the provider document preview.' });
  }
});

app.post('/api/admin/providers/:providerId/review', requireAdmin, async (request, response) => {
  if (!requestIsSameOrigin(request)) return response.status(403).json({ error: 'Review request was rejected.' });
  const providerId = request.params.providerId;
  const decision = request.body?.decision;
  if (!providerId || !['approved', 'declined'].includes(decision)) {
    return response.status(400).json({ error: 'Choose whether to accept or decline this provider application.' });
  }
  try {
    const firestore = getFirestore(getFirebaseAdminApp());
    const providerRef = firestore.collection('providers').doc(providerId);
    const provider = await providerRef.get();
    if (!provider.exists || provider.data()?.applicationStatus !== 'under_review') {
      return response.status(409).json({ error: 'This provider application is no longer waiting for review.' });
    }
    const reviewedAt = new Date().toISOString();
    const batch = firestore.batch();
    batch.update(providerRef, {
      applicationStatus: decision,
      applicationReviewedAt: reviewedAt,
      applicationReviewedBy: request.adminSession.email,
    });
    const auditRef = firestore.collection('admin_audit_logs').doc();
    batch.set(auditRef, {
      action: `provider_application_${decision}`,
      providerId,
      adminEmail: request.adminSession.email,
      createdAt: reviewedAt,
    });
    await batch.commit();
    response.json({ providerId, applicationStatus: decision, applicationReviewedAt: reviewedAt });
  } catch (error) {
    const detail = error instanceof Error ? error.message : '';
    console.error('[admin] Provider application review failed:', detail || 'Unknown Firestore error.');
    response.status(503).json({ error: 'Could not save the provider decision. Check the Firebase Admin connection and try again.' });
  }
});

function serializeValue(value) {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeValue(item)]));
  }
  return value;
}

function redactSensitiveFields(value, fieldName = '') {
  if (/(password|secret|token|api.?key|credential|private.?key|card.?number|cvv|authorization)/i.test(fieldName)) return '[redacted]';
  if (Array.isArray(value)) return value.map((item) => redactSensitiveFields(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactSensitiveFields(item, key)]));
  }
  return value;
}

app.get('/api/admin/data', requireAdmin, async (_request, response) => {
  try {
    const firestore = getFirestore(getFirebaseAdminApp());
    const collectionNames = [
      'users', 'providers', 'bookings', 'public_chargers', 'reviews',
      'transactions', 'refunds', 'provider_payouts', 'admin_audit_logs', 'platform_settings',
    ];
    const [snapshots, providerChargerSnapshot, authResult] = await Promise.all([
      Promise.all(collectionNames.map((name) => firestore.collection(name).get())),
      firestore.collectionGroup('chargers').get(),
      (async () => {
        const users = [];
        let pageToken;
        do {
          const page = await getAuth(getFirebaseAdminApp()).listUsers(1000, pageToken);
          users.push(...page.users.map((user) => ({
            uid: user.uid,
            id: user.uid,
            email: user.email ?? '',
            displayName: user.displayName ?? '',
            photoURL: user.photoURL ?? '',
            phoneNumber: user.phoneNumber ?? '',
            emailVerified: user.emailVerified,
            disabled: user.disabled,
            createdAt: user.metadata.creationTime ?? '',
            lastSignInAt: user.metadata.lastSignInTime ?? '',
            authProviders: user.providerData.map((provider) => provider.providerId),
          })));
          pageToken = page.pageToken;
        } while (pageToken);
        return { users, unavailable: false };
      })().catch(() => ({ users: [], unavailable: true })),
    ]);
    const authUsers = authResult.users;
    const byCollection = Object.fromEntries(collectionNames.map((name, index) => [
      name,
      snapshots[index].docs.map((document) => ({ ...redactSensitiveFields(serializeValue(document.data())), id: document.id })),
    ]));

    const usersById = new Map(byCollection.users.map((profile) => [profile.uid || profile.id, profile]));
    for (const account of authUsers) {
      const profile = usersById.get(account.uid) ?? {};
      usersById.set(account.uid, {
        ...account,
        ...profile,
        id: account.uid,
        uid: account.uid,
        email: profile.email || account.email,
        displayName: profile.displayName || account.displayName,
        phoneNumber: profile.phoneNumber || account.phoneNumber,
        createdAt: profile.createdAt || account.createdAt,
      });
    }

    // Include both canonical provider-owned charger records (including paused
    // bays) and marketplace records, merging matching records by owner and ID.
    const chargersByKey = new Map();
    for (const charger of byCollection.public_chargers) {
      const key = `${charger.providerId || 'public'}:${charger.id}`;
      chargersByKey.set(key, charger);
    }
    for (const document of providerChargerSnapshot.docs) {
      const providerId = document.ref.parent.parent?.id || '';
      const key = `${providerId}:${document.id}`;
      chargersByKey.set(key, {
        ...(chargersByKey.get(key) ?? {}),
        ...redactSensitiveFields(serializeValue(document.data())),
        id: document.id,
        providerId,
        storagePath: document.ref.path,
      });
    }

    response.setHeader('Cache-Control', 'no-store');
    response.json({
      users: [...usersById.values()],
      authAccounts: authUsers,
      providers: byCollection.providers,
      bookings: byCollection.bookings,
      chargers: [...chargersByKey.values()],
      reviews: byCollection.reviews,
      transactions: byCollection.transactions,
      refunds: byCollection.refunds,
      payouts: byCollection.provider_payouts,
      auditLogs: byCollection.admin_audit_logs,
      platformSettings: byCollection.platform_settings,
      sourceErrors: authResult.unavailable
        ? ['Firebase Auth account listing is unavailable. Grant the server identity Firebase Authentication user-list access. Firestore profiles and activity are still available.']
        : [],
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : '';
    console.error('[admin] Dashboard data request failed:', detail || 'Unknown Firebase Admin error.');
    const configuredCredentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const missingCredentialFile = Boolean(configuredCredentialPath && !existsSync(configuredCredentialPath));
    const credentialProblem = missingCredentialFile || /default credentials|credential.*(not found|missing|failed)|could not load.*credential|ENOENT|no such file|JSON.*position/i.test(detail);
    const permissionProblem = /permission|insufficient|not authorized|unauthorized/i.test(detail);
    const message = missingCredentialFile
      ? 'The file set in GOOGLE_APPLICATION_CREDENTIALS cannot be found. Download the Firebase Admin service-account JSON, update that .env value to its real file path, and restart npm run dev.'
      : credentialProblem
        ? 'The admin backend is running, but Firebase Admin credentials are not configured correctly. Set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON file path or set FIREBASE_SERVICE_ACCOUNT_JSON in the project .env, then restart npm run dev.'
      : permissionProblem
        ? 'Firebase Admin is connected, but its service account lacks access. Grant Firestore read access and Firebase Authentication user-list access, then restart the server.'
        : 'The admin backend could not load Firebase data. Check the server terminal for the Firebase Admin error and verify the configured Firebase project.';
    response.status(503).json({ error: message });
  }
});

app.use('/api', (_request, response) => response.status(404).json({ error: 'API route not found.' }));

if (isProduction) {
  app.use(express.static(path.join(rootDir, 'dist'), { index: false }));
  app.get('*', (_request, response) => response.sendFile(path.join(rootDir, 'dist', 'index.html')));
} else {
  const vite = await createViteServer({
    configFile: path.join(rootDir, 'vite.config.ts'),
    server: { middlewareMode: true, hmr: { server: httpServer } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`ChargeShare server running at http://localhost:${port}`);
  if (adminAccounts.length === 0) console.warn('No admin accounts are configured. Set ADMIN_USERS in the server .env file.');
});
