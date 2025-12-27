import { createAuthHandlers } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Log ALL request details to find what Auth.js is reading that contains invalid URL
 */
function debugRequest(request: NextRequest, label: string) {
  console.log(`\n========== ${label} ==========`);
  console.log("request.url:", request.url);
  console.log("request.nextUrl.href:", request.nextUrl.href);
  console.log("request.nextUrl.origin:", request.nextUrl.origin);
  console.log("request.nextUrl.pathname:", request.nextUrl.pathname);
  
  console.log("\n--- ALL HEADERS ---");
  request.headers.forEach((value, key) => {
    console.log(`  ${key}: ${value}`);
  });
  
  console.log("\n--- ENV VARS ---");
  console.log("AUTH_URL:", process.env.AUTH_URL);
  console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL);
  console.log("AUTH_SECRET exists:", !!process.env.AUTH_SECRET);
  console.log("SPOTIFY_CLIENT_ID exists:", !!process.env.SPOTIFY_CLIENT_ID);
  console.log("=================================\n");
}

export async function GET(request: NextRequest) {
  debugRequest(request, "GET " + request.nextUrl.pathname);
  
  // Set env vars from forwarded headers
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    const origin = `${forwardedProto}://${forwardedHost}`;
    process.env.AUTH_URL = origin;
    process.env.NEXTAUTH_URL = origin;
  }
  
  try {
    const handlers = createAuthHandlers(process.env.AUTH_URL!);
    return await handlers.GET(request);
  } catch (error) {
    console.error("[auth GET] CAUGHT ERROR:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  debugRequest(request, "POST " + request.nextUrl.pathname);
  
  // Set env vars from forwarded headers  
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    const origin = `${forwardedProto}://${forwardedHost}`;
    process.env.AUTH_URL = origin;
    process.env.NEXTAUTH_URL = origin;
  }
  
  try {
    const handlers = createAuthHandlers(process.env.AUTH_URL!);
    return await handlers.POST(request);
  } catch (error) {
    console.error("[auth POST] CAUGHT ERROR:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
