"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconMusic, IconArrowRight } from "@tabler/icons-react";
import { SpotifyLogo, AppleLogo } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { SpotifyPlaylist, AppleMusicPlaylist } from "@/types";

interface PlaylistCardProps {
  playlist: SpotifyPlaylist | AppleMusicPlaylist;
  source: "spotify" | "apple";
  onConvert: (playlist: SpotifyPlaylist | AppleMusicPlaylist) => void;
  targetService: "spotify" | "apple";
  disabled?: boolean;
  index?: number;
}

export function PlaylistCard({ playlist, source, onConvert, targetService, disabled, index = 0 }: PlaylistCardProps) {
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
    <Card 
      className={cn(
        "group overflow-hidden transition-all duration-300 card-lift",
        "glass border-border/50 hover:border-primary/40",
        "animate-fade-in-up"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <CardContent className="p-0">
        <div className="flex gap-4 p-4">
          {/* Album Art */}
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted shadow-sm">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110"
                sizes="80px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <IconMusic size={32} className="text-primary/60" />
              </div>
            )}
            {/* Service badge */}
            <div className="absolute bottom-1.5 right-1.5">
              {isSpotify ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1DB954] text-white shadow-lg ring-2 ring-background">
                  <SpotifyLogo className="h-3 w-3" />
                </div>
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#FC3C44] to-[#F94C57] text-white shadow-lg ring-2 ring-background">
                  <AppleLogo className="h-3 w-3" />
                </div>
              )}
            </div>
          </div>

          {/* Playlist Info */}
          <div className="flex flex-1 flex-col justify-between min-w-0">
            <div>
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors" title={name}>
                {name}
              </h3>
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                  {description}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <Badge variant="secondary" className="text-xs bg-muted/80">
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
              className={cn(
                "gap-1.5 transition-all duration-200 shadow-sm hover:shadow-md",
                targetService === "spotify" 
                  ? "bg-[#1DB954] hover:bg-[#1aa34a] hover:shadow-[#1DB954]/20" 
                  : "bg-gradient-to-r from-[#FC3C44] to-[#F94C57] hover:from-[#e03540] hover:to-[#e0444d] hover:shadow-[#FC3C44]/20"
              )}
            >
              <span className="hidden sm:inline text-xs">Convert</span>
              {targetService === "spotify" ? (
                <SpotifyLogo className="h-4 w-4" />
              ) : (
                <AppleLogo className="h-4 w-4" />
              )}
              <IconArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
