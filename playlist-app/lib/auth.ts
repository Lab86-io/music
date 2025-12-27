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

// Get the base URL for callbacks
const getBaseUrl = () => {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.AUTH_URL) return process.env.AUTH_URL;
  return "http://localhost:3000";
};

export const authConfig: NextAuthConfig = {
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
  trustHost: true,
  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access_token to the JWT
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      // Make the access token available on the session
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

