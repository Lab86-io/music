import { NextResponse } from "next/server";
import { searchSpotifyCatalog } from "@/lib/spotify";
import { mapSpotifyTrackMeta } from "@/lib/link-converter";

/**
 * Text search for the converter: type a song instead of pasting a link.
 * Returns top Spotify track candidates; picking one feeds the normal
 * conversion flow (Spotify → every other service).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    if (!q) {
      return NextResponse.json({ error: "Missing 'q' query parameter" }, { status: 400 });
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const items = (await searchSpotifyCatalog(q, "track", 5)) as any[];
    const results = items.filter(Boolean).map((t) => {
      const meta = mapSpotifyTrackMeta(t);
      return {
        title: meta.title,
        artist: meta.artist,
        album: meta.album,
        artworkUrl: meta.artworkUrl,
        url: meta.url,
      };
    });
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
