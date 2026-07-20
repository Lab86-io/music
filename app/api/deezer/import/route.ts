import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as stringSimilarity from "string-similarity";
import {
  validateArl,
  readDeezerArl,
  createDeezerPlaylist,
  addSongsToDeezerPlaylist,
  deezerPlaylistUrl,
} from "@/lib/deezer-arl";
import { getDeezerTrackByIsrc, searchDeezerTracks } from "@/lib/deezer";
import { getSpotifyPlaylistTracks } from "@/lib/spotify";
import { getCachedAppleMusicToken, getAppleMusicPlaylistTracks } from "@/lib/apple-music";
import { mapWithConcurrency } from "@/lib/import-utils";

interface ImportTrack {
  name: string;
  artist: string;
  isrc?: string;
}

interface DeezerMatch {
  id: string;
  method: "isrc" | "fuzzy";
}

function normalized(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function sim(a: string, b: string): number {
  return stringSimilarity.compareTwoStrings(normalized(a), normalized(b));
}

/** ISRC-first, fuzzy-fallback match to a Deezer track ID (public API). */
async function matchDeezerTrack(track: ImportTrack): Promise<DeezerMatch | null> {
  if (track.isrc) {
    const hit = await getDeezerTrackByIsrc(track.isrc);
    if (hit && sim(track.artist, hit.artist?.name ?? "") >= 0.4) {
      return { id: String(hit.id), method: "isrc" };
    }
    if (hit && !track.artist) return { id: String(hit.id), method: "isrc" };
  }
  const candidates = await searchDeezerTracks(`${track.name} ${track.artist}`, 5);
  for (const candidate of candidates) {
    const score =
      sim(track.name, candidate.title) * 0.6 + sim(track.artist, candidate.artist?.name ?? "") * 0.4;
    if (score >= 0.5) return { id: String(candidate.id), method: "fuzzy" };
  }
  return null;
}

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
    return tracks.map((t) => ({
      name: t.name,
      artist: t.artists[0]?.name ?? "",
      isrc: t.external_ids?.isrc,
    }));
  }
  if (source.service === "apple") {
    if (!appleUserToken) return { error: "Missing Apple Music user token", status: 401 };
    const devToken = await getCachedAppleMusicToken();
    const tracks = await getAppleMusicPlaylistTracks(devToken, appleUserToken, source.playlistId, true);
    return tracks.map((t) => ({
      name: t.attributes?.name ?? "",
      artist: t.attributes?.artistName ?? "",
      isrc: t.attributes?.isrc,
    }));
  }
  return { error: `Unsupported source service: ${source.service}`, status: 400 };
}

/**
 * Import tracks into the user's Deezer account via their ARL session
 * (unofficial gateway API — see lib/deezer-arl.ts caveats).
 *
 * POST { name, tracks: [{ name, artist, isrc? }] }
 * POST { name, source: { service: "spotify"|"apple", playlistId }, appleUserToken? }
 */
export async function POST(request: Request) {
  const arl = await readDeezerArl();
  if (!arl) {
    return NextResponse.json({ error: "Not connected to Deezer" }, { status: 401 });
  }
  const session = await validateArl(arl);
  if (!session) {
    return NextResponse.json(
      { error: "Your Deezer session expired — reconnect with a fresh ARL" },
      { status: 401 }
    );
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

  const matches = await mapWithConcurrency(tracks, 5, (track) => matchDeezerTrack(track));
  const trackIds = matches.flatMap((match) => (match ? [match.id] : []));
  const isrcMatches = matches.filter((match) => match?.method === "isrc").length;
  const fuzzyMatches = matches.filter((match) => match?.method === "fuzzy").length;
  const notFound = matches.filter((match) => !match).length;
  if (trackIds.length === 0) {
    return NextResponse.json({ error: "No tracks could be matched on Deezer" }, { status: 502 });
  }

  const playlistId = await createDeezerPlaylist(
    session,
    name,
    "Imported with Playlist Converter (music.lab86.io)"
  );
  if (!playlistId) {
    return NextResponse.json(
      { error: "Could not create the Deezer playlist (gateway API refused)" },
      { status: 502 }
    );
  }

  const result = await addSongsToDeezerPlaylist(session, playlistId, trackIds);
  return NextResponse.json({
    success: true,
    playlistId,
    playlistUrl: deezerPlaylistUrl(playlistId),
    added: result.added,
    notFound: notFound + (trackIds.length - result.added),
    total: tracks.length,
    isrcMatches,
    fuzzyMatches,
    ...(result.error ? { warning: result.error } : {}),
  });
}
