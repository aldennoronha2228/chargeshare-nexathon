import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Check, LoaderCircle, MapPin, Trash2, X, Zap } from 'lucide-react';
import { AttributionControl, Map as MapLibreMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ConnectorType } from '../data/demoChargers';
import { uploadImageToCloudinary } from '../utils/cloudinary';
import { validateProviderChargerForm } from '../utils/marketplaceLogic';
import type { ChargerPhoto, NewProviderCharger, ProviderCharger } from '../utils/providerChargers';

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
  const image = await uploadImageToCloudinary(file, providerId, onProgress);
  return { name: file.name, url: image.url, publicId: image.publicId };
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
  const [devicePosition, setDevicePosition] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const initialCoordinates = initialCharger?.coordinates;
  const initialCoordinatesAreConfirmed = Boolean(
    initialCoordinates
    && (initialCharger?.locationConfirmed === true
      || initialCoordinates.lat !== 12.9716
      || initialCoordinates.lng !== 77.5946)
  );
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(
    initialCoordinatesAreConfirmed && initialCoordinates ? initialCoordinates : null
  );
  const [locationConfirmed, setLocationConfirmed] = useState(initialCoordinatesAreConfirmed);
  const [locationMessage, setLocationMessage] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const locationMapContainerRef = useRef<HTMLDivElement>(null);
  const locationMapRef = useRef<MapLibreMap | null>(null);
  const locationMarkerRef = useRef<Marker | null>(null);
  const geocodeRequestRef = useRef(0);
  const [locality, setLocality] = useState(initialCharger?.locality ?? '');
  const [city, setCity] = useState(initialCharger?.city ?? '');
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

  const lookupAddressForPosition = useCallback(async (position: { lat: number; lng: number }): Promise<string | null> => {
    const requestId = ++geocodeRequestRef.current;
    setLocationMessage('Looking up the pinned address…');
    try {
      const query = new URLSearchParams({ lat: String(position.lat), lng: String(position.lng) });
      let response = await fetch(`/api/geocoding/reverse?${query.toString()}`);
      let result: { label?: string; locality?: string; city?: string; error?: string };

      // The Vite middleware serves this route in development. Static hosting can
      // instead return the app's index.html, so detect that and use Nominatim.
      try {
        result = await response.json() as typeof result;
      } catch {
        const upstreamQuery = new URLSearchParams({
          format: 'jsonv2',
          addressdetails: '1',
          zoom: '18',
          lat: String(position.lat),
          lon: String(position.lng),
        });
        response = await fetch(`https://nominatim.openstreetmap.org/reverse?${upstreamQuery.toString()}`, {
          headers: { 'Accept-Language': 'en' },
        });
        const upstream = await response.json() as {
          display_name?: string;
          address?: Record<string, string | undefined>;
          error?: string;
        };
        const address = upstream.address ?? {};
        result = {
          label: upstream.display_name,
          locality: address.neighbourhood ?? address.suburb ?? address.quarter
            ?? address.city_district ?? address.village ?? address.hamlet ?? address.road ?? '',
          city: address.city ?? address.town ?? address.municipality ?? address.county
            ?? address.state_district ?? address.village ?? '',
          error: upstream.error,
        };
      }
      if (!response.ok || !result.label) {
        throw new Error(result.error || 'No address was found for this pin.');
      }
      if (requestId !== geocodeRequestRef.current) return null;
      setAddressLine(result.label);
      setLocality(result.locality ?? '');
      setCity(result.city ?? '');
      setLocationMessage('Pinned address found. Confirm the pin to save this location.');
      return result.label;
    } catch (error) {
      if (requestId !== geocodeRequestRef.current) return null;
      const message = error instanceof SyntaxError
        ? 'The address service returned an invalid response. Please try again or enter the address manually.'
        : error instanceof Error
          ? error.message
          : 'Could not find an address for this pin. You can enter it manually.';
      setLocationMessage(message);
      return null;
    }
  }, []);

  const confirmPinnedLocation = async () => {
    if (!selectedPosition) return;
    setLocationConfirmed(false);
    const address = await lookupAddressForPosition(selectedPosition);
    if (!address) return;
    setLocationConfirmed(true);
    setLocationMessage('Location confirmed and address added.');
    closeLocationMap();
  };

  useEffect(() => {
    if (!showLocationMap || !selectedPosition || !locationMapContainerRef.current || locationMapRef.current) return;
    const map = new MapLibreMap({
      container: locationMapContainerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [selectedPosition.lng, selectedPosition.lat],
      zoom: 18,
      attributionControl: false,
    });
    map.addControl(new AttributionControl({ compact: true }), 'bottom-right');
    locationMapRef.current = map;
    return () => {
      locationMarkerRef.current?.remove();
      locationMarkerRef.current = null;
      map.remove();
      locationMapRef.current = null;
    };
  }, [showLocationMap, selectedPosition !== null]);

  useEffect(() => {
    if (!showLocationMap || !locationMapRef.current || !selectedPosition) return;
    const point: [number, number] = [selectedPosition.lng, selectedPosition.lat];
    locationMapRef.current.flyTo({ center: point, zoom: 18 });
    if (locationMarkerRef.current) {
      locationMarkerRef.current.setLngLat(point);
    } else {
      const marker = new Marker({ color: '#111111', draggable: true })
        .setLngLat(point)
        .addTo(locationMapRef.current);
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLngLat();
        setSelectedPosition({ lat, lng });
        setLocationConfirmed(false);
        void lookupAddressForPosition({ lat, lng });
      });
      locationMarkerRef.current = marker;
    }
  }, [lookupAddressForPosition, selectedPosition, showLocationMap]);

  const openLocationPicker = () => {
    setShowLocationMap(true);
    setLocationMessage('');
    setLocationConfirmed(false);
    if (!window.isSecureContext) {
      setLocationMessage('Location access requires HTTPS (or localhost). Open this app over a secure connection and try again.');
      return;
    }
    if (!navigator.geolocation) {
      setLocationMessage('This browser cannot provide a starting point. Try a browser with location access, or enter the address manually.');
      return;
    }
    setGettingLocation(true);
    setDevicePosition(null);
    setSelectedPosition(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords: position }) => {
        const nextPosition = { lat: position.latitude, lng: position.longitude };
        setDevicePosition({ ...nextPosition, accuracy: position.accuracy });
        setSelectedPosition(nextPosition);
        setLocationMessage(`Starting point · ±${Math.round(position.accuracy)} m. Move the pin to your location.`);
        setGettingLocation(false);
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Location access was denied. Allow location access in your browser and try again.'
          : error.code === error.POSITION_UNAVAILABLE
            ? 'Your device could not determine a location. Try again where GPS or Wi-Fi is available.'
            : 'Location timed out. Check your signal and try again.';
        setLocationMessage(message);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
  };

  const closeLocationMap = () => {
    setShowLocationMap(false);
    setGettingLocation(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (busy) return;

    if (!selectedPosition) {
      openLocationPicker();
      return;
    }
    if (!locationConfirmed) {
      setShowLocationMap(true);
      setLocationMessage('Review the pin and confirm your location before saving.');
      return;
    }

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
        coordinates: selectedPosition,
        locationConfirmed: true,
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
            <button
              type="button"
              onClick={openLocationPicker}
              disabled={gettingLocation}
              className="mt-2 inline-flex items-center gap-2 rounded border border-[#E2E5E5] bg-[#F5F3F1] px-3.5 py-2 text-xs font-sans font-semibold text-[#636563] transition-colors hover:bg-[#EBE7E5] disabled:cursor-wait disabled:opacity-60"
            >
              {gettingLocation ? <LoaderCircle size={14} className="animate-spin" /> : <MapPin size={14} />}
              Choose location on map
            </button>
            {locationMessage && <p role="status" className="text-[11px] text-[#636563]">{locationMessage}</p>}
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
                placeholder="Filled from pinned address"
                aria-label="Locality"
                aria-invalid={Boolean(errors.locality)}
                className={`${INPUT} min-w-0`}
              />
              <input
                id="charger-city"
                type="text"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="City from pin"
                aria-label="City"
                aria-invalid={Boolean(errors.city)}
                className={`${INPUT} min-w-0`}
              />
            </div>
            {errors.locality && <p className={ERROR}>{errors.locality}</p>}
            {errors.city && <p className={ERROR}>{errors.city}</p>}
          </div>
        </div>

      {showLocationMap && createPortal((
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeLocationMap();
          }}
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="live-location-title"
            className="w-full max-w-2xl overflow-hidden rounded-xl border border-[#E2E5E5] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#EBE7E5] px-4 py-3 sm:px-5">
              <div>
                <h2 id="live-location-title" className="font-sans text-sm font-semibold text-[#111111]">Choose charger location</h2>
                <p className="mt-0.5 text-[11px] text-[#747878]">Move the pin to the charger. Its address will appear in Address &amp; Landmark.</p>
              </div>
              <button type="button" aria-label="Close location map" onClick={closeLocationMap} className="rounded p-2 text-[#636563] transition-colors hover:bg-[#F5F3F1] hover:text-black"><X size={18} /></button>
            </div>
            {selectedPosition ? (
              <div ref={locationMapContainerRef} className="h-[min(60vh,420px)] w-full bg-[#F5F3F1]" />
            ) : (
              <div className="flex h-[min(60vh,420px)] flex-col items-center justify-center gap-2 bg-[#F5F3F1] px-6 text-center text-[#636563]">
                <MapPin size={22} />
                <p className="text-xs font-semibold">Waiting for your device location</p>
                <p className="max-w-sm text-[11px]">The map will appear around your approximate location. You can then drag the pin to the exact spot.</p>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-[#EBE7E5] bg-[#F5F3F1] px-4 py-3 sm:px-5">
              <div role="status" aria-live="polite" className="text-[11px] text-[#636563]">
                <p>{locationMessage || (gettingLocation ? 'Finding a starting point…' : devicePosition ? 'Move the pin to select the address.' : 'Waiting for a starting point…')}</p>
                <p className="mt-1 text-[10px]">Address data © OpenStreetMap contributors</p>
                {selectedPosition && (
                  <p className="mt-1 font-mono text-[10px] text-[#111111]">
                    {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}
                    {devicePosition && ` · starting point accuracy ±${Math.round(devicePosition.accuracy)} m`}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!selectedPosition && !gettingLocation && (
                  <button type="button" onClick={openLocationPicker} className="rounded border border-[#E2E5E5] bg-white px-3 py-2 text-xs font-sans font-semibold text-[#111111] transition-colors hover:bg-[#EBE7E5]">Try again</button>
                )}
                <button
                  type="button"
                  disabled={!selectedPosition}
                  onClick={() => void confirmPinnedLocation()}
                  className="rounded bg-black px-4 py-2 text-xs font-sans font-semibold text-white transition-colors hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Confirm location
                </button>
              </div>
            </div>
          </section>
        </div>
      ), document.body)}

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
