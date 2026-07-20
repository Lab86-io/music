/**
 * YouTube / YouTube Music helpers.
 *
 * Reading an incoming link needs no credentials (oEmbed). Finding a direct
 * YouTube Music match uses the YouTube Data API v3 when YOUTUBE_API_KEY is
 * set; otherwise callers should fall back to a search link.
 */

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  channel: string;
}

const NOISE_PATTERNS =
  /\s*[([](?:official\s*)?(?:music\s*)?(?:video|audio|lyric(?:s)?(?:\s*video)?|visuali[sz]er|4k(?:\s*remaster(?:ed)?)?|hd|hq|remaster(?:ed)?(?:\s*\d{4})?)[)\]]\s*/gi;

/**
 * Fetch video title/channel via the public oEmbed endpoint (no API key).
 */
export async function getYouTubeVideoInfo(videoId: string): Promise<YouTubeVideoInfo | null> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`
      )}&format=json`
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.title) return null;
    return { videoId, title: data.title, channel: data.author_name ?? "" };
  } catch {
    return null;
  }
}

/**
 * Derive { title, artist } from a YouTube video title + channel.
 * Handles "Artist - Title (Official Video)" and YouTube Music
 * auto-generated "Title" on "Artist - Topic" channels.
 */
export function parseYouTubeTitle(info: YouTubeVideoInfo): { title: string; artist: string } {
  const cleaned = info.title.replace(NOISE_PATTERNS, " ").replace(/\s+/g, " ").trim();
  const channel = info.channel.replace(/\s*-\s*Topic$/i, "").trim();

  const dashSplit = cleaned.split(/\s+[-–—]\s+/);
  if (dashSplit.length >= 2) {
    return { artist: dashSplit[0].trim(), title: dashSplit.slice(1).join(" - ").trim() };
  }
  return { title: cleaned, artist: channel };
}

/**
 * Search YouTube (music category) for the best matching video.
 * Returns null when no API key is configured or nothing is found.
 */
export async function searchYouTubeMusic(
  query: string
): Promise<{ videoId: string; title: string; channel: string } | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({
      part: "snippet",
      type: "video",
      videoCategoryId: "10", // Music
      maxResults: "5",
      q: query,
      key: apiKey,
    });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    if (!response.ok) return null;
    const data = await response.json();
    const item = data?.items?.[0];
    if (!item?.id?.videoId) return null;
    return {
      videoId: item.id.videoId,
      title: item.snippet?.title ?? "",
      channel: item.snippet?.channelTitle ?? "",
    };
  } catch {
    return null;
  }
}

export function youtubeMusicWatchUrl(videoId: string): string {
  return `https://music.youtube.com/watch?v=${videoId}`;
}

export function youtubeMusicSearchUrl(query: string): string {
  return `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
}

// ---------------------------------------------------------------------------
// Public playlists (read via API key — no OAuth)
// ---------------------------------------------------------------------------

export interface YouTubePlaylistTrack {
  name: string;
  artist: string;
  albumArt?: string;
}

export interface YouTubePlaylist {
  name: string;
  channel: string | null;
  image: string | null;
  tracks: YouTubePlaylistTrack[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Read a public YouTube / YouTube Music playlist using the API key.
 * Video titles are parsed into {title, artist}; there is no ISRC, so
 * downstream matching is title-based (accuracy varies).
 * Returns null if unavailable or the key is missing.
 */
export async function getYouTubePlaylist(playlistId: string): Promise<YouTubePlaylist | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    // Playlist metadata (title, channel, thumbnail)
    const metaResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`
    );
    if (!metaResponse.ok) return null;
    const metaData = await metaResponse.json();
    const meta = metaData?.items?.[0]?.snippet;
    if (!meta) return null;

    const thumbnails = meta.thumbnails ?? {};
    const image =
      thumbnails.high?.url ?? thumbnails.medium?.url ?? thumbnails.default?.url ?? null;

    // Playlist items (paginated, 50 per page)
    const tracks: YouTubePlaylistTrack[] = [];
    let pageToken = "";
    let guard = 0;
    do {
      guard += 1;
      const params = new URLSearchParams({
        part: "snippet",
        maxResults: "50",
        playlistId,
        key: apiKey,
      });
      if (pageToken) params.set("pageToken", pageToken);
      const itemsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?${params}`
      );
      if (!itemsResponse.ok) break;
      const itemsData = await itemsResponse.json();
      for (const item of itemsData.items ?? []) {
        const snippet = item.snippet;
        // Skip deleted/private placeholders
        if (!snippet?.title || snippet.title === "Deleted video" || snippet.title === "Private video") {
          continue;
        }
        const channel = (snippet.videoOwnerChannelTitle ?? snippet.channelTitle ?? "").replace(
          /\s*-\s*Topic$/i,
          ""
        );
        const parsed = parseYouTubeTitle({
          videoId: snippet.resourceId?.videoId ?? "",
          title: snippet.title,
          channel,
        });
        tracks.push({
          name: parsed.title,
          artist: parsed.artist,
          albumArt: snippet.thumbnails?.default?.url,
        });
      }
      pageToken = itemsData.nextPageToken ?? "";
    } while (pageToken && guard < 20);

    return {
      name: meta.title ?? "YouTube Playlist",
      channel: meta.channelTitle ?? null,
      image,
      tracks,
    };
  } catch {
    return null;
  }
}
