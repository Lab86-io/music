"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { IconLoader2, IconCheck, IconX, IconArrowRight, IconAlertTriangle } from "@tabler/icons-react";
import { SpotifyLogo, AppleLogo, DeezerLogo, TidalLogo } from "@/components/icons";

interface CurrentTrack {
  name: string;
  artist: string;
  status: "searching" | "matched" | "low_confidence" | "not_found";
  matchedTo?: { name: string; artist: string };
  confidence?: number;
}

interface ConversionProgressProps {
  isConverting: boolean;
  playlistName: string;
  sourceService: string;
  targetService: "spotify" | "apple";
  progress?: {
    current: number;
    total: number;
  };
  currentTrack?: CurrentTrack;
  recentTracks?: CurrentTrack[];
  result?: {
    success: boolean;
    stats: {
      total: number;
      matched: number;
      isrcMatches: number;
      fuzzyMatches: number;
      unmatched: number;
      lowConfidence?: number;
      averageConfidence: number;
    };
    newPlaylistId: string;
  };
}

export function ConversionProgress({
  isConverting,
  playlistName,
  sourceService,
  targetService,
  progress,
  currentTrack,
  recentTracks = [],
  result,
}: ConversionProgressProps) {
  const SourceIcon =
    sourceService === "spotify"
      ? SpotifyLogo
      : sourceService === "deezer"
        ? DeezerLogo
        : sourceService === "tidal"
          ? TidalLogo
          : AppleLogo;
  const TargetIcon = targetService === "spotify" ? SpotifyLogo : AppleLogo;

  const progressValue = progress ? (progress.current / progress.total) * 100 : 0;

  const getStatusIcon = (status: CurrentTrack["status"]) => {
    switch (status) {
      case "searching":
        return <IconLoader2 className="animate-spin text-primary" size={16} />;
      case "matched":
        return <IconCheck className="text-emerald-500" size={16} />;
      case "low_confidence":
        return <IconAlertTriangle className="text-amber-500" size={16} />;
      case "not_found":
        return <IconX className="text-red-500" size={16} />;
    }
  };

  const getStatusBg = (status: CurrentTrack["status"]) => {
    switch (status) {
      case "searching":
        return "bg-primary/10 border-primary/20";
      case "matched":
        return "bg-emerald-500/10 border-emerald-500/20";
      case "low_confidence":
        return "bg-amber-500/10 border-amber-500/20";
      case "not_found":
        return "bg-red-500/10 border-red-500/20";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            sourceService === "spotify"
              ? "bg-[#1DB954]"
              : sourceService === "deezer"
                ? "bg-[#A238FF]"
                : sourceService === "tidal"
                  ? "bg-neutral-900"
                  : "bg-[#FC3C44]"
          } text-white`}>
            <SourceIcon className="h-5 w-5" />
          </div>
          <IconArrowRight className="text-muted-foreground" size={20} />
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            targetService === "spotify" ? "bg-[#1DB954]" : "bg-[#FC3C44]"
          } text-white`}>
            <TargetIcon className="h-5 w-5" />
          </div>
          <div className="ml-2 flex-1">
            <CardTitle className="text-lg">{playlistName}</CardTitle>
            <CardDescription>
              {sourceService === "spotify" ? "Spotify" : sourceService === "deezer" ? "Deezer" : sourceService === "tidal" ? "TIDAL" : "Apple Music"} → {targetService === "spotify" ? "Spotify" : "Apple Music"}
            </CardDescription>
          </div>
          {progress && (
            <div className="text-right">
              <p className="text-2xl font-bold">{progress.current}/{progress.total}</p>
              <p className="text-xs text-muted-foreground">tracks</p>
            </div>
          )}
        </div>
        {isConverting && progress && (
          <Progress value={progressValue} className="mt-4" />
        )}
      </CardHeader>
      <CardContent className="pt-4">
        {isConverting && (
          <div className="space-y-3">
            {/* Current track being processed */}
            {currentTrack && (
              <div className={`rounded-lg border p-3 ${getStatusBg(currentTrack.status)}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getStatusIcon(currentTrack.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{currentTrack.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{currentTrack.artist}</p>
                    {currentTrack.status === "searching" && (
                      <p className="text-xs text-primary mt-1">Searching for match...</p>
                    )}
                    {currentTrack.status === "matched" && currentTrack.matchedTo && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        → {currentTrack.matchedTo.name} by {currentTrack.matchedTo.artist}
                        {currentTrack.confidence && ` (${currentTrack.confidence}%)`}
                      </p>
                    )}
                    {currentTrack.status === "low_confidence" && currentTrack.matchedTo && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Low confidence ({currentTrack.confidence}%) - not added
                      </p>
                    )}
                    {currentTrack.status === "not_found" && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">No match found</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Recent tracks */}
            {recentTracks.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {recentTracks.slice(0, 5).map((track, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1 px-2 rounded bg-muted/30">
                    {getStatusIcon(track.status)}
                    <span className="truncate flex-1">{track.name}</span>
                    {track.confidence !== undefined && (
                      <span className={`text-xs ${
                        track.confidence >= 70 ? "text-emerald-600" : "text-amber-600"
                      }`}>
                        {track.confidence}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {result.success ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                    <IconCheck className="text-emerald-500" size={24} />
                  </div>
                  <div>
                    <p className="font-medium text-emerald-600 dark:text-emerald-400">
                      Conversion Complete!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result.stats.matched} of {result.stats.total} tracks added to playlist
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20">
                    <IconX className="text-destructive" size={24} />
                  </div>
                  <div>
                    <p className="font-medium text-destructive">Conversion Failed</p>
                    <p className="text-sm text-muted-foreground">Please try again</p>
                  </div>
                </>
              )}
            </div>

            {result.success && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold">{result.stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {result.stats.matched}
                    </p>
                    <p className="text-xs text-muted-foreground">Added</p>
                  </div>
                  <div className="rounded-lg bg-red-500/10 p-3 text-center">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {result.stats.unmatched}
                    </p>
                    <p className="text-xs text-muted-foreground">Unmatched</p>
                  </div>
                  <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {result.stats.averageConfidence}%
                    </p>
                    <p className="text-xs text-muted-foreground">Confidence</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    <IconCheck size={12} className="mr-1 text-emerald-500" />
                    {result.stats.isrcMatches} exact (ISRC)
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <IconCheck size={12} className="mr-1 text-blue-500" />
                    {result.stats.fuzzyMatches} fuzzy
                  </Badge>
                  {result.stats.lowConfidence !== undefined && result.stats.lowConfidence > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <IconAlertTriangle size={12} className="mr-1 text-amber-500" />
                      {result.stats.lowConfidence} low confidence
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
