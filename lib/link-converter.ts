import * as stringSimilarity from "string-similarity";
import type { ParsedMusicUrl } from "./url-parser";
import {
  getSpotifyTrackById,
  getSpotifyAlbumById,
  getSpotifyArtistById,
  searchSpotifyCatalog,
} from "./spotify";
import {
  getCachedAppleMusicToken,
  getAppleMusicSongDetails,
  getAppleMusicAlbumDetails,
  getAppleMusicArtistDetails,
  searchAppleMusicCatalog,
  getAppleMusicSongsByIsrc,
} from "./apple-music";

export type MusicItemType = "track" | "album" | "artist";

export interface LinkMetadata {
  type: MusicItemType;
  title: string;
  artist: string;
  album?: string;
  isrc?: string;
  artworkUrl?: string;
  releaseDate?: string;
  genres?: string[];
  duration?: number; // ms
  previewUrl?: string;
  url: string;
}

export interface LinkConversionResult {
  direction: "spotify-to-apple" | "apple-to-spotify";
  type: MusicItemType;
  source: LinkMetadata;
  target: LinkMetadata | null;
  confidence: number; // 0-100
  matchMethod: "isrc" | "fuzzy" | "none";
}

// Minimum artist similarity required to trust an ISRC match. Prevents cover
// versions and karaoke tracks that reuse ISRCs from matching originals.
const MIN_ARTIST_SIMILARITY_FOR_ISRC = 0.4;
// Minimum fuzzy score (0-1) required to accept a match at all.
const MIN_ACCEPT_SCORE = 0.4;
// A score this high ends the query cascade early.
const EARLY_EXIT_SCORE = 0.9;

// ---------------------------------------------------------------------------
// Text normalization helpers (ported from convert.jakoblangtry.com)
// ---------------------------------------------------------------------------

function cleanText(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removeFeaturingArtists(title: string): string {
  return title
    .replace(/\s*[([]?\s*(?:feat\.?|ft\.?|featuring|with)\s+[^)\]]*[)\]]?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripVersionInfo(title: string): string {
  return title
    .replace(/\s*[([][^)\]]*(?:remaster(?:ed)?|remix|version|edit|deluxe|anniversary|edition|mono|stereo|live|acoustic|demo|bonus)[^)\]]*[)\]]/gi, "")
    .replace(/\s*-\s*(?:remaster(?:ed)?|remix|single version|album version|radio edit|live|acoustic|mono|stereo)(?:\s+\d{4})?\s*$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function primaryArtist(artist: string): string {
  return artist.split(/,|&|\sfeat\.?\s|\sft\.?\s|\sand\s|\swith\s/i)[0].trim();
}

const TRIBUTE_INDICATORS = [
  "tribute",
  "covers",
  "karaoke",
  "instrumental",
  "orchestra",
  "string quartet",
  "lullaby",
  "piano version",
  "jazz version",
  "made famous",
  "in the style of",
];

function isTributeArtist(candidateArtist: string, originalArtist: string): boolean {
  const candidate = cleanText(candidateArtist);
  const original = cleanText(originalArtist);
  if (candidate === original) return false;
  return TRIBUTE_INDICATORS.some((ind) => candidate.includes(ind)) ||
    (candidate.includes(original) && candidate.length > original.length + 3);
}

function similarity(a: string, b: string): number {
  return stringSimilarity.compareTwoStrings(cleanText(a), cleanText(b));
}

function titleSimilarity(a: string, b: string): number {
  const direct = similarity(a, b);
  const stripped = similarity(
    stripVersionInfo(removeFeaturingArtists(a)),
    stripVersionInfo(removeFeaturingArtists(b))
  );
  return Math.max(direct, stripped);
}

function artistSimilarity(a: string, b: string): number {
  const direct = similarity(a, b);
  const primary = similarity(primaryArtist(a), primaryArtist(b));
  return Math.max(direct, primary * 0.95);
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function scoreCandidate(source: LinkMetadata, candidate: LinkMetadata): number {
  let score = 0;
  if (source.type === "track") {
    score += titleSimilarity(source.title, candidate.title) * 0.45;
    score += artistSimilarity(source.artist, candidate.artist) * 0.35;
    if (source.album && candidate.album) {
      score += titleSimilarity(source.album, candidate.album) * 0.1;
    }
    if (source.duration && candidate.duration) {
      score += Math.abs(source.duration - candidate.duration) <= 2000 ? 0.1 : 0;
    }
  } else if (source.type === "album") {
    score += titleSimilarity(source.title, candidate.title) * 0.6;
    score += artistSimilarity(source.artist, candidate.artist) * 0.4;
  } else {
    score += similarity(source.title, candidate.title);
  }
  if (isTributeArtist(candidate.artist, source.artist)) {
    score *= 0.1;
  }
  return score;
}

// ---------------------------------------------------------------------------
// Metadata mappers
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

function upscaleAppleArtwork(url?: string): string | undefined {
  return url?.replace("{w}", "600").replace("{h}", "600");
}

export function mapSpotifyTrackMeta(t: any): LinkMetadata {
  return {
    type: "track",
    title: t.name,
    artist: (t.artists ?? []).map((a: any) => a.name).join(", "),
    album: t.album?.name,
    isrc: t.external_ids?.isrc,
    artworkUrl: t.album?.images?.[0]?.url,
    releaseDate: t.album?.release_date,
    duration: t.duration_ms,
    previewUrl: t.preview_url ?? undefined,
    url: t.external_urls?.spotify ?? `https://open.spotify.com/track/${t.id}`,
  };
}

function mapSpotifyAlbumMeta(a: any): LinkMetadata {
  return {
    type: "album",
    title: a.name,
    artist: (a.artists ?? []).map((x: any) => x.name).join(", "),
    artworkUrl: a.images?.[0]?.url,
    releaseDate: a.release_date,
    genres: a.genres?.length ? a.genres : undefined,
    url: a.external_urls?.spotify ?? `https://open.spotify.com/album/${a.id}`,
  };
}

function mapSpotifyArtistMeta(a: any): LinkMetadata {
  return {
    type: "artist",
    title: a.name,
    artist: a.name,
    genres: a.genres?.length ? a.genres : undefined,
    artworkUrl: a.images?.[0]?.url,
    url: a.external_urls?.spotify ?? `https://open.spotify.com/artist/${a.id}`,
  };
}

function mapAppleSongMeta(s: any): LinkMetadata {
  const attr = s.attributes ?? {};
  return {
    type: "track",
    title: attr.name,
    artist: attr.artistName,
    album: attr.albumName,
    isrc: attr.isrc,
    artworkUrl: upscaleAppleArtwork(attr.artwork?.url),
    releaseDate: attr.releaseDate,
    genres: attr.genreNames?.length ? attr.genreNames : undefined,
    duration: attr.durationInMillis,
    previewUrl: attr.previews?.[0]?.url,
    url: attr.url,
  };
}

function mapAppleAlbumMeta(a: any): LinkMetadata {
  const attr = a.attributes ?? {};
  return {
    type: "album",
    title: attr.name,
    artist: attr.artistName,
    artworkUrl: upscaleAppleArtwork(attr.artwork?.url),
    releaseDate: attr.releaseDate,
    genres: attr.genreNames?.length ? attr.genreNames : undefined,
    url: attr.url,
  };
}

function mapAppleArtistMeta(a: any): LinkMetadata {
  const attr = a.attributes ?? {};
  return {
    type: "artist",
    title: attr.name,
    artist: attr.name,
    genres: attr.genreNames?.length ? attr.genreNames : undefined,
    artworkUrl: upscaleAppleArtwork(attr.artwork?.url),
    url: attr.url,
  };
}

// ---------------------------------------------------------------------------
// Query generation (most specific -> most permissive)
// ---------------------------------------------------------------------------

function buildSpotifyQueries(source: LinkMetadata): string[] {
  const title = source.title;
  const artist = primaryArtist(source.artist);
  const cleanTitle = stripVersionInfo(removeFeaturingArtists(title));
  const queries: string[] = [];
  if (source.type === "track") {
    queries.push(`track:"${title}" artist:"${artist}"`);
    if (cleanTitle !== title) queries.push(`track:"${cleanTitle}" artist:"${artist}"`);
    queries.push(`${cleanTitle} ${artist}`);
  } else if (source.type === "album") {
    queries.push(`album:"${title}" artist:"${artist}"`);
    if (cleanTitle !== title) queries.push(`album:"${cleanTitle}" artist:"${artist}"`);
    queries.push(`${cleanTitle} ${artist}`);
  } else {
    queries.push(`artist:"${title}"`);
    queries.push(title);
  }
  return [...new Set(queries)];
}

function buildAppleQueries(source: LinkMetadata): string[] {
  const title = source.title;
  const artist = primaryArtist(source.artist);
  const cleanTitle = stripVersionInfo(removeFeaturingArtists(title));
  const queries: string[] = [];
  if (source.type === "artist") {
    queries.push(title);
  } else {
    queries.push(`${title} ${artist}`);
    if (cleanTitle !== title) queries.push(`${cleanTitle} ${artist}`);
    if (source.type === "track" && source.album) {
      queries.push(`${cleanTitle} ${artist} ${source.album}`);
    }
  }
  return [...new Set(queries)];
}

// ---------------------------------------------------------------------------
// Search + match
// ---------------------------------------------------------------------------

async function findSpotifyMatch(
  source: LinkMetadata
): Promise<{ target: LinkMetadata; score: number; method: "isrc" | "fuzzy" } | null> {
  // ISRC first for tracks, guarded by artist similarity
  if (source.type === "track" && source.isrc) {
    const hits = (await searchSpotifyCatalog(`isrc:${source.isrc}`, "track", 5)) as any[];
    for (const hit of hits) {
      const meta = mapSpotifyTrackMeta(hit);
      if (artistSimilarity(source.artist, meta.artist) >= MIN_ARTIST_SIMILARITY_FOR_ISRC) {
        return { target: meta, score: 1, method: "isrc" };
      }
    }
  }

  const mapper =
    source.type === "track"
      ? mapSpotifyTrackMeta
      : source.type === "album"
        ? mapSpotifyAlbumMeta
        : mapSpotifyArtistMeta;

  let best: { target: LinkMetadata; score: number } | null = null;
  for (const query of buildSpotifyQueries(source)) {
    const items = (await searchSpotifyCatalog(query, source.type, 10)) as any[];
    for (const item of items) {
      if (!item) continue;
      const meta = mapper(item);
      let score = scoreCandidate(source, meta);
      // Slight popularity tiebreak, mirrors the original converter
      if (typeof item.popularity === "number") {
        score *= 1 + item.popularity / 1000;
      }
      if (!best || score > best.score) best = { target: meta, score };
    }
    if (best && best.score >= EARLY_EXIT_SCORE) break;
  }

  if (best && best.score >= MIN_ACCEPT_SCORE) {
    return { ...best, score: Math.min(best.score, 1), method: "fuzzy" };
  }
  return null;
}

async function findAppleMatch(
  source: LinkMetadata
): Promise<{ target: LinkMetadata; score: number; method: "isrc" | "fuzzy" } | null> {
  const devToken = await getCachedAppleMusicToken();

  if (source.type === "track" && source.isrc) {
    const hits = await getAppleMusicSongsByIsrc(devToken, source.isrc);
    for (const hit of hits) {
      const meta = mapAppleSongMeta(hit);
      if (artistSimilarity(source.artist, meta.artist) >= MIN_ARTIST_SIMILARITY_FOR_ISRC) {
        return { target: meta, score: 1, method: "isrc" };
      }
    }
  }

  const searchType =
    source.type === "track" ? "songs" : source.type === "album" ? "albums" : "artists";
  const mapper =
    source.type === "track"
      ? mapAppleSongMeta
      : source.type === "album"
        ? mapAppleAlbumMeta
        : mapAppleArtistMeta;

  let best: { target: LinkMetadata; score: number } | null = null;
  for (const query of buildAppleQueries(source)) {
    const items = await searchAppleMusicCatalog(devToken, query, searchType, 10);
    for (const item of items) {
      if (!item) continue;
      const meta = mapper(item);
      const score = scoreCandidate(source, meta);
      if (!best || score > best.score) best = { target: meta, score };
    }
    if (best && best.score >= EARLY_EXIT_SCORE) break;
  }

  if (best && best.score >= MIN_ACCEPT_SCORE) {
    return { ...best, score: Math.min(best.score, 1), method: "fuzzy" };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Source metadata fetch
// ---------------------------------------------------------------------------

async function fetchSourceMetadata(parsed: ParsedMusicUrl): Promise<LinkMetadata | null> {
  if (parsed.service === "spotify") {
    if (parsed.type === "track") return mapSpotifyTrackMeta(await getSpotifyTrackById(parsed.id));
    if (parsed.type === "album") return mapSpotifyAlbumMeta(await getSpotifyAlbumById(parsed.id));
    if (parsed.type === "artist") return mapSpotifyArtistMeta(await getSpotifyArtistById(parsed.id));
    return null;
  }
  const devToken = await getCachedAppleMusicToken();
  const storefront = parsed.storefront || "us";
  if (parsed.type === "track") {
    const song = await getAppleMusicSongDetails(devToken, parsed.id, storefront);
    return song ? mapAppleSongMeta(song) : null;
  }
  if (parsed.type === "album") {
    const album = await getAppleMusicAlbumDetails(devToken, parsed.id, storefront);
    return album ? mapAppleAlbumMeta(album) : null;
  }
  if (parsed.type === "artist") {
    const artist = await getAppleMusicArtistDetails(devToken, parsed.id, storefront);
    return artist ? mapAppleArtistMeta(artist) : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Convert a single Spotify or Apple Music track/album/artist link to the
 * other service. Playlist URLs are not handled here (use the share flow).
 */
export async function convertMusicLink(parsed: ParsedMusicUrl): Promise<LinkConversionResult> {
  if (parsed.type === "playlist") {
    throw new Error("Playlist links are handled by the share flow, not link conversion");
  }

  const source = await fetchSourceMetadata(parsed);
  if (!source) {
    throw new Error("Could not fetch metadata for the source link");
  }

  const match =
    parsed.service === "spotify" ? await findAppleMatch(source) : await findSpotifyMatch(source);

  return {
    direction: parsed.service === "spotify" ? "spotify-to-apple" : "apple-to-spotify",
    type: parsed.type as MusicItemType,
    source,
    target: match?.target ?? null,
    confidence: match ? Math.round(match.score * 100) : 0,
    matchMethod: match?.method ?? "none",
  };
}

// Exported for unit tests
export const _internal = {
  cleanText,
  removeFeaturingArtists,
  stripVersionInfo,
  primaryArtist,
  isTributeArtist,
  scoreCandidate,
  titleSimilarity,
  artistSimilarity,
};
