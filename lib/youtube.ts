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
