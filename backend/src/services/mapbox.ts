import { EntryLocation } from '../types';

const GEOCODE_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const SEARCHBOX_URL = 'https://api.mapbox.com/search/searchbox/v1/forward';

// Search Box handles POIs/business names (cinemas, restaurants, brands) far
// better than the classic geocoder.
async function searchBox(name: string, token: string): Promise<[number, number] | null> {
  const url = `${SEARCHBOX_URL}?q=${encodeURIComponent(name)}&access_token=${token}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Mapbox searchbox failed for "${name}": ${res.status}`);
    return null;
  }
  const data = (await res.json()) as {
    features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
  };
  return data.features?.[0]?.geometry?.coordinates ?? null;
}

// Classic geocoder — strong for places/regions/countries.
async function geocodeClassic(name: string, token: string): Promise<[number, number] | null> {
  const url = `${GEOCODE_URL}/${encodeURIComponent(name)}.json?access_token=${token}&limit=1&types=country,region,place,locality,neighborhood,poi`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Mapbox geocode failed for "${name}": ${res.status}`);
    return null;
  }
  const data = (await res.json()) as { features?: Array<{ center?: [number, number] }> };
  return data.features?.[0]?.center ?? null;
}

// Forward-geocode a single place name: try Search Box (best for POIs) first,
// then fall back to the classic geocoder (best for cities/countries).
async function geocodeOne(name: string, token: string): Promise<EntryLocation | null> {
  const center = (await searchBox(name, token)) ?? (await geocodeClassic(name, token));
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
