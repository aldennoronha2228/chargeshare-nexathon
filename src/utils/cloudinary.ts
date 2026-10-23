import { optimizeImageForUpload } from './imageOptimization';

interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

function parseCloudinaryUrl(value: string): CloudinaryCredentials | null {
  const withoutScheme = value.trim().replace(/^cloudinary:\/\//i, '');
  const at = withoutScheme.lastIndexOf('@');
  if (at === -1) return null;

  const cloudName = withoutScheme.slice(at + 1).replace(/\/+$/, '');
  const credentials = withoutScheme.slice(0, at);
  const colon = credentials.indexOf(':');
  if (colon === -1) return null;

  const apiKey = credentials.slice(0, colon);
  const apiSecret = credentials.slice(colon + 1);
  if (!cloudName || !apiKey || !apiSecret) return null;

  return { cloudName, apiKey, apiSecret };
}

/**
 * Reads credentials from the single CLOUDINARY_URL form
 * (cloudinary://<api_key>:<api_secret>@<cloud_name>) when present, otherwise
 * from the separate cloud name / key / secret variables.
 */
const CREDENTIALS: CloudinaryCredentials | null =
  parseCloudinaryUrl(import.meta.env.VITE_CLOUDINARY_URL ?? '') ?? {
    cloudName: (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? '').trim(),
    apiKey: (import.meta.env.VITE_CLOUDINARY_API_KEY ?? '').trim(),
    apiSecret: (import.meta.env.VITE_CLOUDINARY_API_SECRET ?? '').trim(),
  };

const { cloudName: CLOUD_NAME, apiKey: API_KEY, apiSecret: API_SECRET } = CREDENTIALS;
const UPLOAD_PRESET = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? '').trim();

const UPLOAD_FOLDER_ROOT = 'chargeshare/providers';

export const CLOUDINARY_NOT_CONFIGURED =
  'Image uploads are not configured. Set VITE_CLOUDINARY_URL (cloudinary://<api_key>:<api_secret>@<cloud_name>) or the separate VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_API_KEY / VITE_CLOUDINARY_API_SECRET variables.';

export interface CloudinaryImage {
  url: string;
  publicId: string;
}

interface CloudinaryUploadResponse {
  secure_url?: string;
  public_id?: string;
  error?: { message?: string };
}

export function isCloudinaryConfigured(): boolean {
  return CLOUD_NAME.length > 0 && (usesSignedUpload() || UPLOAD_PRESET.length > 0);
}

function usesSignedUpload(): boolean {
  return API_KEY.length > 0 && API_SECRET.length > 0;
}

/**
 * One folder per provider so every provider's photos stay grouped together,
 * e.g. chargeshare/providers/<uid>.
 */
export function providerUploadFolder(providerId: string): string {
  const owner = providerId.replace(/[^A-Za-z0-9_-]/g, '') || 'unassigned';
  return `${UPLOAD_FOLDER_ROOT}/${owner}`;
}

async function sha1Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Builds the signed fields Cloudinary expects. `file`, `api_key` and
 * `signature` are excluded from the signature, and parameters must be signed
 * in alphabetical order.
 */
async function buildSignatureFields(folder: string): Promise<Record<string, string>> {
  const params: Record<string, string> = {
    folder,
    timestamp: Math.floor(Date.now() / 1000).toString(),
  };

  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return { ...params, api_key: API_KEY, signature: await sha1Hex(`${toSign}${API_SECRET}`) };
}

/**
 * Uploads an image straight from the browser into the provider's own folder.
 * Signs the request with api_key + api_secret when both are configured,
 * otherwise falls back to an unsigned upload preset.
 */
export async function uploadImageToCloudinary(
  file: File,
  providerId: string
): Promise<CloudinaryImage> {
  if (!isCloudinaryConfigured()) {
    throw new Error(CLOUDINARY_NOT_CONFIGURED);
  }

  const folder = providerUploadFolder(providerId);
  const body = new FormData();
  body.append('file', await optimizeImageForUpload(file));

  if (usesSignedUpload()) {
    if (!crypto.subtle) {
      throw new Error('Signed uploads need a secure context (HTTPS or localhost).');
    }
    const fields = await buildSignatureFields(folder);
    for (const [key, value] of Object.entries(fields)) {
      body.append(key, value);
    }
  } else {
    body.append('upload_preset', UPLOAD_PRESET);
    body.append('folder', folder);
  }

  let response: Response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 60_000);
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body,
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) {
      throw new Error('Cloudinary upload timed out after 60 seconds. Check your connection and try again.');
    }
    throw new Error('Could not reach Cloudinary. Check your connection and try again.');
  } finally {
    window.clearTimeout(timeout);
  }

  const payload = (await response.json().catch(() => ({}))) as CloudinaryUploadResponse;

  if (!response.ok || !payload.secure_url || !payload.public_id) {
    throw new Error(payload.error?.message ?? 'Cloudinary rejected the upload. Please try again.');
  }

  return { url: payload.secure_url, publicId: payload.public_id };
}
