import { createAuthHandlers } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Create a new NextRequest with the correct external URL and headers.
 * Auth.js may read the URL from multiple sources, so we fix them all.
 */
function createExternalRequest(request: NextRequest): { request: NextRequest; origin: string } {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  
  const origin = forwardedHost 
    ? `${forwardedProto}://${forwardedHost}`
    : process.env.AUTH_URL || "http://localhost:3000";
  
  const host = forwardedHost || new URL(origin).host;
  
  // Set env vars for Auth.js
  process.env.AUTH_URL = origin;
  process.env.NEXTAUTH_URL = origin;
  
  // Construct external URL
  const path = request.nextUrl.pathname + request.nextUrl.search;
  const externalUrl = `${origin}${path}`;
  
  console.log("[auth] origin:", origin);
  console.log("[auth] externalUrl:", externalUrl);
  console.log("[auth] original host header:", request.headers.get("host"));
  
  // Create new headers with corrected host
  const newHeaders = new Headers(request.headers);
  newHeaders.set("host", host);
  
  console.log("[auth] new host header:", newHeaders.get("host"));
  
  // Create a new NextRequest with the external URL and fixed headers
  const newRequest = new NextRequest(externalUrl, {
    method: request.method,
    headers: newHeaders,
    body: request.body,
    duplex: "half",
  });
  
  return { request: newRequest, origin };
}

export async function GET(request: NextRequest) {
  console.log("[auth GET] Original URL:", request.url);
  
  try {
    const { request: externalRequest, origin } = createExternalRequest(request);
    const handlers = createAuthHandlers(origin);
    return await handlers.GET(externalRequest);
  } catch (error) {
    console.error("[auth GET] Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log("[auth POST] Original URL:", request.url);
  
  try {
    const { request: externalRequest, origin } = createExternalRequest(request);
    const handlers = createAuthHandlers(origin);
    return await handlers.POST(externalRequest);
  } catch (error) {
    console.error("[auth POST] Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
