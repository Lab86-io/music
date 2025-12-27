import { createAuthHandlers } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Create a new NextRequest with the correct external URL.
 */
function createExternalRequest(request: NextRequest): NextRequest {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  
  const origin = forwardedHost 
    ? `${forwardedProto}://${forwardedHost}`
    : process.env.AUTH_URL || "http://localhost:3000";
  
  // Set env vars for Auth.js
  process.env.AUTH_URL = origin;
  process.env.NEXTAUTH_URL = origin;
  
  // Construct external URL
  const path = request.nextUrl.pathname + request.nextUrl.search;
  const externalUrl = `${origin}${path}`;
  
  console.log("[auth] External URL:", externalUrl);
  
  // Create a new NextRequest with the external URL
  return new NextRequest(externalUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    // @ts-expect-error - duplex is needed for streaming request bodies
    duplex: "half",
  });
}

export async function GET(request: NextRequest) {
  console.log("[auth GET] Original URL:", request.url);
  
  try {
    const externalRequest = createExternalRequest(request);
    const origin = new URL(externalRequest.url).origin;
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
    const externalRequest = createExternalRequest(request);
    const origin = new URL(externalRequest.url).origin;
    const handlers = createAuthHandlers(origin);
    return await handlers.POST(externalRequest);
  } catch (error) {
    console.error("[auth POST] Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
