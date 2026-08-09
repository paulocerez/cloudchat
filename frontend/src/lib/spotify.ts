export type SpotifyKind = 'track' | 'album' | 'playlist' | 'episode' | 'show' | 'artist';

export interface SpotifyLink {
  kind: SpotifyKind;
  id: string;
  url: string;
}

const SPOTIFY_RE =
  /https?:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album|playlist|episode|show|artist)\/([a-zA-Z0-9]+)(?:\?\S*)?/gi;

export function extractSpotifyLinks(content: string): SpotifyLink[] {
  const links: SpotifyLink[] = [];
  const seen = new Set<string>();
  for (const match of content.matchAll(SPOTIFY_RE)) {
    const kind = match[1].toLowerCase() as SpotifyKind;
    const id = match[2];
    const key = `${kind}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ kind, id, url: match[0] });
  }
  return links;
}

export function spotifyEmbedUrl(link: SpotifyLink): string {
  return `https://open.spotify.com/embed/${link.kind}/${link.id}`;
}

/** Remove bare Spotify URLs from text so the embed doesn't duplicate the link. */
export function stripSpotifyLinks(content: string): string {
  return content.replace(SPOTIFY_RE, '').replace(/\s{2,}/g, ' ').trim();
}

/** Fetch a human-readable title via Spotify's public oEmbed endpoint. */
export async function fetchSpotifyTitle(link: SpotifyLink): Promise<string | null> {
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(link.url)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return data.title?.trim() || null;
  } catch {
    return null;
  }
}
