import { NextResponse } from "next/server";
import { parseMusicUrl } from "@/lib/url-parser";
import { convertMusicLink } from "@/lib/link-converter";
import { createShareFromParsedUrl, baseUrlFromRequest, ShareError } from "@/lib/share";

/**
 * One-shot endpoint for the iOS Shortcut (share sheet).
 *
 * - Song / album / artist link  -> the equivalent link on the other service
 * - Playlist link               -> a 48h share page link
 *
 * GET  /api/shortcut?url=...&redirect=1   (302 to the converted link)
 * POST /api/shortcut { url, redirect? }
 *
 * JSON response: { original, converted, kind, name, artist?, confidence? }
 */
async function handleShortcut(url: string, redirect: boolean, request: Request) {
  const parsed = parseMusicUrl(url);
  if (!parsed) {
    return NextResponse.json(
      { error: "Unrecognized URL. Share a Spotify or Apple Music link." },
      { status: 400 }
    );
  }

  if (parsed.type === "playlist") {
    const share = await createShareFromParsedUrl(
      { service: parsed.service, playlistId: parsed.id, storefront: parsed.storefront },
      baseUrlFromRequest(request)
    );
    if (redirect) return NextResponse.redirect(share.shareUrl);
    return NextResponse.json({
      original: url,
      converted: share.shareUrl,
      kind: "playlist",
      name: share.playlistName,
      trackCount: share.trackCount,
    });
  }

  const result = await convertMusicLink(parsed);
  if (!result.target) {
    return NextResponse.json(
      {
        original: url,
        converted: null,
        kind: result.type,
        name: result.source.title,
        artist: result.source.artist,
        error: "No confident match found on the other service.",
      },
      { status: 404 }
    );
  }

  if (redirect) return NextResponse.redirect(result.target.url);
  return NextResponse.json({
    original: url,
    converted: result.target.url,
    kind: result.type,
    name: result.target.title,
    artist: result.target.artist,
    confidence: result.confidence,
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    const redirect = ["1", "true", "yes"].includes(
      (searchParams.get("redirect") || "").toLowerCase()
    );
    if (!url) {
      return NextResponse.json({ error: "Missing 'url' query parameter" }, { status: 400 });
    }
    return await handleShortcut(url, redirect, request);
  } catch (error) {
    if (error instanceof ShareError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Shortcut error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = body.url;
    const redirect = body.redirect === true;
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }
    return await handleShortcut(url, redirect, request);
  } catch (error) {
    if (error instanceof ShareError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Shortcut error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
