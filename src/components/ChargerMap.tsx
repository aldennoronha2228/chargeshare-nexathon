/**
 * ChargerMap — interactive MapLibre GL JS map for ChargeShare.
 *
 * Map tile provider: OpenFreeMap (https://openfreemap.org)
 *   • No API key required
 *   • Uses the "liberty" style — clean, readable, OSM-based
 *   • Style URL: https://tiles.openfreemap.org/styles/liberty
 *   • Attribution: © OpenFreeMap contributors, © OpenStreetMap contributors
 *   • Usage limits: free for reasonable use; see openfreemap.org/terms
 *
 *   If VITE_MAP_TILES_API_KEY is set in .env, the component switches to
 *   MapTiler's streets-v2 style which offers higher tile quality.
 *   MapTiler free plan: 100 k tile requests/month — suitable for demo.
 *   Style URL: https://api.maptiler.com/maps/streets-v2/style.json?key=YOUR_KEY
 *
 * Architecture:
 *   - Map instance is created once in useEffect([]) and stored in a ref
 *   - Markers are managed in a separate useEffect that diffs the charger list
 *   - The selected marker is highlighted without recreating the map
 *   - All MapLibre objects are disposed on unmount
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  AlertCircle,
  Loader2,
  Locate,
  MapPin,
  Navigation,
  X,
  Zap,
  Star,
} from 'lucide-react';
import type { ChargerListing } from '../data/demoChargers';
import { chargerLatLng, centreOf } from '../utils/geoUtils';
import { resolveMapStyle } from '../utils/mapStyle';

// ─── Map style ────────────────────────────────────────────────────────────────

// ─── SVG marker factory ───────────────────────────────────────────────────────

/**
 * Marker visual: a rounded price pill when the listing carries a tariff,
 * otherwise a bolt icon. The selected marker is inverted and slightly larger so
 * the current selection stands out on a busy map.
 */
function markerVisual(charger: ChargerListing, selected: boolean): { cssText: string; html: string } {
  const available = charger.availableNow;
  const hasPrice = Number.isFinite(charger.pricePerKwh) && charger.pricePerKwh > 0;

  const background = selected ? '#111111' : '#FFFFFF';
  const foreground = selected ? '#FFFFFF' : available ? '#1C1B1B' : '#747878';
  const border = selected ? '2px solid #FFFFFF' : '1px solid #C4C7C7';

  const cssText = `
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: ${selected ? '6px 11px' : '5px 9px'};
    border-radius: 999px;
    background: ${background};
    color: ${foreground};
    border: ${border};
    box-shadow: 0 2px 8px rgba(0,0,0,0.16);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 800;
    font-size: ${selected ? '13px' : '11px'};
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    transition: background 150ms, transform 150ms;
    transform: scale(${selected ? 1.06 : 1});
  `;

  const html = hasPrice
    ? `${selected && available ? '<span style="width:6px;height:6px;border-radius:50%;background:#22a06b;display:inline-block"></span>' : ''}₹${charger.pricePerKwh}`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="${selected ? 15 : 13}" height="${selected ? 15 : 13}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;

  return { cssText, html };
}

function createMarkerElement(charger: ChargerListing, selected: boolean): HTMLDivElement {
  const outer = document.createElement('div');
  outer.className = 'cs-map-marker';

  const visual = markerVisual(charger, selected);
  outer.style.cssText = visual.cssText;
  outer.innerHTML = visual.html;

  return outer;
}

// ─── Popup content ────────────────────────────────────────────────────────────

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function buildPopupHTML(charger: ChargerListing): string {
  const avail = charger.availableNow
    ? `<span style="background:#D8F36A;color:#173D2C;font-weight:700;font-size:10px;padding:2px 6px;border-radius:4px;text-transform:uppercase;">● Active</span>`
    : `<span style="background:#EDE8D8;color:#565A52;font-size:10px;padding:2px 6px;border-radius:4px;text-transform:uppercase;">○ Paused</span>`;

  const rating = charger.rating
    ? `<span style="font-size:11px;color:#565A52;">★ ${charger.rating.toFixed(1)} (${charger.reviewCount ?? 0})</span>`
    : '';

  return `
    <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:200px;max-width:240px;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:6px;">
        <div style="font-weight:700;font-size:13px;color:#22251F;line-height:1.3;">${escapeHtml(charger.title)}</div>
        ${avail}
      </div>
      <div style="font-size:11px;color:#565A52;margin-bottom:8px;">${escapeHtml(charger.locality)}, ${escapeHtml(charger.city)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:8px;">
        <div style="background:#EDE8D8;border-radius:4px;padding:4px 6px;text-align:center;">
          <div style="font-size:10px;color:#888;text-transform:uppercase;font-weight:600;">Power</div>
          <div style="font-size:12px;font-weight:700;color:#22251F;font-family:monospace;">${charger.powerKw} kW</div>
        </div>
        <div style="background:#EDE8D8;border-radius:4px;padding:4px 6px;text-align:center;">
          <div style="font-size:10px;color:#888;text-transform:uppercase;font-weight:600;">Price</div>
          <div style="font-size:12px;font-weight:700;color:#173D2C;font-family:monospace;">₹${charger.pricePerKwh}/${charger.pricingType === 'per_session' ? 'session' : 'kWh'}</div>
        </div>
        <div style="background:#EDE8D8;border-radius:4px;padding:4px 6px;text-align:center;">
          <div style="font-size:10px;color:#888;text-transform:uppercase;font-weight:600;">Dist</div>
          <div style="font-size:12px;font-weight:700;color:#22251F;font-family:monospace;">${charger.distanceKm === null ? '—' : `${charger.distanceKm} km`}</div>
        </div>
      </div>
      <div style="font-size:11px;color:#173D2C;background:#F6F3E9;border:1px solid #D8D5CA;border-radius:4px;padding:3px 7px;display:inline-block;margin-bottom:8px;">
        ${escapeHtml(charger.connector)}
      </div>
      ${rating ? `<div style="margin-bottom:8px;">${rating}</div>` : ''}
      <div data-charger-id="${charger.id}" style="width:100%;background:#173D2C;color:#D8F36A;border:none;border-radius:6px;padding:7px 0;font-size:12px;font-weight:700;cursor:pointer;text-align:center;">
        View Details →
      </div>
    </div>
  `;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChargerMapProps {
  /** The filtered charger list from the Find a Charger page — kept in sync. */
  chargers: ChargerListing[];
  selectedChargerId: string | null;
  onSelectCharger: (charger: ChargerListing) => void;
  onViewDetails: (charger: ChargerListing) => void;
  onUserLocation?: (location: { lat: number; lng: number }) => void;
  /** Height class — defaults to h-[420px] on mobile, h-[520px] on desktop */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ChargerMap: React.FC<ChargerMapProps> = ({
  chargers,
  selectedChargerId,
  onSelectCharger,
  onViewDetails,
  onUserLocation,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  // Map from charger.id → marker instance
  const markersRef   = useRef<Map<string, maplibregl.Marker>>(new Map());
  const popupRef     = useRef<maplibregl.Popup | null>(null);
  const chargersRef = useRef(chargers);
  const onSelectRef = useRef(onSelectCharger);
  const onViewDetailsRef = useRef(onViewDetails);
  chargersRef.current = chargers;
  onSelectRef.current = onSelectCharger;
  onViewDetailsRef.current = onViewDetails;

  const [mapReady,  setMapReady]  = useState(false);
  const [mapError,  setMapError]  = useState<string | null>(null);
  const [locating,  setLocating]  = useState(false);
  const [locError,  setLocError]  = useState<string | null>(null);
  const [missingCoordinates, setMissingCoordinates] = useState(0);

  // ── 1. Initialise map once ────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: maplibregl.Map;

    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: resolveMapStyle(),
        center: [78.9629, 20.5937], // India centre — overridden once chargers load
        zoom: 4,
        attributionControl: false,
        // Touch gestures
        touchZoomRotate: true,
        dragRotate: false, // keeps single-finger pan consistent on mobile
      });

      // Attribution in bottom-right (compact)
      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        'bottom-right',
      );

      // Zoom controls
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        'top-right',
      );

      map.on('load', () => setMapReady(true));

      map.on('error', (e) => {
        console.error('[ChargerMap] MapLibre error', e);
        // Only surface tile/style errors, not benign worker errors
        if (e.error && !String(e.error).includes('Worker')) {
          setMapError('Map failed to load. Check your internet connection or tile provider configuration.');
        }
      });

      mapRef.current = map;
    } catch (err) {
      console.error('[ChargerMap] Init error', err);
      setMapError('Map could not be initialised in this browser.');
    }

    return () => {
      // Clean up markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      popupRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Sync markers when chargers or selection changes ────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Close any open popup first
    popupRef.current?.remove();

    const validChargers = chargers.filter((c) => chargerLatLng(c) !== null);
    setMissingCoordinates(chargers.length - validChargers.length);

    // Remove markers that are no longer in the results
    const currentIds = new Set(chargers.map((c) => c.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add or update markers for current results
    validChargers.forEach((charger) => {
      const pos = chargerLatLng(charger)!;
      const isSelected = charger.id === selectedChargerId;

      const existing = markersRef.current.get(charger.id);
      if (existing) {
        // Restyle the existing marker element for the new state
        existing.setLngLat([pos.lng, pos.lat]);
        const el = existing.getElement();
        const visual = markerVisual(charger, isSelected);
        el.style.cssText = visual.cssText;
        el.innerHTML = visual.html;
      } else {
        // Create new marker
        const el = createMarkerElement(charger, isSelected);

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([pos.lng, pos.lat])
          .addTo(map);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const currentCharger = chargersRef.current.find((item) => item.id === charger.id);
          const currentPosition = currentCharger ? chargerLatLng(currentCharger) : null;
          if (!currentCharger || !currentPosition) return;
          onSelectRef.current(currentCharger);
          openPopup(map, currentCharger, currentPosition);
        });

        markersRef.current.set(charger.id, marker);
      }
    });

    // Fly to bounds of visible chargers
    if (validChargers.length > 0) {
      if (validChargers.length === 1) {
        const pos = chargerLatLng(validChargers[0])!;
        map.flyTo({ center: [pos.lng, pos.lat], zoom: 14, duration: 800 });
      } else {
        const lngs = validChargers.map((c) => chargerLatLng(c)!.lng);
        const lats = validChargers.map((c) => chargerLatLng(c)!.lat);
        const bounds = new maplibregl.LngLatBounds(
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        );
        map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
      }
    }
  }, [chargers, selectedChargerId, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3. Open popup for selected charger ────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedChargerId) return;

    const charger = chargers.find((c) => c.id === selectedChargerId);
    if (!charger) return;

    const pos = chargerLatLng(charger);
    if (!pos) return;

    openPopup(map, charger, pos);
  }, [chargers, selectedChargerId, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  function openPopup(
    map: maplibregl.Map,
    charger: ChargerListing,
    pos: { lat: number; lng: number },
  ) {
    popupRef.current?.remove();

    const popup = new maplibregl.Popup({
      offset: 18,
      closeButton: true,
      closeOnClick: false,
      maxWidth: '260px',
      className: 'cs-maplibre-popup',
    })
      .setLngLat([pos.lng, pos.lat])
      .setHTML(buildPopupHTML(charger))
      .addTo(map);

    // Wire the "View Details" button inside the popup
    popup.on('open', () => {
      const el = popup.getElement();
      const btn = el?.querySelector<HTMLDivElement>(`[data-charger-id="${charger.id}"]`);
      btn?.addEventListener('click', () => {
        popup.remove();
      const currentCharger = chargersRef.current.find((item) => item.id === charger.id);
      onViewDetailsRef.current(currentCharger ?? charger);
      });
    });

    popupRef.current = popup;

    map.easeTo({ center: [pos.lng, pos.lat], duration: 400 });
  }

  // ── 4. Locate Me ──────────────────────────────────────────────────────────
  const handleLocateMe = useCallback(() => {
    setLocError(null);
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        mapRef.current?.flyTo({
          center: [longitude, latitude],
          zoom: 13,
          duration: 800,
        });
        onUserLocation?.({ lat: latitude, lng: longitude });
        // Add a "you are here" marker
        const el = document.createElement('div');
        el.style.cssText = `
          width:16px;height:16px;border-radius:50%;
          background:#4A90E2;border:3px solid white;
          box-shadow:0 0 0 4px rgba(74,144,226,0.25);
        `;
        new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([longitude, latitude])
          .addTo(mapRef.current!);

        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocError('Location permission denied. Enable it in your browser settings and try again.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocError('Your location could not be determined.');
        } else {
          setLocError('Location request timed out. Try again.');
        }
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, [onUserLocation]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`cs-map-root relative w-full overflow-hidden rounded border-2 border-[#D8D5CA] ${className}`}>
      {/* Map container — must have explicit height */}
      <div
        ref={containerRef}
        className="w-full h-full"
        role="application"
        aria-label="Interactive charger location map"
      />

      {/* Loading overlay */}
      {!mapReady && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#EDE8D8] z-10">
          <div className="flex flex-col items-center gap-2 text-xs text-[#565A52]">
            <Loader2 className="w-6 h-6 animate-spin text-[#173D2C]" />
            <span>Loading map…</span>
          </div>
        </div>
      )}

      {/* Map error */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#EDE8D8] z-10 p-4">
          <div className="flex flex-col items-center gap-3 text-center max-w-xs">
            <AlertCircle className="w-8 h-8 text-[#B42318]" />
            <p className="text-sm font-semibold text-[#22251F]">Map unavailable</p>
            <p className="text-xs text-[#565A52]">{mapError}</p>
          </div>
        </div>
      )}

      {/* No coordinates warning (shown as a banner, not full overlay) */}
      {missingCoordinates > 0 && mapReady && (
        <div className="absolute top-2 left-2 right-2 z-10 flex items-start gap-2 bg-[#FFFAEB] border border-[#FEC84B] rounded px-3 py-2 text-xs text-[#7A4F00] shadow">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{missingCoordinates} listing{missingCoordinates === 1 ? '' : 's'} {missingCoordinates === 1 ? 'needs' : 'need'} an exact location. Ask the provider to update its map location.</span>
        </div>
      )}

      {/* Empty results banner */}
      {chargers.length === 0 && mapReady && (
        <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-2 bg-[#F6F3E9] border border-[#D8D5CA] rounded px-3 py-2 text-xs text-[#565A52] shadow">
          <MapPin className="w-4 h-4 shrink-0 text-[#888]" />
          <span>No chargers match the current filters — no markers to display.</span>
        </div>
      )}

      {/* Locate Me button */}
      <div className="absolute bottom-8 left-2 z-10 flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locating}
          aria-label="Locate me on the map"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#F6F3E9] border-2 border-[#D8D5CA] rounded shadow hover:border-[#173D2C] hover:bg-white transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {locating
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Locate className="w-3.5 h-3.5" />
          }
          {locating ? 'Locating…' : 'Locate me'}
        </button>

        {locError && (
          <div className="flex items-start gap-1.5 max-w-[220px] bg-[#FEE4E2] border border-[#FDA29B] rounded px-2.5 py-1.5 text-[11px] text-[#B42318] shadow">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{locError}</span>
            <button
              type="button"
              onClick={() => setLocError(null)}
              aria-label="Dismiss location error"
              className="ml-auto shrink-0 text-[#B42318] cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Attribution hint (OpenFreeMap / MapTiler) */}
      <div className="absolute bottom-1 left-2 z-10 text-[9px] text-[#888] pointer-events-none select-none">
        {import.meta.env.VITE_MAP_TILES_API_KEY ? '© MapTiler' : '© OpenFreeMap'} · © OpenStreetMap
      </div>
    </div>
  );
};
