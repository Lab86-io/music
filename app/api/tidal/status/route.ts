import { NextResponse } from "next/server";
import { isTidalAuthConfigured, readTidalSession, TIDAL_COOKIE } from "@/lib/tidal-auth";

export async function GET() {
  const configured = isTidalAuthConfigured();
  const session = configured ? await readTidalSession() : null;
  return NextResponse.json(
    { configured, connected: Boolean(session) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(TIDAL_COOKIE);
  return response;
}
