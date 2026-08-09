import type { EntryLocation } from '@cloudchat/shared';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const STYLE = 'mapbox/streets-v12';
const PIN_COLOR = '374151'; // gray-700

export function hasMapbox(): boolean {
  return Boolean(TOKEN);
}

// Build a Mapbox Static Images URL with a pin per location.
export function staticMapUrl(
  locations: EntryLocation[],
  width = 600,
  height = 240
): string | null {
  if (!TOKEN || locations.length === 0) return null;

  const markers = locations
    .map((l) => `pin-s+${PIN_COLOR}(${l.longitude.toFixed(5)},${l.latitude.toFixed(5)})`)
    .join(',');

  // "auto" frames all markers; a single marker gets a sensible default zoom.
  const viewport = locations.length === 1 ? `${locations[0].longitude},${locations[0].latitude},9` : 'auto';

  return `https://api.mapbox.com/styles/v1/${STYLE}/static/${markers}/${viewport}/${width}x${height}@2x?access_token=${TOKEN}`;
}
