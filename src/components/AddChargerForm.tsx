import React, { useRef, useState } from 'react';
import { Camera, Trash2, X } from 'lucide-react';
import type { ConnectorType, IndianCity } from '../data/demoChargers';
import { validateProviderChargerForm } from '../utils/marketplaceLogic';

export interface ChargerPhoto {
  name: string;
  dataUrl: string;
}

export interface ProviderCharger {
  id: string;
  title: string;
  addressLine: string;
  locality: string;
  city: Exclude<IndianCity, 'All Cities'>;
  connector: ConnectorType;
  powerKw: number;
  pricePerKwh: number;
  availableFrom: string;
  availableTo: string;
  accessNotes: string;
  chargerPhoto: ChargerPhoto;
  spacePhoto: ChargerPhoto;
  createdAt: string;
}

const CITIES: Exclude<IndianCity, 'All Cities'>[] = [
  'Bengaluru',
  'Pune',
  'Mumbai',
  'Delhi NCR',
  'Hyderabad',
  'Chennai',
];

const CONNECTORS: ConnectorType[] = ['Type 2 AC', 'Bharat AC001', '15A 3-Pin Socket', 'CCS2 DC'];

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const INPUT =
  'w-full rounded-xl border border-[#DFD9CC] bg-[#FAF7F0] px-3 py-2.5 text-[13px] text-[#1c1c18] outline-none transition-colors focus:border-[#133E2E] focus:bg-white';
const LABEL = 'text-[12px] font-bold text-[#0A261C]';
const ERROR = 'text-[11px] font-semibold text-[#ba1a1a]';

function readImageFile(file: File): Promise<ChargerPhoto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, dataUrl: String(reader.result) });
    reader.onerror = () => reject(new Error('unreadable'));
    reader.readAsDataURL(file);
  });
}

interface PhotoFieldProps {
  id: string;
  label: string;
  question: string;
  photo: ChargerPhoto | null;
  error?: string;
  onChange: (photo: ChargerPhoto | null) => void;
}

const PhotoField: React.FC<PhotoFieldProps> = ({ id, label, question, photo, error, onChange }) => {
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
    try {
      onChange(await readImageFile(file));
    } catch {
      setLocalError('Could not read that image. Try another file.');
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <p className="text-[11px] leading-relaxed text-[#717974]">{question}</p>

      {photo ? (
        <div className="overflow-hidden rounded-xl border border-[#DFD9CC] bg-white">
          <img src={photo.dataUrl} alt={label} className="h-40 w-full object-cover" />
          <div className="flex items-center justify-between gap-2 border-t border-[#EFECE4] px-3 py-2">
            <span className="min-w-0 truncate text-[11px] font-semibold text-[#414944]">
              {photo.name}
            </span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[#DFD9CC] px-2.5 py-1 text-[11px] font-bold text-[#ba1a1a] transition-colors hover:bg-[#ffdad6]/40"
            >
              <Trash2 size={13} />
              <span>Remove</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-40 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#C8C2B2] bg-[#FAF7F0] text-[#717974] transition-colors hover:border-[#133E2E] hover:bg-[#F4F1EA]"
        >
          <Camera size={22} />
          <span className="text-[12px] font-bold text-[#0A261C]">Upload photo</span>
          <span className="text-[11px]">JPG, PNG or WebP · up to 5 MB</span>
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
  onCancel: () => void;
  onSubmit: (charger: ProviderCharger) => void;
}

export const AddChargerForm: React.FC<AddChargerFormProps> = ({ onCancel, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState<Exclude<IndianCity, 'All Cities'>>('Bengaluru');
  const [connector, setConnector] = useState<ConnectorType>('Type 2 AC');
  const [powerKw, setPowerKw] = useState('7.4');
  const [pricePerKwh, setPricePerKwh] = useState('15');
  const [availableFrom, setAvailableFrom] = useState('18:00');
  const [availableTo, setAvailableTo] = useState('22:00');
  const [accessNotes, setAccessNotes] = useState('');
  const [chargerPhoto, setChargerPhoto] = useState<ChargerPhoto | null>(null);
  const [spacePhoto, setSpacePhoto] = useState<ChargerPhoto | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const validation = validateProviderChargerForm({
      title,
      addressLine,
      locality,
      city,
      connector,
      powerKw: Number(powerKw),
      pricePerKwh: Number(pricePerKwh),
      availableFrom,
      availableTo,
      accessNotes,
      hasChargerPhoto: chargerPhoto !== null,
      hasSpacePhoto: spacePhoto !== null,
    });

    if (!validation.valid || !chargerPhoto || !spacePhoto) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    onSubmit({
      id: `pc-${Date.now()}`,
      title: title.trim(),
      addressLine: addressLine.trim(),
      locality: locality.trim(),
      city,
      connector,
      powerKw: Number(powerKw),
      pricePerKwh: Number(pricePerKwh),
      availableFrom,
      availableTo,
      accessNotes: accessNotes.trim(),
      chargerPhoto,
      spacePhoto,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-[#DFD9CC] bg-white p-4 shadow-[0_2px_8px_rgba(19,62,46,0.04)] sm:p-5"
    >
      <div className="flex items-start justify-between gap-3 border-b border-[#EFECE4] pb-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#717974]">
            New charging bay
          </span>
          <h2 className="font-sans text-[18px] font-extrabold leading-tight tracking-tight text-[#0A261C]">
            Tell us about your charger
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-[#414944]">
            Answer these questions so drivers know exactly what they are booking.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close add charger form"
          className="cursor-pointer rounded-full border border-[#DFD9CC] p-1.5 text-[#414944] transition-colors hover:bg-[#F4F1EA]"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex flex-col gap-4 pt-4">
        <section className="flex flex-col gap-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#133E2E]">
            1. The charger
          </h3>

          <div className="flex flex-col gap-1">
            <label htmlFor="charger-title" className={LABEL}>
              What should we call this charger?
            </label>
            <input
              id="charger-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g., Covered driveway Type 2 point"
              className={INPUT}
            />
            {errors.title && <p className={ERROR}>{errors.title}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="charger-connector" className={LABEL}>
                Connector type
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

            <div className="flex flex-col gap-1">
              <label htmlFor="charger-power" className={LABEL}>
                Power rating (kW)
              </label>
              <input
                id="charger-power"
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                value={powerKw}
                onChange={(event) => setPowerKw(event.target.value)}
                className={`${INPUT} font-mono`}
              />
              {errors.powerKw && <p className={ERROR}>{errors.powerKw}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="charger-price" className={LABEL}>
                Tariff (₹ per kWh)
              </label>
              <input
                id="charger-price"
                type="number"
                step="0.5"
                min="0"
                inputMode="decimal"
                value={pricePerKwh}
                onChange={(event) => setPricePerKwh(event.target.value)}
                className={`${INPUT} font-mono`}
              />
              {errors.pricePerKwh && <p className={ERROR}>{errors.pricePerKwh}</p>}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 border-t border-[#EFECE4] pt-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#133E2E]">
            2. Where it is
          </h3>

          <div className="flex flex-col gap-1">
            <label htmlFor="charger-address" className={LABEL}>
              Building, street or gate address
            </label>
            <input
              id="charger-address"
              type="text"
              value={addressLine}
              onChange={(event) => setAddressLine(event.target.value)}
              placeholder="e.g., 412, 12th Main Road, near Corner Park"
              className={INPUT}
            />
            {errors.addressLine && <p className={ERROR}>{errors.addressLine}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="charger-locality" className={LABEL}>
                Neighbourhood / locality
              </label>
              <input
                id="charger-locality"
                type="text"
                value={locality}
                onChange={(event) => setLocality(event.target.value)}
                placeholder="e.g., HSR Layout Sector 2"
                className={INPUT}
              />
              {errors.locality && <p className={ERROR}>{errors.locality}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="charger-city" className={LABEL}>
                City
              </label>
              <select
                id="charger-city"
                value={city}
                onChange={(event) => setCity(event.target.value as Exclude<IndianCity, 'All Cities'>)}
                className={INPUT}
              >
                {CITIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 border-t border-[#EFECE4] pt-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#133E2E]">
            3. Availability &amp; access
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="charger-from" className={LABEL}>
                Available from
              </label>
              <input
                id="charger-from"
                type="time"
                value={availableFrom}
                onChange={(event) => setAvailableFrom(event.target.value)}
                className={INPUT}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="charger-to" className={LABEL}>
                Available until
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
          {errors.availability && <p className={ERROR}>{errors.availability}</p>}

          <div className="flex flex-col gap-1">
            <label htmlFor="charger-access" className={LABEL}>
              How does a driver get in and where should they park?
            </label>
            <textarea
              id="charger-access"
              rows={3}
              value={accessNotes}
              onChange={(event) => setAccessNotes(event.target.value)}
              placeholder="e.g., Ring the bell at gate 2, park on the left of the covered bay. Watchman knows about bookings."
              className={`${INPUT} resize-none`}
            />
            {errors.accessNotes && <p className={ERROR}>{errors.accessNotes}</p>}
          </div>
        </section>

        <section className="flex flex-col gap-3 border-t border-[#EFECE4] pt-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#133E2E]">
            4. Photos
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PhotoField
              id="charger-photo"
              label="Photo of the charger"
              question="A clear shot of the charging unit, plug and cable."
              photo={chargerPhoto}
              error={errors.chargerPhoto}
              onChange={setChargerPhoto}
            />

            <PhotoField
              id="charger-space-photo"
              label="Photo of the charging space"
              question="The parking spot where the car will sit while charging."
              photo={spacePhoto}
              error={errors.spacePhoto}
              onChange={setSpacePhoto}
            />
          </div>
        </section>

        <div className="flex flex-col-reverse gap-2 border-t border-[#EFECE4] pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-xl border border-[#DFD9CC] bg-[#FAF7F0] px-4 py-2.5 text-[13px] font-bold text-[#414944] transition-colors hover:bg-[#F4F1EA]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="cursor-pointer rounded-xl border border-[#b2d40f] bg-[#D2F24E] px-5 py-2.5 text-[13px] font-extrabold text-[#133E2E] shadow-sm transition-colors hover:bg-[#caee34]"
          >
            Save charger
          </button>
        </div>
      </div>
    </form>
  );
};
