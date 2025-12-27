import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("spotify_session")?.value;
  
  if (!sessionCookie) {
    return NextResponse.json({ session: null });
  }
  
  try {
    const sessionData = JSON.parse(Buffer.from(sessionCookie, "base64").toString("utf-8"));
    
    // Check if session is expired
    if (sessionData.expiresAt && sessionData.expiresAt < Math.floor(Date.now() / 1000)) {
      // Session expired - in production you'd refresh the token here
      return NextResponse.json({ session: null, expired: true });
    }
    
    return NextResponse.json({ session: sessionData });
  } catch {
    return NextResponse.json({ session: null, error: "invalid_session" });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("spotify_session");
  return response;
}

