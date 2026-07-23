import { unstable_cache } from "next/cache";
import { convertMusicLink, type LinkConversionResult } from "@/lib/link-converter";
import { recordUniversalLink } from "@/lib/universal-links";
import type { MusicService, MusicLinkType } from "@/lib/url-parser";

const VALID_SERVICES = ["spotify", "apple", "deezer", "tidal", "youtube"] as const;
const VALID_TYPES = ["track", "album", "artist"] as const;

export interface PageParams {
  service: string;
  type: string;
  id: string;
}

export function validateParams(params: PageParams) {
  const service = params.service as (typeof VALID_SERVICES)[number];
  const type = params.type as (typeof VALID_TYPES)[number];
  if (!VALID_SERVICES.includes(service)) return null;
  if (!VALID_TYPES.includes(type)) return null;
  if (!/^[\w.-]{1,64}$/.test(params.id)) return null;
  return { service: service as MusicService, type: type as MusicLinkType, id: params.id };
}

// Conversions are deterministic enough to cache for a day per (service, type, id)
const getCachedConversion = unstable_cache(
  async (service: MusicService, type: MusicLinkType, id: string) => {
    try {
      return await convertMusicLink({ service, type, id });
    } catch {
      return null;
    }
  },
  // v2: bumped to flush results cached before YouTube direct matching existed
  ["universal-link-conversion-v2"],
  { revalidate: 60 * 60 * 24 }
);

export async function loadConversion(params: PageParams): Promise<LinkConversionResult | null> {
  const valid = validateParams(params);
  if (!valid) return null;
  const result = await getCachedConversion(valid.service, valid.type, valid.id);
  if (result) {
    // Bookkeeping for the sitemap; never blocks or fails the render
    recordUniversalLink(valid.service, valid.type, valid.id, result).catch(() => {});
  }
  return result;
}
