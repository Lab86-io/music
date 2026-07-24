"use client";

import { useState } from "react";
import Image from "next/image";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Heading } from "@astryxdesign/core/Heading";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
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
  IconPlus
} from "@tabler/icons-react";
import { toast } from "@/lib/toast";

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
  const [manuallyAdded, setManuallyAdded] = useState<Set<number>>(new Set());

  // A track is truly matched only if confidence >= MIN_CONFIDENCE or manually added
  const isMatched = (m: TrackMatchData, index: number) => 
    manuallyAdded.has(index) || (m.targetTrack !== null && m.matchConfidence >= MIN_CONFIDENCE);

  const filteredMatches = matches
    .map((m, i) => ({ match: m, originalIndex: i }))
    .filter(({ match, originalIndex }) => {
      if (filter === "matched") return isMatched(match, originalIndex);
      if (filter === "unmatched") return !isMatched(match, originalIndex);
      return true;
    });

  const displayedMatches = showAll ? filteredMatches : filteredMatches.slice(0, 10);
  const matchedCount = matches.filter((m, i) => isMatched(m, i)).length;
  const unmatchedCount = matches.filter((m, i) => !isMatched(m, i)).length;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-success";
    if (confidence >= MIN_CONFIDENCE) return "text-warning";
    return "text-error";
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
        // Mark this track as manually added so it disappears from unmatched
        if (searchingIndex !== null) {
          setManuallyAdded(prev => new Set(prev).add(searchingIndex));
        }
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

  const filterOptions = [
    { key: "all" as const, label: "All", count: matches.length },
    { key: "matched" as const, label: "Added", count: matchedCount },
    { key: "unmatched" as const, label: "Unmatched", count: unmatchedCount },
  ];

  return (
    <Stack as="section" className="rounded-lg border border-border/70 bg-card/60">
      <Stack
        direction="horizontal"
        wrap="wrap"
        align="center"
        justify="between"
        className="gap-3 border-b border-border/60 px-4 py-3"
      >
        <Stack>
          <Heading level={3} className="text-sm font-semibold leading-tight">Track matching</Heading>
          <Text as="p" className="mt-0.5 text-xs text-secondary">
            {matchedCount} added
            {unmatchedCount > 0 ? (
              <>
                {" · "}
                <Text className="font-medium text-warning">
                  {unmatchedCount} need attention
                </Text>
              </>
            ) : (
              " · all tracks matched"
            )}
          </Text>
        </Stack>
        <SegmentedControl
          label="Track match filter"
          value={filter}
          onChange={(value) => setFilter(value as typeof filter)}
          size="sm"
        >
          {filterOptions.map((option) => (
            <SegmentedControlItem
              key={option.key}
              value={option.key}
              label={`${option.label} ${option.count}`}
            />
          ))}
        </SegmentedControl>
      </Stack>
      <Stack className="p-3 sm:p-4">
        <Stack className="space-y-2">
          {displayedMatches.map(({ match, originalIndex }) => {
            const matched = isMatched(match, originalIndex);
            const isSearching = searchingIndex === originalIndex;

            return (
              <Stack key={originalIndex}>
                <Stack
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    isSearching ? "border-accent-bg bg-accent-muted" : "hover:bg-muted/50"
                  }`}
                >
                  {/* Status Icon */}
                  <Stack
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      matched
                        ? "bg-success-muted text-success"
                        : "bg-error-muted text-error"
                    }`}
                  >
                    {matched ? (
                      <IconCheck size={16} />
                    ) : (
                      <IconX size={16} />
                    )}
                  </Stack>

                  {/* Track Info */}
                  <Stack className="flex-1 min-w-0">
                    <Stack direction="horizontal" align="center" className="gap-2">
                      <Text className="font-medium truncate">{match.sourceTrack.name}</Text>
                      {match.targetTrack && (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {match.matchMethod === "isrc" ? "ISRC" : "Fuzzy"}
                        </Badge>
                      )}
                    </Stack>
                    <Text as="p" className="text-sm text-secondary truncate">
                      {match.sourceTrack.artist}
                    </Text>
                    {!matched && match.targetTrack && match.matchConfidence < MIN_CONFIDENCE && (
                      <Text as="p" className="mt-0.5 text-xs text-error">
                        Found: {match.targetTrack.name} - not added (low confidence)
                      </Text>
                    )}
                  </Stack>

                  {/* Confidence / Actions */}
                  <Stack direction="horizontal" align="center" className="shrink-0 gap-2">
                    {match.targetTrack && (
                      <Stack className="text-right">
                        <Text className={`font-bold ${getConfidenceColor(match.matchConfidence)}`}>
                          {match.matchConfidence}%
                        </Text>
                      </Stack>
                    )}
                    {!matched && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          isSearching
                            ? closeSearch()
                            : handleSearch(match.sourceTrack.name, match.sourceTrack.artist, originalIndex)
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
                  </Stack>
                </Stack>

                {/* Search Panel */}
                {isSearching && (
                  <Stack className="mt-2 ml-0 sm:ml-11 p-3 rounded-lg border bg-muted/30 space-y-3 max-h-96 overflow-y-auto">
                    <Stack direction="horizontal" className="gap-2">
                      <Input
                        placeholder="Search for track..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCustomSearch()}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={handleCustomSearch} className="shrink-0">
                        <IconSearch size={14} />
                      </Button>
                    </Stack>

                    {searchResults.length > 0 ? (
                      <Stack className="space-y-2">
                        {searchResults.map((result) => (
                          <Stack
                            key={result.id}
                            className="flex items-center gap-2 sm:gap-3 p-2 rounded-lg border bg-body hover:bg-muted/50"
                          >
                            {result.image ? (
                              <Image
                                src={result.image}
                                alt={result.name}
                                width={40}
                                height={40}
                                className="rounded object-cover shrink-0"
                              />
                            ) : (
                              <Stack direction="horizontal" className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                                <IconMusic size={16} className="text-secondary" />
                              </Stack>
                            )}
                            <Stack className="flex-1 min-w-0">
                              <Text as="p" className="font-medium truncate text-sm">{result.name}</Text>
                              <Text as="p" className="text-xs text-secondary truncate">
                                {result.artist} • {result.album}
                              </Text>
                            </Stack>
                            <Button
                              size="sm"
                              onClick={() => handleAddTrack(result)}
                              disabled={addingTrack === result.id}
                              className="shrink-0"
                            >
                              {addingTrack === result.id ? (
                                <IconLoader2 size={14} className="animate-spin" />
                              ) : (
                                <>
                                  <IconPlus size={14} className="sm:mr-1" />
                                  <Text className="hidden sm:inline">Add</Text>
                                </>
                              )}
                            </Button>
                          </Stack>
                        ))}
                      </Stack>
                    ) : searchResults.length === 0 && searchQuery ? (
                      <Text as="p" className="text-sm text-secondary text-center py-4">
                        No results found. Try a different search.
                      </Text>
                    ) : null}
                  </Stack>
                )}
              </Stack>
            );
          })}
        </Stack>

        {filteredMatches.length > 10 && (
          <Stack className="mt-4 text-center">
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
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
