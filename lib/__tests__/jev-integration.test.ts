// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../spotify");
vi.mock("../apple-music");
vi.mock("../deezer");
vi.mock("../tidal");
vi.mock("../youtube");
vi.mock("../jev", async importOriginal => ({
  ...await importOriginal<typeof import("../jev")>(),
  isJevEnabled: () => true,
  selectTrackCandidate: vi.fn(),
}));

import * as spotify from "../spotify";
import * as apple from "../apple-music";
import * as deezer from "../deezer";
import * as tidal from "../tidal";
import * as youtube from "../youtube";
import { selectTrackCandidate } from "../jev";
import { convertMusicLink, type LinkMetadata } from "../link-converter";
import { convertAppleMusicToSpotify, convertSpotifyToAppleMusic } from "../converter";
import type { SpotifyTrack, AppleMusicTrack } from "@/types";

const source: SpotifyTrack = {
  id: "source", name: "Northern Lights", artists: [{ id: "artist", name: "The Harbour" }],
  album: { id: "album", name: "Test Album", images: [] }, duration_ms: 240000, uri: "spotify:track:source",
};
const appleTrack = (id: string, title: string): AppleMusicTrack & { attributes: { url: string } } => ({
  id, type: "songs", attributes: { url: `https://music.apple.com/us/song/${id}`, name: title, artistName: "The Harbour", albumName: "Test Album", durationInMillis: 240000 },
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(spotify.getSpotifyTrackById).mockResolvedValue(source as NonNullable<Awaited<ReturnType<typeof spotify.getSpotifyTrackById>>>);
  vi.mocked(spotify.searchSpotifyCatalog).mockResolvedValue([]);
  vi.mocked(apple.getCachedAppleMusicToken).mockResolvedValue("test-token");
  vi.mocked(apple.searchAppleMusicCatalog).mockResolvedValue([]);
  vi.mocked(apple.getAppleMusicSongsByIsrc).mockResolvedValue([]);
  vi.mocked(deezer.searchDeezerTracks).mockResolvedValue([]);
  vi.mocked(tidal.isTidalConfigured).mockReturnValue(false);
  vi.mocked(youtube.searchYouTubeMusicCandidates).mockResolvedValue([]);
  vi.mocked(selectTrackCandidate).mockResolvedValue(null);
});

describe("Jev in link conversion", () => {
  it("reranks fuzzy candidates before returning an Apple link", async () => {
    vi.mocked(apple.searchAppleMusicCatalog).mockResolvedValue([
      appleTrack("live", "Northern Lights (Live)"), appleTrack("studio", "Northern Lights"),
    ]);
    vi.mocked(selectTrackCandidate).mockImplementation(async (_source, candidates) =>
      candidates.find(candidate => (candidate as LinkMetadata).title === "Northern Lights") ?? null);
    const result = await convertMusicLink({ service: "spotify", type: "track", id: "source" });
    expect(result.links.find(link => link.service === "apple")?.url).toContain("studio");
    expect(result.links.find(link => link.service === "apple")?.confidence).toBe(100);
  });

  it("does not return a fuzzy link that Jev rejects", async () => {
    vi.mocked(apple.searchAppleMusicCatalog).mockResolvedValue([appleTrack("live", "Northern Lights (Live)")]);
    const result = await convertMusicLink({ service: "spotify", type: "track", id: "source" });
    expect(result.links.some(link => link.service === "apple")).toBe(false);
  });

  it("keeps verified ISRC matches outside Jev review", async () => {
    vi.mocked(spotify.getSpotifyTrackById).mockResolvedValue({ ...source, external_ids: { isrc: "TEST123" } } as NonNullable<Awaited<ReturnType<typeof spotify.getSpotifyTrackById>>>);
    vi.mocked(apple.getAppleMusicSongsByIsrc).mockResolvedValue([appleTrack("exact", "Northern Lights")]);
    const result = await convertMusicLink({ service: "spotify", type: "track", id: "source" });
    expect(result.links.find(link => link.service === "apple")?.matchMethod).toBe("isrc");
    expect(apple.searchAppleMusicCatalog).not.toHaveBeenCalled();
    expect(vi.mocked(selectTrackCandidate).mock.calls.some(([, candidates]) =>
      candidates.some(candidate => (candidate as LinkMetadata).url?.includes("exact")))).toBe(false);
  });

  it("reviews every returned YouTube candidate and falls back to search on rejection", async () => {
    vi.mocked(youtube.searchYouTubeMusicCandidates).mockResolvedValue([
      { videoId: "live", title: "Northern Lights (Live)", channel: "The Harbour" },
      { videoId: "studio", title: "Northern Lights", channel: "The Harbour" },
    ]);
    vi.mocked(youtube.parseYouTubeTitle).mockImplementation(info => ({ title: info.title, artist: info.channel }));
    vi.mocked(youtube.youtubeMusicWatchUrl).mockImplementation(id => `https://music.youtube.com/watch?v=${id}`);
    vi.mocked(youtube.youtubeMusicSearchUrl).mockReturnValue("https://music.youtube.com/search?q=test");
    vi.mocked(selectTrackCandidate).mockImplementation(async (_source, candidates) => candidates[1] ?? null);
    const selected = await convertMusicLink({ service: "spotify", type: "track", id: "source" });
    expect(selected.links.find(link => link.service === "youtube")?.url).toContain("v=studio");
    vi.mocked(selectTrackCandidate).mockResolvedValue(null);
    const rejected = await convertMusicLink({ service: "spotify", type: "track", id: "source" });
    expect(rejected.links.find(link => link.service === "youtube")?.kind).toBe("search");
  });
});

describe("playlist conversion evidence", () => {
  it("passes recording metadata to Apple search and does not label a fuzzy fallback as ISRC", async () => {
    vi.mocked(apple.searchAppleMusicTrack).mockResolvedValue(appleTrack("studio", "Northern Lights"));
    const [match] = await convertSpotifyToAppleMusic([{ ...source, external_ids: { isrc: "TEST123" } }], "token");
    expect(match.matchMethod).toBe("fuzzy");
    expect(apple.searchAppleMusicTrack).toHaveBeenLastCalledWith("token", "Northern Lights The Harbour", undefined, "us",
      expect.objectContaining({ title: "Northern Lights", artist: "The Harbour", duration: 240000 }));
  });

  it("passes recording metadata to Spotify and leaves rejected tracks unmatched", async () => {
    vi.mocked(spotify.searchSpotifyTrack).mockResolvedValue(null);
    const [match] = await convertAppleMusicToSpotify([appleTrack("source", "Northern Lights")], "token");
    expect(match.targetTrack).toBeNull();
    expect(match.matchMethod).toBe("none");
    expect(spotify.searchSpotifyTrack).toHaveBeenCalledWith("token", "Northern Lights The Harbour", undefined,
      expect.objectContaining({ title: "Northern Lights", artist: "The Harbour" }));
  });
});
