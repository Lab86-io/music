"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { IconLoader2, IconCheck, IconX, IconArrowRight } from "@tabler/icons-react";
import { SpotifyLogo, AppleLogo } from "@/components/icons";

interface ConversionProgressProps {
  isConverting: boolean;
  playlistName: string;
  sourceService: "spotify" | "apple";
  targetService: "spotify" | "apple";
  progress?: {
    current: number;
    total: number;
  };
  result?: {
    success: boolean;
    stats: {
      total: number;
      matched: number;
      isrcMatches: number;
      fuzzyMatches: number;
      unmatched: number;
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
  result,
}: ConversionProgressProps) {
  const SourceIcon = sourceService === "spotify" ? SpotifyLogo : AppleLogo;
  const TargetIcon = targetService === "spotify" ? SpotifyLogo : AppleLogo;

  const progressValue = progress ? (progress.current / progress.total) * 100 : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            sourceService === "spotify" ? "bg-[#1DB954]" : "bg-gradient-to-br from-[#FC3C44] to-[#F94C57]"
          } text-white`}>
            <SourceIcon className="h-5 w-5" />
          </div>
          <IconArrowRight className="text-muted-foreground" />
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            targetService === "spotify" ? "bg-[#1DB954]" : "bg-gradient-to-br from-[#FC3C44] to-[#F94C57]"
          } text-white`}>
            <TargetIcon className="h-5 w-5" />
          </div>
          <div className="ml-2">
            <CardTitle className="text-lg">{playlistName}</CardTitle>
            <CardDescription>
              Converting from {sourceService === "spotify" ? "Spotify" : "Apple Music"} to{" "}
              {targetService === "spotify" ? "Spotify" : "Apple Music"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {isConverting && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <IconLoader2 className="animate-spin text-primary" size={24} />
              <div>
                <p className="font-medium">Converting tracks...</p>
                {progress && (
                  <p className="text-sm text-muted-foreground">
                    {progress.current} of {progress.total} tracks processed
                  </p>
                )}
              </div>
            </div>
            {progress && (
              <Progress value={progressValue}>
                <span className="sr-only">{Math.round(progressValue)}% complete</span>
              </Progress>
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
                      Playlist created successfully
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
                    <p className="text-sm text-muted-foreground">
                      Please try again
                    </p>
                  </div>
                </>
              )}
            </div>

            {result.success && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{result.stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Tracks</p>
                </div>
                <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {result.stats.matched}
                  </p>
                  <p className="text-xs text-muted-foreground">Matched</p>
                </div>
                <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {result.stats.unmatched}
                  </p>
                  <p className="text-xs text-muted-foreground">Unmatched</p>
                </div>
                <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {result.stats.averageConfidence}%
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Confidence</p>
                </div>
              </div>
            )}

            {result.success && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  <IconCheck size={12} className="mr-1 text-emerald-500" />
                  {result.stats.isrcMatches} ISRC matches
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <IconCheck size={12} className="mr-1 text-blue-500" />
                  {result.stats.fuzzyMatches} fuzzy matches
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
