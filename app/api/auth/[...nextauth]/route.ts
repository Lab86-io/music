import { handlers } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Wrap handlers to log what URL Auth.js receives
async function wrappedGET(request: NextRequest) {
  console.log("[auth] GET request.url:", request.url);
  console.log("[auth] GET request.nextUrl:", request.nextUrl.toString());
  console.log("[auth] Headers host:", request.headers.get("host"));
  console.log("[auth] Headers x-forwarded-host:", request.headers.get("x-forwarded-host"));
  console.log("[auth] Headers x-forwarded-proto:", request.headers.get("x-forwarded-proto"));
  
  try {
    return await handlers.GET(request);
  } catch (error) {
    console.error("[auth] GET error:", error);
    return NextResponse.json({ error: "Auth error" }, { status: 500 });
  }
}

async function wrappedPOST(request: NextRequest) {
  console.log("[auth] POST request.url:", request.url);
  console.log("[auth] POST request.nextUrl:", request.nextUrl.toString());
  
  try {
    return await handlers.POST(request);
  } catch (error) {
    console.error("[auth] POST error:", error);
    return NextResponse.json({ error: "Auth error" }, { status: 500 });
  }
}

export { wrappedGET as GET, wrappedPOST as POST };
