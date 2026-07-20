/**
 * YouTube (Google) OAuth for playlist import. Requires a Google OAuth web
 * client — set YOUTUBE_OAUTH_CLIENT_ID / YOUTUBE_OAUTH_CLIENT_SECRET and add
 * {origin}/api/youtube/callback as an authorized redirect URI.
 */

import { cookies } from "next/headers";

const SCOPE = "https://www.googleapis.com/auth/youtube";
export const YT_COOKIE = "youtube_session";

export interface YouTubeSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export function isYouTubeOAuthConfigured(): boolean {
  return Boolean(
    process.env.YOUTUBE_OAUTH_CLIENT_ID && process.env.YOUTUBE_OAUTH_CLIENT_SECRET
  );
}

export function buildYouTubeAuthUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.YOUTUBE_OAUTH_CLIENT_ID!,
    redirect_uri: `${origin}/api/youtube/callback/`,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeYouTubeCode(
  origin: string,
  code: string
): Promise<YouTubeSession | null> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.YOUTUBE_OAUTH_CLIENT_ID!,
        client_secret: process.env.YOUTUBE_OAUTH_CLIENT_SECRET!,
        redirect_uri: `${origin}/api/youtube/callback/`,
        grant_type: "authorization_code",
        code,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.access_token) return null;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
  } catch {
    return null;
  }
}

async function refreshYouTubeSession(
  session: YouTubeSession
): Promise<YouTubeSession | null> {
  if (!session.refreshToken) return null;
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.YOUTUBE_OAUTH_CLIENT_ID!,
        client_secret: process.env.YOUTUBE_OAUTH_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: session.refreshToken,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.access_token) return null;
    return {
      accessToken: data.access_token,
      refreshToken: session.refreshToken,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
  } catch {
    return null;
  }
}

export function encodeSession(session: YouTubeSession): string {
  return Buffer.from(JSON.stringify(session)).toString("base64url");
}

export async function readYouTubeSession(): Promise<YouTubeSession | null> {
  try {
    const store = await cookies();
    const raw = store.get(YT_COOKIE)?.value;
    if (!raw) return null;
    const session: YouTubeSession = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8")
    );
    if (Date.now() < session.expiresAt - 60_000) return session;
    return await refreshYouTubeSession(session);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// YouTube Data API helpers (user context)
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

async function ytFetch(
  session: YouTubeSession,
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: any }> {
  const response = await fetch(`https://www.googleapis.com/youtube/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}

export async function createYouTubePlaylist(
  session: YouTubeSession,
  title: string,
  description: string
): Promise<string | null> {
  const { ok, data } = await ytFetch(session, "/playlists?part=snippet,status", {
    method: "POST",
    body: JSON.stringify({
      snippet: { title, description },
      status: { privacyStatus: "private" },
    }),
  });
  return ok ? (data?.id ?? null) : null;
}

export async function searchYouTubeVideoId(
  session: YouTubeSession,
  query: string
): Promise<{ videoId: string | null; quotaExceeded: boolean }> {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoCategoryId: "10",
    maxResults: "1",
    q: query,
  });
  const { ok, status, data } = await ytFetch(session, `/search?${params}`);
  if (!ok) {
    return { videoId: null, quotaExceeded: status === 403 };
  }
  return { videoId: data?.items?.[0]?.id?.videoId ?? null, quotaExceeded: false };
}

export async function addVideoToPlaylist(
  session: YouTubeSession,
  playlistId: string,
  videoId: string
): Promise<{ ok: boolean; quotaExceeded: boolean }> {
  const { ok, status } = await ytFetch(session, "/playlistItems?part=snippet", {
    method: "POST",
    body: JSON.stringify({
      snippet: {
        playlistId,
        resourceId: { kind: "youtube#video", videoId },
      },
    }),
  });
  return { ok, quotaExceeded: status === 403 };
}
