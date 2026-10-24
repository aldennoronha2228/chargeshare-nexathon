import { auth } from '../firebase';
import { optimizeImageForUpload } from './imageOptimization';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const CLOUDINARY_NOT_CONFIGURED = 'Cloudinary is not configured on the app server. Add CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET) to the hosting provider’s server environment, then redeploy.';

export interface CloudinaryImage {
  /** Public delivery URL. Only set for ordinary charger photos. */
  url: string;
  publicId: string;
  version: number;
  format: string;
}

interface CloudinaryUploadResponse {
  secure_url?: string;
  public_id?: string;
  version?: number;
  format?: string;
  error?: { message?: string };
}

interface UploadSignature {
  api_key: string;
  timestamp: number;
  folder: string;
  type: 'upload' | 'authenticated';
  signature: string;
  cloudName: string;
  error?: string;
}

async function getUploadSignature(purpose: 'charger' | 'verification', idToken: string): Promise<UploadSignature> {
  let response: Response;
  try {
    response = await fetch('/api/cloudinary/upload-signature', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose }),
    });
  } catch {
    throw new Error('The upload API could not be reached. Deploy the app with its Node.js server (npm start) and make /api routes available on this site; a static-only deployment cannot issue Cloudinary upload signatures.');
  }
  const result = await response.json().catch(() => ({})) as UploadSignature;
  if (!response.ok || !result.signature || !result.cloudName) {
    if (result.error === 'API route not found.') {
      throw new Error('The hosted server does not have the upload API route. Redeploy the latest app with its Node.js server (npm start) and route /api/cloudinary/upload-signature to it.');
    }
    if (response.status === 404 || response.status === 405 || response.status === 501) {
      throw new Error('The upload API is not available on this hosting deployment. It must run the app’s Node.js server and expose /api/cloudinary/upload-signature; static-only hosting cannot handle uploads.');
    }
    throw new Error(result.error || CLOUDINARY_NOT_CONFIGURED);
  }
  return result;
}

async function sendSignedImage(file: File, signature: UploadSignature, onProgress?: (progress: number) => void): Promise<CloudinaryUploadResponse> {
  const body = new FormData();
  body.append('file', await optimizeImageForUpload(file));
  for (const key of ['api_key', 'timestamp', 'folder', 'type', 'signature'] as const) {
    body.append(key, String(signature[key]));
  }

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`);
    request.timeout = 60_000;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      let result: CloudinaryUploadResponse;
      try { result = JSON.parse(request.responseText) as CloudinaryUploadResponse; }
      catch { result = {}; }
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(result.error?.message ?? `Cloudinary returned HTTP ${request.status}.`));
        return;
      }
      resolve(result);
    };
    request.onerror = () => reject(new Error('Could not reach Cloudinary. Check your connection and try again.'));
    request.ontimeout = () => reject(new Error('Cloudinary upload timed out after 60 seconds.'));
    request.onabort = () => reject(new Error('Cloudinary upload was cancelled. Please retry.'));
    request.send(body);
  });
}

function validateImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type) || file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
    throw new Error('Choose a JPG, PNG, or WebP image up to 5 MB.');
  }
}

async function uploadImage(file: File, purpose: 'charger' | 'verification', onProgress?: (progress: number) => void): Promise<CloudinaryImage> {
  validateImage(file);
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before uploading images.');
  const signature = await getUploadSignature(purpose, await user.getIdToken());
  const payload = await sendSignedImage(file, signature, onProgress);
  if (!payload.public_id || !payload.version || !payload.format || (purpose === 'charger' && !payload.secure_url)) {
    throw new Error(payload.error?.message ?? 'Cloudinary did not return the uploaded image details.');
  }
  return {
    url: purpose === 'charger' ? payload.secure_url ?? '' : '',
    publicId: payload.public_id,
    version: payload.version,
    format: payload.format,
  };
}

/** Uploads a public provider charger photo using a server-issued signature. */
export async function uploadImageToCloudinary(
  file: File,
  providerId: string,
  onProgress?: (progress: number) => void,
): Promise<CloudinaryImage> {
  if (auth.currentUser?.uid !== providerId) throw new Error('You can only upload images for your signed-in provider account.');
  return uploadImage(file, 'charger', onProgress);
}

/** Uploads a private provider verification image using the same Cloudinary uploader. */
export async function uploadVerificationImageToCloudinary(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<CloudinaryImage> {
  return uploadImage(file, 'verification', onProgress);
}
