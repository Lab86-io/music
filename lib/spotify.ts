import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import type { SpotifyPlaylist, SpotifyTrack } from "@/types";

export function createSpotifyClient(accessToken: string) {
  return SpotifyApi.withAccessToken(
    process.env.SPOTIFY_CLIENT_ID!,
    {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: "",
    }
  );
}

export async function getSpotifyPlaylists(accessToken: string): Promise<SpotifyPlaylist[]> {
  const spotify = createSpotifyClient(accessToken);
  const playlists: SpotifyPlaylist[] = [];
  let offset = 0;
  const limit = 50;
  
  while (true) {
    const response = await spotify.currentUser.playlists.playlists(limit, offset);
    
    const mapped = response.items.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      images: p.images,
      tracks: {
        total: p.tracks?.total ?? 0,
        href: p.tracks?.href ?? "",
      },
      owner: {
        id: p.owner.id,
        display_name: p.owner.display_name || p.owner.id,
      },
      public: p.public ?? false,
      collaborative: p.collaborative,
    }));
    
    playlists.push(...mapped);
    
    if (response.items.length < limit || !response.next) {
      break;
    }
    offset += limit;
  }
  
  return playlists;
}

export async function getSpotifyPlaylistTracks(
  accessToken: string,
  playlistId: string
): Promise<SpotifyTrack[]> {
  const spotify = createSpotifyClient(accessToken);
  const tracks: SpotifyTrack[] = [];
  let offset = 0;
  const limit = 50 as const; // Max allowed by Spotify API
  
  while (true) {
    const response = await spotify.playlists.getPlaylistItems(
      playlistId,
      undefined,
      undefined,
      limit,
      offset
    );
    
    for (const item of response.items) {
      if (item.track && item.track.type === "track") {
        const track = item.track;
        tracks.push({
          id: track.id,
          name: track.name,
          artists: track.artists.map((a) => ({ id: a.id, name: a.name })),
          album: {
            id: track.album.id,
            name: track.album.name,
            images: track.album.images,
          },
          duration_ms: track.duration_ms,
          external_ids: track.external_ids,
          uri: track.uri,
        });
      }
    }
    
    if (response.items.length < limit || !response.next) {
      break;
    }
    offset += limit;
  }
  
  return tracks;
}

export async function createSpotifyPlaylist(
  accessToken: string,
  name: string,
  description: string,
  isPublic: boolean = false
): Promise<string> {
  const spotify = createSpotifyClient(accessToken);
  const user = await spotify.currentUser.profile();
  
  const playlist = await spotify.playlists.createPlaylist(user.id, {
    name,
    description,
    public: isPublic,
  });
  
  return playlist.id;
}

export async function addTracksToSpotifyPlaylist(
  accessToken: string,
  playlistId: string,
  trackUris: string[]
): Promise<void> {
  const spotify = createSpotifyClient(accessToken);
  
  // Spotify allows max 100 tracks per request
  const chunks: string[][] = [];
  for (let i = 0; i < trackUris.length; i += 100) {
    chunks.push(trackUris.slice(i, i + 100));
  }
  
  for (const chunk of chunks) {
    await spotify.playlists.addItemsToPlaylist(playlistId, chunk);
  }
}

export async function searchSpotifyTrack(
  accessToken: string,
  query: string,
  isrc?: string
): Promise<SpotifyTrack | null> {
  const spotify = createSpotifyClient(accessToken);
  
  // First try ISRC search if available
  if (isrc) {
    try {
      const isrcResult = await spotify.search(`isrc:${isrc}`, ["track"], undefined, 1);
      if (isrcResult.tracks.items.length > 0) {
        const track = isrcResult.tracks.items[0];
        return {
          id: track.id,
          name: track.name,
          artists: track.artists.map((a) => ({ id: a.id, name: a.name })),
          album: {
            id: track.album.id,
            name: track.album.name,
            images: track.album.images,
          },
          duration_ms: track.duration_ms,
          external_ids: track.external_ids,
          uri: track.uri,
        };
      }
    } catch {
      // ISRC search failed, fall through to text search
    }
  }
  
  // Fallback to text search
  try {
    const result = await spotify.search(query, ["track"], undefined, 1);
    if (result.tracks.items.length > 0) {
      const track = result.tracks.items[0];
      return {
        id: track.id,
        name: track.name,
        artists: track.artists.map((a) => ({ id: a.id, name: a.name })),
        album: {
          id: track.album.id,
          name: track.album.name,
          images: track.album.images,
        },
        duration_ms: track.duration_ms,
        external_ids: track.external_ids,
        uri: track.uri,
      };
    }
  } catch {
    return null;
  }
  
  return null;
}

/**
 * Get a public Spotify playlist using client credentials (no user auth required)
 * Works only for public playlists
 */
export async function getPublicSpotifyPlaylist(playlistId: string): Promise<{
  name: string;
  description: string | null;
  image: string | null;
  ownerName: string | null;
  tracks: SpotifyTrack[];
}> {
  // Use client credentials flow - no user authentication needed
  const spotify = SpotifyApi.withClientCredentials(
    process.env.SPOTIFY_CLIENT_ID!,
    process.env.SPOTIFY_CLIENT_SECRET!
  );

  // Get playlist metadata
  const playlist = await spotify.playlists.getPlaylist(playlistId);

  // Get all tracks with pagination
  const tracks: SpotifyTrack[] = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const response = await spotify.playlists.getPlaylistItems(
      playlistId,
      undefined,
      undefined,
      limit,
      offset
    );

    for (const item of response.items) {
      if (item.track && item.track.type === "track") {
        const track = item.track;
        tracks.push({
          id: track.id,
          name: track.name,
          artists: track.artists.map((a) => ({ id: a.id, name: a.name })),
          album: {
            id: track.album.id,
            name: track.album.name,
            images: track.album.images,
          },
          duration_ms: track.duration_ms,
          external_ids: track.external_ids,
          uri: track.uri,
        });
      }
    }

    if (response.items.length < limit || !response.next) {
      break;
    }
    offset += limit;
  }

  return {
    name: playlist.name,
    description: playlist.description,
    image: playlist.images?.[0]?.url || null,
    ownerName: playlist.owner.display_name || null,
    tracks,
  };
}

