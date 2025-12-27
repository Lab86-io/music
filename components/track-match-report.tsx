"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  IconCheck, 
  IconX, 
  IconChevronDown, 
  IconChevronUp, 
  IconMusic, 
  IconSearch,
  IconLoader2,
  IconAlertTriangle,
  IconPlus
} from "@tabler/icons-react";
import { toast } from "sonner";

const MIN_CONFIDENCE = 70;

interface TrackMatchData {
  sourceTrack: { name: string; artist: string };
  targetTrack: { name: string; artist: string } | null;
  matchConfidence: number;
  matchMethod: "isrc" | "fuzzy" | "none";
}

interface SearchResult {
  id: string;
  uri?: string;
  type?: string;
  name: string;
  artist: string;
  album: string;
  image?: string;
}

interface TrackMatchReportProps {
  matches: TrackMatchData[];
  targetService: "spotify" | "apple";
  playlistId: string;
  appleUserToken?: string;
  onTrackAdded?: () => void;
}

export function TrackMatchReport({ 
  matches, 
  targetService, 
  playlistId,
  appleUserToken,
  onTrackAdded 
}: TrackMatchReportProps) {
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<"all" | "matched" | "unmatched">("all");
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [addingTrack, setAddingTrack] = useState<string | null>(null);

  // A track is truly matched only if confidence >= MIN_CONFIDENCE
  const isMatched = (m: TrackMatchData) => 
    m.targetTrack !== null && m.matchConfidence >= MIN_CONFIDENCE;

  const filteredMatches = matches.filter((m) => {
    if (filter === "matched") return isMatched(m);
    if (filter === "unmatched") return !isMatched(m);
    return true;
  });

  const displayedMatches = showAll ? filteredMatches : filteredMatches.slice(0, 10);
  const matchedCount = matches.filter(isMatched).length;
  const unmatchedCount = matches.filter(m => !isMatched(m)).length;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (confidence >= MIN_CONFIDENCE) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const handleSearch = async (trackName: string, artistName: string, index: number) => {
    setSearchingIndex(index);
    setSearchQuery(`${trackName} ${artistName}`);
    setSearchResults([]);

    try {
      const headers: HeadersInit = {};
      if (targetService === "apple" && appleUserToken) {
        headers["Music-User-Token"] = appleUserToken;
      }

      const response = await fetch(
        `/api/search?q=${encodeURIComponent(`${trackName} ${artistName}`)}&service=${targetService}&limit=5`,
        { headers }
      );

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data);
      } else {
        toast.error("Search failed");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed");
    }
  };

  const handleCustomSearch = async () => {
    if (!searchQuery.trim() || searchingIndex === null) return;

    try {
      const headers: HeadersInit = {};
      if (targetService === "apple" && appleUserToken) {
        headers["Music-User-Token"] = appleUserToken;
      }

      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&service=${targetService}&limit=5`,
        { headers }
      );

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data);
      } else {
        toast.error("Search failed");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed");
    }
  };

  const handleAddTrack = async (track: SearchResult) => {
    setAddingTrack(track.id);

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (targetService === "apple" && appleUserToken) {
        headers["Music-User-Token"] = appleUserToken;
      }

      const response = await fetch("/api/playlist/add-track", {
        method: "POST",
        headers,
        body: JSON.stringify({
          service: targetService,
          playlistId,
          trackId: track.id,
          trackUri: track.uri,
          trackType: track.type || "songs",
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Added "${track.name}" to playlist`);
        setSearchingIndex(null);
        setSearchResults([]);
        onTrackAdded?.();
      } else {
        toast.error(data.error || "Failed to add track");
      }
    } catch (error) {
      console.error("Add track error:", error);
      toast.error("Failed to add track");
    } finally {
      setAddingTrack(null);
    }
  };

  const closeSearch = () => {
    setSearchingIndex(null);
    setSearchResults([]);
    setSearchQuery("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconMusic size={20} />
              Track Matching Report
            </CardTitle>
            <CardDescription>
              {matchedCount} added, {unmatchedCount} need attention
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
              Added ({matchedCount})
            </Button>
            <Button
              variant={filter === "unmatched" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("unmatched")}
            >
              Unmatched ({unmatchedCount})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayedMatches.map((match, index) => {
            const matched = isMatched(match);
            const isSearching = searchingIndex === index;
            const actualIndex = showAll ? index : filteredMatches.indexOf(match);

            return (
              <div key={index}>
                <div
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    isSearching ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  {/* Status Icon */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      matched
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : match.targetTrack && match.matchConfidence < MIN_CONFIDENCE
                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        : "bg-red-500/20 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {matched ? (
                      <IconCheck size={16} />
                    ) : match.targetTrack && match.matchConfidence < MIN_CONFIDENCE ? (
                      <IconAlertTriangle size={16} />
                    ) : (
                      <IconX size={16} />
                    )}
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
                    </p>
                    {match.targetTrack && match.matchConfidence < MIN_CONFIDENCE && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                        Found: {match.targetTrack.name} - not added (low confidence)
                      </p>
                    )}
                  </div>

                  {/* Confidence / Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {match.targetTrack && (
                      <div className="text-right">
                        <span className={`font-bold ${getConfidenceColor(match.matchConfidence)}`}>
                          {match.matchConfidence}%
                        </span>
                      </div>
                    )}
                    {!matched && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          isSearching
                            ? closeSearch()
                            : handleSearch(match.sourceTrack.name, match.sourceTrack.artist, actualIndex)
                        }
                      >
                        {isSearching ? (
                          "Cancel"
                        ) : (
                          <>
                            <IconSearch size={14} className="mr-1" />
                            Find
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Search Panel */}
                {isSearching && (
                  <div className="mt-2 ml-11 p-3 rounded-lg border bg-muted/30 space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search for track..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCustomSearch()}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={handleCustomSearch}>
                        <IconSearch size={14} />
                      </Button>
                    </div>

                    {searchResults.length > 0 ? (
                      <div className="space-y-2">
                        {searchResults.map((result) => (
                          <div
                            key={result.id}
                            className="flex items-center gap-3 p-2 rounded-lg border bg-background hover:bg-muted/50"
                          >
                            {result.image ? (
                              <Image
                                src={result.image}
                                alt={result.name}
                                width={40}
                                height={40}
                                className="rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                <IconMusic size={16} className="text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate text-sm">{result.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {result.artist} • {result.album}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAddTrack(result)}
                              disabled={addingTrack === result.id}
                            >
                              {addingTrack === result.id ? (
                                <IconLoader2 size={14} className="animate-spin" />
                              ) : (
                                <>
                                  <IconPlus size={14} className="mr-1" />
                                  Add
                                </>
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : searchResults.length === 0 && searchQuery ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No results found. Try a different search.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
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
