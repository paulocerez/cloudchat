import { EntryLocation, PlaceSuggestion } from '../types';

const GEOCODE_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const SEARCHBOX_URL = 'https://api.mapbox.com/search/searchbox/v1/forward';

function toSuggestion(
  name: string,
  context: string,
  longitude: number,
  latitude: number
): PlaceSuggestion {
  const trimmed = context.trim().replace(/^,\s*/, '');
  // The full context disambiguates in the picker, but a saved chip only needs
  // enough of it to be unambiguous — street and city, not the country too.
  const short = trimmed.split(',').slice(0, 2).join(',').trim();
  return {
    name,
    context: trimmed,
    label: short ? `${name}, ${short}` : name,
    longitude,
    latitude,
  };
}

// Search Box handles POIs/business names (cinemas, restaurants, brands) far
// better than the classic geocoder.
async function searchBox(q: string, token: string, limit: number): Promise<PlaceSuggestion[]> {
  const url = `${SEARCHBOX_URL}?q=${encodeURIComponent(q)}&access_token=${token}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Mapbox searchbox failed for "${q}": ${res.status}`);
    return [];
  }
  const data = (await res.json()) as {
    features?: Array<{
      properties?: { name?: string; place_formatted?: string; full_address?: string };
      geometry?: { coordinates?: [number, number] };
    }>;
  };
  return (data.features ?? []).flatMap((f) => {
    const name = f.properties?.name;
    const coords = f.geometry?.coordinates;
    if (!name || !coords) return [];
    const context = f.properties?.place_formatted ?? f.properties?.full_address ?? '';
    return [toSuggestion(name, context, coords[0], coords[1])];
  });
}

// Classic geocoder — strong for places/regions/countries.
async function geocodeClassic(q: string, token: string, limit: number): Promise<PlaceSuggestion[]> {
  const url = `${GEOCODE_URL}/${encodeURIComponent(q)}.json?access_token=${token}&limit=${limit}&types=country,region,place,locality,neighborhood,poi`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Mapbox geocode failed for "${q}": ${res.status}`);
    return [];
  }
  const data = (await res.json()) as {
    features?: Array<{ text?: string; place_name?: string; center?: [number, number] }>;
  };
  return (data.features ?? []).flatMap((f) => {
    const name = f.text;
    const center = f.center;
    if (!name || !center) return [];
    // place_name is "Text, rest of the context" — keep only the remainder.
    const context = (f.place_name ?? '').startsWith(name)
      ? (f.place_name ?? '').slice(name.length)
      : (f.place_name ?? '');
    return [toSuggestion(name, context, center[0], center[1])];
  });
}

// A place is "the same place" if it shares a label or lands within ~10m of one
// we already have — the two endpoints often return the same POI.
function dedupe(suggestions: PlaceSuggestion[], limit: number): PlaceSuggestion[] {
  const seen = new Set<string>();
  const out: PlaceSuggestion[] = [];
  for (const s of suggestions) {
    const key = `${s.label.toLowerCase()}|${s.longitude.toFixed(4)},${s.latitude.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length === limit) break;
  }
  return out;
}

// Search both endpoints and return the candidates for the user to choose from.
// Search Box first (POIs are what people usually mean), classic after it.
export async function searchPlaces(q: string, limit = 6): Promise<PlaceSuggestion[]> {
  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    console.warn('MAPBOX_TOKEN not set — skipping place search');
    return [];
  }
  const trimmed = q.trim();
  if (!trimmed) return [];

  const [box, classic] = await Promise.all([
    searchBox(trimmed, token, Math.min(limit + 4, 10)),
    geocodeClassic(trimmed, token, 5),
  ]);
  return dedupe([...box, ...classic], limit);
}

// Forward-geocode a single place name, keeping the caller's name for the pin:
// the AI scan labels pins with the phrase it extracted, not Mapbox's wording.
async function geocodeOne(name: string): Promise<EntryLocation | null> {
  const [best] = await searchPlaces(name, 1);
  if (!best) return null;
  return { name, longitude: best.longitude, latitude: best.latitude };
}

// Geocode a list of place names, de-duplicating and dropping ones that fail.
export async function geocodePlaces(names: string[]): Promise<EntryLocation[]> {
  if (!process.env.MAPBOX_TOKEN) {
    console.warn('MAPBOX_TOKEN not set — skipping geocoding');
    return [];
  }

  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const results = await Promise.all(unique.map((n) => geocodeOne(n)));
  return results.filter((r): r is EntryLocation => r !== null);
}
