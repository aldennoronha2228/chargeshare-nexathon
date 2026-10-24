import React, { useState } from 'react';

const INDIA_STATES_AND_UTS = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
  'Lakshadweep', 'Puducherry',
];

const COUNTRY_CODES = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW`.split(' ');
const REGION_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });
const COUNTRIES = COUNTRY_CODES.map((code) => ({ code, name: REGION_NAMES.of(code) ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name));

export interface SelectedLocation {
  countryCode: string;
  country: string;
  state: string;
  city: string;
  area: string;
  latitude: number;
  longitude: number;
}

interface MapTilerGeocodeResult { features?: Array<{ center?: [number, number]; text?: string }>; }
interface PhotonGeocodeResult {
  features?: Array<{
    geometry?: { coordinates?: [number, number] };
    properties?: { name?: string; city?: string; state?: string; country?: string; countrycode?: string };
  }>;
}
interface GeocodedLocation { latitude: number; longitude: number; suggestedArea?: string; }
interface PlaceCandidate { name: string; latitude: number; longitude: number; }
const GEOCODE_CACHE_PREFIX = 'chargeshare:area-geocode:v3:';
let lastGeocodeRequestAt = 0;

const OFFLINE_AREA_CENTRES: Record<string, { state: string; latitude: number; longitude: number }> = {
  bengaluru: { state: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
  bangalore: { state: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
  indiranagar: { state: 'Karnataka', latitude: 12.9784, longitude: 77.6408 },
  koramangala: { state: 'Karnataka', latitude: 12.9352, longitude: 77.6245 },
  jayanagar: { state: 'Karnataka', latitude: 12.925, longitude: 77.5938 },
  mangaluru: { state: 'Karnataka', latitude: 12.9141, longitude: 74.856 },
  pune: { state: 'Maharashtra', latitude: 18.5204, longitude: 73.8567 },
  mumbai: { state: 'Maharashtra', latitude: 19.076, longitude: 72.8777 },
  'delhi ncr': { state: 'Delhi', latitude: 28.6139, longitude: 77.209 },
  delhi: { state: 'Delhi', latitude: 28.6139, longitude: 77.209 },
  hyderabad: { state: 'Telangana', latitude: 17.385, longitude: 78.4867 },
  chennai: { state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707 },
};

const OFFLINE_AREA_LABELS: Record<string, string> = {
  bengaluru: 'Bengaluru', bangalore: 'Bengaluru', indiranagar: 'Indiranagar',
  koramangala: 'Koramangala', jayanagar: 'Jayanagar', mangaluru: 'Mangaluru',
  pune: 'Pune', mumbai: 'Mumbai', 'delhi ncr': 'Delhi NCR', delhi: 'Delhi',
  hyderabad: 'Hyderabad', chennai: 'Chennai',
};
const OFFLINE_AREA_ALIASES: Record<string, string> = {
  bangaluru: 'bengaluru',
  manglore: 'mangaluru',
  mangalore: 'mangaluru',
};

function normalizePlaceName(value: string): string {
  return value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function letterDistance(first: string, second: string): number {
  const a = normalizePlaceName(first);
  const b = normalizePlaceName(second);
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length];
}

function closestPlaceMatch(input: string, candidates: PlaceCandidate[]): PlaceCandidate | null {
  const normalizedInput = normalizePlaceName(input);
  if (normalizedInput.length < 3) return null;
  const ranked = candidates
    .filter((candidate) => Number.isFinite(candidate.latitude) && Number.isFinite(candidate.longitude) && normalizePlaceName(candidate.name))
    .map((candidate) => ({
      candidate,
      distance: letterDistance(input, candidate.name),
      similarity: 1 - letterDistance(input, candidate.name) / Math.max(normalizedInput.length, normalizePlaceName(candidate.name).length),
      prefixMatch: normalizePlaceName(candidate.name).startsWith(normalizedInput.slice(0, Math.min(3, normalizedInput.length))),
    }))
    .sort((a, b) => a.distance - b.distance || Number(b.prefixMatch) - Number(a.prefixMatch));
  const best = ranked[0];
  if (!best || best.similarity < 0.5) return null;
  return best.candidate;
}

function findOfflineAreaSuggestion(area: string, state: string): GeocodedLocation | null {
  if (!state) return null;
  const normalizedArea = area.trim().toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
  const aliasTarget = OFFLINE_AREA_ALIASES[normalizedArea];
  if (aliasTarget) {
    const aliasLocation = OFFLINE_AREA_CENTRES[aliasTarget];
    if (aliasLocation?.state === state) {
      return { latitude: aliasLocation.latitude, longitude: aliasLocation.longitude, suggestedArea: OFFLINE_AREA_LABELS[aliasTarget] };
    }
  }
  const candidates = Object.entries(OFFLINE_AREA_CENTRES)
    .filter(([, location]) => location.state === state)
    .map(([key, location]) => ({
      name: OFFLINE_AREA_LABELS[key] ?? key,
      latitude: location.latitude,
      longitude: location.longitude,
    }));
  const best = closestPlaceMatch(area, candidates);
  if (!best || normalizePlaceName(best.name) === normalizedArea) return null;
  return { latitude: best.latitude, longitude: best.longitude, suggestedArea: best.name };
}

async function geocodeLocation(area: string, city: string, state: string, countryCode: string, country: string): Promise<GeocodedLocation> {
  const query = [area.trim(), city.trim(), state.trim(), country].filter(Boolean).join(', ');
  const cacheKey = `${GEOCODE_CACHE_PREFIX}${query.toLowerCase()}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as GeocodedLocation;
  } catch { /* Storage may be unavailable; continue with the lookup. */ }

  const saveLocation = (location: GeocodedLocation) => {
    try { localStorage.setItem(cacheKey, JSON.stringify(location)); } catch { /* The search still succeeds without local caching. */ }
    return location;
  };
  try {
    const response = await fetch(`/api/geocoding/forward?${new URLSearchParams({ query }).toString()}`);
    if (response.ok) {
      const result = await response.json() as { latitude?: number; longitude?: number };
      if (typeof result.latitude === 'number' && Number.isFinite(result.latitude)
        && typeof result.longitude === 'number' && Number.isFinite(result.longitude)) {
        return saveLocation({ latitude: result.latitude, longitude: result.longitude });
      }
    }
  } catch { /* Use the existing map geocoder fallback if the server lookup is unavailable. */ }

  const mapTilerKey = import.meta.env.VITE_MAP_TILES_API_KEY;
  if (mapTilerKey) {
    try {
      const wait = Math.max(0, 1000 - (Date.now() - lastGeocodeRequestAt));
      if (wait) await new Promise((resolve) => window.setTimeout(resolve, wait));
      const endpoint = import.meta.env.VITE_GEOCODER_URL || 'https://api.maptiler.com/geocoding';
      const params = new URLSearchParams({ key: mapTilerKey, country: countryCode.toLowerCase(), limit: '5', language: 'en' });
      lastGeocodeRequestAt = Date.now();
      const response = await fetch(`${endpoint}/${encodeURIComponent(query)}.json?${params.toString()}`);
      if (response.ok) {
        const results = await response.json() as MapTilerGeocodeResult;
        const candidates = (results.features ?? []).flatMap((feature) => {
          if (!feature.text || !feature.center) return [];
          const [longitude, latitude] = feature.center;
          return [{ name: feature.text, latitude, longitude }];
        });
        const best = closestPlaceMatch(area.trim() || city, candidates) ?? (!area.trim() ? candidates[0] : null);
        const feature = best;
        const latitude = feature?.latitude ?? Number.NaN;
        const longitude = feature?.longitude ?? Number.NaN;
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          const suggestedArea = area.trim() ? best?.name.trim() : undefined;
          return saveLocation({
            latitude,
            longitude,
            ...(suggestedArea && normalizePlaceName(suggestedArea) !== normalizePlaceName(area) ? { suggestedArea } : {}),
          });
        }
      }
    } catch { /* Fall back to the typo-tolerant public geocoder below. */ }
  } else if (countryCode === 'IN') {
    const fallback = OFFLINE_AREA_CENTRES[area.trim().toLowerCase()];
    if (fallback && fallback.state === state) {
      return saveLocation({ latitude: fallback.latitude, longitude: fallback.longitude });
    }
    const suggestion = findOfflineAreaSuggestion(area, state);
    if (suggestion) return saveLocation(suggestion);
  }

  // Photon provides typo-tolerant place search when the optional MapTiler key
  // is absent or its exact query has no result. This runs only on form submit.
  try {
    const wait = Math.max(0, 1000 - (Date.now() - lastGeocodeRequestAt));
    if (wait) await new Promise((resolve) => window.setTimeout(resolve, wait));
    const params = new URLSearchParams({ q: query, limit: '5', lang: 'en' });
    lastGeocodeRequestAt = Date.now();
    const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`);
    if (response.ok) {
      const results = await response.json() as PhotonGeocodeResult;
      const candidates = (results.features ?? []).flatMap((feature) => {
        const coordinates = feature.geometry?.coordinates;
        const properties = feature.properties;
        if (!coordinates || !properties) return [];
        if (properties.countrycode && properties.countrycode.toUpperCase() !== countryCode) return [];
        const name = properties.name?.trim() || properties.city?.trim();
        if (!name) return [];
        const [longitude, latitude] = coordinates;
        return [{ name, latitude, longitude }];
      });
      const best = closestPlaceMatch(area.trim() || city, candidates) ?? (!area.trim() ? candidates[0] : null);
      if (best) {
        const suggestedArea = best.name;
        return saveLocation({
          latitude: best.latitude,
          longitude: best.longitude,
          ...(area.trim() && normalizePlaceName(suggestedArea) !== normalizePlaceName(area) ? { suggestedArea } : {}),
        });
      }
    }
  } catch { /* Show the local matching or lookup error below. */ }

  if (countryCode === 'IN') {
    const suggestion = findOfflineAreaSuggestion(area, state);
    if (suggestion) return saveLocation(suggestion);
  }
  throw new Error('We could not find that area. Check the spelling and try a nearby city or neighbourhood.');
}

interface LocationSelectionModalProps {
  onSubmit: (location: SelectedLocation) => Promise<void>;
}

export const LocationSelectionModal: React.FC<LocationSelectionModalProps> = ({ onSubmit }) => {
  const [countryCode, setCountryCode] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [state, setState] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [stateMenuOpen, setStateMenuOpen] = useState(false);
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState<{ area: string; latitude: number; longitude: number } | null>(null);
  const filteredCountries = COUNTRIES.filter(({ code, name }) =>
    `${name} ${code}`.toLocaleLowerCase().includes(countrySearch.trim().toLocaleLowerCase()),
  ).slice(0, 12);
  const filteredStates = INDIA_STATES_AND_UTS.filter((name) =>
    name.toLocaleLowerCase().includes(stateSearch.trim().toLocaleLowerCase()),
  );
  const totalSteps = countryCode === 'IN' || !countryCode ? 3 : 2;
  const currentStep = !countryCode ? 1
    : countryCode === 'IN' && !state ? 2
      : !city.trim() ? (countryCode === 'IN' ? 3 : 2)
        : totalSteps;

  const handleCountryKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setCountryMenuOpen(false);
    } else if (event.key === 'Enter' && countryMenuOpen && filteredCountries[0]) {
      event.preventDefault();
      const country = filteredCountries[0];
      setCountryCode(country.code);
      setCountrySearch(country.name);
      setState('');
      setStateSearch('');
      setCity('');
      setArea('');
      setSuggestion(null);
      setCountryMenuOpen(false);
    }
  };

  const handleStateKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setStateMenuOpen(false);
    } else if (event.key === 'Enter' && stateMenuOpen && filteredStates[0]) {
      event.preventDefault();
      setState(filteredStates[0]);
      setStateSearch(filteredStates[0]);
      setCity('');
      setArea('');
      setSuggestion(null);
      setStateMenuOpen(false);
    }
  };

  const confirmLocation = async (areaName: string, latitude: number, longitude: number) => {
    const country = COUNTRIES.find((item) => item.code === countryCode);
    if (!country) return;
    await onSubmit({ countryCode, country: country.name, state, city: city.trim(), area: areaName, latitude, longitude });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const country = COUNTRIES.find((item) => item.code === countryCode);
    if (!country || !city.trim() || (countryCode === 'IN' && !state)) return;
    setBusy(true);
    setError('');
    setSuggestion(null);
    try {
      const coordinates = await geocodeLocation(area, city, state, countryCode, country.name);
      if (area.trim() && coordinates.suggestedArea) {
        setSuggestion({ area: coordinates.suggestedArea, latitude: coordinates.latitude, longitude: coordinates.longitude });
      } else {
        await confirmLocation(area.trim(), coordinates.latitude, coordinates.longitude);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not find that location.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="charger-location-title" className="w-full max-w-lg space-y-5 rounded-2xl border border-[#3A3A3A] bg-[#121212] p-5 text-white shadow-2xl sm:p-7">
        <div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#BDBDBD]">Set your search area · Step {currentStep} of {totalSteps}</span>
          <h2 id="charger-location-title" className="mt-1 font-display text-xl font-bold text-white">Where do you need a charger?</h2>
          <p className="mt-1 text-xs text-[#BDBDBD]">Choose a country, state or region, then a city or neighbourhood.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label htmlFor="location-country-search" className="block text-xs font-semibold text-white">Country</label>
            <input id="location-country-search" role="combobox" aria-autocomplete="list" aria-expanded={countryMenuOpen} aria-controls="location-country-options" value={countrySearch} onFocus={() => setCountryMenuOpen(true)} onBlur={(event) => { if (!event.relatedTarget || !event.currentTarget.parentElement?.contains(event.relatedTarget as Node)) setCountryMenuOpen(false); }} onKeyDown={handleCountryKeyDown} onChange={(event) => { setCountrySearch(event.target.value); setCountryCode(''); setState(''); setStateSearch(''); setCity(''); setArea(''); setSuggestion(null); setCountryMenuOpen(true); }} placeholder="Search countries..." autoComplete="off" className="mt-1.5 w-full rounded-lg border border-[#555] bg-white px-3 py-3 text-sm text-black placeholder:text-[#777] focus:outline-none focus:ring-2 focus:ring-white" />
            {countryMenuOpen && <ul id="location-country-options" role="listbox" className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[#555] bg-[#1C1C1C] p-1 shadow-xl">
              {filteredCountries.length ? filteredCountries.map(({ code, name }) => <li key={code} role="option" aria-selected={countryCode === code}>
                <button type="button" onClick={() => { setCountryCode(code); setCountrySearch(name); setState(''); setStateSearch(''); setCity(''); setArea(''); setSuggestion(null); setCountryMenuOpen(false); }} className="w-full rounded-md px-3 py-2 text-left text-sm text-white hover:bg-white/10 focus:bg-white/10 focus:outline-none">{name}</button>
              </li>) : <li className="px-3 py-2 text-xs text-[#BDBDBD]">No countries match your search.</li>}
            </ul>}
          </div>
          {countryCode === 'IN' && <div className="relative">
            <label htmlFor="location-state-search" className="block text-xs font-semibold text-white">State or Union Territory</label>
            <input id="location-state-search" role="combobox" aria-autocomplete="list" aria-expanded={stateMenuOpen} aria-controls="location-state-options" value={stateSearch} onFocus={() => setStateMenuOpen(true)} onBlur={(event) => { if (!event.relatedTarget || !event.currentTarget.parentElement?.contains(event.relatedTarget as Node)) setStateMenuOpen(false); }} onKeyDown={handleStateKeyDown} onChange={(event) => { setStateSearch(event.target.value); setState(''); setCity(''); setArea(''); setSuggestion(null); setStateMenuOpen(true); }} placeholder="Search states and UTs..." autoComplete="off" className="mt-1.5 w-full rounded-lg border border-[#555] bg-white px-3 py-3 text-sm text-black placeholder:text-[#777] focus:outline-none focus:ring-2 focus:ring-white" />
            {stateMenuOpen && <ul id="location-state-options" role="listbox" className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[#555] bg-[#1C1C1C] p-1 shadow-xl">
              {filteredStates.length ? filteredStates.map((name) => <li key={name} role="option" aria-selected={state === name}>
                <button type="button" onClick={() => { setState(name); setStateSearch(name); setCity(''); setArea(''); setSuggestion(null); setStateMenuOpen(false); }} className="w-full rounded-md px-3 py-2 text-left text-sm text-white hover:bg-white/10 focus:bg-white/10 focus:outline-none">{name}</button>
              </li>) : <li className="px-3 py-2 text-xs text-[#BDBDBD]">No states or UTs match your search.</li>}
            </ul>}
          </div>}
          {countryCode && countryCode !== 'IN' && <label className="block text-xs font-semibold text-white">State, province or region <span className="font-normal text-[#BDBDBD]">(optional)</span>
            <input value={state} onChange={(event) => { setState(event.target.value); setCity(''); setArea(''); setSuggestion(null); }} placeholder="e.g. California" autoComplete="address-level1" className="mt-1.5 w-full rounded-lg border border-[#555] bg-white px-3 py-3 text-sm text-black placeholder:text-[#777] focus:outline-none focus:ring-2 focus:ring-white" />
          </label>}
          {countryCode && (countryCode !== 'IN' || state) && <>
            <label className="block text-xs font-semibold text-white">City
              <input required value={city} onChange={(event) => { setCity(event.target.value); setSuggestion(null); }} placeholder="e.g. Bengaluru" autoComplete="address-level2" className="mt-1.5 w-full rounded-lg border border-[#555] bg-white px-3 py-3 text-sm text-black placeholder:text-[#777] focus:outline-none focus:ring-2 focus:ring-white" />
            </label>
            <label className="block text-xs font-semibold text-white">Area or neighbourhood <span className="font-normal text-[#BDBDBD]">(optional)</span>
              <input value={area} onChange={(event) => { setArea(event.target.value); setSuggestion(null); }} placeholder="e.g. Indiranagar" autoComplete="address-level3" className="mt-1.5 w-full rounded-lg border border-[#555] bg-white px-3 py-3 text-sm text-black placeholder:text-[#777] focus:outline-none focus:ring-2 focus:ring-white" />
            </label>
          </>}
          {error && <p role="alert" className="text-xs text-[#FF8A80]">{error}</p>}
          {suggestion && <div className="space-y-2 rounded-lg border border-[#555] bg-[#1C1C1C] p-3" role="status">
            <p className="text-sm text-white">Did you mean <strong>{suggestion.area}</strong>?</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void confirmLocation(suggestion.area, suggestion.latitude, suggestion.longitude)} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black hover:bg-[#EAEAEA]">Use {suggestion.area}</button>
              <button type="button" onClick={() => void confirmLocation(area.trim(), suggestion.latitude, suggestion.longitude)} className="rounded-lg border border-[#777] px-3 py-2 text-xs font-semibold text-white hover:bg-white/10">Keep “{area.trim()}”</button>
            </div>
          </div>}
          <button type="submit" disabled={busy || !countryCode || (countryCode === 'IN' && !state) || !city.trim()} className="w-full rounded-lg border border-white bg-white px-4 py-3 text-sm font-bold text-black hover:bg-[#EAEAEA] disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? 'Finding your area…' : 'Show chargers in this area'}
          </button>
        </form>
        <p className="text-[10px] leading-relaxed text-[#BDBDBD]">Location lookup uses map geocoding. Map data attribution is shown on the map.</p>
      </section>
    </div>
  );
};



