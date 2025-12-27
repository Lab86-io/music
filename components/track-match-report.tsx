"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconCheck, IconX, IconChevronDown, IconChevronUp, IconMusic } from "@tabler/icons-react";

interface TrackMatchData {
  sourceTrack: { name: string; artist: string };
  targetTrack: { name: string; artist: string } | null;
  matchConfidence: number;
  matchMethod: "isrc" | "fuzzy" | "none";
}

interface TrackMatchReportProps {
  matches: TrackMatchData[];
}

export function TrackMatchReport({ matches }: TrackMatchReportProps) {
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<"all" | "matched" | "unmatched">("all");

  const filteredMatches = matches.filter((m) => {
    if (filter === "matched") return m.targetTrack !== null;
    if (filter === "unmatched") return m.targetTrack === null;
    return true;
  });

  const displayedMatches = showAll ? filteredMatches : filteredMatches.slice(0, 10);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (confidence >= 70) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconMusic size={20} />
              Track Matching Report
            </CardTitle>
            <CardDescription>
              Showing {displayedMatches.length} of {filteredMatches.length} tracks
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All ({matches.length})
            </Button>
            <Button
              variant={filter === "matched" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("matched")}
            >
              Matched ({matches.filter((m) => m.targetTrack).length})
            </Button>
            <Button
              variant={filter === "unmatched" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("unmatched")}
            >
              Unmatched ({matches.filter((m) => !m.targetTrack).length})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayedMatches.map((match, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              {/* Status Icon */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  match.targetTrack
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/20 text-red-600 dark:text-red-400"
                }`}
              >
                {match.targetTrack ? <IconCheck size={16} /> : <IconX size={16} />}
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{match.sourceTrack.name}</span>
                  {match.targetTrack && (
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {match.matchMethod === "isrc" ? "ISRC" : "Fuzzy"}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {match.sourceTrack.artist}
                  {match.targetTrack && match.targetTrack.artist !== match.sourceTrack.artist && (
                    <span className="text-primary"> → {match.targetTrack.artist}</span>
                  )}
                </p>
              </div>

              {/* Confidence */}
              {match.targetTrack && (
                <div className="text-right shrink-0">
                  <span className={`font-bold ${getConfidenceColor(match.matchConfidence)}`}>
                    {match.matchConfidence}%
                  </span>
                  <p className="text-xs text-muted-foreground">confidence</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredMatches.length > 10 && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => setShowAll(!showAll)}
              className="gap-2"
            >
              {showAll ? (
                <>
                  <IconChevronUp size={16} />
                  Show Less
                </>
              ) : (
                <>
                  <IconChevronDown size={16} />
                  Show All ({filteredMatches.length - 10} more)
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


