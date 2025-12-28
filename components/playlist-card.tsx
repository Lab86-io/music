"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconMusic, IconArrowRight, IconShare2 } from "@tabler/icons-react";
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

export function PlaylistCard({ playlist, source, onConvert, onShare, targetService, disabled, shareDisabled }: PlaylistCardProps) {
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
    : (playlist as AppleMusicPlaylist).attributes.artwork?.url?.replace("{w}", "300").replace("{h}", "300");

  const description = isSpotify
    ? (playlist as SpotifyPlaylist).description
    : (playlist as AppleMusicPlaylist).attributes.description?.standard;

  return (
    <Card className="group overflow-visible transition-colors hover:bg-muted/50">
      <CardContent className="p-3">
        <div className="flex gap-3">
          {/* Album Art */}
          <div className="relative h-14 w-14 shrink-0">
            <div className="h-full w-full overflow-hidden rounded-md bg-muted">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <IconMusic size={24} className="text-muted-foreground" />
                </div>
              )}
            </div>
            {/* Service badge */}
            <div className="absolute -bottom-1 -right-1 z-10">
              {isSpotify ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1DB954] text-white ring-2 ring-background">
                  <SpotifyLogo className="h-3 w-3" />
                </div>
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FC3C44] text-white ring-2 ring-background">
                  <AppleLogo className="h-3 w-3" />
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Playlist Info */}
            <div className="flex-1 min-w-0 pr-1">
              <h3 className="font-medium text-sm text-foreground line-clamp-2 leading-tight" title={name}>
                {name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {trackCount > 0 ? `${trackCount} tracks` : "Playlist"}
              </p>
            </div>

            {/* Action Buttons - bottom right */}
            <div className="flex items-center gap-1.5 mt-1.5 justify-end">
              {onShare && (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => onShare(playlist)}
                  disabled={shareDisabled}
                  className="h-7 w-7 rounded-full"
                >
                  <IconShare2 size={14} />
                </Button>
              )}
              <Button
                size="icon"
                onClick={() => onConvert(playlist)}
                disabled={disabled}
                className={cn(
                  "h-7 w-7 rounded-full",
                  targetService === "spotify" 
                    ? "bg-[#1DB954] hover:bg-[#1aa34a]" 
                    : "bg-[#FC3C44] hover:bg-[#e03540]"
                )}
              >
                {targetService === "spotify" ? (
                  <SpotifyLogo className="h-3.5 w-3.5" />
                ) : (
                  <AppleLogo className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
