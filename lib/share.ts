import { nanoid } from "nanoid";
import { db, sharedPlaylists } from "@/lib/db";
import { getPublicSpotifyPlaylist } from "@/lib/spotify";
import { getPublicAppleMusicPlaylist } from "@/lib/apple-music";
import { getDeezerPlaylist, type DeezerTrack } from "@/lib/deezer";
import { getServiceName, type ParsedPlaylistUrl } from "@/lib/url-parser";
import type { SpotifyTrack, AppleMusicTrack } from "@/types";

export interface SharedTrack {
  name: string;
  artist: string;
  album: string;
  albumArt?: string;
  isrc?: string;
  duration_ms?: number;
}

export interface ShareCreationResult {
  shareId: string;
  shareUrl: string;
  playlistName: string;
  trackCount: number;
  service: string;
  image: string | null;
}

export class ShareError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function extractSpotifyTrackData(track: SpotifyTrack): SharedTrack {
  // Get smallest image (64x64) for efficiency, fallback to first available
  const albumArt = track.album.images?.sort((a, b) => a.width - b.width)[0]?.url;
  return {
    name: track.name,
    artist: track.artists[0]?.name || "",
    album: track.album.name,
    albumArt,
    isrc: track.external_ids?.isrc,
    duration_ms: track.duration_ms,
  };
}

function extractDeezerTrackData(track: DeezerTrack): SharedTrack {
  return {
    name: track.title,
    artist: track.artist?.name || "",
    album: track.album?.title || "",
    albumArt: track.album?.cover_medium,
    isrc: track.isrc,
    duration_ms: track.duration ? track.duration * 1000 : undefined,
  };
}

function extractAppleTrackData(track: AppleMusicTrack): SharedTrack {
  // Apple Music artwork URLs have {w}x{h} placeholders - replace with small size
  const albumArt = track.attributes.artwork?.url
    ?.replace("{w}", "64")
    .replace("{h}", "64");
  return {
    name: track.attributes.name,
    artist: track.attributes.artistName,
    album: track.attributes.albumName,
    albumArt,
    isrc: track.attributes.isrc,
    duration_ms: track.attributes.durationInMillis,
  };
}

/**
 * Fetch a public playlist, store it, and return a 48h share link.
 * Throws ShareError with an HTTP-appropriate status on failure.
 */
export async function createShareFromParsedUrl(
  parsed: ParsedPlaylistUrl,
  baseUrl: string
): Promise<ShareCreationResult> {
  let tracks: SharedTrack[] = [];
  let playlistName: string;
  let playlistImage: string | null = null;
  let createdByName: string | null = null;

  if (parsed.service === "spotify") {
    try {
      const playlist = await getPublicSpotifyPlaylist(parsed.playlistId);
      playlistName = playlist.name;
      playlistImage = playlist.image;
      createdByName = playlist.ownerName;
      tracks = playlist.tracks.map(extractSpotifyTrackData);
    } catch (error) {
      console.error("Spotify fetch error:", error);
      throw new ShareError(
        "Could not access this Spotify playlist. Make sure it's public.",
        403
      );
    }
  } else if (parsed.service === "deezer") {
    const playlist = await getDeezerPlaylist(parsed.playlistId);
    if (!playlist) {
      throw new ShareError(
        "Could not access this Deezer playlist. Make sure it's public.",
        403
      );
    }
    playlistName = playlist.title;
    playlistImage = playlist.picture_xl || playlist.picture_medium || null;
    createdByName = playlist.creator?.name || null;
    tracks = (playlist.tracks?.data ?? []).map(extractDeezerTrackData);
  } else {
    try {
      const playlist = await getPublicAppleMusicPlaylist(
        parsed.playlistId,
        parsed.storefront || "us"
      );
      playlistName = playlist.name;
      playlistImage = playlist.image;
      createdByName = playlist.curatorName;
      tracks = playlist.tracks.map(extractAppleTrackData);
    } catch (error) {
      console.error("Apple Music fetch error:", error);
      throw new ShareError(
        "Could not access this Apple Music playlist. Make sure 'Share on Web and in Search' is enabled.",
        403
      );
    }
  }

  if (tracks.length === 0) {
    throw new ShareError("Playlist appears to be empty", 400);
  }

  const shareId = nanoid(10);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await db.insert(sharedPlaylists).values({
    id: shareId,
    createdByName,
    playlistName,
    playlistImage,
    sourceService: parsed.service,
    tracks: JSON.stringify(tracks),
    trackCount: tracks.length,
    expiresAt,
  });

  return {
    shareId,
    shareUrl: `${baseUrl}/share/${shareId}`,
    playlistName,
    trackCount: tracks.length,
    service: getServiceName(parsed),
    image: playlistImage,
  };
}

/**
 * Derive the public base URL from an incoming request's headers.
 */
export function baseUrlFromRequest(request: Request): string {
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  return `${protocol}://${host}`;
}
