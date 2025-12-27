import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

/**
 * Sevalla/CDN/proxy environments sometimes expose subtle env-var issues:
 * - Leading/trailing whitespace in URLs/secrets
 * - Some auth internals still read NEXTAUTH_URL/NEXTAUTH_SECRET
 *
 * Normalize + alias to avoid `new URL(undefined)` / `new URL(" https://...")`.
 */
const normalizedAuthUrl = process.env.AUTH_URL?.trim();
if (normalizedAuthUrl) {
  process.env.AUTH_URL = normalizedAuthUrl;
  process.env.NEXTAUTH_URL ??= normalizedAuthUrl;
}

const normalizedAuthSecret = process.env.AUTH_SECRET?.trim();
if (normalizedAuthSecret) {
  process.env.AUTH_SECRET = normalizedAuthSecret;
  process.env.NEXTAUTH_SECRET ??= normalizedAuthSecret;
}

const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
].join(" ");

export const authConfig: NextAuthConfig = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID?.trim(),
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET?.trim(),
      authorization: {
        params: {
          scope: SPOTIFY_SCOPES,
        },
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  debug: true,
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

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
