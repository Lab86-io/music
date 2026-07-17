/**
 * Parse playlist URLs from Spotify and Apple Music
 * 
 * Supported formats:
 * - Spotify: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
 * - Spotify (with query params): https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=xxx
 * - Apple Music: https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb
 * - Apple Music (short): https://music.apple.com/us/playlist/pl.f4d106fed2bd41149aaacabb233eb5eb
 */

export interface ParsedPlaylistUrl {
  service: "spotify" | "apple" | "deezer";
  playlistId: string;
  storefront?: string; // For Apple Music regional catalogs (e.g., "us", "gb", "jp")
}

/**
 * Parse a Spotify or Apple Music playlist URL and extract the service and playlist ID
 */
export function parsePlaylistUrl(url: string): ParsedPlaylistUrl | null {
  try {
    const parsed = new URL(url.trim());
    
    // Spotify URLs
    // Format: https://open.spotify.com/playlist/{playlistId}
    if (parsed.hostname === "open.spotify.com") {
      const match = parsed.pathname.match(/^\/playlist\/([a-zA-Z0-9]+)/);
      if (match) {
        return {
          service: "spotify",
          playlistId: match[1],
        };
      }
    }

    // Apple Music URLs
    // Format: https://music.apple.com/{storefront}/playlist/{name}/{playlistId}
    // Or: https://music.apple.com/{storefront}/playlist/{playlistId}
    if (parsed.hostname === "music.apple.com") {
      // Match pattern: /{storefront}/playlist/{optional-name}/{pl.xxx}
      // The playlist ID always starts with "pl."
      const match = parsed.pathname.match(/^\/([a-z]{2})\/playlist\/(?:.*\/)?(pl\.[a-zA-Z0-9-]+)/);
      if (match) {
        return {
          service: "apple",
          playlistId: match[2],
          storefront: match[1],
        };
      }
      
      // Alternative pattern without the name segment
      const altMatch = parsed.pathname.match(/^\/([a-z]{2})\/playlist\/(pl\.[a-zA-Z0-9-]+)/);
      if (altMatch) {
        return {
          service: "apple",
          playlistId: altMatch[2],
          storefront: altMatch[1],
        };
      }
    }

    return null;
  } catch {
    // Invalid URL
    return null;
  }
}

// ---------------------------------------------------------------------------
// Generic music link parsing (tracks, albums, artists, playlists)
// ---------------------------------------------------------------------------

export type MusicLinkType = "track" | "album" | "artist" | "playlist";
export type MusicService = "spotify" | "apple" | "deezer" | "youtube" | "amazon";

export interface ParsedMusicUrl {
  service: MusicService;
  type: MusicLinkType;
  id: string;
  storefront?: string; // Apple Music regional catalog (e.g. "us", "gb")
}

/** Hosts we recognize but cannot read (no public catalog API). */
export function isAmazonMusicUrl(url: string): boolean {
  try {
    return new URL(url.trim()).hostname.endsWith("music.amazon.com");
  } catch {
    return false;
  }
}

/** Deezer short links need a server-side redirect resolution first. */
export function isDeezerShortLink(url: string): boolean {
  try {
    const host = new URL(url.trim()).hostname;
    return host === "link.deezer.com" || host === "deezer.page.link" || host === "dzr.page.link";
  } catch {
    return false;
  }
}

/**
 * Parse any Spotify or Apple Music content URL (track, album, artist, playlist).
 *
 * Supported formats:
 * - https://open.spotify.com/{track|album|artist|playlist}/{id}
 * - https://open.spotify.com/intl-de/track/{id} (locale prefixes)
 * - https://music.apple.com/us/album/name/123456?i=654321 (track via ?i=)
 * - https://music.apple.com/us/album/name/123456
 * - https://music.apple.com/us/song/name/654321
 * - https://music.apple.com/us/artist/name/123456
 * - https://music.apple.com/us/playlist/name/pl.xxx
 * - https://www.deezer.com/{lang?}/{track|album|artist|playlist}/{id}
 * - https://music.youtube.com/watch?v={id}, youtube.com/watch?v=, youtu.be/{id}
 */
export function parseMusicUrl(url: string): ParsedMusicUrl | null {
  try {
    const parsed = new URL(url.trim());

    if (
      parsed.hostname === "open.spotify.com" ||
      parsed.hostname === "play.spotify.com"
    ) {
      // Strip optional locale prefix like /intl-de or /intl-pt-BR
      const path = parsed.pathname.replace(/^\/intl-[a-z]{2}(?:-[A-Za-z]{2})?/, "");
      const match = path.match(/^\/(track|album|artist|playlist)\/([a-zA-Z0-9]+)/);
      if (match) {
        return { service: "spotify", type: match[1] as MusicLinkType, id: match[2] };
      }
      return null;
    }

    if (
      parsed.hostname === "music.apple.com" ||
      parsed.hostname === "geo.music.apple.com" ||
      parsed.hostname === "itunes.apple.com"
    ) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      let storefront = "us";
      let rest = parts;
      if (parts.length > 0 && /^[a-z]{2}$/.test(parts[0])) {
        storefront = parts[0];
        rest = parts.slice(1);
      }
      const kind = rest[0];
      const lastPart = rest[rest.length - 1];
      const trackId = parsed.searchParams.get("i");

      if (kind === "playlist") {
        const pl = rest.find((p) => p.startsWith("pl."));
        return pl ? { service: "apple", type: "playlist", id: pl, storefront } : null;
      }
      if (kind === "album") {
        if (trackId && /^\d+$/.test(trackId)) {
          return { service: "apple", type: "track", id: trackId, storefront };
        }
        if (lastPart && /^\d+$/.test(lastPart)) {
          return { service: "apple", type: "album", id: lastPart, storefront };
        }
        return null;
      }
      if (kind === "song" && lastPart && /^\d+$/.test(lastPart)) {
        return { service: "apple", type: "track", id: lastPart, storefront };
      }
      if (kind === "artist" && lastPart && /^\d+$/.test(lastPart)) {
        return { service: "apple", type: "artist", id: lastPart, storefront };
      }
      return null;
    }

    if (parsed.hostname === "www.deezer.com" || parsed.hostname === "deezer.com") {
      // Optional locale prefix like /en or /fr-FR
      const path = parsed.pathname.replace(/^\/[a-z]{2}(?:-[A-Za-z]{2})?(?=\/)/, "");
      const match = path.match(/^\/(track|album|artist|playlist)\/(\d+)/);
      if (match) {
        return { service: "deezer", type: match[1] as MusicLinkType, id: match[2] };
      }
      return null;
    }

    if (
      parsed.hostname === "music.youtube.com" ||
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "youtube.com" ||
      parsed.hostname === "m.youtube.com"
    ) {
      const videoId = parsed.searchParams.get("v");
      if (parsed.pathname === "/watch" && videoId && /^[\w-]{6,20}$/.test(videoId)) {
        return { service: "youtube", type: "track", id: videoId };
      }
      return null;
    }

    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      if (id && /^[\w-]{6,20}$/.test(id)) {
        return { service: "youtube", type: "track", id };
      }
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a string looks like a valid playlist URL
 */
export function isValidPlaylistUrl(url: string): boolean {
  return parsePlaylistUrl(url) !== null;
}

/**
 * Get a human-readable service name from a parsed URL
 */
export function getServiceName(parsed: ParsedPlaylistUrl): string {
  if (parsed.service === "spotify") return "Spotify";
  if (parsed.service === "deezer") return "Deezer";
  return "Apple Music";
}

