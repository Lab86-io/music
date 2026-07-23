import type { MusicService } from "@/lib/url-parser";

/**
 * Directional conversion landing pages (/spotify-to-apple-music etc.).
 * Sources are the five services we can read; targets add Amazon Music,
 * which we can only link out to via pre-filled search.
 */

export interface SeoService {
  id: MusicService;
  slug: string;
  name: string;
  canBeSource: boolean;
  /** Can receive full playlist imports (sign-in flow or share page). */
  playlistTarget: boolean;
}

export const SEO_SERVICES: SeoService[] = [
  { id: "spotify", slug: "spotify", name: "Spotify", canBeSource: true, playlistTarget: true },
  { id: "apple", slug: "apple-music", name: "Apple Music", canBeSource: true, playlistTarget: true },
  { id: "deezer", slug: "deezer", name: "Deezer", canBeSource: true, playlistTarget: true },
  { id: "tidal", slug: "tidal", name: "TIDAL", canBeSource: true, playlistTarget: true },
  { id: "youtube", slug: "youtube-music", name: "YouTube Music", canBeSource: true, playlistTarget: true },
  { id: "amazon", slug: "amazon-music", name: "Amazon Music", canBeSource: false, playlistTarget: false },
];

export interface ConversionPair {
  slug: string;
  from: SeoService;
  to: SeoService;
}

export const CONVERSION_PAIRS: ConversionPair[] = SEO_SERVICES.filter(
  (service) => service.canBeSource
).flatMap((from) =>
  SEO_SERVICES.filter((to) => to.id !== from.id).map((to) => ({
    slug: `${from.slug}-to-${to.slug}`,
    from,
    to,
  }))
);

export function findPair(slug: string): ConversionPair | undefined {
  return CONVERSION_PAIRS.find((pair) => pair.slug === slug);
}
