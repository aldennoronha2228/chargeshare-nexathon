import crypto from 'node:crypto';

function getCloudinaryConfig() {
  const configuredUrl = process.env.CLOUDINARY_URL || '';
  const match = configuredUrl.match(/^cloudinary:\/\/([^:]+):(.+)@([^/]+)\/?$/i);
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || match?.[3] || '',
    apiKey: process.env.CLOUDINARY_API_KEY || match?.[1] || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || match?.[2] || '',
  };
}

function signParameters(parameters, apiSecret) {
  const payload = Object.keys(parameters)
    .sort()
    .map((key) => `${key}=${parameters[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
}

async function verifyFirebaseToken(idToken) {
  const apiKey = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) throw new Error('Firebase web API key is not configured on the server.');

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

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const authorization = request.headers.authorization || '';
  const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!idToken) return response.status(401).json({ error: 'Sign in before uploading provider documents.' });

  const purpose = request.body?.purpose;
  if (!['charger', 'verification'].includes(purpose)) {
    return response.status(400).json({ error: 'Invalid image upload purpose.' });
  }

  try {
    const uid = await verifyFirebaseToken(idToken);
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) {
      return response.status(403).json({ error: 'This account cannot upload provider documents.' });
    }

    const cloudinary = getCloudinaryConfig();
    if (!cloudinary.cloudName || !cloudinary.apiKey || !cloudinary.apiSecret) {
      return response.status(503).json({ error: 'Cloudinary credentials are not configured on the server. Add CLOUDINARY_URL to the Vercel project environment variables and redeploy.' });
    }

    const parameters = {
      folder: purpose === 'verification'
        ? `chargeshare/providers/${uid}/verification`
        : `chargeshare/providers/${uid}`,
      timestamp: Math.floor(Date.now() / 1000),
      type: purpose === 'verification' ? 'authenticated' : 'upload',
    };
    return response.status(200).json({
      ...parameters,
      api_key: cloudinary.apiKey,
      signature: signParameters(parameters, cloudinary.apiSecret),
      cloudName: cloudinary.cloudName,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : '';
    console.error('[cloudinary] Could not issue upload signature:', detail);
    const configProblem = /API key is not configured|fetch failed|ENOTFOUND|ECONNREFUSED|timed out|timeout|aborted/i.test(detail);
    return response.status(configProblem ? 503 : 401).json({
      error: configProblem
        ? 'Could not verify your sign-in with Firebase. Set FIREBASE_WEB_API_KEY (or VITE_FIREBASE_API_KEY) in the Vercel project environment variables and redeploy.'
        : 'Your sign-in could not be verified. Sign in again and retry.',
    });
  }
}
