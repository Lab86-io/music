import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { addTracksToSpotifyPlaylist } from "@/lib/spotify";
import { generateAppleMusicToken, addTracksToAppleMusicPlaylist } from "@/lib/apple-music";

interface SpotifySession {
  accessToken: string;
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { service, playlistId, trackId, trackUri, trackType } = body;
    const appleUserToken = request.headers.get("Music-User-Token");

    if (!service || !playlistId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (service === "spotify") {
      const session = await getSpotifySession();
      if (!session?.accessToken) {
        return NextResponse.json(
          { success: false, error: "Not authenticated with Spotify" },
          { status: 401 }
        );
      }

      if (!trackUri) {
        return NextResponse.json(
          { success: false, error: "Missing track URI" },
          { status: 400 }
        );
      }

      await addTracksToSpotifyPlaylist(session.accessToken, playlistId, [trackUri]);
      return NextResponse.json({ success: true, message: "Track added to Spotify playlist" });
    } else if (service === "apple") {
      if (!appleUserToken) {
        return NextResponse.json(
          { success: false, error: "Missing Apple Music user token" },
          { status: 401 }
        );
      }

      if (!trackId || !trackType) {
        return NextResponse.json(
          { success: false, error: "Missing track ID or type" },
          { status: 400 }
        );
      }

      const devToken = await generateAppleMusicToken();
      await addTracksToAppleMusicPlaylist(devToken, appleUserToken, playlistId, [
        { id: trackId, type: trackType as "songs" | "library-songs" },
      ]);
      return NextResponse.json({ success: true, message: "Track added to Apple Music playlist" });
    }

    return NextResponse.json(
      { success: false, error: "Invalid service" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Add track error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add track" },
      { status: 500 }
    );
  }
}

