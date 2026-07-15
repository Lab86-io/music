import { NextResponse } from "next/server";
import { parseMusicUrl } from "@/lib/url-parser";
import { convertMusicLink } from "@/lib/link-converter";
import { createShareFromParsedUrl, baseUrlFromRequest, ShareError } from "@/lib/share";

/**
 * Universal link conversion endpoint.
 *
 * - Track / album / artist links are converted to the other service with
 *   metadata and a confidence score.
 * - Playlist links are turned into a 48h share link (same as Quick Share).
 *
 * POST { url } or GET ?url=
 */
async function handleConvert(url: string, request: Request) {
  const parsed = parseMusicUrl(url);
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "Unrecognized URL. Paste a Spotify or Apple Music song, album, artist, or playlist link.",
      },
      { status: 400 }
    );
  }

  if (parsed.type === "playlist") {
    const share = await createShareFromParsedUrl(
      { service: parsed.service, playlistId: parsed.id, storefront: parsed.storefront },
      baseUrlFromRequest(request)
    );
    return NextResponse.json({
      kind: "playlist",
      sourceProvider: parsed.service,
      ...share,
      // matchedUrl kept for backward compatibility with older clients/shortcuts
      matchedUrl: share.shareUrl,
    });
  }

  const result = await convertMusicLink(parsed);
  return NextResponse.json({
    kind: "conversion",
    sourceProvider: parsed.service,
    ...result,
    // matchedUrl kept for backward compatibility with older clients/shortcuts
    matchedUrl: result.target?.url ?? null,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url: string = body.url;
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }
    return await handleConvert(url, request);
  } catch (error) {
    if (error instanceof ShareError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Link convert error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "Missing 'url' query parameter" }, { status: 400 });
    }
    return await handleConvert(url, request);
  } catch (error) {
    if (error instanceof ShareError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Link convert error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
