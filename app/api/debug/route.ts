import { NextResponse } from "next/server";

export async function GET() {
  // Check which env vars are set (don't expose values!)
  const envCheck = {
    SPOTIFY_CLIENT_ID: !!process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: !!process.env.SPOTIFY_CLIENT_SECRET,
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL || "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
    // Check lengths to verify they're not empty strings
    SPOTIFY_CLIENT_ID_LENGTH: process.env.SPOTIFY_CLIENT_ID?.length || 0,
    SPOTIFY_CLIENT_SECRET_LENGTH: process.env.SPOTIFY_CLIENT_SECRET?.length || 0,
    AUTH_SECRET_LENGTH: process.env.AUTH_SECRET?.length || 0,
  };

  return NextResponse.json(envCheck);
}

