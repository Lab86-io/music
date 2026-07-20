import type { Metadata } from "next";
import { Header } from "@/components/header";
import { LinkConverter } from "@/components/link-converter";

export const metadata: Metadata = {
  title: "Convert a Link | Playlist Converter",
  description:
    "Convert Spotify and Apple Music song, album, and artist links to the other service instantly. No sign-in required.",
};

export default function ConvertPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="relative">
        <div aria-hidden className="hero-staff pointer-events-none absolute inset-x-0 top-0 h-72" />
        <div className="container relative mx-auto px-4">
          <section className="mx-auto max-w-2xl pt-12 text-center sm:pt-16">
            <h1 className="font-display text-3xl font-bold tracking-tight">Convert a link</h1>
            <p className="mx-auto mt-3 max-w-md text-balance text-muted-foreground">
              One link in, five services out. Playlists become 48-hour share links.
            </p>
          </section>
          <section className="mx-auto max-w-2xl pb-16 pt-8">
            <LinkConverter />
          </section>
        </div>
      </main>
    </div>
  );
}
