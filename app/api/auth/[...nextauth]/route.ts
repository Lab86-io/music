import { handlers } from "@/lib/auth";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sevalla proxy passes requests to internal container (localhost:8080).
 * Auth.js needs the external URL for OAuth callbacks and internal URL parsing.
 * 
 * Fix: Set NEXTAUTH_URL dynamically from forwarded headers before Auth.js runs.
 */
function setupAuthUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  
  if (forwardedHost) {
    const externalOrigin = `${forwardedProto}://${forwardedHost}`;
    
    // Set both env vars that Auth.js might read
    process.env.AUTH_URL = externalOrigin;
    process.env.NEXTAUTH_URL = externalOrigin;
    
    console.log("[auth] Set AUTH_URL/NEXTAUTH_URL to:", externalOrigin);
    return externalOrigin;
  }
  
  return process.env.AUTH_URL || "http://localhost:3000";
}

function getExternalRequest(request: NextRequest, origin: string): NextRequest {
  const externalUrl = `${origin}${request.nextUrl.pathname}${request.nextUrl.search}`;
  console.log("[auth] External URL:", externalUrl);
  
  return new NextRequest(new URL(externalUrl), {
    method: request.method,
    headers: request.headers,
    body: request.body,
    duplex: "half",
  });
}

export async function GET(request: NextRequest) {
  const origin = setupAuthUrl(request);
  const externalRequest = getExternalRequest(request, origin);
  
  try {
    return await handlers.GET(externalRequest);
  } catch (error) {
    console.error("[auth] GET error:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const origin = setupAuthUrl(request);
  const externalRequest = getExternalRequest(request, origin);
  
  try {
    return await handlers.POST(externalRequest);
  } catch (error) {
    console.error("[auth] POST error:", error);
    throw error;
  }
}
