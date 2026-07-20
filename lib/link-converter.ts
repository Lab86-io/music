import * as stringSimilarity from "string-similarity";
import type { ParsedMusicUrl, MusicService } from "./url-parser";
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
import {
  getDeezerTrack,
  getDeezerTrackByIsrc,
  getDeezerAlbum,
  getDeezerArtist,
  searchDeezerTracks,
  searchDeezerAlbums,
  searchDeezerArtists,
  type DeezerTrack,
  type DeezerAlbum,
  type DeezerArtist,
} from "./deezer";
import {
  getTidalTrack,
  getTidalAlbum,
  getTidalArtist,
  getTidalTracksByIsrc,
  searchTidal,
  isTidalConfigured,
  type TidalItem,
} from "./tidal";
import {
  getYouTubeVideoInfo,
  parseYouTubeTitle,
  searchYouTubeMusic,
  searchYouTubeChannel,
  searchYouTubeAlbumPlaylist,
  youtubeMusicWatchUrl,
  youtubeMusicChannelUrl,
  youtubeMusicPlaylistUrl,
  youtubeMusicSearchUrl,
} from "./youtube";

export type MusicItemType = "track" | "album" | "artist";
export type { MusicService };

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

export interface ServiceLink {
  service: MusicService;
  url: string;
  /** direct = an exact catalog match; search = a pre-filled search page */
  kind: "direct" | "search";
  confidence?: number; // 0-100, direct links only
  matchMethod?: "isrc" | "fuzzy";
  metadata?: LinkMetadata;
}

export interface LinkConversionResult {
  type: MusicItemType;
  sourceService: MusicService;
  source: LinkMetadata;
  /** One entry per other service, in display order. */
  links: ServiceLink[];
  /** Best direct match — what shortcuts and "converted" consumers want. */
  primary: ServiceLink | null;
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

function mapDeezerTrackMeta(t: DeezerTrack): LinkMetadata {
  return {
    type: "track",
    title: t.title,
    artist: t.artist?.name ?? "",
    album: t.album?.title,
    isrc: t.isrc,
    artworkUrl: t.album?.cover_xl || t.album?.cover_medium,
    releaseDate: t.release_date,
    duration: t.duration ? t.duration * 1000 : undefined,
    previewUrl: t.preview || undefined,
    url: t.link,
  };
}

function mapDeezerAlbumMeta(a: DeezerAlbum): LinkMetadata {
  return {
    type: "album",
    title: a.title,
    artist: a.artist?.name ?? "",
    artworkUrl: a.cover_xl || a.cover_medium,
    releaseDate: a.release_date,
    genres: a.genres?.data?.length ? a.genres.data.map((g) => g.name) : undefined,
    url: a.link,
  };
}

function mapDeezerArtistMeta(a: DeezerArtist): LinkMetadata {
  return {
    type: "artist",
    title: a.name,
    artist: a.name,
    artworkUrl: a.picture_xl || a.picture_medium,
    url: a.link,
  };
}

function mapTidalMeta(item: TidalItem): LinkMetadata {
  return {
    type: item.type,
    title: item.title,
    artist: item.artist,
    album: item.album,
    isrc: item.isrc,
    artworkUrl: item.artworkUrl,
    releaseDate: item.releaseDate,
    duration: item.duration,
    url: item.url,
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

function buildPlainQueries(source: LinkMetadata): string[] {
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
// Per-service matchers (direct catalog matches)
// ---------------------------------------------------------------------------

interface DirectMatch {
  metadata: LinkMetadata;
  score: number;
  method: "isrc" | "fuzzy";
}

function pickBest(
  source: LinkMetadata,
  candidates: LinkMetadata[],
  best: DirectMatch | null
): DirectMatch | null {
  for (const meta of candidates) {
    if (!meta?.title) continue;
    const score = scoreCandidate(source, meta);
    if (!best || score > best.score) best = { metadata: meta, score, method: "fuzzy" };
  }
  return best;
}

async function findSpotifyMatch(source: LinkMetadata): Promise<DirectMatch | null> {
  if (source.type === "track" && source.isrc) {
    const hits = (await searchSpotifyCatalog(`isrc:${source.isrc}`, "track", 5)) as any[];
    for (const hit of hits) {
      const meta = mapSpotifyTrackMeta(hit);
      if (artistSimilarity(source.artist, meta.artist) >= MIN_ARTIST_SIMILARITY_FOR_ISRC) {
        return { metadata: meta, score: 1, method: "isrc" };
      }
    }
  }

  const mapper =
    source.type === "track"
      ? mapSpotifyTrackMeta
      : source.type === "album"
        ? mapSpotifyAlbumMeta
        : mapSpotifyArtistMeta;

  let best: DirectMatch | null = null;
  for (const query of buildSpotifyQueries(source)) {
    const items = (await searchSpotifyCatalog(query, source.type, 10)) as any[];
    best = pickBest(source, items.filter(Boolean).map(mapper), best);
    if (best && best.score >= EARLY_EXIT_SCORE) break;
  }
  return best && best.score >= MIN_ACCEPT_SCORE ? { ...best, score: Math.min(best.score, 1) } : null;
}

async function findAppleMatch(source: LinkMetadata): Promise<DirectMatch | null> {
  const devToken = await getCachedAppleMusicToken();

  if (source.type === "track" && source.isrc) {
    const hits = await getAppleMusicSongsByIsrc(devToken, source.isrc);
    for (const hit of hits) {
      const meta = mapAppleSongMeta(hit);
      if (artistSimilarity(source.artist, meta.artist) >= MIN_ARTIST_SIMILARITY_FOR_ISRC) {
        return { metadata: meta, score: 1, method: "isrc" };
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

  let best: DirectMatch | null = null;
  for (const query of buildPlainQueries(source)) {
    const items = await searchAppleMusicCatalog(devToken, query, searchType, 10);
    best = pickBest(source, items.filter(Boolean).map(mapper), best);
    if (best && best.score >= EARLY_EXIT_SCORE) break;
  }
  return best && best.score >= MIN_ACCEPT_SCORE ? { ...best, score: Math.min(best.score, 1) } : null;
}

async function findDeezerMatch(source: LinkMetadata): Promise<DirectMatch | null> {
  if (source.type === "track" && source.isrc) {
    const hit = await getDeezerTrackByIsrc(source.isrc);
    if (hit) {
      const meta = mapDeezerTrackMeta(hit);
      if (artistSimilarity(source.artist, meta.artist) >= MIN_ARTIST_SIMILARITY_FOR_ISRC) {
        return { metadata: meta, score: 1, method: "isrc" };
      }
    }
  }

  let best: DirectMatch | null = null;
  for (const query of buildPlainQueries(source)) {
    let candidates: LinkMetadata[] = [];
    if (source.type === "track") {
      candidates = (await searchDeezerTracks(query, 10)).map(mapDeezerTrackMeta);
    } else if (source.type === "album") {
      candidates = (await searchDeezerAlbums(query, 10)).map(mapDeezerAlbumMeta);
    } else {
      candidates = (await searchDeezerArtists(query, 10)).map(mapDeezerArtistMeta);
    }
    best = pickBest(source, candidates, best);
    if (best && best.score >= EARLY_EXIT_SCORE) break;
  }
  return best && best.score >= MIN_ACCEPT_SCORE ? { ...best, score: Math.min(best.score, 1) } : null;
}

async function findTidalMatch(source: LinkMetadata): Promise<DirectMatch | null> {
  if (!isTidalConfigured()) return null;

  if (source.type === "track" && source.isrc) {
    const hits = await getTidalTracksByIsrc(source.isrc);
    for (const hit of hits) {
      const meta = mapTidalMeta(hit);
      if (artistSimilarity(source.artist, meta.artist) >= MIN_ARTIST_SIMILARITY_FOR_ISRC) {
        return { metadata: meta, score: 1, method: "isrc" };
      }
    }
  }

  let best: DirectMatch | null = null;
  for (const query of buildPlainQueries(source)) {
    const items = await searchTidal(query, source.type as "track" | "album" | "artist");
    best = pickBest(source, items.map(mapTidalMeta), best);
    if (best && best.score >= EARLY_EXIT_SCORE) break;
  }
  return best && best.score >= MIN_ACCEPT_SCORE ? { ...best, score: Math.min(best.score, 1) } : null;
}

/**
 * YouTube Music: direct matches for tracks (videos), albums (auto-generated
 * OLAK5uy_ playlists), and artists (channels) via the Data API; falls back to
 * a pre-filled search link when the key is missing or nothing matches well.
 */
async function findYouTubeLink(source: LinkMetadata): Promise<ServiceLink> {
  const query =
    source.type === "artist" ? source.title : `${source.title} ${primaryArtist(source.artist)}`;
  const searchLink: ServiceLink = {
    service: "youtube",
    url: youtubeMusicSearchUrl(query),
    kind: "search",
  };

  if (source.type === "artist") {
    const hit = await searchYouTubeChannel(source.title);
    if (!hit) return searchLink;
    const score = similarity(source.title, hit.title);
    if (score < 0.5) return searchLink;
    return {
      service: "youtube",
      url: youtubeMusicChannelUrl(hit.channelId),
      kind: "direct",
      confidence: Math.round(Math.min(score, 1) * 100),
      matchMethod: "fuzzy",
      metadata: {
        type: "artist",
        title: hit.title,
        artist: hit.title,
        url: youtubeMusicChannelUrl(hit.channelId),
      },
    };
  }

  if (source.type === "album") {
    const hit = await searchYouTubeAlbumPlaylist(`${source.title} ${primaryArtist(source.artist)} album`);
    if (!hit) return searchLink;
    // Album playlists are usually titled "Artist - Album (Full Album)"; strip
    // the noise and compare against both "Album" and "Artist Album".
    const cleanedTitle = hit.title
      .replace(/[([]?\s*(?:full\s*album|complete|official|hq|hd|\d{4})\s*[)\]]?/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    const combined = `${primaryArtist(source.artist)} ${source.title}`;
    const score = Math.max(
      titleSimilarity(source.title, cleanedTitle) * 0.7 +
        artistSimilarity(source.artist, hit.channel || hit.title) * 0.3,
      titleSimilarity(combined, cleanedTitle)
    );
    if (score < 0.5) return searchLink;
    return {
      service: "youtube",
      url: youtubeMusicPlaylistUrl(hit.playlistId),
      kind: "direct",
      confidence: Math.round(Math.min(score, 1) * 100),
      matchMethod: "fuzzy",
      metadata: {
        type: "album",
        title: hit.title,
        artist: hit.channel,
        url: youtubeMusicPlaylistUrl(hit.playlistId),
      },
    };
  }

  const hit = await searchYouTubeMusic(query);
  if (!hit) return searchLink;

  const parsed = parseYouTubeTitle({ videoId: hit.videoId, title: hit.title, channel: hit.channel });
  const score =
    titleSimilarity(source.title, parsed.title) * 0.6 +
    Math.max(
      artistSimilarity(source.artist, parsed.artist),
      artistSimilarity(source.artist, hit.channel)
    ) *
      0.4;
  if (score < 0.35) return searchLink;

  return {
    service: "youtube",
    url: youtubeMusicWatchUrl(hit.videoId),
    kind: "direct",
    confidence: Math.round(Math.min(score, 1) * 100),
    matchMethod: "fuzzy",
    metadata: {
      type: "track",
      title: parsed.title,
      artist: parsed.artist,
      url: youtubeMusicWatchUrl(hit.videoId),
    },
  };
}

/** Amazon Music has no public catalog API — best we can do is a search link. */
function amazonSearchLink(source: LinkMetadata): ServiceLink {
  const query =
    source.type === "artist" ? source.title : `${source.title} ${primaryArtist(source.artist)}`;
  return {
    service: "amazon",
    url: `https://music.amazon.com/search/${encodeURIComponent(query)}`,
    kind: "search",
  };
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
  if (parsed.service === "apple") {
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
  if (parsed.service === "deezer") {
    if (parsed.type === "track") {
      const t = await getDeezerTrack(parsed.id);
      return t ? mapDeezerTrackMeta(t) : null;
    }
    if (parsed.type === "album") {
      const a = await getDeezerAlbum(parsed.id);
      return a ? mapDeezerAlbumMeta(a) : null;
    }
    if (parsed.type === "artist") {
      const a = await getDeezerArtist(parsed.id);
      return a ? mapDeezerArtistMeta(a) : null;
    }
    return null;
  }
  if (parsed.service === "tidal") {
    if (parsed.type === "track") {
      const t = await getTidalTrack(parsed.id);
      return t ? mapTidalMeta(t) : null;
    }
    if (parsed.type === "album") {
      const a = await getTidalAlbum(parsed.id);
      return a ? mapTidalMeta(a) : null;
    }
    if (parsed.type === "artist") {
      const a = await getTidalArtist(parsed.id);
      return a ? mapTidalMeta(a) : null;
    }
    return null;
  }
  if (parsed.service === "youtube") {
    const info = await getYouTubeVideoInfo(parsed.id);
    if (!info) return null;
    const { title, artist } = parseYouTubeTitle(info);
    return {
      type: "track",
      title,
      artist,
      url: youtubeMusicWatchUrl(parsed.id),
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

const LINK_ORDER: MusicService[] = ["spotify", "apple", "deezer", "tidal", "youtube", "amazon"];

function toServiceLink(service: MusicService, match: DirectMatch | null): ServiceLink | null {
  if (!match) return null;
  return {
    service,
    url: match.metadata.url,
    kind: "direct",
    confidence: Math.round(match.score * 100),
    matchMethod: match.method,
    metadata: match.metadata,
  };
}

/**
 * Convert a single music link into equivalents on every other service.
 * Playlist URLs are not handled here (use the share flow).
 */
export async function convertMusicLink(parsed: ParsedMusicUrl): Promise<LinkConversionResult> {
  if (parsed.type === "playlist") {
    throw new Error("Playlist links are handled by the share flow, not link conversion");
  }

  let source = await fetchSourceMetadata(parsed);
  if (!source) {
    throw new Error("Could not fetch metadata for the source link");
  }

  const results = new Map<MusicService, ServiceLink | null>();

  // For YouTube sources (title-parsed, no ISRC), resolve Spotify first and use
  // its clean metadata to anchor the remaining lookups.
  if (parsed.service === "youtube") {
    const spotifyMatch = await findSpotifyMatch(source);
    results.set("spotify", toServiceLink("spotify", spotifyMatch));
    if (spotifyMatch) {
      source = {
        ...source,
        title: spotifyMatch.metadata.title,
        artist: spotifyMatch.metadata.artist,
        album: spotifyMatch.metadata.album,
        isrc: spotifyMatch.metadata.isrc,
        duration: spotifyMatch.metadata.duration,
        artworkUrl: source.artworkUrl ?? spotifyMatch.metadata.artworkUrl,
      };
    }
  }

  const lookups: Promise<void>[] = [];
  for (const service of LINK_ORDER) {
    if (service === parsed.service || results.has(service)) continue;
    if (service === "spotify") {
      lookups.push(
        findSpotifyMatch(source).then((m) => void results.set("spotify", toServiceLink("spotify", m)))
      );
    } else if (service === "apple") {
      lookups.push(
        findAppleMatch(source).then((m) => void results.set("apple", toServiceLink("apple", m)))
      );
    } else if (service === "deezer") {
      lookups.push(
        findDeezerMatch(source).then((m) => void results.set("deezer", toServiceLink("deezer", m)))
      );
    } else if (service === "tidal") {
      lookups.push(
        findTidalMatch(source).then((m) => void results.set("tidal", toServiceLink("tidal", m)))
      );
    } else if (service === "youtube") {
      lookups.push(findYouTubeLink(source).then((l) => void results.set("youtube", l)));
    } else if (service === "amazon") {
      results.set("amazon", amazonSearchLink(source));
    }
  }
  await Promise.all(lookups);

  const links: ServiceLink[] = [];
  for (const service of LINK_ORDER) {
    if (service === parsed.service) continue;
    const link = results.get(service);
    if (link) links.push(link);
  }

  // Primary: the direct match a shortcut should open. Spotify sources prefer
  // Apple Music (and vice versa); everything else prefers Spotify.
  const preference: MusicService[] =
    parsed.service === "spotify"
      ? ["apple", "deezer", "tidal", "youtube"]
      : parsed.service === "apple"
        ? ["spotify", "deezer", "tidal", "youtube"]
        : ["spotify", "apple", "deezer", "tidal", "youtube"];
  const primary =
    preference
      .map((s) => links.find((l) => l.service === s && l.kind === "direct"))
      .find(Boolean) ?? null;

  return {
    type: parsed.type as MusicItemType,
    sourceService: parsed.service,
    source,
    links,
    primary,
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
