import { NextResponse } from "next/server";
import { parseMusicUrl, isAmazonMusicUrl, isDeezerShortLink } from "@/lib/url-parser";
import { convertMusicLink } from "@/lib/link-converter";
import { resolveDeezerShortLink } from "@/lib/deezer";
import { createShareFromParsedUrl, baseUrlFromRequest, ShareError } from "@/lib/share";

/**
 * Universal link conversion endpoint.
 *
 * - Track / album / artist links return equivalents on every other service
 *   (direct matches for Spotify / Apple Music / Deezer / YouTube Music,
 *   search links for Amazon Music).
 * - Playlist links (Spotify, Apple Music, Deezer) become 48h share links.
 *
 * POST { url } or GET ?url=
 */
async function handleConvert(rawUrl: string, request: Request) {
  let url = rawUrl;
  if (isDeezerShortLink(url)) {
    const resolved = await resolveDeezerShortLink(url);
    if (resolved) url = resolved;
  }

  const parsed = parseMusicUrl(url);
  if (!parsed) {
    const message = isAmazonMusicUrl(url)
      ? "Amazon Music links can't be read — Amazon has no public catalog API. Paste the same item from Spotify, Apple Music, Deezer, or YouTube Music instead."
      : "Unrecognized URL. Paste a Spotify, Apple Music, Deezer, or YouTube Music link.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (parsed.type === "playlist") {
    if (parsed.service === "amazon") {
      return NextResponse.json(
        { error: "Amazon Music playlists can't be read — no public API." },
        { status: 400 }
      );
    }
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
    ...result,
    sourceId: parsed.id,
    // Universal landing page listing every service — the link to share
    pageUrl: `${baseUrlFromRequest(request)}/link/${parsed.service}/${parsed.type}/${parsed.id}`,
    // matchedUrl kept for backward compatibility with older clients/shortcuts
    matchedUrl: result.primary?.url ?? null,
  });
}

async function handle(request: Request, url: string | null) {
  try {
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

export async function POST(request: Request) {
  let url: string | null = null;
  try {
    const body = await request.json();
    url = body.url;
  } catch {
    // handled by the missing-url check
  }
  return handle(request, url);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return handle(request, searchParams.get("url"));
}
