import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ClientLocation } from '../utils/bookings';

interface BookingLiveLocationMapProps {
  location: ClientLocation | null | undefined;
  updatedAt?: number;
}

/** Small live map shown to a provider after the driver has shared location. */
export const BookingLiveLocationMap: React.FC<BookingLiveLocationMapProps> = ({ location, updatedAt }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: location ? [location.lng, location.lat] : [78.9629, 20.5937],
      zoom: location ? 15 : 4,
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = map;
    return () => {
      markerRef.current?.remove();
      map.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const point: [number, number] = [location.lng, location.lat];
    if (!markerRef.current) {
      const element = document.createElement('div');
      element.setAttribute('aria-label', 'Client live location');
      element.style.cssText = 'width:20px;height:20px;border-radius:50%;background:#2563EB;border:4px solid white;box-shadow:0 0 0 7px #2563EB44';
      markerRef.current = new maplibregl.Marker({ element }).setLngLat(point).addTo(map);
      map.once('load', () => map.flyTo({ center: point, zoom: 15, duration: 700 }));
    } else {
      markerRef.current.setLngLat(point);
      map.easeTo({ center: point, zoom: Math.max(map.getZoom(), 14), duration: 500 });
    }
  }, [location?.lat, location?.lng]);

  return (
    <div className="overflow-hidden rounded-lg border border-[#D5D5D5]">
      <div ref={containerRef} className="h-52 w-full bg-[#F0F0F0]" aria-label="Client live location map" />
      <p className="bg-white px-3 py-2 text-[11px] text-[#555]">
        {location
          ? `Client location live${updatedAt ? ` · updated ${new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`
          : 'Waiting for the client to share their location.'}
      </p>
    </div>
  );
};

