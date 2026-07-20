import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeTidalCode, encodeTidalSession, TIDAL_COOKIE } from "@/lib/tidal-auth";
import { baseUrlFromRequest } from "@/lib/share";
import { normalizeReturnPath, returnPathWithError } from "@/lib/auth-return";

export async function GET(request: Request) {
  const origin = baseUrlFromRequest(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const store = await cookies();
  const expectedState = store.get("tidal_auth_state")?.value;
  const verifier = store.get("tidal_auth_verifier")?.value;
  const returnTo = normalizeReturnPath(store.get("tidal_return_to")?.value);

  if (!code || !state || !verifier || state !== expectedState) {
    return NextResponse.redirect(`${origin}${returnPathWithError(returnTo, "tidal_auth_failed")}`);
  }

  const session = await exchangeTidalCode(origin, code, verifier);
  if (!session) {
    return NextResponse.redirect(`${origin}${returnPathWithError(returnTo, "tidal_token_failed")}`);
  }

  const response = NextResponse.redirect(`${origin}${returnTo}`);
  response.cookies.set(TIDAL_COOKIE, encodeTidalSession(session), {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  response.cookies.delete("tidal_auth_state");
  response.cookies.delete("tidal_auth_verifier");
  response.cookies.delete("tidal_return_to");
  return response;
}
