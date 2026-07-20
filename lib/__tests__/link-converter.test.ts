import { describe, it, expect } from "vitest";
import { parseMusicUrl } from "../url-parser";
import { _internal } from "../link-converter";

describe("parseMusicUrl", () => {
  describe("Spotify URLs", () => {
    it("parses track URLs", () => {
      expect(
        parseMusicUrl("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC")
      ).toEqual({ service: "spotify", type: "track", id: "4uLU6hMCjMI75M1A2tKUQC" });
    });

    it("parses album URLs with query params", () => {
      expect(
        parseMusicUrl("https://open.spotify.com/album/6dVIqQ8qmQ5GBnJ9shOYGE?si=xyz")
      ).toEqual({ service: "spotify", type: "album", id: "6dVIqQ8qmQ5GBnJ9shOYGE" });
    });

    it("parses artist URLs", () => {
      expect(
        parseMusicUrl("https://open.spotify.com/artist/0OdUWJ0sBjDrqHygGUXeCF")
      ).toEqual({ service: "spotify", type: "artist", id: "0OdUWJ0sBjDrqHygGUXeCF" });
    });

    it("parses playlist URLs", () => {
      expect(
        parseMusicUrl("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")
      ).toEqual({ service: "spotify", type: "playlist", id: "37i9dQZF1DXcBWIGoYBM5M" });
    });

    it("parses locale-prefixed URLs", () => {
      expect(
        parseMusicUrl("https://open.spotify.com/intl-de/track/4uLU6hMCjMI75M1A2tKUQC")
      ).toEqual({ service: "spotify", type: "track", id: "4uLU6hMCjMI75M1A2tKUQC" });
    });
  });

  describe("Apple Music URLs", () => {
    it("parses track URLs via ?i= param", () => {
      expect(
        parseMusicUrl("https://music.apple.com/us/album/song-name/1440857781?i=1440857782")
      ).toEqual({ service: "apple", type: "track", id: "1440857782", storefront: "us" });
    });

    it("parses song URLs", () => {
      expect(
        parseMusicUrl("https://music.apple.com/us/song/hey-jude/1441164426")
      ).toEqual({ service: "apple", type: "track", id: "1441164426", storefront: "us" });
    });

    it("parses album URLs", () => {
      expect(
        parseMusicUrl("https://music.apple.com/gb/album/abbey-road/1441164359")
      ).toEqual({ service: "apple", type: "album", id: "1441164359", storefront: "gb" });
    });

    it("parses artist URLs", () => {
      expect(
        parseMusicUrl("https://music.apple.com/us/artist/the-beatles/136975")
      ).toEqual({ service: "apple", type: "artist", id: "136975", storefront: "us" });
    });

    it("parses playlist URLs", () => {
      expect(
        parseMusicUrl(
          "https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb"
        )
      ).toEqual({
        service: "apple",
        type: "playlist",
        id: "pl.f4d106fed2bd41149aaacabb233eb5eb",
        storefront: "us",
      });
    });
  });

  describe("Deezer URLs", () => {
    it("parses track URLs", () => {
      expect(parseMusicUrl("https://www.deezer.com/track/3135556")).toEqual({
        service: "deezer",
        type: "track",
        id: "3135556",
      });
    });

    it("parses locale-prefixed album URLs", () => {
      expect(parseMusicUrl("https://www.deezer.com/en/album/302127")).toEqual({
        service: "deezer",
        type: "album",
        id: "302127",
      });
    });

    it("parses artist and playlist URLs", () => {
      expect(parseMusicUrl("https://www.deezer.com/fr/artist/27")).toEqual({
        service: "deezer",
        type: "artist",
        id: "27",
      });
      expect(parseMusicUrl("https://www.deezer.com/playlist/1479458365")).toEqual({
        service: "deezer",
        type: "playlist",
        id: "1479458365",
      });
    });
  });

  describe("TIDAL URLs", () => {
    it("parses browse and listen track/album/artist URLs", () => {
      expect(parseMusicUrl("https://tidal.com/browse/track/140293853")).toEqual({
        service: "tidal",
        type: "track",
        id: "140293853",
      });
      expect(parseMusicUrl("https://listen.tidal.com/album/140293842")).toEqual({
        service: "tidal",
        type: "album",
        id: "140293842",
      });
      expect(parseMusicUrl("https://tidal.com/artist/15686")).toEqual({
        service: "tidal",
        type: "artist",
        id: "15686",
      });
    });

    it("parses playlist UUID URLs", () => {
      expect(
        parseMusicUrl("https://tidal.com/browse/playlist/36ea71a8-445e-41a4-82ab-6628c581535d")
      ).toEqual({
        service: "tidal",
        type: "playlist",
        id: "36ea71a8-445e-41a4-82ab-6628c581535d",
      });
    });
  });

  describe("YouTube URLs", () => {
    it("parses YouTube Music watch URLs", () => {
      expect(parseMusicUrl("https://music.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
        service: "youtube",
        type: "track",
        id: "dQw4w9WgXcQ",
      });
    });

    it("parses YouTube playlist URLs and rejects radio mixes", () => {
      expect(
        parseMusicUrl("https://music.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI")
      ).toEqual({
        service: "youtube",
        type: "playlist",
        id: "PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI",
      });
      // watch?v=…&list=… still resolves to the playlist
      expect(
        parseMusicUrl("https://www.youtube.com/watch?v=abc123&list=PLxyz1234567890")
      ).toEqual({ service: "youtube", type: "playlist", id: "PLxyz1234567890" });
      // Auto-generated radio/mix lists are not shareable playlists
      expect(parseMusicUrl("https://music.youtube.com/watch?v=abc123&list=RDabc123")).toEqual({
        service: "youtube",
        type: "track",
        id: "abc123",
      });
    });

    it("parses regular YouTube and youtu.be URLs", () => {
      expect(parseMusicUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10")).toEqual({
        service: "youtube",
        type: "track",
        id: "dQw4w9WgXcQ",
      });
      expect(parseMusicUrl("https://youtu.be/dQw4w9WgXcQ")).toEqual({
        service: "youtube",
        type: "track",
        id: "dQw4w9WgXcQ",
      });
    });
  });

  describe("invalid URLs", () => {
    it("rejects non-music URLs", () => {
      expect(parseMusicUrl("https://example.com/track/123")).toBeNull();
      expect(parseMusicUrl("not a url")).toBeNull();
      expect(parseMusicUrl("https://open.spotify.com/show/abc123")).toBeNull();
    });
  });
});

describe("link-converter internals", () => {
  const { removeFeaturingArtists, stripVersionInfo, primaryArtist, isTributeArtist, scoreCandidate } =
    _internal;

  it("removes featuring artists from titles", () => {
    expect(removeFeaturingArtists("Umbrella (feat. Jay-Z)")).toBe("Umbrella");
    expect(removeFeaturingArtists("Airplanes ft. Hayley Williams")).toBe("Airplanes");
    expect(removeFeaturingArtists("Plain Title")).toBe("Plain Title");
  });

  it("strips version info from titles", () => {
    expect(stripVersionInfo("Let It Be (Remastered 2009)")).toBe("Let It Be");
    expect(stripVersionInfo("Hurt - Live")).toBe("Hurt");
    expect(stripVersionInfo("Blank Space")).toBe("Blank Space");
  });

  it("extracts the primary artist", () => {
    expect(primaryArtist("Beyoncé, Jay-Z")).toBe("Beyoncé");
    expect(primaryArtist("Simon & Garfunkel")).toBe("Simon");
    expect(primaryArtist("Adele")).toBe("Adele");
  });

  it("flags tribute/cover artists", () => {
    expect(isTributeArtist("Vitamin String Quartet", "Radiohead")).toBe(true);
    expect(isTributeArtist("Radiohead Tribute Band", "Radiohead")).toBe(true);
    expect(isTributeArtist("Radiohead", "Radiohead")).toBe(false);
    expect(isTributeArtist("Coldplay", "Radiohead")).toBe(false);
  });

  it("scores identical tracks near 1.0 and unrelated tracks low", () => {
    const source = {
      type: "track" as const,
      title: "Karma Police",
      artist: "Radiohead",
      album: "OK Computer",
      duration: 261000,
      url: "https://example.com/a",
    };
    const exact = { ...source, url: "https://example.com/b" };
    const unrelated = {
      type: "track" as const,
      title: "Shake It Off",
      artist: "Taylor Swift",
      album: "1989",
      duration: 219000,
      url: "https://example.com/c",
    };
    expect(scoreCandidate(source, exact)).toBeGreaterThan(0.95);
    expect(scoreCandidate(source, unrelated)).toBeLessThan(0.3);
  });

  it("penalizes tribute versions of a track", () => {
    const source = {
      type: "track" as const,
      title: "Karma Police",
      artist: "Radiohead",
      url: "https://example.com/a",
    };
    const tribute = {
      type: "track" as const,
      title: "Karma Police",
      artist: "Radiohead Tribute Orchestra",
      url: "https://example.com/b",
    };
    expect(scoreCandidate(source, tribute)).toBeLessThan(0.2);
  });

  it("scores albums and artists", () => {
    const album = {
      type: "album" as const,
      title: "OK Computer",
      artist: "Radiohead",
      url: "https://example.com/a",
    };
    expect(scoreCandidate(album, { ...album, url: "https://example.com/b" })).toBeGreaterThan(0.95);

    const artist = {
      type: "artist" as const,
      title: "Radiohead",
      artist: "Radiohead",
      url: "https://example.com/a",
    };
    expect(scoreCandidate(artist, { ...artist, url: "https://example.com/b" })).toBeGreaterThan(0.95);
  });
});
