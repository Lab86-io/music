"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { ServiceConnect } from "@/components/service-connect";
import { LinkConverter } from "@/components/link-converter";
import { Equalizer } from "@/components/animated-icons";
import { DancingLetters } from "@/components/dancing-letters";
import {
  SpotifyLogo,
  AppleLogo,
  DeezerLogo,
  TidalLogo,
  YouTubeMusicLogo,
  AmazonMusicLogo,
} from "@/components/icons";
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
      <Stack className="min-h-screen bg-body">
        <Stack direction="horizontal" className="flex items-center justify-center py-20">
          <IconLoader2 className="h-8 w-8 animate-spin text-accent" />
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack className="min-h-screen bg-body">
      <Stack className="relative">
        {/* Faint staff-line texture behind the hero */}
        <Stack aria-hidden className="hero-staff pointer-events-none absolute inset-x-0 top-0 h-96" />

        <Stack className="relative mx-auto w-full px-4">
          {/* Hero */}
          <Stack as="section" className="mx-auto max-w-3xl pb-2 pt-14 text-center sm:pt-20">
            <Stack
              direction="horizontal"
              wrap="wrap"
              className="mb-7 inline-flex items-center justify-center gap-2.5 rounded-full border border-border/70 bg-body/70 px-3.5 py-1.5 text-xs font-medium text-secondary backdrop-blur"
            >
              <SpotifyLogo className="h-3.5 w-3.5 text-green-vivid" />
              <AppleLogo className="h-3.5 w-3.5 text-red-vivid" />
              <Equalizer className="h-3 text-accent" />
              <DeezerLogo className="h-3.5 w-3.5 text-purple-vivid" />
              <TidalLogo className="h-3.5 w-3.5" />
              <YouTubeMusicLogo className="h-3.5 w-3.5 text-red-vivid" />
              <AmazonMusicLogo className="h-3.5 w-3.5 text-cyan-vivid" />
              <Text>6 music services</Text>
            </Stack>
            <Heading level={1} type="display-1" textWrap="balance" className="font-display">
              I made a music converter.{" "}
              <DancingLetters text="I use it myself" className="text-accent" />.
            </Heading>
            <Text as="p" className="mx-auto mt-4 max-w-lg text-balance text-base text-secondary sm:text-lg">
              Paste a link or type a song name. Get matches on Spotify, Apple Music,
              Deezer, TIDAL, YouTube Music, and Amazon Music. No account needed.
            </Text>
          </Stack>

          {/* The one input */}
          <Stack as="section" className="mx-auto max-w-6xl pb-4 pt-8">
            <LinkConverter />
          </Stack>

          {/* Sign-in, demoted below the tool */}
          <Stack as="section" className="mx-auto max-w-4xl pb-16 pt-14">
            <Stack direction="horizontal" className="mb-6 flex items-center gap-4">
              <Stack className="h-px flex-1 bg-border/70" />
              <Text type="supporting" color="secondary" weight="semibold" className="uppercase">
                Or sign in to convert full playlists
              </Text>
              <Stack className="h-px flex-1 bg-border/70" />
            </Stack>
            <ServiceConnect />
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  );
}
