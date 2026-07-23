import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  readYouTubeSession,
  createYouTubePlaylist,
  searchYouTubeVideoId,
  addVideoToPlaylist,
} from "@/lib/youtube-oauth";
import { getSpotifyPlaylistTracks } from "@/lib/spotify";
import { getCachedAppleMusicToken, getAppleMusicPlaylistTracks } from "@/lib/apple-music";

interface ImportTrack {
  name: string;
  artist: string;
}

/**
 * Fetch a signed-in user's playlist tracks server-side, so the dashboard can
 * convert straight to YouTube without shipping the track list through the
 * client.
 */
async function fetchSourceTracks(
  source: { service: string; playlistId: string },
  appleUserToken: string | undefined
): Promise<ImportTrack[] | { error: string; status: number }> {
  if (source.service === "spotify") {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("spotify_session")?.value;
    if (!sessionCookie) return { error: "Not authenticated with Spotify", status: 401 };
    let session;
    try {
      session = JSON.parse(Buffer.from(sessionCookie, "base64").toString("utf-8"));
    } catch {
      return { error: "Invalid Spotify session", status: 401 };
    }
    if (!session?.accessToken) return { error: "Not authenticated with Spotify", status: 401 };
    const tracks = await getSpotifyPlaylistTracks(session.accessToken, source.playlistId);
    return tracks.map((t) => ({ name: t.name, artist: t.artists[0]?.name ?? "" }));
  }
  if (source.service === "apple") {
    if (!appleUserToken) return { error: "Missing Apple Music user token", status: 401 };
    const devToken = await getCachedAppleMusicToken();
    const tracks = await getAppleMusicPlaylistTracks(devToken, appleUserToken, source.playlistId, true);
    return tracks.map((t) => ({
      name: t.attributes?.name ?? "",
      artist: t.attributes?.artistName ?? "",
    }));
  }
  return { error: `Unsupported source service: ${source.service}`, status: 400 };
}

/**
 * Import tracks into the signed-in user's YouTube account as a new playlist.
 * Quota-aware: each track costs ~150 API units (search + insert), so the free
 * daily quota covers roughly 60 tracks; we stop cleanly when exhausted.
 *
 * POST { name, tracks: [{ name, artist }] }
 * POST { name, source: { service: "spotify"|"apple", playlistId }, appleUserToken? }
 */
export async function POST(request: Request) {
  const session = await readYouTubeSession();
  if (!session) {
    return NextResponse.json({ error: "Not connected to YouTube" }, { status: 401 });
  }

  let body: {
    name?: string;
    tracks?: ImportTrack[];
    source?: { service: string; playlistId: string };
    appleUserToken?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const name = body.name?.trim();
  let tracks = (body.tracks ?? []).filter((t) => t?.name);

  if (!tracks.length && body.source?.playlistId) {
    const fetched = await fetchSourceTracks(body.source, body.appleUserToken);
    if (!Array.isArray(fetched)) {
      return NextResponse.json({ error: fetched.error }, { status: fetched.status });
    }
    tracks = fetched.filter((t) => t.name);
  }

  if (!name || tracks.length === 0) {
    return NextResponse.json({ error: "Missing name or tracks" }, { status: 400 });
  }

  const playlistId = await createYouTubePlaylist(
    session,
    name,
    "Imported with Lab86 Convert (music.lab86.io)"
  );
  if (!playlistId) {
    return NextResponse.json(
      { error: "Could not create the YouTube playlist (quota or permissions)" },
      { status: 502 }
    );
  }

  let added = 0;
  let notFound = 0;
  let quotaExceeded = false;

  for (const track of tracks) {
    const search = await searchYouTubeVideoId(session, `${track.name} ${track.artist}`);
    if (search.quotaExceeded) {
      quotaExceeded = true;
      break;
    }
    if (!search.videoId) {
      notFound += 1;
      continue;
    }
    const result = await addVideoToPlaylist(session, playlistId, search.videoId);
    if (result.quotaExceeded) {
      quotaExceeded = true;
      break;
    }
    if (result.ok) added += 1;
    else notFound += 1;
  }

  return NextResponse.json({
    success: true,
    playlistId,
    playlistUrl: `https://music.youtube.com/playlist?list=${playlistId}`,
    added,
    notFound,
    total: tracks.length,
    quotaExceeded,
  });
}
