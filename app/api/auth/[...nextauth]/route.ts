import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
].join(" ");

/**
 * Create Auth.js handlers dynamically with the correct URL from request headers.
 * This avoids the module-level initialization issue where AUTH_URL might be wrong.
 */
function createAuthHandlers(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  
  // Determine the correct external origin
  const origin = forwardedHost 
    ? `${forwardedProto}://${forwardedHost}`
    : process.env.AUTH_URL || "http://localhost:3000";
  
  console.log("[auth] Creating handlers with origin:", origin);
  
  // Set env vars for Auth.js
  process.env.AUTH_URL = origin;
  process.env.NEXTAUTH_URL = origin;
  
  const authConfig: NextAuthConfig = {
    providers: [
      SpotifyProvider({
        clientId: process.env.SPOTIFY_CLIENT_ID!,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
        authorization: {
          params: {
            scope: SPOTIFY_SCOPES,
          },
        },
      }),
    ],
    secret: process.env.AUTH_SECRET,
    trustHost: true,
    callbacks: {
      async jwt({ token, account }) {
        if (account) {
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.expiresAt = account.expires_at;
          token.provider = account.provider;
        }
        return token;
      },
      async session({ session, token }) {
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string;
        session.expiresAt = token.expiresAt as number;
        session.provider = token.provider as string;
        return session;
      },
    },
    pages: {
      signIn: "/",
      error: "/",
    },
    session: {
      strategy: "jwt",
    },
  };
  
  return NextAuth(authConfig).handlers;
}

function getExternalRequest(request: NextRequest): NextRequest {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  
  if (forwardedHost) {
    const externalUrl = `${forwardedProto}://${forwardedHost}${request.nextUrl.pathname}${request.nextUrl.search}`;
    return new NextRequest(new URL(externalUrl), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      duplex: "half",
    });
  }
  
  return request;
}

export async function GET(request: NextRequest) {
  const handlers = createAuthHandlers(request);
  const externalRequest = getExternalRequest(request);
  return handlers.GET(externalRequest);
}

export async function POST(request: NextRequest) {
  const handlers = createAuthHandlers(request);
  const externalRequest = getExternalRequest(request);
  return handlers.POST(externalRequest);
}
