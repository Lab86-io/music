"use client";

import Image from "next/image";
import { IconMusic, IconShare2 } from "@tabler/icons-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SpotifyLogo, AppleLogo } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { SpotifyPlaylist, AppleMusicPlaylist } from "@/types";

interface PlaylistCardProps {
  playlist: SpotifyPlaylist | AppleMusicPlaylist;
  source: "spotify" | "apple";
  onConvert: (playlist: SpotifyPlaylist | AppleMusicPlaylist) => void;
  onShare?: (playlist: SpotifyPlaylist | AppleMusicPlaylist) => void;
  targetService: "spotify" | "apple";
  disabled?: boolean;
  shareDisabled?: boolean;
}

export function PlaylistCard({
  playlist,
  source,
  onConvert,
  onShare,
  targetService,
  disabled,
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

  const targetName = targetService === "spotify" ? "Spotify" : "Apple Music";

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
            "absolute inset-x-0 bottom-0 flex items-end justify-end gap-1.5 p-2 pt-10",
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
          <Tooltip>
            <TooltipTrigger
              onClick={() => onConvert(playlist)}
              disabled={disabled}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full text-white shadow-md transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-50",
                targetService === "spotify"
                  ? "bg-[#1DB954] text-[#07210f]"
                  : "bg-[#FC3C44]"
              )}
            >
              {targetService === "spotify" ? (
                <SpotifyLogo className="h-4 w-4" />
              ) : (
                <AppleLogo className="h-4 w-4" />
              )}
            </TooltipTrigger>
            <TooltipContent>Convert to {targetName}</TooltipContent>
          </Tooltip>
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
