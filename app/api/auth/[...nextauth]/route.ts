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
  
  console.log("[auth] Original request.url:", request.url);
  console.log("[auth] x-forwarded-host:", forwardedHost);
  console.log("[auth] x-forwarded-proto:", forwardedProto);
  
  if (forwardedHost) {
    // Reconstruct the full external URL
    const externalUrl = `${forwardedProto}://${forwardedHost}${request.nextUrl.pathname}${request.nextUrl.search}`;
    console.log("[auth] Reconstructed external URL:", externalUrl);
    
    const url = new URL(externalUrl);
    
    // Create new request with correct URL
    const newRequest = new NextRequest(url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      duplex: "half",
    });
    
    console.log("[auth] New request.url:", newRequest.url);
    return newRequest;
  }
  
  console.log("[auth] No forwarded host, using original request");
  return request;
}

export async function GET(request: NextRequest) {
  console.log("[auth] GET handler called");
  try {
    const externalRequest = getExternalRequest(request);
    console.log("[auth] Calling handlers.GET with URL:", externalRequest.url);
    return await handlers.GET(externalRequest);
  } catch (error) {
    console.error("[auth] GET error:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  console.log("[auth] POST handler called");
  try {
    const externalRequest = getExternalRequest(request);
    console.log("[auth] Calling handlers.POST with URL:", externalRequest.url);
    return await handlers.POST(externalRequest);
  } catch (error) {
    console.error("[auth] POST error:", error);
    throw error;
  }
}
