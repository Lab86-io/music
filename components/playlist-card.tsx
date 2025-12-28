"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconMusic, IconArrowRight, IconShare } from "@tabler/icons-react";
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
      <CardContent className="p-0">
        <div className="flex gap-3 p-3">
          {/* Album Art */}
          <div className="relative h-12 w-12 shrink-0">
            <div className="h-full w-full overflow-hidden rounded bg-muted">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <IconMusic size={20} className="text-muted-foreground" />
                </div>
              )}
            </div>
            {/* Service badge - positioned outside image bounds */}
            <div className="absolute -bottom-1 -right-1 z-10">
              {isSpotify ? (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1DB954] text-white ring-2 ring-background">
                  <SpotifyLogo className="h-2.5 w-2.5" />
                </div>
              ) : (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FC3C44] text-white ring-2 ring-background">
                  <AppleLogo className="h-2.5 w-2.5" />
                </div>
              )}
            </div>
          </div>

          {/* Playlist Info */}
          <div className="flex flex-1 flex-col justify-center min-w-0">
            <h3 className="font-medium text-sm text-foreground truncate" title={name}>
              {name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {trackCount > 0 && <span>{trackCount} tracks</span>}
              {description && trackCount > 0 && <span>•</span>}
              {description && <span className="truncate">{description}</span>}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            {onShare && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onShare(playlist)}
                disabled={shareDisabled}
                className="h-8 px-2 sm:px-3"
              >
                <IconShare size={14} />
                <span className="hidden sm:inline ml-1.5">Share</span>
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => onConvert(playlist)}
              disabled={disabled}
              className={cn(
                "h-8 px-2 sm:px-3",
                targetService === "spotify" 
                  ? "bg-[#1DB954] hover:bg-[#1aa34a]" 
                  : "bg-[#FC3C44] hover:bg-[#e03540]"
              )}
            >
              <span className="hidden sm:inline mr-1.5">Convert</span>
              {targetService === "spotify" ? (
                <SpotifyLogo className="h-3.5 w-3.5" />
              ) : (
                <AppleLogo className="h-3.5 w-3.5" />
              )}
              <IconArrowRight size={12} className="ml-0.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
