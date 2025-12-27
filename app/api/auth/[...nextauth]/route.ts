import { handlers } from "@/lib/auth";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sevalla (and similar proxies) pass the real host via x-forwarded-host header,
 * but request.url contains the internal container URL (localhost:8080).
 * Auth.js's trustHost doesn't always rewrite early enough, causing "Invalid URL".
 * 
 * Fix: Reconstruct the request with the correct external URL.
 */
function getExternalRequest(request: NextRequest): NextRequest {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  
  if (forwardedHost) {
    // Reconstruct the full external URL
    const url = new URL(request.nextUrl.pathname + request.nextUrl.search, `${forwardedProto}://${forwardedHost}`);
    
    // Create new request with correct URL
    return new NextRequest(url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      duplex: "half",
    });
  }
  
  return request;
}

export async function GET(request: NextRequest) {
  return handlers.GET(getExternalRequest(request));
}

export async function POST(request: NextRequest) {
  return handlers.POST(getExternalRequest(request));
}
