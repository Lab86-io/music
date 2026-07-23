import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { ServiceRow, CopyPageUrlButton } from "./service-rows";
import { loadConversion, type PageParams } from "./conversion";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const result = await loadConversion(resolvedParams);
  if (!result) return { title: "Link not found", robots: { index: false } };
  const { source, type } = result;
  const canonical = `/link/${resolvedParams.service}/${resolvedParams.type}/${resolvedParams.id}`;
  const title =
    type === "artist" ? source.title : `${source.title} by ${source.artist}`;
  const description = `Listen to this ${type} on Spotify, Apple Music, Deezer, TIDAL, YouTube Music, or Amazon Music. One link, every service.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "music.song",
      url: canonical,
    },
    // Card image comes from the generated opengraph-image route
    twitter: {
      card: "summary_large_image",
      title,
      description,
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

  const pageUrl = `https://music.lab86.io/link/${resolvedParams.service}/${resolvedParams.type}/${resolvedParams.id}`;
  const musicJsonLd =
    type === "track"
      ? {
          "@context": "https://schema.org",
          "@type": "MusicRecording",
          name: source.title,
          url: pageUrl,
          ...(source.artist ? { byArtist: { "@type": "MusicGroup", name: source.artist } } : {}),
          ...(source.album ? { inAlbum: { "@type": "MusicAlbum", name: source.album } } : {}),
          ...(source.artworkUrl ? { image: source.artworkUrl } : {}),
        }
      : type === "album"
        ? {
            "@context": "https://schema.org",
            "@type": "MusicAlbum",
            name: source.title,
            url: pageUrl,
            ...(source.artist ? { byArtist: { "@type": "MusicGroup", name: source.artist } } : {}),
            ...(source.artworkUrl ? { image: source.artworkUrl } : {}),
          }
        : {
            "@context": "https://schema.org",
            "@type": "MusicGroup",
            name: source.title,
            url: pageUrl,
            ...(source.genres?.length ? { genre: source.genres } : {}),
            ...(source.artworkUrl ? { image: source.artworkUrl } : {}),
          };

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(musicJsonLd) }}
      />
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
                Lab86 Convert
              </Link>
              . Paste any music link, get every service.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
