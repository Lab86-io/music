import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateAppleMusicToken } from "@/lib/apple-music";

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const service = searchParams.get("service"); // "spotify" or "apple"
    const limit = parseInt(searchParams.get("limit") || "5");
    const appleUserToken = request.headers.get("Music-User-Token");

    if (!query || !service) {
      return NextResponse.json(
        { success: false, error: "Missing query or service parameter" },
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

      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: "Spotify search failed" },
          { status: response.status }
        );
      }

      const data = await response.json();
      const tracks = data.tracks?.items?.map((track: {
        id: string;
        uri: string;
        name: string;
        artists: Array<{ name: string }>;
        album: { name: string; images: Array<{ url: string }> };
        duration_ms: number;
      }) => ({
        id: track.id,
        uri: track.uri,
        name: track.name,
        artist: track.artists[0]?.name || "Unknown Artist",
        album: track.album.name,
        image: track.album.images[0]?.url,
        duration: track.duration_ms,
      })) || [];

      return NextResponse.json({ success: true, data: tracks });
    } else if (service === "apple") {
      if (!appleUserToken) {
        return NextResponse.json(
          { success: false, error: "Missing Apple Music user token" },
          { status: 401 }
        );
      }

      const devToken = await generateAppleMusicToken();

      const response = await fetch(
        `https://api.music.apple.com/v1/catalog/us/search?term=${encodeURIComponent(query)}&types=songs&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${devToken}`,
            "Music-User-Token": appleUserToken,
          },
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: "Apple Music search failed" },
          { status: response.status }
        );
      }

      const data = await response.json();
      const tracks = data.results?.songs?.data?.map((track: {
        id: string;
        type: string;
        attributes: {
          name: string;
          artistName: string;
          albumName: string;
          artwork?: { url: string };
          durationInMillis: number;
        };
      }) => ({
        id: track.id,
        type: track.type,
        name: track.attributes.name,
        artist: track.attributes.artistName,
        album: track.attributes.albumName,
        image: track.attributes.artwork?.url?.replace("{w}", "100").replace("{h}", "100"),
        duration: track.attributes.durationInMillis,
      })) || [];

      return NextResponse.json({ success: true, data: tracks });
    }

    return NextResponse.json(
      { success: false, error: "Invalid service" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { success: false, error: "Search failed" },
      { status: 500 }
    );
  }
}

