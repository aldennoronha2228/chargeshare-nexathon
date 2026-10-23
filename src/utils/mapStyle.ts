/** Shared MapLibre style for both discovery and provider location picking. */
export function resolveMapStyle(): string {
  const apiKey = import.meta.env.VITE_MAP_TILES_API_KEY;
  if (apiKey?.trim()) {
    return `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`;
  }
  return 'https://tiles.openfreemap.org/styles/liberty';
}
