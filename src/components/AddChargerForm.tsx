import React, { useRef, useState } from 'react';
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import { Camera, Check, LoaderCircle, Trash2, X, Zap } from 'lucide-react';
import type { ConnectorType, IndianCity } from '../data/demoChargers';
import { storage } from '../firebase';
import { validateProviderChargerForm } from '../utils/marketplaceLogic';
import { optimizeImageForUpload } from '../utils/imageOptimization';
import type { ChargerPhoto, NewProviderCharger, ProviderCharger } from '../utils/providerChargers';

const CITIES: Exclude<IndianCity, 'All Cities'>[] = [
  'Bengaluru',
  'Pune',
  'Mumbai',
  'Delhi NCR',
  'Hyderabad',
  'Chennai',
];

const CONNECTORS: ConnectorType[] = ['Type 2 AC', 'Bharat AC001', '15A 3-Pin Socket', 'CCS2 DC'];
const VEHICLE_TYPES = ['2-Wheeler', '3-Wheeler', '4-Wheeler (Car)', 'Bus/Truck'];

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const EMPTY_PHOTO: ChargerPhoto = { name: '', url: '', publicId: '' };

const INPUT =
  'w-full rounded border border-[#E2E5E5] bg-[#F5F3F1] px-3.5 py-2.5 text-xs font-sans text-[#111111] outline-none transition-all placeholder:text-[#747878] focus:border-black focus:bg-white';
const LABEL = 'text-[10px] font-sans font-semibold uppercase tracking-[0.14em] text-[#636563]';
const ERROR = 'text-[11px] font-sans text-red-600 mt-1';

async function uploadPhoto(
  file: File,
  providerId: string,
  onProgress: (progress: number) => void,
): Promise<ChargerPhoto> {
  const optimizedFile = await optimizeImageForUpload(file);
  const safeBaseName = optimizedFile.name.replace(/[^a-zA-Z0-9._-]/g, '-') || 'charger-photo.webp';
  const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `providers/${providerId}/chargers/${fileId}-${safeBaseName}`;
  const fileReference = storageRef(storage, path);
  const uploadTask = uploadBytesResumable(fileReference, optimizedFile, {
    contentType: optimizedFile.type,
  });
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      uploadTask.cancel();
      reject(new Error('Upload timed out after 60 seconds. Check your connection and Firebase Storage setup, then retry.'));
    }, 60_000);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      (error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        reject(error);
      },
      () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve();
      },
    );
  });
  let downloadUrl: string;
  let urlTimeout: number | undefined;
  try {
    downloadUrl = await Promise.race([
      getDownloadURL(fileReference),
      new Promise<never>((_, reject) => {
        urlTimeout = window.setTimeout(
          () => reject(new Error('Photo uploaded, but Firebase did not return its URL. Check Storage configuration and retry.')),
          30_000,
        );
      }),
    ]);
  } finally {
    if (urlTimeout !== undefined) window.clearTimeout(urlTimeout);
  }
  return { name: file.name, url: downloadUrl, publicId: path };
}

interface PhotoFieldProps {
  id: string;
  label: string;
  question: string;
  photo: ChargerPhoto | null;
  error?: string;
  busy: boolean;
  progress: number | null;
  providerId: string;
  onBusyChange: (busy: boolean) => void;
  onProgressChange: (progress: number | null) => void;
  onChange: (photo: ChargerPhoto | null) => void;
}

const PhotoField: React.FC<PhotoFieldProps> = ({
  id,
  label,
  question,
  photo,
  error,
  busy,
  progress,
  providerId,
  onBusyChange,
  onProgressChange,
  onChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState('');

  const handleSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLocalError('Choose an image file (JPG, PNG or WebP).');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setLocalError('Image must be 5 MB or smaller.');
      return;
    }

    setLocalError('');
    onBusyChange(true);
    onProgressChange(null);
    try {
      onChange(await uploadPhoto(file, providerId, onProgressChange));
    } catch (uploadError) {
      const code = (uploadError as { code?: string } | null)?.code;
      const message = code === 'storage/unauthorized'
        ? 'Firebase Storage denied this upload. Deploy the project storage.rules and try again.'
        : code === 'storage/canceled'
          ? 'Upload was cancelled. Please retry.'
          : uploadError instanceof Error
            ? uploadError.message
            : 'Upload failed. Please try again.';
      setLocalError(message);
    } finally {
      onBusyChange(false);
      onProgressChange(null);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <p className="text-[11px] text-[#747878]">{question}</p>

      {busy ? (
        <div className="flex h-36 flex-col items-center justify-center gap-2 rounded border border-dashed border-[#E2E5E5] bg-[#F5F3F1] text-[#636563]">
          <LoaderCircle size={20} className="animate-spin text-black" />
          <span className="text-[10px] font-sans uppercase tracking-wider text-black">
            {progress === null
              ? 'Optimizing photo…'
              : progress === 100
                ? 'Finalizing photo…'
                : `Uploading ${progress}%…`}
          </span>
          {progress !== null && (
            <div className="h-1 w-40 overflow-hidden rounded bg-[#E2E5E5]" aria-label={`Upload ${progress}% complete`}>
              <div className="h-full bg-black transition-[width]" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      ) : photo ? (
        <div className="overflow-hidden rounded border border-[#E2E5E5] bg-[#F5F3F1]">
          <img src={photo.url} alt={label} className="h-36 w-full object-cover" />
          <div className="flex items-center justify-between gap-2 border-t border-[#E2E5E5] bg-white px-3 py-2">
            <span className="min-w-0 truncate text-[11px] text-[#747878]">
              {photo.name}
            </span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex cursor-pointer items-center gap-1 rounded border border-[#E2E5E5] px-2 py-0.5 text-[10px] font-sans uppercase tracking-wider text-black hover:bg-[#F5F3F1]"
            >
              <Trash2 size={12} />
              <span>Replace</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-36 cursor-pointer flex-col items-center justify-center gap-1.5 rounded border border-dashed border-[#C4C7C7] bg-[#F5F3F1] text-[#747878] transition-all hover:border-black hover:bg-white hover:text-black"
        >
          <Camera size={18} />
          <span className="text-[11px] font-sans uppercase tracking-wider font-semibold">Upload Photo</span>
          <span className="text-[10px]">JPG, PNG or WebP · Up to 5 MB</span>
        </button>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        onChange={handleSelect}
        className="hidden"
      />

      {(localError || error) && <p className={ERROR}>{localError || error}</p>}
    </div>
  );
};

export interface AddChargerFormProps {
  providerId: string;
  initialCharger?: ProviderCharger;
  onCancel: () => void;
  onSubmit: (charger: NewProviderCharger) => Promise<void>;
}

export const AddChargerForm: React.FC<AddChargerFormProps> = ({
  providerId,
  initialCharger,
  onCancel,
  onSubmit,
}) => {
  const [title, setTitle] = useState(initialCharger?.title ?? '');
  const [addressLine, setAddressLine] = useState(initialCharger?.addressLine ?? '');
  const [locality, setLocality] = useState(initialCharger?.locality ?? '');
  const [city, setCity] = useState<Exclude<IndianCity, 'All Cities'>>(
    initialCharger?.city ?? 'Bengaluru'
  );
  const [connector, setConnector] = useState<ConnectorType>(
    initialCharger?.connector ?? 'Type 2 AC'
  );
  const [powerKw, setPowerKw] = useState(initialCharger?.powerKw?.toString() ?? '7.4');
  const [price, setPrice] = useState(initialCharger?.price?.toString() ?? '15');
  const [pricingType, setPricingType] = useState<'per_kwh' | 'per_session'>(
    initialCharger?.pricingType ?? 'per_kwh'
  );
  const [compatibleVehicles, setCompatibleVehicles] = useState<string[]>(
    initialCharger?.compatibleVehicles ?? ['4-Wheeler (Car)']
  );
  const [availableFrom, setAvailableFrom] = useState(initialCharger?.availableFrom ?? '09:00');
  const [availableTo, setAvailableTo] = useState(initialCharger?.availableTo ?? '21:00');
  const [accessNotes, setAccessNotes] = useState(initialCharger?.accessNotes ?? '');
  const [chargerPhoto, setChargerPhoto] = useState<ChargerPhoto | null>(
    initialCharger?.chargerPhoto?.url ? initialCharger.chargerPhoto : null
  );
  const [spacePhoto, setSpacePhoto] = useState<ChargerPhoto | null>(
    initialCharger?.spacePhoto?.url ? initialCharger.spacePhoto : null
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState({ charger: false, space: false });
  const [uploadProgress, setUploadProgress] = useState<{ charger: number | null; space: number | null }>({
    charger: null,
    space: null,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const uploadInProgress = uploading.charger || uploading.space;
  const busy = uploadInProgress || saving;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (busy) return;

    const validation = validateProviderChargerForm({
      title,
      addressLine,
      locality,
      city,
      connector,
      powerKw: Number(powerKw),
      price: Number(price),
      pricingType,
      availableFrom,
      availableTo,
      accessNotes,
      hasChargerPhoto: chargerPhoto !== null,
      hasSpacePhoto: spacePhoto !== null,
      compatibleVehicles,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSaveError('');
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        addressLine: addressLine.trim(),
        locality: locality.trim(),
        city,
        connector,
        powerKw: Number(powerKw),
        price: Number(price),
        pricingType,
        availableFrom,
        availableTo,
        accessNotes: accessNotes.trim(),
        chargerPhoto: chargerPhoto ?? EMPTY_PHOTO,
        spacePhoto: spacePhoto ?? EMPTY_PHOTO,
        status: 'active',
        compatibleVehicles,
        coordinates: { lat: 12.9716, lng: 77.5946 },
      });
    } catch (submitError) {
      setSaveError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not save the charger. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-white border border-[#E2E5E5] rounded-xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-6"
    >
      <div className="flex items-start justify-between gap-3 border-b border-[#EBE7E5] pb-4">
        <div>
          <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-[#636563]">
            {initialCharger ? 'Edit Charging Bay' : 'List New Charging Bay'}
          </span>
          <h2 className="font-sans text-xl font-bold text-black mt-0.5 tracking-tight">
            {initialCharger ? 'Update Bay Details' : 'Hardware & Pricing Details'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded p-1 text-[#636563] hover:bg-[#F5F3F1] hover:text-black transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-5">
        <div className="space-y-1">
          <label htmlFor="charger-title" className={LABEL}>
            Bay Title / Name
          </label>
          <input
            id="charger-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g., Rohan’s Private Bay 7.4kW"
            className={INPUT}
          />
          {errors.title && <p className={ERROR}>{errors.title}</p>}
        </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="min-w-0 space-y-1">
            <label htmlFor="charger-connector" className={LABEL}>
              Connector
            </label>
            <select
              id="charger-connector"
              value={connector}
              onChange={(event) => setConnector(event.target.value as ConnectorType)}
              className={INPUT}
            >
              {CONNECTORS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="charger-power" className={LABEL}>
              Rating (kW)
            </label>
            <input
              id="charger-power"
              type="number"
              step="0.1"
              min="2"
              value={powerKw}
              onChange={(event) => setPowerKw(event.target.value)}
              className={`${INPUT} font-mono`}
            />
            {errors.powerKw && <p className={ERROR}>{errors.powerKw}</p>}
          </div>

          <div className="min-w-0 space-y-1">
            <label htmlFor="charger-price" className={LABEL}>
              Price (₹)
            </label>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
              <input
                id="charger-price"
                type="number"
                step="0.01"
                min="5"
                max="500"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                aria-invalid={Boolean(errors.price)}
                className={`${INPUT} min-w-0 font-mono`}
              />
              <select
                value={pricingType}
                onChange={(event) =>
                  setPricingType(event.target.value as 'per_kwh' | 'per_session')
                }
                aria-label="Price unit"
                className={INPUT}
              >
                <option value="per_kwh">/kWh</option>
                <option value="per_session">/sess</option>
              </select>
            </div>
            {errors.price && <p className={ERROR}>{errors.price}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label className={LABEL}>Compatible Vehicles</label>
          <div className="flex flex-wrap gap-2">
            {VEHICLE_TYPES.map((type) => {
              const selected = compatibleVehicles.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setCompatibleVehicles((prev) =>
                      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                    )
                  }
                  className={`rounded px-3 py-1.5 text-[11px] font-sans uppercase tracking-wider font-semibold transition-all ${
                    selected
                      ? 'bg-black text-white'
                      : 'bg-[#F5F3F1] text-[#636563] border border-[#E2E5E5] hover:bg-[#EBE7E5]'
                  }`}
                >
                  {selected && <Check size={11} className="inline mr-1" />}
                  {type}
                </button>
              );
            })}
          </div>
          {errors.compatibleVehicles && <p className={ERROR}>{errors.compatibleVehicles}</p>}
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t border-[#EBE7E5]">
          <div className="min-w-0 space-y-1">
            <label htmlFor="charger-address" className={LABEL}>
              Address & Landmark
            </label>
            <input
              id="charger-address"
              type="text"
              value={addressLine}
              onChange={(event) => setAddressLine(event.target.value)}
              placeholder="e.g., 412, 12th Main Road"
              className={INPUT}
            />
            {errors.addressLine && <p className={ERROR}>{errors.addressLine}</p>}
          </div>

          <div className="min-w-0 space-y-1">
            <label htmlFor="charger-locality" className={LABEL}>
              Locality & City
            </label>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(8.5rem,0.9fr)] gap-2">
              <input
                id="charger-locality"
                type="text"
                value={locality}
                onChange={(event) => setLocality(event.target.value)}
                placeholder="e.g., Indiranagar"
                aria-invalid={Boolean(errors.locality)}
                className={`${INPUT} min-w-0`}
              />
              <select
                id="charger-city"
                value={city}
                onChange={(event) => setCity(event.target.value as Exclude<IndianCity, 'All Cities'>)}
                className={INPUT}
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {errors.locality && <p className={ERROR}>{errors.locality}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t border-[#EBE7E5]">
          <div className="space-y-1">
            <label htmlFor="charger-from" className={LABEL}>
              Available From
            </label>
            <input
              id="charger-from"
              type="time"
              value={availableFrom}
              onChange={(event) => setAvailableFrom(event.target.value)}
              className={INPUT}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="charger-to" className={LABEL}>
              Available Until
            </label>
            <input
              id="charger-to"
              type="time"
              value={availableTo}
              onChange={(event) => setAvailableTo(event.target.value)}
              className={INPUT}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="charger-access" className={LABEL}>
            Driver Access Guidelines
          </label>
          <textarea
            id="charger-access"
            rows={2}
            value={accessNotes}
            onChange={(event) => setAccessNotes(event.target.value)}
            placeholder="e.g., Gate #2 PIN #4819, park on covered shaded porch."
            className={`${INPUT} resize-none`}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t border-[#EBE7E5]">
          <PhotoField
            id="charger-photo"
            label="Charger Unit Photo (Optional)"
            question="Optional · wallbox hardware photo"
            photo={chargerPhoto}
            error={errors.chargerPhoto}
            busy={uploading.charger}
            progress={uploadProgress.charger}
            providerId={providerId}
            onBusyChange={(busy) => setUploading((prev) => ({ ...prev, charger: busy }))}
            onProgressChange={(progress) => setUploadProgress((prev) => ({ ...prev, charger: progress }))}
            onChange={setChargerPhoto}
          />

          <PhotoField
            id="charger-space-photo"
            label="Parking Space Photo (Optional)"
            question="Optional · bay parking slot"
            photo={spacePhoto}
            error={errors.spacePhoto}
            busy={uploading.space}
            progress={uploadProgress.space}
            providerId={providerId}
            onBusyChange={(busy) => setUploading((prev) => ({ ...prev, space: busy }))}
            onProgressChange={(progress) => setUploadProgress((prev) => ({ ...prev, space: progress }))}
            onChange={setSpacePhoto}
          />
        </div>

        {saveError && (
          <p className="rounded border border-red-300 bg-red-50 p-2.5 text-xs text-red-600">
            {saveError}
          </p>
        )}

        <div className="flex gap-2 pt-2 border-t border-[#EBE7E5]">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 h-10 rounded border border-[#E8E6E5] hover:bg-[#F5F3F1] font-sans text-xs uppercase tracking-wider font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 h-10 rounded bg-black text-white hover:bg-neutral-800 font-sans text-xs uppercase tracking-wider font-semibold disabled:opacity-40"
          >
            {uploadInProgress ? 'Uploading…' : saving ? 'Saving…' : initialCharger ? 'Update Bay' : 'Save Bay'}
          </button>
        </div>
      </div>
    </form>
  );
};
