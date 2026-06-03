import { NextResponse } from "next/server";
import { getPublicSpotifyPlaylist, getSpotifyPlaylistTracks, searchSpotifyTrackClient } from "@/lib/spotify";
import { generateAppleMusicToken, getPublicAppleMusicPlaylist, getAppleMusicSongDetails, searchAppleMusicTrack } from "@/lib/apple-music";

type ConvertResult = {
  sourceProvider: "spotify" | "apple" | "unknown";
  sourceId: string | null;
  sourceType: "track" | "album" | "playlist" | "artist" | null;
  sourceMetadata?: any;
  matchedProvider?: "spotify" | "apple";
  matchedUrl?: string | null;
  matchedMetadata?: any;
};

function parseSpotifyUrl(urlStr: string) {
  try {
    const url = new URL(urlStr);
    if (!url.hostname.includes("spotify.com")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const type = parts[0] as any;
    const id = parts[1];
    return { type, id };
  } catch {
    return null;
  }
}

function parseAppleMusicUrl(urlStr: string) {
  try {
    const url = new URL(urlStr);
    if (!url.hostname.includes("music.apple.com")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const region = parts[0];
    const type = parts[1] as any;
    // track id may be in ?i= query
    const trackId = url.searchParams.get("i") || parts[parts.length - 1];
    return { region, type, id: trackId };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url: string = body.url;
    if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

    // Spotify link?
    const sp = parseSpotifyUrl(url);
    if (sp) {
      // handle playlist or track
      if (sp.type === "playlist") {
        const playlist = await getPublicSpotifyPlaylist(sp.id);
        // attempt to convert first track as sample
        const firstTrack = playlist.tracks[0];
        let matched: any = null;
        if (firstTrack) {
          const query = `${firstTrack.name} ${firstTrack.artists?.[0]?.name || ""}`;
        const match = await searchAppleMusicTrack(await generateAppleMusicToken(), query, firstTrack.external_ids?.isrc);
          matched = match ? { url: match.attributes.url, metadata: match } : null;
        }
        const res: ConvertResult = {
          sourceProvider: "spotify",
          sourceId: sp.id,
          sourceType: "playlist",
          sourceMetadata: playlist,
          matchedProvider: matched ? "apple" : undefined,
          matchedUrl: matched ? matched.url : null,
          matchedMetadata: matched ? matched.metadata : undefined,
        };
        return NextResponse.json(res);
      } else if (sp.type === "track") {
        // fetch track via client credentials search (searchSpotifyTrack supports text/isrc)
        const id = sp.id;
        // try to fetch by id via search fallback
        const trackQuery = id;
        // search by id may not work; try search Spotify API for track details via getPublicSpotifyPlaylist? reuse searchSpotifyTrack is acceptable
        // Use searchSpotifyTrack with id as query and isrc undefined — it will likely find it
        const track = await searchSpotifyTrackClient(id).catch(() => null);
        // If searchSpotifyTrack requires token, fallback to constructing minimal metadata
        const sourceMetadata = track || { id, url };
        // Try to find on Apple
        const appleToken = await generateAppleMusicToken();
        const query = track ? `${track.name} ${track.artists?.[0]?.name || ""}` : id;
        const appleMatch = await searchAppleMusicTrack(appleToken, query, track?.external_ids?.isrc);
        const res: ConvertResult = {
          sourceProvider: "spotify",
          sourceId: id,
          sourceType: "track",
          sourceMetadata,
          matchedProvider: appleMatch ? "apple" : undefined,
          matchedUrl: appleMatch ? appleMatch.attributes.url : null,
          matchedMetadata: appleMatch ? appleMatch : undefined,
        };
        return NextResponse.json(res);
      }
    }

    // Apple Music link?
    const am = parseAppleMusicUrl(url);
    if (am) {
      const region = am.region || "us";
      if (am.type === "playlist") {
        const playlist = await getPublicAppleMusicPlaylist(am.id, region);
        // try to match first track on Spotify
        const first = playlist.tracks?.[0];
        let matched: any = null;
        if (first) {
          const query = `${first.attributes.name} ${first.attributes.artistName}`;
          const spotifyMatch = await searchSpotifyTrackClient(query, first.attributes.isrc);
          matched = spotifyMatch ? { url: `https://open.spotify.com/track/${spotifyMatch.id}`, metadata: spotifyMatch } : null;
        }
        const res: ConvertResult = {
          sourceProvider: "apple",
          sourceId: am.id,
          sourceType: "playlist",
          sourceMetadata: playlist,
          matchedProvider: matched ? "spotify" : undefined,
          matchedUrl: matched ? matched.url : null,
          matchedMetadata: matched ? matched.metadata : undefined,
        };
        return NextResponse.json(res);
      } else if (am.type === "track") {
        const appleToken = await generateAppleMusicToken();
        const song = await getAppleMusicSongDetails(appleToken, am.id, region);
        const query = song ? `${song.attributes.name} ${song.attributes.artistName}` : am.id;
        const spotifyMatch = await searchSpotifyTrackClient(query, song?.attributes.isrc);
        const res: ConvertResult = {
          sourceProvider: "apple",
          sourceId: am.id,
          sourceType: "track",
          sourceMetadata: song,
          matchedProvider: spotifyMatch ? "spotify" : undefined,
          matchedUrl: spotifyMatch ? `https://open.spotify.com/track/${spotifyMatch.id}` : null,
          matchedMetadata: spotifyMatch ? spotifyMatch : undefined,
        };
        return NextResponse.json(res);
      }
    }

    return NextResponse.json({ error: "Unsupported or unrecognized URL" }, { status: 400 });
  } catch (error: any) {
    console.error("Link convert error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

