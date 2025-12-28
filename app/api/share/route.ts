import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { db, sharedPlaylists } from "@/lib/db";
import { getSpotifyPlaylistTracks } from "@/lib/spotify";
import { generateAppleMusicToken, getAppleMusicPlaylistTracks } from "@/lib/apple-music";
import type { SpotifyTrack, AppleMusicTrack } from "@/types";

interface SpotifySession {
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

async function getSpotifySession(): Promise<SpotifySession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("spotify_session")?.value;
  
  if (!sessionCookie) return null;
  
  try {
    return JSON.parse(Buffer.from(sessionCookie, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

interface SharedTrack {
  name: string;
  artist: string;
  album: string;
  albumArt?: string;
  isrc?: string;
  duration_ms?: number;
}

function extractTrackData(track: SpotifyTrack | AppleMusicTrack): SharedTrack {
  if ("name" in track && "artists" in track) {
    // Spotify track
    const spotifyTrack = track as SpotifyTrack;
    // Get smallest image (64x64) for efficiency, fallback to first available
    const albumArt = spotifyTrack.album.images
      ?.sort((a, b) => a.width - b.width)[0]?.url;
    return {
      name: spotifyTrack.name,
      artist: spotifyTrack.artists[0]?.name || "",
      album: spotifyTrack.album.name,
      albumArt,
      isrc: spotifyTrack.external_ids?.isrc,
      duration_ms: spotifyTrack.duration_ms,
    };
  } else {
    // Apple Music track
    const appleTrack = track as AppleMusicTrack;
    // Apple Music artwork URLs have {w}x{h} placeholders - replace with small size
    const albumArt = appleTrack.attributes.artwork?.url
      ?.replace("{w}", "64")
      .replace("{h}", "64");
    return {
      name: appleTrack.attributes.name,
      artist: appleTrack.attributes.artistName,
      album: appleTrack.attributes.albumName,
      albumArt,
      isrc: appleTrack.attributes.isrc,
      duration_ms: appleTrack.attributes.durationInMillis,
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceService, playlistId, playlistName, playlistImage, appleUserToken } = body;

    if (!sourceService || !playlistId || !playlistName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    let tracks: SharedTrack[] = [];
    let createdByName: string | null = null;

    if (sourceService === "spotify") {
      const session = await getSpotifySession();
      if (!session?.accessToken) {
        return NextResponse.json(
          { success: false, error: "Not authenticated with Spotify" },
          { status: 401 }
        );
      }

      // Capture the sharer's name for metadata
      createdByName = session.user?.name || null;

      const spotifyTracks = await getSpotifyPlaylistTracks(session.accessToken, playlistId);
      tracks = spotifyTracks.map(extractTrackData);
    } else if (sourceService === "apple") {
      if (!appleUserToken) {
        return NextResponse.json(
          { success: false, error: "Not authenticated with Apple Music" },
          { status: 401 }
        );
      }

      const appleDevToken = await generateAppleMusicToken();
      const appleTracks = await getAppleMusicPlaylistTracks(appleDevToken, appleUserToken, playlistId, true);
      tracks = appleTracks.map(extractTrackData);
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid source service" },
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
      playlistImage: playlistImage || null,
      sourceService,
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
        trackCount: tracks.length,
      },
    });
  } catch (error) {
    console.error("Share creation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create share link" },
      { status: 500 }
    );
  }
}

