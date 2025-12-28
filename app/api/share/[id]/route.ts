import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, sharedPlaylists } from "@/lib/db";
import { searchSpotifyTrack, createSpotifyPlaylist, addTracksToSpotifyPlaylist } from "@/lib/spotify";
import { generateAppleMusicToken, searchAppleMusicTrack, createAppleMusicPlaylist, addTracksToAppleMusicPlaylist } from "@/lib/apple-music";
import { calculateArtistSimilarity } from "@/lib/converter";
import type { SpotifyTrack, AppleMusicTrack } from "@/types";

interface SpotifySession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface SharedTrack {
  name: string;
  artist: string;
  album: string;
  albumArt?: string;
  isrc?: string;
  duration_ms?: number;
}

interface MatchResult {
  sourceTrack: { name: string; artist: string };
  targetTrack: { name: string; artist: string } | null;
  matchConfidence: number;
  matchMethod: "isrc" | "fuzzy" | "none";
}

// Minimum confidence to accept a match
const MIN_MATCH_CONFIDENCE = 70;
// Minimum artist similarity for ISRC matches
const MIN_ARTIST_SIMILARITY_FOR_ISRC = 0.4;

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

// GET - Fetch shared playlist data (public, no auth required)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await db
      .select()
      .from(sharedPlaylists)
      .where(eq(sharedPlaylists.id, id))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Share link not found or has expired" },
        { status: 404 }
      );
    }

    const shared = result[0];
    const tracks = JSON.parse(shared.tracks) as SharedTrack[];

    return NextResponse.json({
      success: true,
      data: {
        id: shared.id,
        playlistName: shared.playlistName,
        playlistImage: shared.playlistImage,
        sourceService: shared.sourceService,
        trackCount: shared.trackCount,
        tracks: tracks.map((t) => ({
          name: t.name,
          artist: t.artist,
          album: t.album,
          albumArt: t.albumArt,
          duration_ms: t.duration_ms,
        })),
        createdAt: shared.createdAt,
      },
    });
  } catch (error) {
    console.error("Get shared playlist error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch shared playlist" },
      { status: 500 }
    );
  }
}

// Helper to calculate match confidence based on name/artist similarity
function calculateMatchConfidence(
  sourceTrack: SharedTrack,
  targetName: string,
  targetArtist: string
): number {
  const stringSimilarity = require("string-similarity");
  
  const nameSimilarity = stringSimilarity.compareTwoStrings(
    sourceTrack.name.toLowerCase(),
    targetName.toLowerCase()
  );
  
  const artistSimilarity = stringSimilarity.compareTwoStrings(
    sourceTrack.artist.toLowerCase(),
    targetArtist.toLowerCase()
  );
  
  // Weight name more heavily than artist
  return Math.round((nameSimilarity * 0.6 + artistSimilarity * 0.4) * 100);
}

// POST - Claim the shared playlist (imports to user's service) with SSE streaming
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const encoder = new TextEncoder();
  const acceptHeader = request.headers.get("accept") || "";
  const wantsStream = acceptHeader.includes("text/event-stream");

  try {
    const { id } = await params;
    const body = await request.json();
    const { targetService, appleUserToken } = body;

    if (!targetService) {
      return NextResponse.json(
        { success: false, error: "Target service is required" },
        { status: 400 }
      );
    }

    // Fetch the shared playlist
    const result = await db
      .select()
      .from(sharedPlaylists)
      .where(eq(sharedPlaylists.id, id))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Share link not found or has already been claimed" },
        { status: 404 }
      );
    }

    const shared = result[0];
    const tracks = JSON.parse(shared.tracks) as SharedTrack[];

    // Validate auth
    if (targetService === "spotify") {
      const session = await getSpotifySession();
      if (!session?.accessToken) {
        return NextResponse.json(
          { success: false, error: "Not authenticated with Spotify" },
          { status: 401 }
        );
      }
    } else if (targetService === "apple") {
      if (!appleUserToken) {
        return NextResponse.json(
          { success: false, error: "Not authenticated with Apple Music" },
          { status: 401 }
        );
      }
    }

    // For streaming response
    if (wantsStream) {
      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };

          try {
            let newPlaylistId: string;
            const matchResults: MatchResult[] = [];
            let isrcMatches = 0;
            let fuzzyMatches = 0;

            sendEvent("init", { total: tracks.length });

            if (targetService === "spotify") {
              const session = await getSpotifySession();
              const trackUris: string[] = [];

              for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i];
                const query = `${track.name} ${track.artist}`;
                let found: SpotifyTrack | null = null;
                let matchMethod: "isrc" | "fuzzy" | "none" = "none";
                let matchConfidence = 0;

                // Try ISRC first with artist verification
                if (track.isrc) {
                  const isrcResult = await searchSpotifyTrack(session!.accessToken, query, track.isrc);
                  if (isrcResult) {
                    const artistSimilarity = calculateArtistSimilarity(
                      { name: track.name, artist: track.artist },
                      { name: isrcResult.name, artist: isrcResult.artists[0]?.name || "" }
                    );
                    if (artistSimilarity >= MIN_ARTIST_SIMILARITY_FOR_ISRC) {
                      found = isrcResult;
                      matchMethod = "isrc";
                      matchConfidence = 100;
                      isrcMatches++;
                    }
                  }
                }

                // Fallback to fuzzy search
                if (!found) {
                  const fuzzyResult = await searchSpotifyTrack(session!.accessToken, query);
                  if (fuzzyResult) {
                    matchConfidence = calculateMatchConfidence(
                      track,
                      fuzzyResult.name,
                      fuzzyResult.artists[0]?.name || ""
                    );
                    if (matchConfidence >= MIN_MATCH_CONFIDENCE) {
                      found = fuzzyResult;
                      matchMethod = "fuzzy";
                      fuzzyMatches++;
                    }
                  }
                }

                const matchResult: MatchResult = {
                  sourceTrack: { name: track.name, artist: track.artist },
                  targetTrack: found ? { name: found.name, artist: found.artists[0]?.name || "" } : null,
                  matchConfidence,
                  matchMethod,
                };
                matchResults.push(matchResult);

                if (found) {
                  trackUris.push(found.uri);
                }

                // Send progress event
                sendEvent("progress", {
                  current: i + 1,
                  total: tracks.length,
                  track: {
                    name: track.name,
                    artist: track.artist,
                    status: !found ? "not_found" 
                      : matchConfidence >= MIN_MATCH_CONFIDENCE ? "matched" : "low_confidence",
                    matchedTo: found ? { name: found.name, artist: found.artists[0]?.name || "" } : null,
                    confidence: matchConfidence,
                  },
                });

                // Rate limiting
                await new Promise((r) => setTimeout(r, 50));
              }

              // Create playlist and add tracks
              newPlaylistId = await createSpotifyPlaylist(
                session!.accessToken,
                shared.playlistName,
                `Shared playlist from ${shared.sourceService === "spotify" ? "Spotify" : "Apple Music"}`,
                false
              );

              if (trackUris.length > 0) {
                await addTracksToSpotifyPlaylist(session!.accessToken, newPlaylistId, trackUris);
              }

            } else {
              // Apple Music
              const appleDevToken = await generateAppleMusicToken();
              const trackIds: { id: string; type: "songs" | "library-songs" }[] = [];

              for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i];
                const query = `${track.name} ${track.artist}`;
                let found: AppleMusicTrack | null = null;
                let matchMethod: "isrc" | "fuzzy" | "none" = "none";
                let matchConfidence = 0;

                // Try ISRC first with artist verification
                if (track.isrc) {
                  const isrcResult = await searchAppleMusicTrack(appleDevToken, query, track.isrc);
                  if (isrcResult) {
                    const artistSimilarity = calculateArtistSimilarity(
                      { name: track.name, artist: track.artist },
                      { name: isrcResult.attributes.name, artist: isrcResult.attributes.artistName }
                    );
                    if (artistSimilarity >= MIN_ARTIST_SIMILARITY_FOR_ISRC) {
                      found = isrcResult;
                      matchMethod = "isrc";
                      matchConfidence = 100;
                      isrcMatches++;
                    }
                  }
                }

                // Fallback to fuzzy search
                if (!found) {
                  const fuzzyResult = await searchAppleMusicTrack(appleDevToken, query);
                  if (fuzzyResult) {
                    matchConfidence = calculateMatchConfidence(
                      track,
                      fuzzyResult.attributes.name,
                      fuzzyResult.attributes.artistName
                    );
                    if (matchConfidence >= MIN_MATCH_CONFIDENCE) {
                      found = fuzzyResult;
                      matchMethod = "fuzzy";
                      fuzzyMatches++;
                    }
                  }
                }

                const matchResult: MatchResult = {
                  sourceTrack: { name: track.name, artist: track.artist },
                  targetTrack: found ? { name: found.attributes.name, artist: found.attributes.artistName } : null,
                  matchConfidence,
                  matchMethod,
                };
                matchResults.push(matchResult);

                if (found) {
                  trackIds.push({ id: found.id, type: found.type as "songs" | "library-songs" });
                }

                // Send progress event
                sendEvent("progress", {
                  current: i + 1,
                  total: tracks.length,
                  track: {
                    name: track.name,
                    artist: track.artist,
                    status: !found ? "not_found" 
                      : matchConfidence >= MIN_MATCH_CONFIDENCE ? "matched" : "low_confidence",
                    matchedTo: found ? { name: found.attributes.name, artist: found.attributes.artistName } : null,
                    confidence: matchConfidence,
                  },
                });

                // Rate limiting
                await new Promise((r) => setTimeout(r, 50));
              }

              // Create playlist and add tracks
              newPlaylistId = await createAppleMusicPlaylist(
                appleDevToken,
                appleUserToken,
                shared.playlistName,
                `Shared playlist from ${shared.sourceService === "spotify" ? "Spotify" : "Apple Music"}`
              );

              if (trackIds.length > 0) {
                await addTracksToAppleMusicPlaylist(appleDevToken, appleUserToken, newPlaylistId, trackIds);
              }
            }

            // Delete the shared playlist (one-time use)
            await db.delete(sharedPlaylists).where(eq(sharedPlaylists.id, id));

            const matchedCount = matchResults.filter(m => m.targetTrack !== null).length;
            const avgConfidence = matchResults.length > 0
              ? Math.round(matchResults.reduce((sum, m) => sum + m.matchConfidence, 0) / matchResults.length)
              : 0;

            // Send complete event
            sendEvent("complete", {
              success: true,
              newPlaylistId,
              stats: {
                total: tracks.length,
                matched: matchedCount,
                isrcMatches,
                fuzzyMatches,
                unmatched: tracks.length - matchedCount,
                averageConfidence: avgConfidence,
              },
              matches: matchResults,
            });

            controller.close();
          } catch (error) {
            console.error("Streaming import error:", error);
            sendEvent("error", { error: "Import failed" });
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

    // Non-streaming fallback (for backwards compatibility)
    let newPlaylistId: string;
    let matchedCount = 0;
    const matchResults: MatchResult[] = [];

    if (targetService === "spotify") {
      const session = await getSpotifySession();
      const trackUris: string[] = [];

      for (const track of tracks) {
        const query = `${track.name} ${track.artist}`;
        const found = await searchSpotifyTrack(session!.accessToken, query, track.isrc);
        
        if (found) {
          const confidence = calculateMatchConfidence(track, found.name, found.artists[0]?.name || "");
          if (confidence >= MIN_MATCH_CONFIDENCE) {
            trackUris.push(found.uri);
            matchedCount++;
            matchResults.push({
              sourceTrack: { name: track.name, artist: track.artist },
              targetTrack: { name: found.name, artist: found.artists[0]?.name || "" },
              matchConfidence: confidence,
              matchMethod: track.isrc ? "isrc" : "fuzzy",
            });
          }
        }

        await new Promise((r) => setTimeout(r, 50));
      }

      newPlaylistId = await createSpotifyPlaylist(
        session!.accessToken,
        shared.playlistName,
        `Shared playlist from ${shared.sourceService === "spotify" ? "Spotify" : "Apple Music"}`,
        false
      );

      if (trackUris.length > 0) {
        await addTracksToSpotifyPlaylist(session!.accessToken, newPlaylistId, trackUris);
      }
    } else {
      const appleDevToken = await generateAppleMusicToken();
      const trackIds: { id: string; type: "songs" | "library-songs" }[] = [];

      for (const track of tracks) {
        const query = `${track.name} ${track.artist}`;
        const found = await searchAppleMusicTrack(appleDevToken, query, track.isrc);
        
        if (found) {
          const confidence = calculateMatchConfidence(track, found.attributes.name, found.attributes.artistName);
          if (confidence >= MIN_MATCH_CONFIDENCE) {
            trackIds.push({ id: found.id, type: found.type as "songs" | "library-songs" });
            matchedCount++;
            matchResults.push({
              sourceTrack: { name: track.name, artist: track.artist },
              targetTrack: { name: found.attributes.name, artist: found.attributes.artistName },
              matchConfidence: confidence,
              matchMethod: track.isrc ? "isrc" : "fuzzy",
            });
          }
        }

        await new Promise((r) => setTimeout(r, 50));
      }

      newPlaylistId = await createAppleMusicPlaylist(
        appleDevToken,
        appleUserToken,
        shared.playlistName,
        `Shared playlist from ${shared.sourceService === "spotify" ? "Spotify" : "Apple Music"}`
      );

      if (trackIds.length > 0) {
        await addTracksToAppleMusicPlaylist(appleDevToken, appleUserToken, newPlaylistId, trackIds);
      }
    }

    // Delete the shared playlist (one-time use)
    await db.delete(sharedPlaylists).where(eq(sharedPlaylists.id, id));

    return NextResponse.json({
      success: true,
      data: {
        newPlaylistId,
        playlistName: shared.playlistName,
        totalTracks: tracks.length,
        matchedTracks: matchedCount,
        matchResults,
      },
    });
  } catch (error) {
    console.error("Claim shared playlist error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to claim shared playlist" },
      { status: 500 }
    );
  }
}
