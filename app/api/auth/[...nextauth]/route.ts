import { createAuthHandlers } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOriginFromHeaders(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return process.env.AUTH_URL || "http://localhost:3000";
}

function rewriteRequest(request: NextRequest, origin: string): NextRequest {
  // Get the path from the internal URL
  const internalUrl = new URL(request.url);
  const path = internalUrl.pathname + internalUrl.search;
  
  // Construct the external URL
  const externalUrl = `${origin}${path}`;
  
  console.log("[auth] request.url:", request.url);
  console.log("[auth] request.nextUrl.href:", request.nextUrl.href);
  console.log("[auth] request.nextUrl.origin:", request.nextUrl.origin);
  console.log("[auth] Rewritten to:", externalUrl);
  
  // Create new request with external URL
  const newRequest = new NextRequest(externalUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    duplex: "half",
  });
  
  console.log("[auth] newRequest.url:", newRequest.url);
  console.log("[auth] newRequest.nextUrl.href:", newRequest.nextUrl.href);
  
  return newRequest;
}

export async function GET(request: NextRequest) {
  const origin = getOriginFromHeaders(request);
  process.env.AUTH_URL = origin;
  process.env.NEXTAUTH_URL = origin;
  
  console.log("[auth GET] Origin:", origin);
  
  try {
    const rewrittenRequest = rewriteRequest(request, origin);
    const handlers = createAuthHandlers(origin);
    return await handlers.GET(rewrittenRequest);
  } catch (error) {
    console.error("[auth GET] Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const origin = getOriginFromHeaders(request);
  process.env.AUTH_URL = origin;
  process.env.NEXTAUTH_URL = origin;
  
  console.log("[auth POST] Origin:", origin);
  
  try {
    const rewrittenRequest = rewriteRequest(request, origin);
    const handlers = createAuthHandlers(origin);
    return await handlers.POST(rewrittenRequest);
  } catch (error) {
    console.error("[auth POST] Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
