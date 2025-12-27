import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function getOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function GET(request: NextRequest) {
  const origin = getOrigin(request);
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  
  if (error) {
    return NextResponse.redirect(`${origin}/?error=${error}`);
  }
  
  if (!code || !state) {
    return NextResponse.redirect(`${origin}/?error=missing_params`);
  }
  
  const cookieStore = await cookies();
  const storedState = cookieStore.get("spotify_auth_state")?.value;
  const codeVerifier = cookieStore.get("spotify_code_verifier")?.value;
  
  // Verify state
  if (state !== storedState) {
    return NextResponse.redirect(`${origin}/?error=state_mismatch`);
  }
  
  if (!codeVerifier) {
    return NextResponse.redirect(`${origin}/?error=missing_verifier`);
  }
  
  // Exchange code for tokens
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const callbackUrl = `${origin}/api/spotify/callback`;
  
  try {
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: callbackUrl,
        code_verifier: codeVerifier,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return NextResponse.redirect(`${origin}/?error=token_exchange_failed`);
    }
    
    const tokens = await tokenResponse.json();
    
    // Get user profile
    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        "Authorization": `Bearer ${tokens.access_token}`,
      },
    });
    
    if (!profileResponse.ok) {
      return NextResponse.redirect(`${origin}/?error=profile_fetch_failed`);
    }
    
    const profile = await profileResponse.json();
    
    // Store session data
    const sessionData = {
      user: {
        id: profile.id,
        name: profile.display_name,
        email: profile.email,
        image: profile.images?.[0]?.url,
      },
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
    };
    
    // Clear auth cookies and set session
    const response = NextResponse.redirect(`${origin}/dashboard`);
    
    response.cookies.delete("spotify_auth_state");
    response.cookies.delete("spotify_code_verifier");
    
    // Store Spotify session in a cookie (encrypted with base64 for simplicity)
    // In production, you'd want to encrypt this properly
    response.cookies.set("spotify_session", Buffer.from(JSON.stringify(sessionData)).toString("base64"), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });
    
    return response;
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(`${origin}/?error=callback_error`);
  }
}

