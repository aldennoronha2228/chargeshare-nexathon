/**
 * geoUtils.ts — coordinate parsing and geo helpers.
 *
 * ChargeShare stores coordinates as degree-string pairs, e.g.:
 *   { lat: "12.9719° N", lng: "77.6412° E" }
 *
 * These helpers convert that format to decimal numbers so MapLibre can use them.
 */

import type { ChargerListing } from '../data/demoChargers';

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Parses a degree string like "12.9719° N", "77.6412° E",
 * "28.5603° N", "77.1613° E" into a signed decimal.
 *
 * Returns null when the string cannot be parsed (missing, empty, or invalid).
 */
export function parseDegreeString(raw: string | undefined | null): number | null {
  if (!raw || typeof raw !== 'string') return null;

  // Match: optional sign, digits, optional decimal, optional degree symbol, optional space, optional hemisphere
  const match = raw
    .trim()
    .match(/^([+-]?\d+(?:\.\d+)?)\s*°?\s*([NSEWnsew]?)$/);

  if (!match) return null;

  const value = parseFloat(match[1]);
  if (!isFinite(value)) return null;

  const hemi = match[2].toUpperCase();
  if (hemi === 'S' || hemi === 'W') return -value;
  return value;
}

/**
 * Extracts a valid [lng, lat] pair from a ChargerListing.
 * Returns null if either coordinate is missing or unparseable.
 * MapLibre uses [longitude, latitude] order.
 */
export function chargerLatLng(charger: ChargerListing): LatLng | null {
  const lat = parseDegreeString(charger.coordinates?.lat);
  const lng = parseDegreeString(charger.coordinates?.lng);

  if (lat === null || lng === null) return null;
  if (!isFinite(lat) || !isFinite(lng)) return null;

  // Sanity-check: valid lat/lng ranges
  if (lat < -90 || lat > 90) return null;
  if (lng < -180 || lng > 180) return null;

  return { lat, lng };
}

/**
 * Computes the geographic centre of a set of LatLng points.
 * Falls back to a default India-centre if the array is empty.
 */
export function centreOf(points: LatLng[]): LatLng {
  if (points.length === 0) return { lat: 20.5937, lng: 78.9629 }; // India centre
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  return { lat, lng };
}
