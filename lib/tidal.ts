/**
 * TIDAL API v2 client (openapi.tidal.com) using client credentials.
 * JSON:API format: resources in `data`, related resources in `included`.
 */

const TIDAL_AUTH_URL = "https://auth.tidal.com/v1/oauth2/token";
const TIDAL_API_BASE = "https://openapi.tidal.com/v2";
const COUNTRY = "US";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getTidalToken(): Promise<string | null> {
  const clientId = process.env.TIDAL_CLIENT_ID;
  const clientSecret = process.env.TIDAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;
  try {
    const response = await fetch(TIDAL_AUTH_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.access_token) return null;
    cachedToken = {
      token: data.access_token,
      // refresh a minute before expiry
      expiresAt: Date.now() + Math.max(60, (data.expires_in ?? 3600) - 60) * 1000,
    };
    return cachedToken.token;
  } catch {
    return null;
  }
}

export function isTidalConfigured(): boolean {
  return Boolean(process.env.TIDAL_CLIENT_ID && process.env.TIDAL_CLIENT_SECRET);
}

/* eslint-disable @typescript-eslint/no-explicit-any */

interface JsonApiDoc {
  data?: any;
  included?: any[];
  links?: { next?: string };
}

async function tidalFetch(endpoint: string): Promise<JsonApiDoc | null> {
  const token = await getTidalToken();
  if (!token) return null;
  try {
    const response = await fetch(`${TIDAL_API_BASE}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.api+json",
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/** Normalized TIDAL item used by the converter engine. */
export interface TidalItem {
  id: string;
  type: "track" | "album" | "artist";
  title: string;
  artist: string;
  album?: string;
  isrc?: string;
  artworkUrl?: string;
  releaseDate?: string;
  duration?: number; // ms
  url: string;
}

function iso8601DurationToMs(value?: string): number | undefined {
  if (!value) return undefined;
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return undefined;
  const [, h, m, s] = match;
  return ((Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0)) * 1000;
}

function tidalUrl(type: string, id: string): string {
  return `https://tidal.com/browse/${type}/${id}`;
}

function pickArtwork(included: any[], resource: any): string | undefined {
  const artworkRef = resource?.relationships?.coverArt?.data?.[0]?.id;
  const artworks = (included ?? []).filter((i) => i.type === "artworks");
  const art = artworkRef
    ? artworks.find((a) => a.id === artworkRef) ?? artworks[0]
    : artworks[0];
  const files: any[] = art?.attributes?.files ?? [];
  // Prefer ~640px, fall back to the largest available
  const sorted = [...files].sort(
    (a, b) => (a.meta?.width ?? 0) - (b.meta?.width ?? 0)
  );
  const mid = sorted.find((f) => (f.meta?.width ?? 0) >= 600) ?? sorted[sorted.length - 1];
  return mid?.href;
}

function relatedNames(
  doc: JsonApiDoc,
  resource: any,
  relationship: string,
  type: string
): string[] {
  const refs: any[] = resource?.relationships?.[relationship]?.data ?? [];
  const ids = new Set(refs.map((r) => r.id));
  return (doc.included ?? [])
    .filter((i) => i.type === type && ids.has(i.id))
    .map((i) => i.attributes?.name ?? i.attributes?.title)
    .filter(Boolean);
}

function mapTrack(doc: JsonApiDoc, resource: any): TidalItem {
  const attr = resource.attributes ?? {};
  const artists = relatedNames(doc, resource, "artists", "artists");
  const albums = relatedNames(doc, resource, "albums", "albums");
  return {
    id: resource.id,
    type: "track",
    title: attr.title ?? "",
    artist: artists.join(", "),
    album: albums[0],
    isrc: attr.isrc,
    duration: iso8601DurationToMs(attr.duration),
    artworkUrl: pickArtwork(doc.included ?? [], resource),
    url: tidalUrl("track", resource.id),
  };
}

function mapAlbum(doc: JsonApiDoc, resource: any): TidalItem {
  const attr = resource.attributes ?? {};
  const artists = relatedNames(doc, resource, "artists", "artists");
  return {
    id: resource.id,
    type: "album",
    title: attr.title ?? "",
    artist: artists.join(", "),
    releaseDate: attr.releaseDate,
    artworkUrl: pickArtwork(doc.included ?? [], resource),
    url: tidalUrl("album", resource.id),
  };
}

function mapArtist(doc: JsonApiDoc, resource: any): TidalItem {
  const attr = resource.attributes ?? {};
  return {
    id: resource.id,
    type: "artist",
    title: attr.name ?? "",
    artist: attr.name ?? "",
    artworkUrl: pickArtwork(doc.included ?? [], resource),
    url: tidalUrl("artist", resource.id),
  };
}

export async function getTidalTrack(
  id: string,
  countryCode = COUNTRY
): Promise<TidalItem | null> {
  const doc = await tidalFetch(
    `/tracks/${id}?countryCode=${encodeURIComponent(countryCode)}&include=artists,albums,albums.coverArt`
  );
  if (!doc?.data) return null;
  const item = mapTrack(doc, doc.data);
  if (!item.artworkUrl) item.artworkUrl = pickArtwork(doc.included ?? [], null);
  return item;
}

export async function getTidalAlbum(id: string): Promise<TidalItem | null> {
  const doc = await tidalFetch(
    `/albums/${id}?countryCode=${COUNTRY}&include=artists,coverArt`
  );
  return doc?.data ? mapAlbum(doc, doc.data) : null;
}

export async function getTidalArtist(id: string): Promise<TidalItem | null> {
  const doc = await tidalFetch(
    `/artists/${id}?countryCode=${COUNTRY}&include=profileArt`
  );
  return doc?.data ? mapArtist(doc, doc.data) : null;
}

export async function getTidalTracksByIsrc(
  isrc: string,
  countryCode = COUNTRY
): Promise<TidalItem[]> {
  const doc = await tidalFetch(
    `/tracks?filter%5Bisrc%5D=${encodeURIComponent(isrc)}&countryCode=${encodeURIComponent(countryCode)}&include=artists,albums`
  );
  if (!doc?.data) return [];
  return (doc.data as any[]).map((r) => mapTrack(doc, r));
}

export async function searchTidal(
  query: string,
  type: "track" | "album" | "artist",
  countryCode = COUNTRY
): Promise<TidalItem[]> {
  const includeType = type === "track" ? "tracks" : type === "album" ? "albums" : "artists";
  const doc = await tidalFetch(
    `/searchResults/${encodeURIComponent(query)}?countryCode=${encodeURIComponent(countryCode)}&include=${includeType}`
  );
  if (!doc) return [];
  const resources = (doc.included ?? []).filter((i) => i.type === includeType);
  // Search results don't nest artist/album names; fetch details for the top hits
  const top = resources.slice(0, 5);
  if (type === "track") {
    const detailed = await Promise.all(top.map((r) => getTidalTrack(r.id, countryCode)));
    return detailed.filter(Boolean) as TidalItem[];
  }
  if (type === "album") {
    const detailed = await Promise.all(top.map((r) => getTidalAlbum(r.id)));
    return detailed.filter(Boolean) as TidalItem[];
  }
  return top.map((r) => mapArtist(doc, r));
}

// ---------------------------------------------------------------------------
// Playlists (public, readable with client credentials)
// ---------------------------------------------------------------------------

export interface TidalPlaylist {
  name: string;
  description: string | null;
  image: string | null;
  trackIds: string[];
}

export async function getTidalPlaylist(uuid: string): Promise<TidalPlaylist | null> {
  const doc = await tidalFetch(
    `/playlists/${uuid}?countryCode=${COUNTRY}&include=coverArt`
  );
  if (!doc?.data) return null;
  const attr = doc.data.attributes ?? {};

  const trackIds: string[] = [];
  let next: string | null =
    `/playlists/${uuid}/relationships/items?countryCode=${COUNTRY}`;
  let guard = 0;
  while (next && guard < 25) {
    guard += 1;
    const page: JsonApiDoc | null = await tidalFetch(next);
    if (!page?.data) break;
    for (const ref of page.data as any[]) {
      if (ref?.id) trackIds.push(String(ref.id));
    }
    next = page.links?.next ?? null;
  }

  return {
    name: attr.name ?? "TIDAL Playlist",
    description: attr.description ?? null,
    image: pickArtwork(doc.included ?? [], doc.data) ?? null,
    trackIds,
  };
}

/** Fetch full track details (artists, ISRC) for a list of track IDs, batched. */
export async function getTidalTracksByIds(ids: string[]): Promise<TidalItem[]> {
  const results: TidalItem[] = [];
  for (let i = 0; i < ids.length; i += 20) {
    const batch = ids.slice(i, i + 20);
    const doc = await tidalFetch(
      `/tracks?filter%5Bid%5D=${batch.join("%2C")}&countryCode=${COUNTRY}&include=artists,albums`
    );
    if (doc?.data) {
      for (const r of doc.data as any[]) results.push(mapTrack(doc, r));
    }
  }
  // Preserve playlist order
  const byId = new Map(results.map((t) => [t.id, t]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as TidalItem[];
}
