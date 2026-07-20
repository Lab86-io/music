import { NextResponse } from "next/server";
import {
  readYouTubeSession,
  createYouTubePlaylist,
  searchYouTubeVideoId,
  addVideoToPlaylist,
} from "@/lib/youtube-oauth";

/**
 * Import a track list into the signed-in user's YouTube account as a new
 * playlist. Quota-aware: each track costs ~150 API units (search + insert),
 * so the free daily quota covers roughly 60 tracks; we stop cleanly when
 * exhausted and report progress.
 *
 * POST { name, tracks: [{ name, artist }] }
 */
export async function POST(request: Request) {
  const session = await readYouTubeSession();
  if (!session) {
    return NextResponse.json({ error: "Not connected to YouTube" }, { status: 401 });
  }

  let body: { name?: string; tracks?: { name: string; artist: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const name = body.name?.trim();
  const tracks = (body.tracks ?? []).filter((t) => t?.name);
  if (!name || tracks.length === 0) {
    return NextResponse.json({ error: "Missing name or tracks" }, { status: 400 });
  }

  const playlistId = await createYouTubePlaylist(
    session,
    name,
    "Imported with Playlist Converter (music.lab86.io)"
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
