import * as jose from "jose";
import type { AppleMusicPlaylist, AppleMusicTrack } from "@/types";

const APPLE_MUSIC_API_BASE = "https://api.music.apple.com/v1";

/**
 * Generate a developer token for Apple Music API
 * This token is used to authenticate API requests server-side
 */
export async function generateAppleMusicToken(): Promise<string> {
  const teamId = process.env.APPLE_TEAM_ID!;
  const keyId = process.env.APPLE_KEY_ID!;
  const privateKey = process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n");

  const key = await jose.importPKCS8(privateKey, "ES256");
  
  const token = await new jose.SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime("180d") // Max 180 days
    .sign(key);

  return token;
}

/**
 * Make an authenticated request to the Apple Music API
 */
async function appleMusicFetch(
  endpoint: string,
  developerToken: string,
  userToken?: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${developerToken}`,
    "Content-Type": "application/json",
  };

  if (userToken) {
    headers["Music-User-Token"] = userToken;
  }

  const response = await fetch(`${APPLE_MUSIC_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Apple Music API error: ${response.status} - ${error}`);
  }

  return response;
}

/**
 * Get user's library playlists from Apple Music
 */
export async function getAppleMusicPlaylists(
  developerToken: string,
  userToken: string
): Promise<AppleMusicPlaylist[]> {
  const playlists: AppleMusicPlaylist[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await appleMusicFetch(
      `/me/library/playlists?limit=${limit}&offset=${offset}`,
      developerToken,
      userToken
    );

    const data = await response.json();
    
    if (data.data) {
      playlists.push(...data.data);
    }

    if (!data.next || data.data?.length < limit) {
      break;
    }
    offset += limit;
  }

  return playlists;
}

/**
 * Get tracks from an Apple Music playlist
 */
export async function getAppleMusicPlaylistTracks(
  developerToken: string,
  userToken: string,
  playlistId: string,
  isLibraryPlaylist: boolean = true
): Promise<AppleMusicTrack[]> {
  const tracks: AppleMusicTrack[] = [];
  const baseEndpoint = isLibraryPlaylist
    ? `/me/library/playlists/${playlistId}/tracks`
    : `/catalog/us/playlists/${playlistId}/tracks`;
  
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await appleMusicFetch(
      `${baseEndpoint}?limit=${limit}&offset=${offset}`,
      developerToken,
      userToken
    );

    const data = await response.json();
    
    if (data.data) {
      tracks.push(...data.data);
    }

    if (!data.next || data.data?.length < limit) {
      break;
    }
    offset += limit;
  }

  return tracks;
}

/**
 * Create a new playlist in user's Apple Music library
 */
export async function createAppleMusicPlaylist(
  developerToken: string,
  userToken: string,
  name: string,
  description?: string
): Promise<string> {
  const response = await appleMusicFetch(
    "/me/library/playlists",
    developerToken,
    userToken,
    {
      method: "POST",
      body: JSON.stringify({
        attributes: {
          name,
          description: description || "",
        },
      }),
    }
  );

  const data = await response.json();
  return data.data[0].id;
}

/**
 * Add tracks to an Apple Music playlist
 */
export async function addTracksToAppleMusicPlaylist(
  developerToken: string,
  userToken: string,
  playlistId: string,
  trackIds: { id: string; type: "songs" | "library-songs" }[]
): Promise<void> {
  // Apple Music allows up to 100 tracks per request
  const chunks: typeof trackIds[] = [];
  for (let i = 0; i < trackIds.length; i += 100) {
    chunks.push(trackIds.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    await appleMusicFetch(
      `/me/library/playlists/${playlistId}/tracks`,
      developerToken,
      userToken,
      {
        method: "POST",
        body: JSON.stringify({
          data: chunk,
        }),
      }
    );
  }
}

/**
 * Search for a track in Apple Music catalog
 */
export async function searchAppleMusicTrack(
  developerToken: string,
  query: string,
  isrc?: string,
  storefront: string = "us"
): Promise<AppleMusicTrack | null> {
  // First try ISRC search if available
  if (isrc) {
    try {
      const response = await appleMusicFetch(
        `/catalog/${storefront}/songs?filter[isrc]=${isrc}`,
        developerToken
      );
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        return data.data[0];
      }
    } catch {
      // ISRC search failed, fall through to text search
    }
  }

  // Fallback to text search
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await appleMusicFetch(
      `/catalog/${storefront}/search?term=${encodedQuery}&types=songs&limit=1`,
      developerToken
    );
    const data = await response.json();
    if (data.results?.songs?.data?.length > 0) {
      return data.results.songs.data[0];
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Get song details by catalog ID (useful for getting ISRC from library songs)
 */
export async function getAppleMusicSongDetails(
  developerToken: string,
  catalogId: string,
  storefront: string = "us"
): Promise<AppleMusicTrack | null> {
  try {
    const response = await appleMusicFetch(
      `/catalog/${storefront}/songs/${catalogId}`,
      developerToken
    );
    const data = await response.json();
    if (data.data && data.data.length > 0) {
      return data.data[0];
    }
  } catch {
    return null;
  }
  return null;
}

