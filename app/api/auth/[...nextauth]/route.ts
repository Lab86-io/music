import { createAuthHandlers } from "@/lib/auth";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Get the external origin from forwarded headers (for proxy environments like Sevalla).
 */
function getExternalOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  
  return process.env.AUTH_URL || "http://localhost:3000";
}

/**
 * Reconstruct request with external URL for proxy environments.
 */
function getExternalRequest(request: NextRequest, origin: string): NextRequest {
  const externalUrl = `${origin}${request.nextUrl.pathname}${request.nextUrl.search}`;
  
  return new NextRequest(new URL(externalUrl), {
    method: request.method,
    headers: request.headers,
    body: request.body,
    duplex: "half",
  });
}

export async function GET(request: NextRequest) {
  const origin = getExternalOrigin(request);
  console.log("[auth GET] origin:", origin);
  console.log("[auth GET] SPOTIFY_CLIENT_ID exists:", !!process.env.SPOTIFY_CLIENT_ID);
  console.log("[auth GET] SPOTIFY_CLIENT_SECRET exists:", !!process.env.SPOTIFY_CLIENT_SECRET);
  console.log("[auth GET] AUTH_SECRET exists:", !!process.env.AUTH_SECRET);
  
  const handlers = createAuthHandlers(origin);
  const externalRequest = getExternalRequest(request, origin);
  
  console.log("[auth GET] externalRequest.url:", externalRequest.url);
  return handlers.GET(externalRequest);
}

export async function POST(request: NextRequest) {
  const origin = getExternalOrigin(request);
  console.log("[auth POST] origin:", origin);
  console.log("[auth POST] SPOTIFY_CLIENT_ID exists:", !!process.env.SPOTIFY_CLIENT_ID);
  console.log("[auth POST] SPOTIFY_CLIENT_SECRET exists:", !!process.env.SPOTIFY_CLIENT_SECRET);
  console.log("[auth POST] AUTH_SECRET exists:", !!process.env.AUTH_SECRET);
  
  const handlers = createAuthHandlers(origin);
  const externalRequest = getExternalRequest(request, origin);
  
  console.log("[auth POST] externalRequest.url:", externalRequest.url);
  return handlers.POST(externalRequest);
}
