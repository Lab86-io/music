import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeYouTubeCode, encodeSession, YT_COOKIE } from "@/lib/youtube-oauth";
import { baseUrlFromRequest } from "@/lib/share";

export async function GET(request: Request) {
  const origin = baseUrlFromRequest(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const store = await cookies();
  const expectedState = store.get("youtube_auth_state")?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${origin}/dashboard?error=youtube_auth_failed`);
  }

  const session = await exchangeYouTubeCode(origin, code);
  if (!session) {
    return NextResponse.redirect(`${origin}/dashboard?error=youtube_token_failed`);
  }

  const response = NextResponse.redirect(`${origin}/dashboard`);
  response.cookies.set(YT_COOKIE, encodeSession(session), {
    httpOnly: true,
    secure: origin.startsWith("https"),
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  response.cookies.delete("youtube_auth_state");
  return response;
}
