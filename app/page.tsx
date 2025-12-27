"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ServiceConnect } from "@/components/service-connect";
import { ThemeToggle } from "@/components/theme-toggle";
import { IconArrowRight, IconRefresh } from "@tabler/icons-react";
import { SpotifyLogo, AppleLogo, AppleMusicLogo, MusicNote } from "@/components/icons";

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
        }
      } catch (error) {
        console.error("Failed to check session:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="mx-auto max-w-4xl text-center">
          {/* Logo/Icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl">
                <MusicNote className="h-12 w-12" />
              </div>
              <div className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#1DB954] text-white shadow-lg ring-4 ring-background">
                <SpotifyLogo className="h-5 w-5" />
              </div>
              <div className="absolute -bottom-3 -left-3 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#FC3C44] to-[#F94C57] text-white shadow-lg ring-4 ring-background">
                <AppleLogo className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Playlist <span className="text-primary">Converter</span>
          </h1>
          
          <p className="mb-8 text-lg text-muted-foreground md:text-xl">
            Seamlessly transfer your playlists between{" "}
            <span className="font-medium text-[#1DB954]">Spotify</span> and{" "}
            <span className="font-medium text-[#FC3C44]">Apple Music</span>
          </p>

          {/* Feature Pills */}
          <div className="mb-12 flex flex-wrap justify-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm">
              <IconRefresh size={16} className="text-primary" />
              <span>Bidirectional sync</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm">
              <AppleMusicLogo className="h-4 w-4 text-primary" />
              <span>Smart track matching</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm">
              <IconArrowRight size={16} className="text-primary" />
              <span>One-click conversion</span>
            </div>
          </div>
        </div>

        {/* Connection Cards */}
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-foreground">Connect Your Accounts</h2>
            <p className="text-muted-foreground">
              Link your streaming services to get started
            </p>
          </div>
          
          <ServiceConnect />

          {isLoading && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Checking authentication...</span>
              </div>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="mx-auto mt-20 max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-semibold text-foreground">
            How It Works
          </h2>
          
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border bg-card p-6 text-center transition-all hover:shadow-lg">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="text-xl font-bold">1</span>
              </div>
              <h3 className="mb-2 font-semibold">Connect Accounts</h3>
              <p className="text-sm text-muted-foreground">
                Sign in to both Spotify and Apple Music to authorize access to your playlists.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6 text-center transition-all hover:shadow-lg">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="text-xl font-bold">2</span>
              </div>
              <h3 className="mb-2 font-semibold">Choose Playlist</h3>
              <p className="text-sm text-muted-foreground">
                Select the playlist you want to convert from either service.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6 text-center transition-all hover:shadow-lg">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="text-xl font-bold">3</span>
              </div>
              <h3 className="mb-2 font-semibold">Convert</h3>
              <p className="text-sm text-muted-foreground">
                We&apos;ll match tracks using ISRC codes and create the playlist for you.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Built with Next.js, shadcn/ui, and the Spotify & Apple Music APIs.
          </p>
        </div>
      </footer>
    </div>
  );
}
