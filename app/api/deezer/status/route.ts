import { NextResponse } from "next/server";
import { validateArl, readDeezerArl, DEEZER_ARL_COOKIE } from "@/lib/deezer-arl";
import { baseUrlFromRequest } from "@/lib/share";

export async function GET() {
  const arl = await readDeezerArl();
  const session = arl ? await validateArl(arl) : null;
  return NextResponse.json(
    {
      configured: true,
      connected: Boolean(session),
      userName: session?.userName,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** Connect: validate a pasted ARL and store it as an httpOnly cookie. */
export async function POST(request: Request) {
  let body: { arl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const arl = body.arl?.trim();
  if (!arl || arl.length < 50 || arl.length > 512 || /\s/.test(arl)) {
    return NextResponse.json({ error: "That doesn't look like an ARL token" }, { status: 400 });
  }
  const session = await validateArl(arl);
  if (!session) {
    return NextResponse.json(
      { error: "Deezer rejected that ARL. Copy a fresh one from your deezer.com cookies" },
      { status: 401 }
    );
  }
  const response = NextResponse.json({ success: true, userName: session.userName });
  response.cookies.set(DEEZER_ARL_COOKIE, arl, {
    httpOnly: true,
    secure: baseUrlFromRequest(request).startsWith("https"),
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(DEEZER_ARL_COOKIE);
  return response;
}
