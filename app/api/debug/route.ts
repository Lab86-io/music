import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const envVars = {
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID ? `${process.env.SPOTIFY_CLIENT_ID.slice(0,4)}...` : null,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ? `${process.env.SPOTIFY_CLIENT_SECRET.slice(0,4)}...` : null,
    AUTH_SECRET: process.env.AUTH_SECRET ? `${process.env.AUTH_SECRET.slice(0,4)}...` : null,
    AUTH_URL: process.env.AUTH_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? `${process.env.NEXTAUTH_SECRET.slice(0,4)}...` : null,
    NODE_ENV: process.env.NODE_ENV,
    SPOTIFY_CLIENT_ID_LENGTH: process.env.SPOTIFY_CLIENT_ID?.length,
    SPOTIFY_CLIENT_SECRET_LENGTH: process.env.SPOTIFY_CLIENT_SECRET?.length,
    AUTH_SECRET_LENGTH: process.env.AUTH_SECRET?.length,
  };
  return NextResponse.json(envVars);
}
