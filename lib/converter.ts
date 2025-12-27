import * as stringSimilarity from "string-similarity";
import type { SpotifyTrack, AppleMusicTrack, TrackMatch } from "@/types";
import { searchSpotifyTrack } from "./spotify";
import { searchAppleMusicTrack } from "./apple-music";

/**
 * Type guard to check if track is a Spotify track
 */
function isSpotifyTrack(track: SpotifyTrack | AppleMusicTrack): track is SpotifyTrack {
  return "artists" in track && "uri" in track;
}

/**
 * Normalize a string for comparison
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove special characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Create a search query from a track
 */
function createSearchQuery(track: SpotifyTrack | AppleMusicTrack): string {
  if (isSpotifyTrack(track)) {
    const artist = track.artists[0]?.name || "";
    return `${track.name} ${artist}`;
  } else {
    return `${track.attributes.name} ${track.attributes.artistName}`;
  }
}

/**
 * Get ISRC from a track if available
 */
function getIsrc(track: SpotifyTrack | AppleMusicTrack): string | undefined {
  if (isSpotifyTrack(track)) {
    return track.external_ids?.isrc;
  } else {
    return track.attributes.isrc;
  }
}

/**
 * Get track name for display
 */
function getTrackName(track: SpotifyTrack | AppleMusicTrack): string {
  if (isSpotifyTrack(track)) {
    return track.name;
  }
  return track.attributes.name;
}

/**
 * Get artist name for display
 */
function getArtistName(track: SpotifyTrack | AppleMusicTrack): string {
  if (isSpotifyTrack(track)) {
    return track.artists[0]?.name || "";
  }
  return track.attributes.artistName;
}

/**
 * Calculate match confidence between two tracks
 */
function calculateMatchConfidence(
  sourceTrack: SpotifyTrack | AppleMusicTrack,
  targetTrack: SpotifyTrack | AppleMusicTrack
): number {
  const sourceName = normalizeString(getTrackName(sourceTrack));
  const targetName = normalizeString(getTrackName(targetTrack));
  const sourceArtist = normalizeString(getArtistName(sourceTrack));
  const targetArtist = normalizeString(getArtistName(targetTrack));

  const nameScore = stringSimilarity.compareTwoStrings(sourceName, targetName);
  const artistScore = stringSimilarity.compareTwoStrings(sourceArtist, targetArtist);

  // Weight name slightly higher than artist
  return Math.round((nameScore * 0.6 + artistScore * 0.4) * 100);
}

/**
 * Convert Spotify tracks to Apple Music
 */
export async function convertSpotifyToAppleMusic(
  spotifyTracks: SpotifyTrack[],
  appleMusicDevToken: string,
  onProgress?: (current: number, total: number, match: TrackMatch) => void
): Promise<TrackMatch[]> {
  const matches: TrackMatch[] = [];

  for (let i = 0; i < spotifyTracks.length; i++) {
    const track = spotifyTracks[i];
    const isrc = getIsrc(track);
    const query = createSearchQuery(track);

    let targetTrack: AppleMusicTrack | null = null;
    let matchMethod: "isrc" | "fuzzy" | "none" = "none";
    let matchConfidence = 0;

    // Try ISRC first
    if (isrc) {
      targetTrack = await searchAppleMusicTrack(appleMusicDevToken, query, isrc);
      if (targetTrack) {
        matchMethod = "isrc";
        matchConfidence = 100;
      }
    }

    // Fallback to fuzzy search
    if (!targetTrack) {
      targetTrack = await searchAppleMusicTrack(appleMusicDevToken, query);
      if (targetTrack) {
        matchMethod = "fuzzy";
        matchConfidence = calculateMatchConfidence(track, targetTrack);
      }
    }

    const match: TrackMatch = {
      sourceTrack: track,
      targetTrack,
      matchConfidence,
      matchMethod,
    };

    matches.push(match);

    if (onProgress) {
      onProgress(i + 1, spotifyTracks.length, match);
    }

    // Rate limiting - be nice to the APIs
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return matches;
}

/**
 * Convert Apple Music tracks to Spotify
 */
export async function convertAppleMusicToSpotify(
  appleMusicTracks: AppleMusicTrack[],
  spotifyAccessToken: string,
  onProgress?: (current: number, total: number, match: TrackMatch) => void
): Promise<TrackMatch[]> {
  const matches: TrackMatch[] = [];

  for (let i = 0; i < appleMusicTracks.length; i++) {
    const track = appleMusicTracks[i];
    const isrc = getIsrc(track);
    const query = createSearchQuery(track);

    let targetTrack: SpotifyTrack | null = null;
    let matchMethod: "isrc" | "fuzzy" | "none" = "none";
    let matchConfidence = 0;

    // Try ISRC first
    if (isrc) {
      targetTrack = await searchSpotifyTrack(spotifyAccessToken, query, isrc);
      if (targetTrack) {
        matchMethod = "isrc";
        matchConfidence = 100;
      }
    }

    // Fallback to fuzzy search
    if (!targetTrack) {
      targetTrack = await searchSpotifyTrack(spotifyAccessToken, query);
      if (targetTrack) {
        matchMethod = "fuzzy";
        matchConfidence = calculateMatchConfidence(track, targetTrack);
      }
    }

    const match: TrackMatch = {
      sourceTrack: track,
      targetTrack,
      matchConfidence,
      matchMethod,
    };

    matches.push(match);

    if (onProgress) {
      onProgress(i + 1, appleMusicTracks.length, match);
    }

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return matches;
}

/**
 * Filter matches by confidence threshold
 */
export function filterMatchesByConfidence(
  matches: TrackMatch[],
  minConfidence: number = 70
): TrackMatch[] {
  return matches.filter(
    (m) => m.targetTrack !== null && m.matchConfidence >= minConfidence
  );
}

/**
 * Get conversion statistics
 */
export function getConversionStats(matches: TrackMatch[]): {
  total: number;
  matched: number;
  isrcMatches: number;
  fuzzyMatches: number;
  unmatched: number;
  averageConfidence: number;
} {
  const matched = matches.filter((m) => m.targetTrack !== null);
  const isrcMatches = matches.filter((m) => m.matchMethod === "isrc");
  const fuzzyMatches = matches.filter((m) => m.matchMethod === "fuzzy");
  const unmatched = matches.filter((m) => m.targetTrack === null);

  const totalConfidence = matched.reduce((sum, m) => sum + m.matchConfidence, 0);
  const averageConfidence = matched.length > 0 ? totalConfidence / matched.length : 0;

  return {
    total: matches.length,
    matched: matched.length,
    isrcMatches: isrcMatches.length,
    fuzzyMatches: fuzzyMatches.length,
    unmatched: unmatched.length,
    averageConfidence: Math.round(averageConfidence),
  };
}

