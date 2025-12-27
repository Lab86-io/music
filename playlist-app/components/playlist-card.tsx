"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconMusic, IconArrowRight } from "@tabler/icons-react";
import { SpotifyLogo, AppleLogo } from "@/components/icons";
import type { SpotifyPlaylist, AppleMusicPlaylist } from "@/types";

interface PlaylistCardProps {
  playlist: SpotifyPlaylist | AppleMusicPlaylist;
  source: "spotify" | "apple";
  onConvert: (playlist: SpotifyPlaylist | AppleMusicPlaylist) => void;
  targetService: "spotify" | "apple";
  disabled?: boolean;
}

export function PlaylistCard({ playlist, source, onConvert, targetService, disabled }: PlaylistCardProps) {
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
    <Card className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
      <CardContent className="p-0">
        <div className="flex gap-4 p-4">
          {/* Album Art */}
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={name}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="80px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <IconMusic size={32} className="text-primary/60" />
              </div>
            )}
            {/* Service badge */}
            <div className="absolute bottom-1 right-1">
              {isSpotify ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1DB954] text-white shadow-md">
                  <SpotifyLogo className="h-3 w-3" />
                </div>
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#FC3C44] to-[#F94C57] text-white shadow-md">
                  <AppleLogo className="h-3 w-3" />
                </div>
              )}
            </div>
          </div>

          {/* Playlist Info */}
          <div className="flex flex-1 flex-col justify-between min-w-0">
            <div>
              <h3 className="font-semibold text-foreground truncate" title={name}>
                {name}
              </h3>
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                  {description}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <Badge variant="secondary" className="text-xs">
                <IconMusic size={12} className="mr-1" />
                {trackCount > 0 ? `${trackCount} tracks` : "Playlist"}
              </Badge>
            </div>
          </div>

          {/* Convert Button */}
          <div className="flex items-center">
            <Button
              size="sm"
              onClick={() => onConvert(playlist)}
              disabled={disabled}
              className="gap-1 transition-all"
            >
              <span className="hidden sm:inline">Convert to</span>
              {targetService === "spotify" ? (
                <SpotifyLogo className="h-4 w-4" />
              ) : (
                <AppleLogo className="h-4 w-4" />
              )}
              <IconArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
