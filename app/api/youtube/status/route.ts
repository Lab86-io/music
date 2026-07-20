import { NextResponse } from "next/server";
import { isYouTubeOAuthConfigured, readYouTubeSession, YT_COOKIE } from "@/lib/youtube-oauth";

export async function GET() {
  const configured = isYouTubeOAuthConfigured();
  const session = configured ? await readYouTubeSession() : null;
  return NextResponse.json({ configured, connected: Boolean(session) });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(YT_COOKIE);
  return response;
}
