import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { Header } from "@/components/header";
import { ServiceRow, CopyPageUrlButton } from "./service-rows";
import { convertMusicLink, type LinkConversionResult } from "@/lib/link-converter";
import type { MusicService, MusicLinkType } from "@/lib/url-parser";

export const dynamic = "force-dynamic";

const VALID_SERVICES = ["spotify", "apple", "deezer", "tidal", "youtube"] as const;
const VALID_TYPES = ["track", "album", "artist"] as const;

interface PageParams {
  service: string;
  type: string;
  id: string;
}

function validateParams(params: PageParams) {
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

async function loadConversion(params: PageParams): Promise<LinkConversionResult | null> {
  const valid = validateParams(params);
  if (!valid) return null;
  return getCachedConversion(valid.service, valid.type, valid.id);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const result = await loadConversion(await params);
  if (!result) return { title: "Link not found" };
  const { source, type } = result;
  const title =
    type === "artist" ? source.title : `${source.title} — ${source.artist}`;
  const description = `Listen to this ${type} on Spotify, Apple Music, Deezer, TIDAL, YouTube Music, or Amazon Music. One link, every service.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "music.song",
      images: source.artworkUrl ? [{ url: source.artworkUrl, width: 600, height: 600 }] : undefined,
    },
    twitter: {
      card: source.artworkUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: source.artworkUrl ? [source.artworkUrl] : undefined,
    },
  };
}

export default async function UniversalLinkPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const resolvedParams = await params;
  const result = await loadConversion(resolvedParams);
  if (!result) notFound();

  const { source, links, type, sourceService } = result;

  // Source first, then the other services in engine order
  const rows = [
    {
      service: sourceService,
      url: source.url,
      kind: "direct" as const,
      isSource: true,
    },
    ...links.map((link) => ({
      service: link.service,
      url: link.url,
      kind: link.kind,
      isSource: false,
    })),
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="relative overflow-hidden">
        {/* Artwork-derived full-bleed backdrop */}
        {source.artworkUrl && (
          <>
            <Image
              src={source.artworkUrl}
              alt=""
              aria-hidden
              fill
              priority
              sizes="100vw"
              className="scale-125 object-cover opacity-25 blur-3xl saturate-150 dark:opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
          </>
        )}

        <div className="container relative mx-auto px-4">
          <div className="mx-auto flex max-w-md flex-col items-center pb-16 pt-10 sm:pt-14">
            {source.artworkUrl && (
              <Image
                src={source.artworkUrl}
                alt={source.title}
                width={224}
                height={224}
                priority
                className={
                  type === "artist"
                    ? "h-56 w-56 rounded-full object-cover shadow-2xl"
                    : "h-56 w-56 rounded-2xl object-cover shadow-2xl"
                }
              />
            )}

            <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {type}
            </p>
            <h1 className="font-display mt-1 text-balance text-center text-3xl font-bold leading-tight">
              {source.title}
            </h1>
            {type !== "artist" && (
              <p className="mt-1 text-center text-muted-foreground">
                {source.artist}
                {type === "track" && source.album ? ` · ${source.album}` : ""}
              </p>
            )}

            <div className="mt-8 w-full space-y-2">
              {rows.map((row) => (
                <ServiceRow key={row.service} {...row} />
              ))}
            </div>

            <CopyPageUrlButton className="mt-6" />

            <p className="mt-10 text-center text-xs text-muted-foreground">
              Made with{" "}
              <Link href="/" className="font-medium text-foreground hover:underline">
                Playlist Converter
              </Link>{" "}
              — paste any music link, get every service.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
