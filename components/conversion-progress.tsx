"use client";

import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { IconLoader2, IconCheck, IconX, IconArrowRight, IconAlertTriangle } from "@tabler/icons-react";
import { SpotifyLogo, AppleLogo, DeezerLogo, TidalLogo, YouTubeMusicLogo } from "@/components/icons";

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
  targetService: "spotify" | "apple" | "youtube" | "tidal" | "deezer";
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
          : sourceService === "youtube"
            ? YouTubeMusicLogo
            : AppleLogo;
  const TargetIcon =
    targetService === "spotify"
      ? SpotifyLogo
      : targetService === "tidal"
        ? TidalLogo
        : targetService === "deezer"
          ? DeezerLogo
      : targetService === "youtube"
        ? YouTubeMusicLogo
        : AppleLogo;

  const progressValue = progress ? (progress.current / progress.total) * 100 : 0;

  const getStatusIcon = (status: CurrentTrack["status"]) => {
    switch (status) {
      case "searching":
        return <IconLoader2 className="animate-spin text-accent" size={16} />;
      case "matched":
        return <IconCheck className="text-success" size={16} />;
      case "low_confidence":
        return <IconAlertTriangle className="text-warning" size={16} />;
      case "not_found":
        return <IconX className="text-error" size={16} />;
    }
  };

  const getStatusBg = (status: CurrentTrack["status"]) => {
    switch (status) {
      case "searching":
        return "bg-accent-muted border-accent-bg";
      case "matched":
        return "bg-success-muted border-success";
      case "low_confidence":
        return "bg-warning-muted border-warning";
      case "not_found":
        return "bg-error-muted border-error";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <Stack direction="horizontal" align="center" className="gap-3">
          <Stack direction="horizontal" className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            sourceService === "spotify"
              ? "bg-green-ring"
              : sourceService === "deezer"
                ? "bg-purple-ring"
                : sourceService === "tidal"
                  ? "bg-gray-ring"
                  : sourceService === "youtube"
                    ? "bg-red-ring"
                    : "bg-red-ring"
          } text-on-dark`}>
            <SourceIcon className="h-5 w-5" />
          </Stack>
          <IconArrowRight className="text-secondary" size={20} />
          <Stack direction="horizontal" className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            targetService === "spotify"
              ? "bg-green-ring"
              : targetService === "tidal"
                ? "bg-gray-ring"
                : targetService === "deezer"
                  ? "bg-purple-ring"
                  : targetService === "youtube"
                    ? "bg-red-ring"
                    : "bg-red-ring"
          } text-on-dark`}>
            <TargetIcon className="h-5 w-5" />
          </Stack>
          <Stack className="ml-2 flex-1">
            <CardTitle className="text-lg">{playlistName}</CardTitle>
            <CardDescription>
              {sourceService === "spotify" ? "Spotify" : sourceService === "deezer" ? "Deezer" : sourceService === "tidal" ? "TIDAL" : sourceService === "youtube" ? "YouTube Music" : "Apple Music"} → {targetService === "spotify" ? "Spotify" : targetService === "tidal" ? "TIDAL" : targetService === "deezer" ? "Deezer" : targetService === "youtube" ? "YouTube Music" : "Apple Music"}
            </CardDescription>
          </Stack>
          {progress && (
            <Stack className="text-right">
              <Text as="p" className="text-2xl font-bold">{progress.current}/{progress.total}</Text>
              <Text as="p" className="text-xs text-secondary">tracks</Text>
            </Stack>
          )}
        </Stack>
        {isConverting && progress && (
          <Progress value={progressValue} className="mt-4" />
        )}
      </CardHeader>
      <CardContent className="pt-4">
        {isConverting && (
          <Stack className="space-y-3">
            {/* Current track being processed */}
            {currentTrack && (
              <Stack className={`rounded-lg border p-3 ${getStatusBg(currentTrack.status)}`}>
                <Stack direction="horizontal" align="start" className="gap-3">
                  <Stack className="mt-0.5">
                    {getStatusIcon(currentTrack.status)}
                  </Stack>
                  <Stack className="flex-1 min-w-0">
                    <Text as="p" className="font-medium truncate">{currentTrack.name}</Text>
                    <Text as="p" className="text-sm text-secondary truncate">{currentTrack.artist}</Text>
                    {currentTrack.status === "searching" && (
                      <Text as="p" className="text-xs text-accent mt-1">Searching for match...</Text>
                    )}
                    {currentTrack.status === "matched" && currentTrack.matchedTo && (
                      <Text as="p" className="mt-1 text-xs text-success">
                        → {currentTrack.matchedTo.name} by {currentTrack.matchedTo.artist}
                        {currentTrack.confidence && ` (${currentTrack.confidence}%)`}
                      </Text>
                    )}
                    {currentTrack.status === "low_confidence" && currentTrack.matchedTo && (
                      <Text as="p" className="mt-1 text-xs text-warning">
                        Low confidence ({currentTrack.confidence}%) - not added
                      </Text>
                    )}
                    {currentTrack.status === "not_found" && (
                      <Text as="p" className="mt-1 text-xs text-error">No match found</Text>
                    )}
                  </Stack>
                </Stack>
              </Stack>
            )}

            {/* Recent tracks */}
            {recentTracks.length > 0 && (
              <Stack className="space-y-1.5 max-h-48 overflow-y-auto">
                {recentTracks.slice(0, 5).map((track, i) => (
                  <Stack key={i} direction="horizontal" align="center" className="gap-2 rounded bg-muted/30 px-2 py-1 text-sm">
                    {getStatusIcon(track.status)}
                    <Text className="truncate flex-1">{track.name}</Text>
                    {track.confidence !== undefined && (
                      <Text className={`text-xs ${
                        track.confidence >= 70 ? "text-success" : "text-warning"
                      }`}>
                        {track.confidence}%
                      </Text>
                    )}
                  </Stack>
                ))}
              </Stack>
            )}
          </Stack>
        )}

        {result && (
          <Stack className="space-y-4">
            <Stack direction="horizontal" align="center" className="gap-3">
              {result.success ? (
                <>
                  <Stack direction="horizontal" className="flex h-10 w-10 items-center justify-center rounded-full bg-success-muted">
                    <IconCheck className="text-success" size={24} />
                  </Stack>
                  <Stack>
                    <Text as="p" className="font-medium text-success">
                      Conversion Complete!
                    </Text>
                    <Text as="p" className="text-sm text-secondary">
                      {result.stats.matched} of {result.stats.total} tracks added to playlist
                    </Text>
                  </Stack>
                </>
              ) : (
                <>
                  <Stack direction="horizontal" className="flex h-10 w-10 items-center justify-center rounded-full bg-error-muted">
                    <IconX className="text-error" size={24} />
                  </Stack>
                  <Stack>
                    <Text as="p" className="font-medium text-error">Conversion Failed</Text>
                    <Text as="p" className="text-sm text-secondary">Please try again</Text>
                  </Stack>
                </>
              )}
            </Stack>

            {result.success && (
              <>
                <Stack className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stack className="rounded-lg bg-muted/50 p-3 text-center">
                    <Text as="p" className="text-2xl font-bold">{result.stats.total}</Text>
                    <Text as="p" className="text-xs text-secondary">Total</Text>
                  </Stack>
                  <Stack className="rounded-lg bg-success-muted p-3 text-center">
                    <Text as="p" className="text-2xl font-bold text-success">
                      {result.stats.matched}
                    </Text>
                    <Text as="p" className="text-xs text-secondary">Added</Text>
                  </Stack>
                  <Stack className="rounded-lg bg-error-muted p-3 text-center">
                    <Text as="p" className="text-2xl font-bold text-error">
                      {result.stats.unmatched}
                    </Text>
                    <Text as="p" className="text-xs text-secondary">Unmatched</Text>
                  </Stack>
                  <Stack className="rounded-lg bg-blue-subtle p-3 text-center">
                    <Text as="p" className="text-2xl font-bold text-blue-vivid">
                      {result.stats.averageConfidence}%
                    </Text>
                    <Text as="p" className="text-xs text-secondary">Confidence</Text>
                  </Stack>
                </Stack>

                <Stack direction="horizontal" wrap="wrap" className="gap-2">
                  <Badge variant="outline" className="text-xs">
                    <IconCheck size={12} className="mr-1 text-success" />
                    {result.stats.isrcMatches} exact (ISRC)
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <IconCheck size={12} className="mr-1 text-blue-vivid" />
                    {result.stats.fuzzyMatches} fuzzy
                  </Badge>
                  {result.stats.lowConfidence !== undefined && result.stats.lowConfidence > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <IconAlertTriangle size={12} className="mr-1 text-warning" />
                      {result.stats.lowConfidence} low confidence
                    </Badge>
                  )}
                </Stack>
              </>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
