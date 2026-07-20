"use client";

import Image from "next/image";
import { IconMusic, IconShare2 } from "@tabler/icons-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  SpotifyLogo,
  AppleLogo,
  YouTubeMusicLogo,
  TidalLogo,
  DeezerLogo,
} from "@/components/icons";
import { cn } from "@/lib/utils";
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
  { name: string; className: string; Logo: typeof SpotifyLogo }
> = {
  spotify: { name: "Spotify", className: "bg-[#1DB954] text-[#07210f]", Logo: SpotifyLogo },
  apple: { name: "Apple Music", className: "bg-[#FC3C44] text-white", Logo: AppleLogo },
  youtube: { name: "YouTube Music", className: "bg-[#FF0000] text-white", Logo: YouTubeMusicLogo },
  tidal: { name: "TIDAL", className: "bg-neutral-950 text-white ring-1 ring-white/15", Logo: TidalLogo },
  deezer: { name: "Deezer", className: "bg-[#A238FF] text-white", Logo: DeezerLogo },
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
    <div className="group">
      {/* Artwork tile */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted shadow-sm transition-shadow duration-200 group-hover:shadow-[0_10px_28px_-10px_rgb(0_0_0/0.4)]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 45vw, (max-width: 1280px) 25vw, 200px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <IconMusic size={32} className="text-muted-foreground/50" />
          </div>
        )}

        {/* Source service badge */}
        <div
          className={cn(
            "absolute left-2 top-2 flex h-5.5 w-5.5 items-center justify-center rounded-full text-white shadow-sm",
            isSpotify ? "bg-[#1DB954]" : "bg-[#FC3C44]"
          )}
        >
          {isSpotify ? <SpotifyLogo className="h-3 w-3" /> : <AppleLogo className="h-3 w-3" />}
        </div>

        {/* Hover scrim + actions (always visible on touch, hover-revealed on pointer devices) */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-end gap-1.5 p-2 pt-10",
            "bg-gradient-to-t from-black/60 via-black/25 to-transparent",
            "transition-opacity duration-200",
            "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          )}
        >
          {onShare && (
            <Tooltip>
              <TooltipTrigger
                onClick={() => onShare(playlist)}
                disabled={shareDisabled}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-md backdrop-blur transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
              >
                <IconShare2 size={14} />
              </TooltipTrigger>
              <TooltipContent>Create a 48-hour share link</TooltipContent>
            </Tooltip>
          )}
          {targets.map((target) => {
            const style = TARGET_STYLE[target.service];
            return (
              <Tooltip key={target.service}>
                <TooltipTrigger
                  onClick={() => {
                    if (!target.disabled) onConvert(playlist, target.service);
                  }}
                  aria-disabled={target.disabled}
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-transform hover:scale-105 active:scale-95",
                    // Keep disabled targets hoverable so the tooltip can explain why
                    target.disabled && "cursor-not-allowed opacity-45",
                    style.className
                  )}
                >
                  <style.Logo className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>
                  {target.disabled
                    ? (target.disabledReason ?? `Connect ${style.name} first`)
                    : `Convert to ${style.name}`}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Label */}
      <div className="mt-2 px-0.5">
        <h3
          className="truncate text-sm font-medium leading-snug text-foreground"
          title={name}
        >
          {name}
        </h3>
        <p className="text-xs text-muted-foreground">
          {trackCount > 0 ? `${trackCount} tracks` : "Playlist"}
        </p>
      </div>
    </div>
  );
}
