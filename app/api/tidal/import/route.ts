import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as stringSimilarity from "string-similarity";
import {
  readTidalSession,
  createTidalPlaylist,
  addTracksToTidalPlaylist,
  tidalPlaylistUrl,
} from "@/lib/tidal-auth";
import { getTidalTracksByIsrc, searchTidal } from "@/lib/tidal";
import { getSpotifyPlaylistTracks } from "@/lib/spotify";
import { getCachedAppleMusicToken, getAppleMusicPlaylistTracks } from "@/lib/apple-music";
import { mapWithConcurrency } from "@/lib/import-utils";

interface ImportTrack {
  name: string;
  artist: string;
  isrc?: string;
}

interface TidalMatch {
  id: string;
  method: "isrc" | "fuzzy";
}

function normalized(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function sim(a: string, b: string): number {
  return stringSimilarity.compareTwoStrings(normalized(a), normalized(b));
}

/** ISRC-first, fuzzy-fallback match to a TIDAL track ID. */
async function matchTidalTrack(
  track: ImportTrack,
  countryCode: string
): Promise<TidalMatch | null> {
  if (track.isrc) {
    const hits = await getTidalTracksByIsrc(track.isrc, countryCode);
    const hit = hits.find((h) => sim(track.artist, h.artist) >= 0.4) ?? hits[0];
    if (hit) return { id: hit.id, method: "isrc" };
  }
  const candidates = await searchTidal(`${track.name} ${track.artist}`, "track", countryCode);
  for (const candidate of candidates) {
    const score = sim(track.name, candidate.title) * 0.6 + sim(track.artist, candidate.artist) * 0.4;
    if (score >= 0.5) return { id: candidate.id, method: "fuzzy" };
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
 * Import tracks into the signed-in user's TIDAL account as a new private
 * playlist. Matching is ISRC-exact with fuzzy fallback — no daily quota.
 *
 * POST { name, tracks: [{ name, artist, isrc? }] }
 * POST { name, source: { service: "spotify"|"apple", playlistId }, appleUserToken? }
 */
export async function POST(request: Request) {
  const session = await readTidalSession();
  if (!session) {
    return NextResponse.json({ error: "Not connected to TIDAL" }, { status: 401 });
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

  // Match everything first so a create isn't wasted on an all-miss list
  const matches = await mapWithConcurrency(tracks, 5, (track) =>
    matchTidalTrack(track, session.countryCode ?? "US")
  );
  const trackIds = matches.flatMap((match) => (match ? [match.id] : []));
  const isrcMatches = matches.filter((match) => match?.method === "isrc").length;
  const fuzzyMatches = matches.filter((match) => match?.method === "fuzzy").length;
  const notFound = matches.filter((match) => !match).length;
  if (trackIds.length === 0) {
    return NextResponse.json(
      { error: "No tracks could be matched on TIDAL" },
      { status: 502 }
    );
  }

  const created = await createTidalPlaylist(
    session,
    name,
    "Imported with Lab86 Convert (music.lab86.io)"
  );
  if (!created.id) {
    return NextResponse.json(
      { error: `Could not create the TIDAL playlist: ${created.error}` },
      { status: 502 }
    );
  }

  const result = await addTracksToTidalPlaylist(session, created.id, trackIds);

  return NextResponse.json({
    success: true,
    playlistId: created.id,
    playlistUrl: tidalPlaylistUrl(created.id),
    added: result.added,
    notFound: notFound + (trackIds.length - result.added),
    total: tracks.length,
    isrcMatches,
    fuzzyMatches,
    ...(result.error ? { warning: `Some adds failed: ${result.error}` } : {}),
  });
}
