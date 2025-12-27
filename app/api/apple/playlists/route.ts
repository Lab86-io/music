import { NextResponse } from "next/server";
import { generateAppleMusicToken, getAppleMusicPlaylists, getAppleMusicPlaylistTracks } from "@/lib/apple-music";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = request.headers.get("Music-User-Token");
    const playlistId = searchParams.get("playlistId");

    if (!userToken) {
      return NextResponse.json(
        { success: false, error: "Missing Apple Music user token" },
        { status: 401 }
      );
    }

    const developerToken = await generateAppleMusicToken();

    if (playlistId) {
      // Get tracks for a specific playlist
      const tracks = await getAppleMusicPlaylistTracks(
        developerToken,
        userToken,
        playlistId,
        true // library playlist
      );
      return NextResponse.json({ success: true, data: tracks });
    }

    // Get all playlists
    const playlists = await getAppleMusicPlaylists(developerToken, userToken);
    return NextResponse.json({ success: true, data: playlists });
  } catch (error) {
    console.error("Apple Music API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch from Apple Music" },
      { status: 500 }
    );
  }
}


