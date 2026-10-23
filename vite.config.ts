import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function openStreetMapReverseGeocodingProxy() {
  const cachedLookups = new Map<string, { label: string; locality: string; city: string; expiresAt: number }>();
  let nextRequestAt = 0;
  let requestQueue = Promise.resolve();

  return {
    name: 'openstreetmap-reverse-geocoding-proxy',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use('/api/geocoding/reverse', async (request, response) => {
        response.setHeader('Content-Type', 'application/json');
        if (request.method !== 'GET') {
          response.statusCode = 405;
          response.end(JSON.stringify({ error: 'Method not allowed.' }));
          return;
        }

        try {
          const requestUrl = new URL(request.url ?? '/', 'http://localhost');
          const lat = Number(requestUrl.searchParams.get('lat'));
          const lng = Number(requestUrl.searchParams.get('lng'));
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            response.statusCode = 400;
            response.end(JSON.stringify({ error: 'Valid latitude and longitude are required.' }));
            return;
          }

          const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
          const cached = cachedLookups.get(cacheKey);
          if (cached && cached.expiresAt > Date.now()) {
            response.end(JSON.stringify({ label: cached.label, locality: cached.locality, city: cached.city }));
            return;
          }

          // Queue requests to respect the public Nominatim service's one-request-per-second policy.
          const runLookup = requestQueue.then(async () => {
            const delay = Math.max(0, nextRequestAt - Date.now());
            if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
            nextRequestAt = Date.now() + 1100;

            const upstreamUrl = new URL('https://nominatim.openstreetmap.org/reverse');
            upstreamUrl.searchParams.set('format', 'jsonv2');
            upstreamUrl.searchParams.set('addressdetails', '1');
            upstreamUrl.searchParams.set('zoom', '18');
            upstreamUrl.searchParams.set('lat', String(lat));
            upstreamUrl.searchParams.set('lon', String(lng));
            const upstream = await fetch(upstreamUrl, {
              headers: {
                'User-Agent': 'ChargeShareNexathon/1.0 (charger address lookup)',
                'Accept-Language': 'en',
              },
              signal: AbortSignal.timeout(12000),
            });
            const payload = await upstream.json() as {
              display_name?: string;
              address?: Record<string, string | undefined>;
              error?: string;
            };
            if (!upstream.ok || !payload.display_name) {
              throw new Error(payload.error || 'No mapped address was found for this pin.');
            }
            const address = payload.address ?? {};
            const locality = address.neighbourhood
              ?? address.suburb
              ?? address.quarter
              ?? address.city_district
              ?? address.village
              ?? address.hamlet
              ?? address.road
              ?? '';
            const city = address.city
              ?? address.town
              ?? address.municipality
              ?? address.county
              ?? address.state_district
              ?? address.village
              ?? '';
            const lookup = { label: payload.display_name, locality, city, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
            cachedLookups.set(cacheKey, lookup);
            return lookup;
          });
          requestQueue = runLookup.then(() => undefined, () => undefined);
          const lookup = await runLookup;
          response.end(JSON.stringify({ label: lookup.label, locality: lookup.locality, city: lookup.city }));
        } catch {
          response.statusCode = 502;
          response.end(JSON.stringify({ error: 'Could not find an address for this pin. Try moving the pin slightly or enter the address manually.' }));
        }
      });
    },
  };
}

export default defineConfig(() => ({
  plugins: [react(), tailwindcss(), openStreetMapReverseGeocodingProxy()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    hmr: process.env.DISABLE_HMR !== 'true',
    // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
}));
