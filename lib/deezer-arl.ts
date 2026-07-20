/**
 * Deezer playlist writes via the private gateway API, authenticated with a
 * user-supplied ARL session cookie.
 *
 * CAVEATS (surfaced in the UI as an "advanced" connection): Deezer closed
 * their developer program, so there is no official write API. This uses the
 * same unofficial gateway the deemix ecosystem relies on. It is against
 * Deezer's ToS, may break without notice, and the ARL is a full session
 * token — it is stored ONLY in the user's httpOnly cookie and never logged
 * or persisted server-side.
 */

import { cookies } from "next/headers";

const GW_URL = "https://www.deezer.com/ajax/gw-light.php";
export const DEEZER_ARL_COOKIE = "deezer_arl";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function gwCall(
  arl: string,
  method: string,
  apiToken: string,
  payload: unknown
): Promise<any | null> {
  try {
    const params = new URLSearchParams({
      method,
      input: "3",
      api_version: "1.0",
      api_token: apiToken,
    });
    const response = await fetch(`${GW_URL}?${params}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `arl=${arl}`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      },
      body: JSON.stringify(payload ?? {}),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.error && Object.keys(data.error).length > 0) return null;
    return data?.results ?? null;
  } catch {
    return null;
  }
}

export interface DeezerArlSession {
  arl: string;
  apiToken: string;
  userId: string;
  userName: string;
}

/** Validate an ARL and fetch the CSRF api_token needed for writes. */
export async function validateArl(arl: string): Promise<DeezerArlSession | null> {
  const results = await gwCall(arl, "deezer.getUserData", "null", {});
  const userId = results?.USER?.USER_ID;
  if (!userId || String(userId) === "0") return null;
  return {
    arl,
    apiToken: results.checkForm,
    userId: String(userId),
    userName: results.USER?.BLOG_NAME ?? "Deezer user",
  };
}

export async function readDeezerArl(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(DEEZER_ARL_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export async function createDeezerPlaylist(
  session: DeezerArlSession,
  title: string,
  description: string
): Promise<string | null> {
  const result = await gwCall(session.arl, "playlist.create", session.apiToken, {
    title,
    description,
    songs: [],
    status: 0, // private
  });
  // playlist.create returns the new playlist id (number or {PLAYLIST_ID})
  const id = typeof result === "object" ? result?.PLAYLIST_ID : result;
  return id ? String(id) : null;
}

export async function addSongsToDeezerPlaylist(
  session: DeezerArlSession,
  playlistId: string,
  trackIds: string[]
): Promise<{ added: number; error?: string }> {
  let added = 0;
  for (let i = 0; i < trackIds.length; i += 500) {
    const batch = trackIds.slice(i, i + 500);
    const result = await gwCall(session.arl, "playlist.addSongs", session.apiToken, {
      playlist_id: playlistId,
      songs: batch.map((id) => [id, 0]),
    });
    if (result === null) return { added, error: "Deezer rejected part of the playlist" };
    added += batch.length;
  }
  return { added };
}

export function deezerPlaylistUrl(id: string): string {
  return `https://www.deezer.com/playlist/${id}`;
}
