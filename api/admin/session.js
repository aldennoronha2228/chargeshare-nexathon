import crypto from 'node:crypto';

const COOKIE_NAME = 'chargeshare_admin_session';

export default function adminSession(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const secret = process.env.ADMIN_SESSION_SECRET || '';
  const token = (request.headers.cookie || '').split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (secret.length < 32 || !token) return response.status(200).json({ authenticated: false });

  const separator = token.lastIndexOf('.');
  if (separator < 1) return response.status(200).json({ authenticated: false });
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  let expected;
  let supplied;
  try {
    expected = crypto.createHmac('sha256', secret).update(payload).digest();
    supplied = Buffer.from(signature, 'base64url');
  } catch {
    return response.status(200).json({ authenticated: false });
  }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return response.status(200).json({ authenticated: false });
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof session.email !== 'string' || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) {
      return response.status(200).json({ authenticated: false });
    }
    return response.status(200).json({ authenticated: true, email: session.email });
  } catch {
    return response.status(200).json({ authenticated: false });
  }
}
