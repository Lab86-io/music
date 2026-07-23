import { describe, it, expect } from "vitest";
import { calculateArtistSimilarity, getConversionStats, MIN_MATCH_CONFIDENCE } from "@/lib/converter";
import type { SpotifyTrack, TrackMatch } from "@/types";

function spotifyTrack(id: string, name: string, artist: string): SpotifyTrack {
  return {
    id,
    name,
    artists: [{ id: `artist-${id}`, name: artist }],
    album: {
      id: `album-${id}`,
      name: "Test Album",
      images: [],
    },
    duration_ms: 180_000,
    uri: `spotify:track:${id}`,
  };
}

describe("calculateArtistSimilarity", () => {
  it("returns high similarity for exact matches", () => {
    const source = { name: "Song", artist: "The Beatles" };
    const target = { name: "Song", artist: "The Beatles" };
    expect(calculateArtistSimilarity(source, target)).toBe(1);
  });

  it("returns high similarity for case-insensitive matches", () => {
    const source = { name: "Song", artist: "The Beatles" };
    const target = { name: "Song", artist: "the beatles" };
    expect(calculateArtistSimilarity(source, target)).toBe(1);
  });

  it("returns lower similarity for different artists", () => {
    const source = { name: "Song", artist: "The Beatles" };
    const target = { name: "Song", artist: "Led Zeppelin" };
    const similarity = calculateArtistSimilarity(source, target);
    expect(similarity).toBeLessThan(0.5);
    expect(similarity).toBeGreaterThan(0);
  });
});

describe("getConversionStats", () => {
  it("calculates correct stats for all matched tracks", () => {
    const matches: TrackMatch[] = [
      {
        sourceTrack: spotifyTrack("source-1", "Track 1", "Artist 1"),
        targetTrack: spotifyTrack("target-1", "Track 1", "Artist 1"),
        matchConfidence: 95,
        matchMethod: "isrc",
      },
      {
        sourceTrack: spotifyTrack("source-2", "Track 2", "Artist 2"),
        targetTrack: spotifyTrack("target-2", "Track 2", "Artist 2"),
        matchConfidence: 85,
        matchMethod: "fuzzy",
      },
    ];

    const stats = getConversionStats(matches);
    expect(stats.total).toBe(2);
    expect(stats.matched).toBe(2);
    expect(stats.isrcMatches).toBe(1);
    expect(stats.fuzzyMatches).toBe(1);
    expect(stats.unmatched).toBe(0);
    expect(stats.averageConfidence).toBe(90);
  });

  it("calculates correct stats with unmatched tracks", () => {
    const matches: TrackMatch[] = [
      {
        sourceTrack: spotifyTrack("source-1", "Track 1", "Artist 1"),
        targetTrack: spotifyTrack("target-1", "Track 1", "Artist 1"),
        matchConfidence: 95,
        matchMethod: "isrc",
      },
      {
        sourceTrack: spotifyTrack("source-2", "Track 2", "Artist 2"),
        targetTrack: null,
        matchConfidence: 0,
        matchMethod: "none",
      },
    ];

    const stats = getConversionStats(matches);
    expect(stats.total).toBe(2);
    expect(stats.matched).toBe(1);
    expect(stats.unmatched).toBe(1);
  });

  it("counts low confidence matches as unmatched", () => {
    const matches: TrackMatch[] = [
      {
        sourceTrack: spotifyTrack("source-1", "Track 1", "Artist 1"),
        targetTrack: spotifyTrack("target-1", "Track 1", "Artist 1"),
        matchConfidence: MIN_MATCH_CONFIDENCE - 20,
        matchMethod: "fuzzy",
      },
    ];

    const stats = getConversionStats(matches);
    expect(stats.total).toBe(1);
    expect(stats.matched).toBe(0);
    expect(stats.lowConfidence).toBe(1);
    expect(stats.unmatched).toBe(1);
  });
});
