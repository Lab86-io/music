import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildYouTubeAuthUrl, isYouTubeOAuthConfigured } from "@/lib/youtube-oauth";
import { baseUrlFromRequest } from "@/lib/share";
import { normalizeReturnPath } from "@/lib/auth-return";

export async function GET(request: Request) {
  if (!isYouTubeOAuthConfigured()) {
    return NextResponse.json(
      { error: "YouTube OAuth is not configured (YOUTUBE_OAUTH_CLIENT_ID/SECRET missing)" },
      { status: 503 }
    );
  }
  const origin = baseUrlFromRequest(request);
  const returnTo = normalizeReturnPath(new URL(request.url).searchParams.get("returnTo"));
  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(buildYouTubeAuthUrl(origin, state));
  response.cookies.set("youtube_auth_state", state, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  response.cookies.set("youtube_return_to", returnTo, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
