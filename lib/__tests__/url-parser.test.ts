import { describe, it, expect } from "vitest";

// URL parsing functions (extracted from route handlers for testing)
function parseSpotifyUrl(urlStr: string) {
  try {
    const url = new URL(urlStr);
    if (!url.hostname.includes("spotify.com")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const type = parts[0];
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
    const type = parts[1];
    const trackId = url.searchParams.get("i") || parts[parts.length - 1];
    return { region, type, id: trackId };
  } catch {
    return null;
  }
}

describe("parseSpotifyUrl", () => {
  it("parses Spotify track URLs", () => {
    const result = parseSpotifyUrl("https://open.spotify.com/track/123abc");
    expect(result).toEqual({ type: "track", id: "123abc" });
  });

  it("parses Spotify playlist URLs", () => {
    const result = parseSpotifyUrl("https://open.spotify.com/playlist/456def");
    expect(result).toEqual({ type: "playlist", id: "456def" });
  });

  it("parses Spotify album URLs", () => {
    const result = parseSpotifyUrl("https://open.spotify.com/album/789ghi");
    expect(result).toEqual({ type: "album", id: "789ghi" });
  });

  it("parses Spotify artist URLs", () => {
    const result = parseSpotifyUrl("https://open.spotify.com/artist/artist123");
    expect(result).toEqual({ type: "artist", id: "artist123" });
  });

  it("returns null for non-Spotify URLs", () => {
    const result = parseSpotifyUrl("https://music.apple.com/us/playlist/123");
    expect(result).toBeNull();
  });

  it("returns null for invalid URLs", () => {
    const result = parseSpotifyUrl("not-a-url");
    expect(result).toBeNull();
  });
});

describe("parseAppleMusicUrl", () => {
  it("parses Apple Music playlist URLs", () => {
    const result = parseAppleMusicUrl("https://music.apple.com/us/playlist/playlist-name/pl.123abc");
    expect(result?.type).toBe("playlist");
    expect(result?.region).toBe("us");
  });

  it("parses Apple Music track URLs", () => {
    const result = parseAppleMusicUrl("https://music.apple.com/us/album/album-name/123456?i=789abc");
    expect(result?.type).toBe("album");
    expect(result?.id).toBe("789abc");
  });

  it("parses Apple Music URLs without query params", () => {
    const result = parseAppleMusicUrl("https://music.apple.com/us/artist/artist-name/123");
    expect(result?.type).toBe("artist");
    expect(result?.id).toBe("123");
  });

  it("returns null for non-Apple URLs", () => {
    const result = parseAppleMusicUrl("https://open.spotify.com/track/123");
    expect(result).toBeNull();
  });

  it("returns null for invalid URLs", () => {
    const result = parseAppleMusicUrl("not-a-url");
    expect(result).toBeNull();
  });
});
