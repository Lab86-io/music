import { NextResponse } from "next/server";
import { parseMusicUrl, isAmazonMusicUrl, isDeezerShortLink } from "@/lib/url-parser";
import { convertMusicLink } from "@/lib/link-converter";
import { resolveDeezerShortLink } from "@/lib/deezer";
import { createShareFromParsedUrl, baseUrlFromRequest, ShareError } from "@/lib/share";

/**
 * One-shot endpoint for the iOS Shortcut (share sheet).
 *
 * - Song / album / artist link  -> the best direct match on another service,
 *   plus links for every service
 * - Playlist link               -> a 48h share page link
 *
 * GET  /api/shortcut?url=...&redirect=1   (302 to the converted link)
 * POST /api/shortcut { url, redirect? }
 *
 * JSON response: { original, converted, kind, name, artist?, confidence?, links }
 */
async function handleShortcut(rawUrl: string, redirect: boolean, request: Request) {
  let url = rawUrl;
  if (isDeezerShortLink(url)) {
    const resolved = await resolveDeezerShortLink(url);
    if (resolved) url = resolved;
  }

  const parsed = parseMusicUrl(url);
  if (!parsed) {
    const message = isAmazonMusicUrl(url)
      ? "Amazon Music links can't be read. Share from Spotify, Apple Music, Deezer, or YouTube Music instead."
      : "Unrecognized URL. Share a Spotify, Apple Music, Deezer, or YouTube Music link.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (parsed.type === "playlist") {
    if (parsed.service === "amazon") {
      return NextResponse.json(
        { error: "Amazon Music playlists can't be read (no public API)." },
        { status: 400 }
      );
    }
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
  const linkMap = Object.fromEntries(result.links.map((l) => [l.service, l.url]));

  if (!result.primary) {
    return NextResponse.json(
      {
        original: url,
        converted: null,
        kind: result.type,
        name: result.source.title,
        artist: result.source.artist,
        links: linkMap,
        error: "No confident direct match found on another service.",
      },
      { status: 404 }
    );
  }

  if (redirect) return NextResponse.redirect(result.primary.url);
  return NextResponse.json({
    original: url,
    converted: result.primary.url,
    convertedService: result.primary.service,
    kind: result.type,
    name: result.primary.metadata?.title ?? result.source.title,
    artist: result.primary.metadata?.artist ?? result.source.artist,
    confidence: result.primary.confidence,
    links: linkMap,
    // One URL that works for everyone — a landing page listing every service
    pageUrl: `${baseUrlFromRequest(request)}/link/${parsed.service}/${parsed.type}/${parsed.id}`,
  });
}

async function handle(request: Request, url: string | null, redirect: boolean) {
  try {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirect = ["1", "true", "yes"].includes(
    (searchParams.get("redirect") || "").toLowerCase()
  );
  return handle(request, searchParams.get("url"), redirect);
}

export async function POST(request: Request) {
  let url: string | null = null;
  let redirect = false;
  try {
    const body = await request.json();
    url = body.url;
    redirect = body.redirect === true;
  } catch {
    // handled by the missing-url check
  }
  return handle(request, url, redirect);
}
