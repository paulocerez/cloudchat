import type { EntryLocation } from '@cloudchat/shared';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

// A bright street map inside a dark card is the loudest thing on the page, so
// the tiles follow the theme too. Passed in rather than read off the DOM: the
// URL has to change for React to fetch the other one.
const STYLE = { light: 'mapbox/streets-v12', dark: 'mapbox/dark-v11' } as const;
const PIN_COLOR = { light: '374151', dark: 'e5e7eb' } as const;

export function hasMapbox(): boolean {
  return Boolean(TOKEN);
}

// Build a Mapbox Static Images URL with a pin per location.
export function staticMapUrl(
  locations: EntryLocation[],
  width = 600,
  height = 240,
  theme: 'light' | 'dark' = 'light'
): string | null {
  if (!TOKEN || locations.length === 0) return null;

  const markers = locations
    .map((l) => `pin-s+${PIN_COLOR[theme]}(${l.longitude.toFixed(5)},${l.latitude.toFixed(5)})`)
    .join(',');

  // "auto" frames all markers; a single marker gets a sensible default zoom.
  const viewport = locations.length === 1 ? `${locations[0].longitude},${locations[0].latitude},9` : 'auto';

  return `https://api.mapbox.com/styles/v1/${STYLE[theme]}/static/${markers}/${viewport}/${width}x${height}@2x?access_token=${TOKEN}`;
}
