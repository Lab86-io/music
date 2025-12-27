import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSpotifyPlaylists, getSpotifyPlaylistTracks } from "@/lib/spotify";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { success: false, error: "Not authenticated with Spotify" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get("playlistId");

    if (playlistId) {
      // Get tracks for a specific playlist
      const tracks = await getSpotifyPlaylistTracks(session.accessToken, playlistId);
      return NextResponse.json({ success: true, data: tracks });
    }

    // Get all playlists
    const playlists = await getSpotifyPlaylists(session.accessToken);
    return NextResponse.json({ success: true, data: playlists });
  } catch (error) {
    console.error("Spotify API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch from Spotify" },
      { status: 500 }
    );
  }
}


