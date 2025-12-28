import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
].join(" ");

function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

function getOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function GET(request: NextRequest) {
  const origin = getOrigin(request);
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  
  if (!clientId) {
    return NextResponse.json({ error: "Missing SPOTIFY_CLIENT_ID" }, { status: 500 });
  }
  
  // Get optional return URL from query params
  const returnUrl = request.nextUrl.searchParams.get("returnUrl");
  
  // Generate PKCE codes
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = randomBytes(16).toString("hex");
  
  // Store verifier and state in cookies
  const cookieStore = await cookies();
  cookieStore.set("spotify_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });
  cookieStore.set("spotify_auth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });
  
  // Store return URL if provided (for redirecting back after auth)
  if (returnUrl) {
    cookieStore.set("spotify_return_url", returnUrl, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/",
    });
  }
  
  // Build Spotify authorization URL
  const callbackUrl = `${origin}/api/spotify/callback`;
  
  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set("scope", SPOTIFY_SCOPES);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  
  return NextResponse.redirect(authUrl.toString());
}

