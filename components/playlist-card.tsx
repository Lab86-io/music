"use client";

import Image from "next/image";
import { IconMusic, IconShare2 } from "@tabler/icons-react";
import { AspectRatio } from "@astryxdesign/core/AspectRatio";
import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { Heading } from "@astryxdesign/core/Heading";
import { Overlay } from "@astryxdesign/core/Overlay";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { MediaTheme } from "@astryxdesign/core/theme";
import {
  SpotifyLogo,
  AppleLogo,
  YouTubeMusicLogo,
  TidalLogo,
  DeezerLogo,
} from "@/components/icons";
import type { SpotifyPlaylist, AppleMusicPlaylist } from "@/types";

export type ConvertTargetService = "spotify" | "apple" | "youtube" | "tidal" | "deezer";

export interface ConvertTarget {
  service: ConvertTargetService;
  disabled?: boolean;
  /** Shown in the tooltip when disabled (e.g. "Connect Apple Music first") */
  disabledReason?: string;
}

const TARGET_STYLE: Record<
  ConvertTargetService,
  { name: string; Logo: typeof SpotifyLogo }
> = {
  spotify: { name: "Spotify", Logo: SpotifyLogo },
  apple: { name: "Apple Music", Logo: AppleLogo },
  youtube: { name: "YouTube Music", Logo: YouTubeMusicLogo },
  tidal: { name: "TIDAL", Logo: TidalLogo },
  deezer: { name: "Deezer", Logo: DeezerLogo },
};

interface PlaylistCardProps {
  playlist: SpotifyPlaylist | AppleMusicPlaylist;
  source: "spotify" | "apple";
  onConvert: (playlist: SpotifyPlaylist | AppleMusicPlaylist, target: ConvertTargetService) => void;
  onShare?: (playlist: SpotifyPlaylist | AppleMusicPlaylist) => void;
  /** Destinations offered on hover, in order. */
  targets: ConvertTarget[];
  shareDisabled?: boolean;
}

export function PlaylistCard({
  playlist,
  source,
  onConvert,
  onShare,
  targets,
  shareDisabled,
}: PlaylistCardProps) {
  const isSpotify = source === "spotify";

  // Normalize playlist data
  const name = isSpotify
    ? (playlist as SpotifyPlaylist).name
    : (playlist as AppleMusicPlaylist).attributes.name;

  const trackCount = isSpotify
    ? (playlist as SpotifyPlaylist).tracks.total
    : 0; // Apple Music doesn't give count upfront

  const imageUrl = isSpotify
    ? (playlist as SpotifyPlaylist).images?.[0]?.url
    : (playlist as AppleMusicPlaylist).attributes.artwork?.url
        ?.replace("{w}", "400")
        .replace("{h}", "400");

  return (
    <VStack gap={2}>
      <AspectRatio ratio={1} fit="cover">
        <Overlay
          showOn="hover-or-focus"
          position="bottom"
          align="end"
          scrim="dark"
          content={
            <MediaTheme mode="dark">
              <HStack gap={1.5} wrap="wrap" hAlign="end">
                {onShare && (
                  <Button
                    label="Create a 48-hour share link"
                    icon={<IconShare2 size={14} />}
                    isIconOnly
                    onClick={() => onShare(playlist)}
                    isDisabled={shareDisabled}
                    variant="ghost"
                    size="sm"
                    tooltip="Create a 48-hour share link"
                  />
                )}
                {targets.map((target) => {
                  const service = TARGET_STYLE[target.service];
                  return (
                    <Button
                      key={target.service}
                      label={
                        target.disabled
                          ? (target.disabledReason ?? `Connect ${service.name} first`)
                          : `Convert to ${service.name}`
                      }
                      icon={<service.Logo className="h-4 w-4" />}
                      isIconOnly
                      isDisabled={target.disabled}
                      onClick={() => onConvert(playlist, target.service)}
                      variant="ghost"
                      size="sm"
                      tooltip={
                        target.disabled
                          ? (target.disabledReason ?? `Connect ${service.name} first`)
                          : `Convert to ${service.name}`
                      }
                    />
                  );
                })}
              </HStack>
            </MediaTheme>
          }
        >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 45vw, (max-width: 1280px) 25vw, 200px"
          />
        ) : (
          <Center height="100%" axis="both">
            <IconMusic size={32} className="text-secondary/50" />
          </Center>
        )}
        </Overlay>
      </AspectRatio>
      <VStack gap={0}>
        <Heading level={3} maxLines={1}>
          {name}
        </Heading>
        <Text type="supporting">
          {trackCount > 0 ? `${trackCount} tracks` : "Playlist"}
        </Text>
      </VStack>
    </VStack>
  );
}
