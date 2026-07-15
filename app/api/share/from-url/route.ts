import { NextResponse } from "next/server";
import { parsePlaylistUrl } from "@/lib/url-parser";
import { createShareFromParsedUrl, baseUrlFromRequest, ShareError } from "@/lib/share";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing playlist URL" },
        { status: 400 }
      );
    }

    // Parse the URL to determine service and playlist ID
    const parsed = parsePlaylistUrl(url);
    if (!parsed) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid playlist URL. Please provide a Spotify or Apple Music playlist link.",
        },
        { status: 400 }
      );
    }

    const data = await createShareFromParsedUrl(parsed, baseUrlFromRequest(request));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof ShareError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    console.error("Public share creation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create share link" },
      { status: 500 }
    );
  }
}

// Also support GET for simpler shortcut integration (URL as query param)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { success: false, error: "Missing 'url' query parameter" },
      { status: 400 }
    );
  }

  // Create a mock request body and call POST logic
  const mockRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ url }),
  });

  return POST(mockRequest);
}
