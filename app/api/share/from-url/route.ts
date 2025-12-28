import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db, sharedPlaylists } from "@/lib/db";
import { getPublicSpotifyPlaylist } from "@/lib/spotify";
import { getPublicAppleMusicPlaylist } from "@/lib/apple-music";
import { parsePlaylistUrl, getServiceName } from "@/lib/url-parser";
import type { SpotifyTrack, AppleMusicTrack } from "@/types";

interface SharedTrack {
  name: string;
  artist: string;
  album: string;
  albumArt?: string;
  isrc?: string;
  duration_ms?: number;
}

function extractSpotifyTrackData(track: SpotifyTrack): SharedTrack {
  // Get smallest image (64x64) for efficiency, fallback to first available
  const albumArt = track.album.images
    ?.sort((a, b) => a.width - b.width)[0]?.url;
  return {
    name: track.name,
    artist: track.artists[0]?.name || "",
    album: track.album.name,
    albumArt,
    isrc: track.external_ids?.isrc,
    duration_ms: track.duration_ms,
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing playlist URL" },
        { status: 400 }
      );
    }

    // Parse the URL to determine service and playlist ID
    const parsed = parsePlaylistUrl(url);
    if (!parsed) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid playlist URL. Please provide a Spotify or Apple Music playlist link." 
        },
        { status: 400 }
      );
    }

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
        return NextResponse.json(
          { 
            success: false, 
            error: "Could not access this Spotify playlist. Make sure it's public." 
          },
          { status: 403 }
        );
      }
    } else if (parsed.service === "apple") {
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
        return NextResponse.json(
          { 
            success: false, 
            error: "Could not access this Apple Music playlist. Make sure 'Share on Web and in Search' is enabled." 
          },
          { status: 403 }
        );
      }
    }

    if (tracks.length === 0) {
      return NextResponse.json(
        { success: false, error: "Playlist appears to be empty" },
        { status: 400 }
      );
    }

    // Generate a short, URL-safe ID
    const shareId = nanoid(10);

    // Links expire after 48 hours
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Store in database
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

    // Generate share URL using the request's origin
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;
    const shareUrl = `${baseUrl}/share/${shareId}`;

    return NextResponse.json({
      success: true,
      data: {
        shareId,
        shareUrl,
        playlistName,
        trackCount: tracks.length,
        service: getServiceName(parsed),
        image: playlistImage,
      },
    });
  } catch (error) {
    console.error("Public share creation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create share link" },
      { status: 500 }
    );
  }
}

// Also support GET for simpler shortcut integration (URL as query param)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { success: false, error: "Missing 'url' query parameter" },
      { status: 400 }
    );
  }

  // Create a mock request body and call POST logic
  const mockRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ url }),
  });

  return POST(mockRequest);
}

