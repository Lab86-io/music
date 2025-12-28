import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, sharedPlaylists } from "@/lib/db";
import { searchSpotifyTrack, createSpotifyPlaylist, addTracksToSpotifyPlaylist } from "@/lib/spotify";
import { generateAppleMusicToken, searchAppleMusicTrack, createAppleMusicPlaylist, addTracksToAppleMusicPlaylist } from "@/lib/apple-music";
import type { SpotifyTrack, AppleMusicTrack } from "@/types";

interface SpotifySession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface SharedTrack {
  name: string;
  artist: string;
  album: string;
  isrc?: string;
  duration_ms?: number;
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

// GET - Fetch shared playlist data (public, no auth required)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await db
      .select()
      .from(sharedPlaylists)
      .where(eq(sharedPlaylists.id, id))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Share link not found or has expired" },
        { status: 404 }
      );
    }

    const shared = result[0];
    const tracks = JSON.parse(shared.tracks) as SharedTrack[];

    return NextResponse.json({
      success: true,
      data: {
        id: shared.id,
        playlistName: shared.playlistName,
        sourceService: shared.sourceService,
        trackCount: shared.trackCount,
        tracks: tracks.map((t) => ({
          name: t.name,
          artist: t.artist,
          album: t.album,
        })),
        createdAt: shared.createdAt,
      },
    });
  } catch (error) {
    console.error("Get shared playlist error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch shared playlist" },
      { status: 500 }
    );
  }
}

// POST - Claim the shared playlist (imports to user's service)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { targetService, appleUserToken } = body;

    if (!targetService) {
      return NextResponse.json(
        { success: false, error: "Target service is required" },
        { status: 400 }
      );
    }

    // Fetch the shared playlist
    const result = await db
      .select()
      .from(sharedPlaylists)
      .where(eq(sharedPlaylists.id, id))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Share link not found or has already been claimed" },
        { status: 404 }
      );
    }

    const shared = result[0];
    const tracks = JSON.parse(shared.tracks) as SharedTrack[];

    let newPlaylistId: string;
    let matchedCount = 0;
    const matchResults: { name: string; artist: string; matched: boolean }[] = [];

    if (targetService === "spotify") {
      const session = await getSpotifySession();
      if (!session?.accessToken) {
        return NextResponse.json(
          { success: false, error: "Not authenticated with Spotify" },
          { status: 401 }
        );
      }

      // Create the playlist
      newPlaylistId = await createSpotifyPlaylist(
        session.accessToken,
        shared.playlistName,
        `Shared playlist from ${shared.sourceService === "spotify" ? "Spotify" : "Apple Music"}`,
        false
      );

      // Match and add tracks
      const trackUris: string[] = [];
      for (const track of tracks) {
        const query = `${track.name} ${track.artist}`;
        const found = await searchSpotifyTrack(session.accessToken, query, track.isrc);
        
        if (found) {
          trackUris.push(found.uri);
          matchedCount++;
          matchResults.push({ name: track.name, artist: track.artist, matched: true });
        } else {
          matchResults.push({ name: track.name, artist: track.artist, matched: false });
        }

        // Rate limiting
        await new Promise((r) => setTimeout(r, 50));
      }

      if (trackUris.length > 0) {
        await addTracksToSpotifyPlaylist(session.accessToken, newPlaylistId, trackUris);
      }
    } else if (targetService === "apple") {
      if (!appleUserToken) {
        return NextResponse.json(
          { success: false, error: "Not authenticated with Apple Music" },
          { status: 401 }
        );
      }

      const appleDevToken = await generateAppleMusicToken();

      // Create the playlist
      newPlaylistId = await createAppleMusicPlaylist(
        appleDevToken,
        appleUserToken,
        shared.playlistName,
        `Shared playlist from ${shared.sourceService === "spotify" ? "Spotify" : "Apple Music"}`
      );

      // Match and add tracks
      const trackIds: { id: string; type: "songs" | "library-songs" }[] = [];
      for (const track of tracks) {
        const query = `${track.name} ${track.artist}`;
        const found = await searchAppleMusicTrack(appleDevToken, query, track.isrc);
        
        if (found) {
          trackIds.push({ id: found.id, type: found.type as "songs" | "library-songs" });
          matchedCount++;
          matchResults.push({ name: track.name, artist: track.artist, matched: true });
        } else {
          matchResults.push({ name: track.name, artist: track.artist, matched: false });
        }

        // Rate limiting
        await new Promise((r) => setTimeout(r, 50));
      }

      if (trackIds.length > 0) {
        await addTracksToAppleMusicPlaylist(appleDevToken, appleUserToken, newPlaylistId, trackIds);
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid target service" },
        { status: 400 }
      );
    }

    // Delete the shared playlist (one-time use)
    await db.delete(sharedPlaylists).where(eq(sharedPlaylists.id, id));

    return NextResponse.json({
      success: true,
      data: {
        newPlaylistId,
        playlistName: shared.playlistName,
        totalTracks: tracks.length,
        matchedTracks: matchedCount,
        matchResults,
      },
    });
  } catch (error) {
    console.error("Claim shared playlist error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to claim shared playlist" },
      { status: 500 }
    );
  }
}

