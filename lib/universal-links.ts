import { desc, sql } from "drizzle-orm";
import { db, universalLinks } from "@/lib/db";
import type { LinkConversionResult } from "@/lib/link-converter";
import type { MusicLinkType, MusicService } from "@/lib/url-parser";

/**
 * Record a rendered universal link page so the sitemap can enumerate it.
 * Fire-and-forget: page rendering must never fail because of bookkeeping.
 */
export async function recordUniversalLink(
  service: MusicService,
  type: MusicLinkType,
  itemId: string,
  result: LinkConversionResult
): Promise<void> {
  try {
    await db
      .insert(universalLinks)
      .values({
        service,
        type,
        itemId,
        title: result.source.title.slice(0, 500),
        artist: result.source.artist?.slice(0, 500) ?? null,
        artworkUrl: result.source.artworkUrl ?? null,
      })
      .onConflictDoUpdate({
        target: [universalLinks.service, universalLinks.type, universalLinks.itemId],
        set: {
          title: result.source.title.slice(0, 500),
          artist: result.source.artist?.slice(0, 500) ?? null,
          artworkUrl: result.source.artworkUrl ?? null,
          updatedAt: sql`now()`,
        },
      });
  } catch (error) {
    console.error("Failed to record universal link:", error);
  }
}

/** Newest-first universal links for the sitemap (Google's per-sitemap cap is 50k). */
export async function getRecentUniversalLinks(limit = 25_000) {
  try {
    return await db
      .select({
        service: universalLinks.service,
        type: universalLinks.type,
        itemId: universalLinks.itemId,
        updatedAt: universalLinks.updatedAt,
      })
      .from(universalLinks)
      .orderBy(desc(universalLinks.updatedAt))
      .limit(limit);
  } catch (error) {
    console.error("Failed to load universal links for sitemap:", error);
    return [];
  }
}
