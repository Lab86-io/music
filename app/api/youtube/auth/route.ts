import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildYouTubeAuthUrl, isYouTubeOAuthConfigured } from "@/lib/youtube-oauth";
import { baseUrlFromRequest } from "@/lib/share";

export async function GET(request: Request) {
  if (!isYouTubeOAuthConfigured()) {
    return NextResponse.json(
      { error: "YouTube OAuth is not configured (YOUTUBE_OAUTH_CLIENT_ID/SECRET missing)" },
      { status: 503 }
    );
  }
  const origin = baseUrlFromRequest(request);
  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(buildYouTubeAuthUrl(origin, state));
  response.cookies.set("youtube_auth_state", state, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    maxAge: 600,
    path: "/",
  });
  return response;
}
