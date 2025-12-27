import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Test what URL Auth.js would see
  const url = new URL(request.url);
  const host = request.headers.get("host");
  const xForwardedHost = request.headers.get("x-forwarded-host");
  const xForwardedProto = request.headers.get("x-forwarded-proto");
  
  // Try to construct what Auth.js constructs
  let constructedOrigin: string;
  try {
    if (xForwardedHost) {
      constructedOrigin = `${xForwardedProto || "https"}://${xForwardedHost}`;
    } else if (host) {
      constructedOrigin = `${url.protocol}//${host}`;
    } else {
      constructedOrigin = url.origin;
    }
  } catch (e) {
    constructedOrigin = `Error: ${e}`;
  }
  
  // Test constructing a callback URL
  let callbackUrl: string;
  try {
    const base = new URL(constructedOrigin);
    callbackUrl = new URL("/api/auth/callback/spotify", base).toString();
  } catch (e) {
    callbackUrl = `Error: ${e}`;
  }
  
  // Test constructing Spotify auth URL
  let spotifyAuthUrl: string;
  try {
    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.searchParams.set("client_id", process.env.SPOTIFY_CLIENT_ID || "MISSING");
    authUrl.searchParams.set("redirect_uri", callbackUrl);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "user-read-email");
    spotifyAuthUrl = authUrl.toString();
  } catch (e) {
    spotifyAuthUrl = `Error: ${e}`;
  }
  
  return NextResponse.json({
    request: {
      url: request.url,
      nextUrl: {
        href: request.nextUrl.href,
        origin: request.nextUrl.origin,
        host: request.nextUrl.host,
        protocol: request.nextUrl.protocol,
      },
    },
    headers: {
      host,
      xForwardedHost,
      xForwardedProto,
    },
    env: {
      AUTH_URL: process.env.AUTH_URL,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID ? `${process.env.SPOTIFY_CLIENT_ID.slice(0, 8)}...` : null,
      SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ? "present" : null,
      AUTH_SECRET: process.env.AUTH_SECRET ? "present" : null,
    },
    constructed: {
      origin: constructedOrigin,
      callbackUrl,
      spotifyAuthUrl,
    },
  });
}

