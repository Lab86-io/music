/**
 * Deezer public API client. No authentication required.
 * https://developers.deezer.com/api
 */

const DEEZER_API_BASE = "https://api.deezer.com";

export interface DeezerTrack {
  id: number;
  title: string;
  isrc?: string;
  link: string;
  duration: number; // seconds
  preview?: string;
  release_date?: string;
  artist: { id: number; name: string };
  album: { id: number; title: string; cover_xl?: string; cover_medium?: string };
}

export interface DeezerAlbum {
  id: number;
  title: string;
  link: string;
  cover_xl?: string;
  cover_medium?: string;
  release_date?: string;
  genres?: { data: { name: string }[] };
  artist: { id: number; name: string };
}

export interface DeezerArtist {
  id: number;
  name: string;
  link: string;
  picture_xl?: string;
  picture_medium?: string;
}

export interface DeezerPlaylist {
  id: number;
  title: string;
  description?: string;
  link: string;
  picture_xl?: string;
  picture_medium?: string;
  creator?: { name: string };
  tracks: { data: DeezerTrack[] };
}

async function deezerFetch<T>(endpoint: string): Promise<T | null> {
  try {
    const response = await fetch(`${DEEZER_API_BASE}${endpoint}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.error) return null;
    return data as T;
  } catch {
    return null;
  }
}

export async function getDeezerTrack(id: string): Promise<DeezerTrack | null> {
  return deezerFetch<DeezerTrack>(`/track/${id}`);
}

export async function getDeezerTrackByIsrc(isrc: string): Promise<DeezerTrack | null> {
  return deezerFetch<DeezerTrack>(`/track/isrc:${encodeURIComponent(isrc)}`);
}

export async function getDeezerAlbum(id: string): Promise<DeezerAlbum | null> {
  return deezerFetch<DeezerAlbum>(`/album/${id}`);
}

export async function getDeezerArtist(id: string): Promise<DeezerArtist | null> {
  return deezerFetch<DeezerArtist>(`/artist/${id}`);
}

export async function getDeezerPlaylist(id: string): Promise<DeezerPlaylist | null> {
  return deezerFetch<DeezerPlaylist>(`/playlist/${id}`);
}

export async function searchDeezerTracks(query: string, limit = 10): Promise<DeezerTrack[]> {
  const data = await deezerFetch<{ data: DeezerTrack[] }>(
    `/search/track?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  return data?.data ?? [];
}

export async function searchDeezerAlbums(query: string, limit = 10): Promise<DeezerAlbum[]> {
  const data = await deezerFetch<{ data: DeezerAlbum[] }>(
    `/search/album?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  return data?.data ?? [];
}

export async function searchDeezerArtists(query: string, limit = 10): Promise<DeezerArtist[]> {
  const data = await deezerFetch<{ data: DeezerArtist[] }>(
    `/search/artist?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  return data?.data ?? [];
}

/**
 * Resolve a Deezer short link (link.deezer.com / deezer.page.link) to its
 * canonical URL by following redirects. Server-side only.
 */
export async function resolveDeezerShortLink(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });
    return response.url || null;
  } catch {
    return null;
  }
}
