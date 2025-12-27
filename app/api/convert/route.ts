import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSpotifyPlaylistTracks, createSpotifyPlaylist, addTracksToSpotifyPlaylist } from "@/lib/spotify";
import { generateAppleMusicToken, getAppleMusicPlaylistTracks, createAppleMusicPlaylist, addTracksToAppleMusicPlaylist } from "@/lib/apple-music";
import { convertSpotifyToAppleMusic, convertAppleMusicToSpotify, getConversionStats, filterMatchesByConfidence } from "@/lib/converter";
import type { SpotifyTrack, AppleMusicTrack } from "@/types";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const body = await request.json();
    
    const {
      sourceService,
      targetService,
      playlistId,
      playlistName,
      appleUserToken,
    } = body;

    if (!sourceService || !targetService || !playlistId || !playlistName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate authentication for the services
    if ((sourceService === "spotify" || targetService === "spotify") && !session?.accessToken) {
      return NextResponse.json(
        { success: false, error: "Not authenticated with Spotify" },
        { status: 401 }
      );
    }

    if ((sourceService === "apple" || targetService === "apple") && !appleUserToken) {
      return NextResponse.json(
        { success: false, error: "Not authenticated with Apple Music" },
        { status: 401 }
      );
    }

    const appleDevToken = await generateAppleMusicToken();

    let matches;
    let newPlaylistId: string;

    if (sourceService === "spotify" && targetService === "apple") {
      // Spotify -> Apple Music
      const sourceTracks = await getSpotifyPlaylistTracks(session!.accessToken!, playlistId);
      matches = await convertSpotifyToAppleMusic(sourceTracks, appleDevToken);
      
      // Create new playlist in Apple Music
      newPlaylistId = await createAppleMusicPlaylist(
        appleDevToken,
        appleUserToken,
        `${playlistName} (from Spotify)`,
        `Converted from Spotify playlist: ${playlistName}`
      );

      // Add matched tracks
      const goodMatches = filterMatchesByConfidence(matches, 70);
      const trackIds = goodMatches
        .filter((m) => m.targetTrack)
        .map((m) => {
          const track = m.targetTrack as AppleMusicTrack;
          return { id: track.id, type: track.type as "songs" | "library-songs" };
        });

      if (trackIds.length > 0) {
        await addTracksToAppleMusicPlaylist(appleDevToken, appleUserToken, newPlaylistId, trackIds);
      }
    } else if (sourceService === "apple" && targetService === "spotify") {
      // Apple Music -> Spotify
      const sourceTracks = await getAppleMusicPlaylistTracks(
        appleDevToken,
        appleUserToken,
        playlistId,
        true
      );
      matches = await convertAppleMusicToSpotify(sourceTracks, session!.accessToken!);

      // Create new playlist in Spotify
      newPlaylistId = await createSpotifyPlaylist(
        session!.accessToken!,
        `${playlistName} (from Apple Music)`,
        `Converted from Apple Music playlist: ${playlistName}`,
        false
      );

      // Add matched tracks
      const goodMatches = filterMatchesByConfidence(matches, 70);
      const trackUris = goodMatches
        .filter((m) => m.targetTrack)
        .map((m) => (m.targetTrack as SpotifyTrack).uri);

      if (trackUris.length > 0) {
        await addTracksToSpotifyPlaylist(session!.accessToken!, newPlaylistId, trackUris);
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid source/target service combination" },
        { status: 400 }
      );
    }

    const stats = getConversionStats(matches);

    return NextResponse.json({
      success: true,
      data: {
        newPlaylistId,
        stats,
        matches: matches.map((m) => ({
          sourceTrack: "name" in m.sourceTrack 
            ? { name: (m.sourceTrack as SpotifyTrack).name, artist: (m.sourceTrack as SpotifyTrack).artists[0]?.name }
            : { name: m.sourceTrack.attributes.name, artist: m.sourceTrack.attributes.artistName },
          targetTrack: m.targetTrack
            ? "name" in m.targetTrack
              ? { name: (m.targetTrack as SpotifyTrack).name, artist: (m.targetTrack as SpotifyTrack).artists[0]?.name }
              : { name: m.targetTrack.attributes.name, artist: m.targetTrack.attributes.artistName }
            : null,
          matchConfidence: m.matchConfidence,
          matchMethod: m.matchMethod,
        })),
      },
    });
  } catch (error) {
    console.error("Conversion error:", error);
    return NextResponse.json(
      { success: false, error: "Conversion failed" },
      { status: 500 }
    );
  }
}


