import { EntryLocation } from '../types';

const GEOCODE_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

// Forward-geocode a single place name to coordinates via the Mapbox Geocoding API.
async function geocodeOne(name: string, token: string): Promise<EntryLocation | null> {
  const url = `${GEOCODE_URL}/${encodeURIComponent(name)}.json?access_token=${token}&limit=1&types=country,region,place,locality,neighborhood,poi`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Mapbox geocode failed for "${name}": ${res.status}`);
    return null;
  }
  const data = (await res.json()) as { features?: Array<{ center?: [number, number] }> };
  const center = data.features?.[0]?.center;
  if (!center) return null;
  return { name, longitude: center[0], latitude: center[1] };
}

// Geocode a list of place names, de-duplicating and dropping ones that fail.
export async function geocodePlaces(names: string[]): Promise<EntryLocation[]> {
  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    console.warn('MAPBOX_TOKEN not set — skipping geocoding');
    return [];
  }

  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const results = await Promise.all(unique.map((n) => geocodeOne(n, token)));
  return results.filter((r): r is EntryLocation => r !== null);
}
