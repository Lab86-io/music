"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ServiceConnect } from "@/components/service-connect";
import { Header } from "@/components/header";
import { LinkConverter } from "@/components/link-converter";
import { Equalizer } from "@/components/animated-icons";
import { SpotifyLogo, AppleLogo } from "@/components/icons";
import { IconLoader2 } from "@tabler/icons-react";

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Check Spotify session and redirect to dashboard if authenticated
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/spotify/session");
        const data = await response.json();
        if (data.session) {
          router.push("/dashboard");
          return;
        }
      } catch (error) {
        console.error("Failed to check session:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="relative">
        {/* Faint staff-line texture behind the hero */}
        <div aria-hidden className="hero-staff pointer-events-none absolute inset-x-0 top-0 h-[26rem]" />

        <div className="container relative mx-auto px-4">
          {/* Hero */}
          <section className="mx-auto max-w-2xl pb-2 pt-14 text-center sm:pt-20">
            <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-border/70 bg-background/70 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <SpotifyLogo className="h-3.5 w-3.5 text-[#1DB954]" />
              <Equalizer className="h-3 text-primary" />
              <AppleLogo className="h-3.5 w-3.5 text-[#FC3C44]" />
              <span>Spotify &amp; Apple Music</span>
            </div>
            <h1 className="text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-[3.25rem]">
              Music links that play <span className="text-primary">everywhere</span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-balance text-base text-muted-foreground sm:text-lg">
              Paste a song, album, artist, or playlist. Get a link that works on the other
              service — no account needed.
            </p>
          </section>

          {/* The one input */}
          <section className="mx-auto max-w-2xl pb-4 pt-8">
            <LinkConverter />
          </section>

          {/* Sign-in, demoted below the tool */}
          <section className="mx-auto max-w-2xl pb-16 pt-14">
            <div className="mb-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-border/70" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Or sign in to convert full playlists
              </span>
              <div className="h-px flex-1 bg-border/70" />
            </div>
            <ServiceConnect />
          </section>
        </div>
      </main>
    </div>
  );
}
