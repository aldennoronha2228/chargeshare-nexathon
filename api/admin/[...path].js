import crypto from 'node:crypto';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const SESSION_COOKIE = 'chargeshare_admin_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const loginAttempts = new Map();

function getAdminAccounts() {
  try {
    const parsed = JSON.parse(process.env.ADMIN_USERS || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((account) => typeof account?.email === 'string')
      .map((account) => {
        const extraEntries = Object.entries(account).filter(([key]) => key !== 'email');
        const passwords = typeof account.password === 'string'
          ? [account.password]
          : extraEntries.length === 1 && typeof extraEntries[0][1] === 'string'
            ? [extraEntries[0][0], extraEntries[0][1]]
            : [];
        return { email: account.email.trim().toLowerCase(), passwords: passwords.filter(Boolean) };
      })
      .filter((account) => account.email.includes('@'));
  } catch {
    return [];
  }
}

function requestIsSameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    const host = request.headers['x-forwarded-host'] || request.headers.host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  if (secret.length < 32) throw new Error('ADMIN_SESSION_SECRET is not configured.');
  return secret;
}

function makeSession(email) {
  const payload = Buffer.from(JSON.stringify({ email, expiresAt: Date.now() + SESSION_DURATION_MS })).toString('base64url');
  const signature = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
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
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  let expected;
  let supplied;
  try {
    expected = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest();
    supplied = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof session.email === 'string' && session.expiresAt > Date.now()
      ? session
      : null;
  } catch {
    return null;
  }
}

function setSessionCookie(response, email) {
  const secure = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${SESSION_COOKIE}=${makeSession(email)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}${secure}`);
}

function clearSessionCookie(response) {
  const secure = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`);
}

function getFirebaseAdminApp() {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credential = serviceAccount ? cert(JSON.parse(serviceAccount)) : applicationDefault();
  return initializeApp({ credential, ...(projectId ? { projectId } : {}) });
}

async function getAdminRecord(email) {
  const snapshot = await getFirestore(getFirebaseAdminApp()).collection('admin_users').doc(email).get();
  return snapshot.exists ? snapshot.data() : null;
}

function verifyAdminPassword(password, adminRecord) {
  if (typeof password !== 'string' || typeof adminRecord?.passwordSalt !== 'string'
    || typeof adminRecord?.passwordHash !== 'string') return false;
  const expected = Buffer.from(adminRecord.passwordHash, 'hex');
  const supplied = crypto.scryptSync(password, adminRecord.passwordSalt, expected.length || 64);
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
}

function withinLoginLimit(request) {
  const forwarded = request.headers['x-forwarded-for'];
  const key = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]) || request.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || now - record.startedAt > 15 * 60 * 1000) {
    loginAttempts.set(key, { count: 1, startedAt: now });
    return true;
  }
  if (record.count >= 8) return false;
  record.count += 1;
  return true;
}

function getCloudinaryConfig() {
  const configuredUrl = process.env.CLOUDINARY_URL || '';
  const match = configuredUrl.match(/^cloudinary:\/\/([^:]+):(.+)@([^/]+)\/?$/i);
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || match?.[3] || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || match?.[2] || '',
  };
}

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

function requireAdmin(request, response) {
  const session = readSession(request);
  if (!session) {
    clearSessionCookie(response);
    response.status(401).json({ error: 'Your admin session expired. Sign in again.' });
    return null;
  }
  return session;
}

async function sendAdminData(response) {
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
    const chargersByKey = new Map();
    for (const charger of byCollection.public_chargers) {
      chargersByKey.set(`${charger.providerId || 'public'}:${charger.id}`, charger);
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
    return response.status(200).json({
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
        ? ['Firebase Auth account listing is unavailable. Grant the service account Firebase Authentication user-list access. Firestore data may still be available.']
        : [],
    });
  } catch (error) {
    console.error('[admin] Dashboard data request failed:', error instanceof Error ? error.message : 'Unknown Firebase Admin error.');
    return response.status(503).json({
      error: 'The admin backend could not load Firebase data. Check FIREBASE_SERVICE_ACCOUNT_JSON and the service account permissions in Vercel.',
    });
  }
}

async function serveProviderDocument(request, response, providerId, documentType) {
  const fieldMap = {
    electricityBill: ['electricityBillPublicId', 'electricityBillVersion', 'electricityBillFormat'],
    ownershipProof: ['ownershipProofPublicId', 'ownershipProofVersion', 'ownershipProofFormat'],
  };
  const fields = fieldMap[documentType];
  if (!fields) return response.status(404).json({ error: 'Provider document not found.' });
  try {
    const providerSnapshot = await getFirestore(getFirebaseAdminApp()).collection('providers').doc(providerId).get();
    if (!providerSnapshot.exists) return response.status(404).json({ error: 'Provider application not found.' });
    const [publicId, version, format] = fields.map((field) => providerSnapshot.get(field));
    if (typeof publicId !== 'string' || !Number.isInteger(version) || typeof format !== 'string'
      || !/^[a-z0-9]+$/i.test(format) || !/^[A-Za-z0-9_/-]+$/.test(publicId)) {
      return response.status(404).json({ error: 'Provider document is not available.' });
    }
    const { cloudName, apiSecret } = getCloudinaryConfig();
    if (!cloudName || !apiSecret) return response.status(503).json({ error: 'Cloudinary server credentials are not configured.' });
    const deliveryPath = `v${version}/${publicId}.${format}`;
    const signature = crypto.createHash('sha1').update(`${deliveryPath}${apiSecret}`).digest('base64url').slice(0, 8);
    const encodedPath = deliveryPath.split('/').map((segment) => encodeURIComponent(segment)).join('/');
    const imageUrl = `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/authenticated/s--${signature}--/${encodedPath}`;
    const upstream = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
    if (!upstream.ok) return response.status(502).json({ error: 'Could not load the provider document preview.' });
    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return response.status(502).json({ error: 'The uploaded document is not an image.' });
    const image = Buffer.from(await upstream.arrayBuffer());
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    return response.status(200).type(contentType).send(image);
  } catch (error) {
    console.error('[admin] Provider document preview failed:', error instanceof Error ? error.message : 'Unknown error.');
    return response.status(503).json({ error: 'Could not load the provider document preview.' });
  }
}

async function reviewProvider(request, response, providerId, session) {
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
      applicationReviewedBy: session.email,
    });
    batch.set(firestore.collection('admin_audit_logs').doc(), {
      action: `provider_application_${decision}`,
      providerId,
      adminEmail: session.email,
      createdAt: reviewedAt,
    });
    await batch.commit();
    return response.status(200).json({ providerId, applicationStatus: decision, applicationReviewedAt: reviewedAt });
  } catch (error) {
    console.error('[admin] Provider application review failed:', error instanceof Error ? error.message : 'Unknown Firestore error.');
    return response.status(503).json({ error: 'Could not save the provider decision. Check the Firebase Admin connection and try again.' });
  }
}

export default async function handler(request, response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  const routePath = Array.isArray(request.query?.path)
    ? request.query.path.join('/')
    : typeof request.query?.path === 'string' ? request.query.path : '';
  const segments = routePath.split('/').filter(Boolean);
  const route = segments.join('/');
  const method = request.method || 'GET';

  if (route === 'session' && method === 'GET') {
    const session = readSession(request);
    return response.status(200).json(session
      ? { authenticated: true, email: session.email }
      : { authenticated: false });
  }

  if (route === 'login' && method === 'POST') {
    if (!requestIsSameOrigin(request)) return response.status(403).json({ error: 'Sign-in request was rejected.' });
    if (!withinLoginLimit(request)) return response.status(429).json({ error: 'Too many sign-in attempts. Wait 15 minutes and try again.' });
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const password = typeof request.body?.password === 'string' ? request.body.password : '';
    let adminRecord;
    try {
      adminRecord = await getAdminRecord(email);
    } catch (error) {
      console.error('[admin] Admin credential lookup failed:', error instanceof Error ? error.message : 'Unknown Firestore error.');
      return response.status(503).json({ error: 'Admin sign-in is temporarily unavailable. Check the Firebase Admin connection.' });
    }
    if (!adminRecord?.active || !verifyAdminPassword(password, adminRecord)) {
      return response.status(401).json({ error: 'Email or password is incorrect.' });
    }
    try {
      setSessionCookie(response, email);
      return response.status(200).json({ authenticated: true, email });
    } catch {
      return response.status(503).json({ error: 'The admin session is not configured on the Vercel server.' });
    }
  }

  if (route === 'google-session' && method === 'POST') {
    if (!requestIsSameOrigin(request)) return response.status(403).json({ error: 'Sign-in request was rejected.' });
    if (!withinLoginLimit(request)) return response.status(429).json({ error: 'Too many sign-in attempts. Wait 15 minutes and try again.' });
    const idToken = typeof request.body?.idToken === 'string' ? request.body.idToken : '';
    if (!idToken) return response.status(400).json({ error: 'Google sign-in token is missing.' });
    try {
      const decoded = await getAuth(getFirebaseAdminApp()).verifyIdToken(idToken);
      const email = decoded.email?.trim().toLowerCase();
      const adminRecord = email ? await getAdminRecord(email) : null;
      if (!email || decoded.email_verified !== true || !adminRecord?.active) {
        return response.status(403).json({ error: 'This Google account is not on the admin allowlist.' });
      }
      setSessionCookie(response, email);
      return response.status(200).json({ authenticated: true, email });
    } catch (error) {
      console.error('[admin] Google sign-in verification failed:', error instanceof Error ? error.message : 'Unknown error.');
      return response.status(401).json({ error: 'Google sign-in could not be verified by the server.' });
    }
  }

  if (route === 'logout' && method === 'POST') {
    if (!requestIsSameOrigin(request)) return response.status(403).json({ error: 'Sign-out request was rejected.' });
    clearSessionCookie(response);
    return response.status(204).end();
  }

  if (route === 'data' && method === 'GET') {
    if (!requireAdmin(request, response)) return;
    return sendAdminData(response);
  }

  if (segments[0] === 'providers' && segments[1] && segments[2] === 'documents' && segments.length === 4 && method === 'GET') {
    if (!requireAdmin(request, response)) return;
    return serveProviderDocument(request, response, segments[1], segments[3]);
  }

  if (segments[0] === 'providers' && segments[1] && segments[2] === 'review' && segments.length === 3 && method === 'POST') {
    if (!requestIsSameOrigin(request)) return response.status(403).json({ error: 'Review request was rejected.' });
    const session = requireAdmin(request, response);
    if (!session) return;
    return reviewProvider(request, response, segments[1], session);
  }

  response.setHeader('Allow', 'GET, POST');
  return response.status(404).json({ error: 'Admin API route not found.' });
}
