import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildTidalAuthUrl, generatePkce, isTidalAuthConfigured } from "@/lib/tidal-auth";
import { baseUrlFromRequest } from "@/lib/share";
import { normalizeReturnPath } from "@/lib/auth-return";

export async function GET(request: Request) {
  if (!isTidalAuthConfigured()) {
    return NextResponse.json({ error: "TIDAL credentials not configured" }, { status: 503 });
  }
  const origin = baseUrlFromRequest(request);
  const returnTo = normalizeReturnPath(new URL(request.url).searchParams.get("returnTo"));
  const state = randomBytes(16).toString("hex");
  const { verifier, challenge } = generatePkce();
  const response = NextResponse.redirect(buildTidalAuthUrl(origin, state, challenge));
  const cookieOptions = {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };
  response.cookies.set("tidal_auth_state", state, cookieOptions);
  response.cookies.set("tidal_auth_verifier", verifier, cookieOptions);
  response.cookies.set("tidal_return_to", returnTo, cookieOptions);
  return response;
}
