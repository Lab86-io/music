import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
].join(" ");

/**
 * Create Auth.js config with the correct URL.
 * Called lazily to ensure env vars are properly set.
 */
export function createAuthConfig(origin?: string): NextAuthConfig {
  // Use provided origin or fall back to env var
  const authUrl = origin || process.env.AUTH_URL || "http://localhost:3000";
  
  // Set env vars for any internal Auth.js reads
  process.env.AUTH_URL = authUrl;
  process.env.NEXTAUTH_URL = authUrl;
  
  return {
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
}

// Lazy-initialized singleton for server components (uses AUTH_URL from env)
let _auth: ReturnType<typeof NextAuth> | null = null;

function getAuth() {
  if (!_auth) {
    _auth = NextAuth(createAuthConfig());
  }
  return _auth;
}

// Export functions that use the lazy singleton
export const auth = (...args: Parameters<ReturnType<typeof NextAuth>["auth"]>) => 
  getAuth().auth(...args);

export const signIn = (...args: Parameters<ReturnType<typeof NextAuth>["signIn"]>) => 
  getAuth().signIn(...args);

export const signOut = (...args: Parameters<ReturnType<typeof NextAuth>["signOut"]>) => 
  getAuth().signOut(...args);

// For API routes that need to create handlers with a specific origin
export function createAuthHandlers(origin: string) {
  return NextAuth(createAuthConfig(origin)).handlers;
}
