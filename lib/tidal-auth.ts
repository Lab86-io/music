/**
 * TIDAL user authorization (Authorization Code + PKCE) and user-context
 * playlist writes. Uses the same TIDAL_CLIENT_ID/SECRET as catalog reads;
 * requires {origin}/api/tidal/callback as a registered redirect URI.
 */

import { cookies } from "next/headers";
import { createHash, randomBytes, randomUUID } from "crypto";

const TIDAL_LOGIN_URL = "https://login.tidal.com/authorize";
const TIDAL_TOKEN_URL = "https://auth.tidal.com/v1/oauth2/token";
const TIDAL_API_BASE = "https://openapi.tidal.com/v2";
const SCOPE = "user.read playlists.read playlists.write";

export const TIDAL_COOKIE = "tidal_session";

export interface TidalSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  countryCode?: string;
}

export function isTidalAuthConfigured(): boolean {
  return Boolean(process.env.TIDAL_CLIENT_ID && process.env.TIDAL_CLIENT_SECRET);
}

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function buildTidalAuthUrl(origin: string, state: string, challenge: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.TIDAL_CLIENT_ID!,
    redirect_uri: `${origin}/api/tidal/callback`,
    scope: SCOPE,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
  });
  return `${TIDAL_LOGIN_URL}?${params}`;
}

async function tokenRequest(body: URLSearchParams): Promise<TidalSession | null> {
  try {
    const response = await fetch(TIDAL_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
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

export async function exchangeTidalCode(
  origin: string,
  code: string,
  verifier: string
): Promise<TidalSession | null> {
  const session = await tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.TIDAL_CLIENT_ID!,
      code,
      redirect_uri: `${origin}/api/tidal/callback`,
      code_verifier: verifier,
    })
  );
  if (!session) return null;

  const countryCode = await readTidalCountryCode(session);
  return countryCode ? { ...session, countryCode } : session;
}

async function refreshTidalSession(session: TidalSession): Promise<TidalSession | null> {
  if (!session.refreshToken) return null;
  const refreshed = await tokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: session.refreshToken,
    })
  );
  if (refreshed && !refreshed.refreshToken) refreshed.refreshToken = session.refreshToken;
  if (refreshed && !refreshed.countryCode) refreshed.countryCode = session.countryCode;
  return refreshed;
}

export function encodeTidalSession(session: TidalSession): string {
  return Buffer.from(JSON.stringify(session)).toString("base64url");
}

export async function readTidalSession(): Promise<TidalSession | null> {
  try {
    const store = await cookies();
    const raw = store.get(TIDAL_COOKIE)?.value;
    if (!raw) return null;
    const session: TidalSession = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (Date.now() < session.expiresAt - 60_000) return session;
    return await refreshTidalSession(session);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// User-context playlist writes (JSON:API)
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

async function tidalUserFetch(
  session: TidalSession,
  endpoint: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: any }> {
  const response = await fetch(`${TIDAL_API_BASE}${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}

async function readTidalCountryCode(session: TidalSession): Promise<string | undefined> {
  const { ok, data } = await tidalUserFetch(session, "/users/me");
  const country = data?.data?.attributes?.country;
  return ok && typeof country === "string" ? country : undefined;
}

function countryQuery(session: TidalSession): string {
  return session.countryCode ? `?countryCode=${encodeURIComponent(session.countryCode)}` : "";
}

export async function createTidalPlaylist(
  session: TidalSession,
  name: string,
  description: string
): Promise<{ id: string | null; error?: string }> {
  const { ok, data } = await tidalUserFetch(session, `/playlists${countryQuery(session)}`, {
    method: "POST",
    headers: { "Idempotency-Key": randomUUID() },
    body: JSON.stringify({
      data: {
        type: "playlists",
        // Omitting accessType creates the user's normal private playlist. The
        // API only accepts PUBLIC or UNLISTED when accessType is supplied.
        attributes: { name, description },
      },
    }),
  });
  if (!ok) {
    const detail = data?.errors?.[0]?.detail ?? data?.errors?.[0]?.code ?? "unknown error";
    return { id: null, error: String(detail) };
  }
  return { id: data?.data?.id ?? null };
}

export async function addTracksToTidalPlaylist(
  session: TidalSession,
  playlistId: string,
  trackIds: string[]
): Promise<{ added: number; error?: string }> {
  let added = 0;
  for (let i = 0; i < trackIds.length; i += 50) {
    const batch = trackIds.slice(i, i + 50);
    const { ok, data } = await tidalUserFetch(
      session,
      `/playlists/${playlistId}/relationships/items${countryQuery(session)}`,
      {
        method: "POST",
        headers: { "Idempotency-Key": randomUUID() },
        body: JSON.stringify({
          data: batch.map((id) => ({ id, type: "tracks" })),
        }),
      }
    );
    if (!ok) {
      const detail = data?.errors?.[0]?.detail ?? "add failed";
      return { added, error: String(detail) };
    }
    added += batch.length;
  }
  return { added };
}

export function tidalPlaylistUrl(id: string): string {
  return `https://tidal.com/browse/playlist/${id}`;
}
