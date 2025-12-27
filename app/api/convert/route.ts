import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSpotifyPlaylistTracks, createSpotifyPlaylist, addTracksToSpotifyPlaylist } from "@/lib/spotify";
import { generateAppleMusicToken, getAppleMusicPlaylistTracks, createAppleMusicPlaylist, addTracksToAppleMusicPlaylist } from "@/lib/apple-music";
import { convertSpotifyToAppleMusic, convertAppleMusicToSpotify, getConversionStats, MIN_MATCH_CONFIDENCE } from "@/lib/converter";
import type { SpotifyTrack, AppleMusicTrack, TrackMatch } from "@/types";

interface SpotifySession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
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

function formatTrackForResponse(track: SpotifyTrack | AppleMusicTrack): { name: string; artist: string } {
  if ("name" in track && "artists" in track) {
    return { name: (track as SpotifyTrack).name, artist: (track as SpotifyTrack).artists[0]?.name || "" };
  }
  return { name: (track as AppleMusicTrack).attributes.name, artist: (track as AppleMusicTrack).attributes.artistName };
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  
  // Check if client wants streaming
  const acceptHeader = request.headers.get("accept") || "";
  const wantsStream = acceptHeader.includes("text/event-stream");

  try {
    const session = await getSpotifySession();
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

    // For streaming response
    if (wantsStream) {
      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };

          try {
            let matches: TrackMatch[];
            let newPlaylistId: string;
            let sourceTracks: (SpotifyTrack | AppleMusicTrack)[];

            if (sourceService === "spotify" && targetService === "apple") {
              sourceTracks = await getSpotifyPlaylistTracks(session!.accessToken!, playlistId);
              sendEvent("init", { total: sourceTracks.length });

              matches = await convertSpotifyToAppleMusic(
                sourceTracks as SpotifyTrack[],
                appleDevToken,
                (current, total, match) => {
                  const sourceInfo = formatTrackForResponse(match.sourceTrack);
                  const targetInfo = match.targetTrack ? formatTrackForResponse(match.targetTrack) : null;
                  
                  sendEvent("progress", {
                    current,
                    total,
                    track: {
                      name: sourceInfo.name,
                      artist: sourceInfo.artist,
                      status: !match.targetTrack ? "not_found" 
                        : match.matchConfidence >= MIN_MATCH_CONFIDENCE ? "matched" : "low_confidence",
                      matchedTo: targetInfo,
                      confidence: match.matchConfidence,
                    },
                  });
                }
              );

              newPlaylistId = await createAppleMusicPlaylist(
                appleDevToken,
                appleUserToken,
                `${playlistName} (from Spotify)`,
                `Converted from Spotify playlist: ${playlistName}`
              );

              const goodMatches = matches.filter(m => m.targetTrack && m.matchConfidence >= MIN_MATCH_CONFIDENCE);
              const trackIds = goodMatches.map((m) => {
                const track = m.targetTrack as AppleMusicTrack;
                return { id: track.id, type: track.type as "songs" | "library-songs" };
              });

              if (trackIds.length > 0) {
                await addTracksToAppleMusicPlaylist(appleDevToken, appleUserToken, newPlaylistId, trackIds);
              }
            } else if (sourceService === "apple" && targetService === "spotify") {
              sourceTracks = await getAppleMusicPlaylistTracks(appleDevToken, appleUserToken, playlistId, true);
              sendEvent("init", { total: sourceTracks.length });

              matches = await convertAppleMusicToSpotify(
                sourceTracks as AppleMusicTrack[],
                session!.accessToken!,
                (current, total, match) => {
                  const sourceInfo = formatTrackForResponse(match.sourceTrack);
                  const targetInfo = match.targetTrack ? formatTrackForResponse(match.targetTrack) : null;
                  
                  sendEvent("progress", {
                    current,
                    total,
                    track: {
                      name: sourceInfo.name,
                      artist: sourceInfo.artist,
                      status: !match.targetTrack ? "not_found" 
                        : match.matchConfidence >= MIN_MATCH_CONFIDENCE ? "matched" : "low_confidence",
                      matchedTo: targetInfo,
                      confidence: match.matchConfidence,
                    },
                  });
                }
              );

              newPlaylistId = await createSpotifyPlaylist(
                session!.accessToken!,
                `${playlistName} (from Apple Music)`,
                `Converted from Apple Music playlist: ${playlistName}`,
                false
              );

              const goodMatches = matches.filter(m => m.targetTrack && m.matchConfidence >= MIN_MATCH_CONFIDENCE);
              const trackUris = goodMatches.map((m) => (m.targetTrack as SpotifyTrack).uri);

              if (trackUris.length > 0) {
                await addTracksToSpotifyPlaylist(session!.accessToken!, newPlaylistId, trackUris);
              }
            } else {
              sendEvent("error", { error: "Invalid source/target service combination" });
              controller.close();
              return;
            }

            const stats = getConversionStats(matches);

            sendEvent("complete", {
              success: true,
              newPlaylistId,
              stats,
              matches: matches.map((m) => ({
                sourceTrack: formatTrackForResponse(m.sourceTrack),
                targetTrack: m.targetTrack ? formatTrackForResponse(m.targetTrack) : null,
                matchConfidence: m.matchConfidence,
                matchMethod: m.matchMethod,
              })),
            });

            controller.close();
          } catch (error) {
            console.error("Streaming conversion error:", error);
            sendEvent("error", { error: "Conversion failed" });
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming response (original behavior)
    let matches: TrackMatch[];
    let newPlaylistId: string;

    if (sourceService === "spotify" && targetService === "apple") {
      const sourceTracks = await getSpotifyPlaylistTracks(session!.accessToken!, playlistId);
      matches = await convertSpotifyToAppleMusic(sourceTracks, appleDevToken);
      
      newPlaylistId = await createAppleMusicPlaylist(
        appleDevToken,
        appleUserToken,
        `${playlistName} (from Spotify)`,
        `Converted from Spotify playlist: ${playlistName}`
      );

      const goodMatches = matches.filter(m => m.targetTrack && m.matchConfidence >= MIN_MATCH_CONFIDENCE);
      const trackIds = goodMatches.map((m) => {
        const track = m.targetTrack as AppleMusicTrack;
        return { id: track.id, type: track.type as "songs" | "library-songs" };
      });

      if (trackIds.length > 0) {
        await addTracksToAppleMusicPlaylist(appleDevToken, appleUserToken, newPlaylistId, trackIds);
      }
    } else if (sourceService === "apple" && targetService === "spotify") {
      const sourceTracks = await getAppleMusicPlaylistTracks(appleDevToken, appleUserToken, playlistId, true);
      matches = await convertAppleMusicToSpotify(sourceTracks, session!.accessToken!);

      newPlaylistId = await createSpotifyPlaylist(
        session!.accessToken!,
        `${playlistName} (from Apple Music)`,
        `Converted from Apple Music playlist: ${playlistName}`,
        false
      );

      const goodMatches = matches.filter(m => m.targetTrack && m.matchConfidence >= MIN_MATCH_CONFIDENCE);
      const trackUris = goodMatches.map((m) => (m.targetTrack as SpotifyTrack).uri);

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
          sourceTrack: formatTrackForResponse(m.sourceTrack),
          targetTrack: m.targetTrack ? formatTrackForResponse(m.targetTrack) : null,
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
