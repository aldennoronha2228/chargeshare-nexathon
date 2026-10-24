import React, { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { db } from '../firebase';
import type { ClientLocation } from '../utils/bookings';

interface BookingLiveLocationMapProps {
  location: ClientLocation | null | undefined;
  chargerId?: string;
  chargerLocation?: ClientLocation | null;
  viewerLocation?: ClientLocation | null;
  updatedAt?: number;
}

/** Shows the booked station and, when shared, the client's live position. */
export const BookingLiveLocationMap: React.FC<BookingLiveLocationMapProps> = ({
  location,
  chargerId,
  chargerLocation,
  viewerLocation,
  updatedAt,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const stationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const clientMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [resolvedChargerLocation, setResolvedChargerLocation] = useState<ClientLocation | null>(chargerLocation ?? null);
  const station = chargerLocation ?? resolvedChargerLocation;
  const clientPoint = viewerLocation ?? location;

  useEffect(() => {
    setResolvedChargerLocation(chargerLocation ?? null);
    if (chargerLocation || !chargerId) return;
    let active = true;
    void getDoc(doc(db, 'public_chargers', chargerId)).then((snapshot) => {
      if (!active || !snapshot.exists()) return;
      const data = snapshot.data();
      const coords = data.coordinates;
      const lat = Number(coords?.lat);
      const lng = Number(coords?.lng);
      const isLegacyPlaceholder = lat === 12.9716 && lng === 77.5946;
      if (Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lng) && Math.abs(lng) <= 180
        && (data.locationConfirmed === true || !isLegacyPlaceholder)) {
        setResolvedChargerLocation({ lat, lng });
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [chargerId, chargerLocation?.lat, chargerLocation?.lng]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const initialPoint = station ?? clientPoint;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: initialPoint ? [initialPoint.lng, initialPoint.lat] : [78.9629, 20.5937],
      zoom: initialPoint ? 14 : 4,
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = map;
    return () => {
      stationMarkerRef.current?.remove();
      clientMarkerRef.current?.remove();
      map.remove();
      stationMarkerRef.current = null;
      clientMarkerRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (station) {
      const point: [number, number] = [station.lng, station.lat];
      if (!stationMarkerRef.current) {
        const element = document.createElement('div');
        element.setAttribute('aria-label', 'Charging station location');
        element.style.cssText = 'width:22px;height:22px;border-radius:50%;background:#111;border:4px solid white;box-shadow:0 1px 7px #0008';
        stationMarkerRef.current = new maplibregl.Marker({ element }).setLngLat(point).addTo(map);
      } else {
        stationMarkerRef.current.setLngLat(point);
      }
    } else {
      stationMarkerRef.current?.remove();
      stationMarkerRef.current = null;
    }

    if (clientPoint) {
      const point: [number, number] = [clientPoint.lng, clientPoint.lat];
      if (!clientMarkerRef.current) {
        const element = document.createElement('div');
        element.setAttribute('aria-label', 'Client live location');
        element.style.cssText = 'width:20px;height:20px;border-radius:50%;background:#2563EB;border:4px solid white;box-shadow:0 0 0 7px #2563EB44';
        clientMarkerRef.current = new maplibregl.Marker({ element }).setLngLat(point).addTo(map);
      } else {
        clientMarkerRef.current.setLngLat(point);
      }
    } else {
      clientMarkerRef.current?.remove();
      clientMarkerRef.current = null;
    }

    const points = [station, clientPoint].filter((point): point is ClientLocation => Boolean(point));
    if (points.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      points.forEach((point) => bounds.extend([point.lng, point.lat]));
      const fit = () => map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 500 });
      if (map.isStyleLoaded()) fit();
      else map.once('load', fit);
    } else if (points.length === 1) {
      const point = points[0];
      const center: [number, number] = [point.lng, point.lat];
      if (map.isStyleLoaded()) map.easeTo({ center, zoom: 14, duration: 500 });
      else map.once('load', () => map.flyTo({ center, zoom: 14, duration: 500 }));
    }
  }, [station?.lat, station?.lng, clientPoint?.lat, clientPoint?.lng]);

  return (
    <div className="overflow-hidden rounded-lg border border-[#D5D5D5]">
      <div ref={containerRef} className="h-52 w-full bg-[#F0F0F0]" aria-label="Booking locations map" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-white px-3 py-2 text-[11px] text-[#555]">
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#111]" />Charging station{station ? '' : ' location unavailable'}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" />{clientPoint ? (viewerLocation ? 'Your location' : `Client live${updatedAt ? ` · updated ${new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`) : 'Client location not shared'}</span>
      </div>
    </div>
  );
};
