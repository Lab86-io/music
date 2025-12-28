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
  service: "spotify" | "apple";
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
  return parsed.service === "spotify" ? "Spotify" : "Apple Music";
}

