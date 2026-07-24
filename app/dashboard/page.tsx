"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "@/lib/toast";
import { ServiceConnect } from "@/components/service-connect";
import { PlaylistCard, type ConvertTargetService } from "@/components/playlist-card";
import { PlaylistSkeletonList } from "@/components/playlist-skeleton";
import { ConversionProgress } from "@/components/conversion-progress";
import { TrackMatchReport } from "@/components/track-match-report";
import { ShareDialog } from "@/components/share-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Badge as AstryxBadge } from "@astryxdesign/core/Badge";
import { Heading } from "@astryxdesign/core/Heading";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Stack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  IconMusic, 
  IconRefresh, 
  IconLoader2,
  IconSearch
} from "@tabler/icons-react";
import {
  SpotifyLogo,
  AppleLogo,
  YouTubeMusicLogo,
  TidalLogo,
  DeezerLogo,
} from "@/components/icons";
import { LinkConverter } from "@/components/link-converter";
import type { SpotifyPlaylist, AppleMusicPlaylist } from "@/types";

interface SpotifySession {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface ConversionResult {
  success: boolean;
  newPlaylistId: string;
  stats: {
    total: number;
    matched: number;
    isrcMatches: number;
    fuzzyMatches: number;
    unmatched: number;
    lowConfidence?: number;
    averageConfidence: number;
  };
  matches: {
    sourceTrack: { name: string; artist: string };
    targetTrack: { name: string; artist: string } | null;
    matchConfidence: number;
    matchMethod: "isrc" | "fuzzy" | "none";
  }[];
}

export default function DashboardPage() {
  const router = useRouter();

  // Spotify session state
  const [spotifySession, setSpotifySession] = useState<SpotifySession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Connection state
  const [appleConnected, setAppleConnected] = useState(false);
  const [appleUserToken, setAppleUserToken] = useState<string | null>(null);

  // YouTube connection state
  const [youtube, setYoutube] = useState<{ configured: boolean; connected: boolean }>({
    configured: false,
    connected: false,
  });
  const [tidal, setTidal] = useState<{ configured: boolean; connected: boolean }>({
    configured: false,
    connected: false,
  });
  const [deezer, setDeezer] = useState<{ configured: boolean; connected: boolean }>({
    configured: true,
    connected: false,
  });

  // Playlists state
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [applePlaylists, setApplePlaylists] = useState<AppleMusicPlaylist[]>([]);
  const [loadingSpotify, setLoadingSpotify] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);

  // Conversion state
  const [isConverting, setIsConverting] = useState(false);
  const [conversionPlaylist, setConversionPlaylist] = useState<{
    name: string;
    source: "spotify" | "apple";
    target: ConvertTargetService;
  } | null>(null);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [conversionProgress, setConversionProgress] = useState<{ current: number; total: number } | null>(null);
  const [currentTrack, setCurrentTrack] = useState<{
    name: string;
    artist: string;
    status: "searching" | "matched" | "low_confidence" | "not_found";
    matchedTo?: { name: string; artist: string };
    confidence?: number;
  } | null>(null);
  const [recentTracks, setRecentTracks] = useState<Array<{
    name: string;
    artist: string;
    status: "searching" | "matched" | "low_confidence" | "not_found";
    matchedTo?: { name: string; artist: string };
    confidence?: number;
  }>>([]);

  // Active tab
  const [activeTab, setActiveTab] = useState<string>("spotify");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Normalize text for fuzzy search (handle apostrophes, special chars, etc.)
  const normalizeForSearch = (text: string): string => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/[''`]/g, "") // Remove apostrophes
      .replace(/[^\w\s]/g, "") // Remove other special chars
      .trim();
  };

  // Sharing state
  const [sharingPlaylist, setSharingPlaylist] = useState<SpotifyPlaylist | AppleMusicPlaylist | null>(null);
  const [sharingSource, setSharingSource] = useState<"spotify" | "apple">("spotify");

  const spotifyConnected = !!spotifySession;

  // Auto-select tab based on which service is connected
  useEffect(() => {
    if (spotifyConnected && !appleConnected) {
      setActiveTab("spotify");
    } else if (appleConnected && !spotifyConnected) {
      setActiveTab("apple");
    }
  }, [spotifyConnected, appleConnected]);

  // YouTube availability
  useEffect(() => {
    fetch("/api/youtube/status")
      .then((r) => r.json())
      .then((d) => setYoutube({ configured: !!d.configured, connected: !!d.connected }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/tidal/status")
      .then((r) => r.json())
      .then((d) => setTidal({ configured: !!d.configured, connected: !!d.connected }))
      .catch(() => {});
    fetch("/api/deezer/status")
      .then((r) => r.json())
      .then((d) => setDeezer({ configured: !!d.configured, connected: !!d.connected }))
      .catch(() => {});
  }, []);

  // Fetch Spotify session on mount
  useEffect(() => {
    const fetchSpotifySession = async () => {
      try {
        const response = await fetch("/api/spotify/session");
        const data = await response.json();
        if (data.session) {
          setSpotifySession(data.session);
        } else {
          // Redirect to home if not authenticated
          router.push("/");
        }
      } catch (error) {
        console.error("Failed to fetch Spotify session:", error);
        router.push("/");
      } finally {
        setSessionLoading(false);
      }
    };
    fetchSpotifySession();
  }, [router]);

  // Load Spotify playlists
  const loadSpotifyPlaylists = useCallback(async () => {
    if (!spotifyConnected) return;
    
    setLoadingSpotify(true);
    try {
      const response = await fetch("/api/spotify/playlists");
      const data = await response.json();
      if (data.success) {
        setSpotifyPlaylists(data.data);
        toast.success(`Loaded ${data.data.length} Spotify playlists`);
      } else {
        toast.error("Failed to load Spotify playlists");
      }
    } catch (error) {
      console.error("Failed to load Spotify playlists:", error);
      toast.error("Failed to load Spotify playlists");
    } finally {
      setLoadingSpotify(false);
    }
  }, [spotifyConnected]);

  // Load Apple Music playlists
  const loadApplePlaylists = useCallback(async () => {
    const token = appleUserToken || sessionStorage.getItem("appleUserToken");
    if (!token) return;
    
    setLoadingApple(true);
    try {
      const response = await fetch("/api/apple/playlists", {
        headers: {
          "Music-User-Token": token,
        },
      });
      const data = await response.json();
      if (data.success) {
        setApplePlaylists(data.data);
        toast.success(`Loaded ${data.data.length} Apple Music playlists`);
      } else {
        toast.error("Failed to load Apple Music playlists");
      }
    } catch (error) {
      console.error("Failed to load Apple Music playlists:", error);
      toast.error("Failed to load Apple Music playlists");
    } finally {
      setLoadingApple(false);
    }
  }, [appleUserToken]);

  // Load playlists on mount and connection change
  useEffect(() => {
    if (spotifyConnected) {
      loadSpotifyPlaylists();
    }
  }, [spotifyConnected, loadSpotifyPlaylists]);

  useEffect(() => {
    if (appleConnected) {
      loadApplePlaylists();
    }
  }, [appleConnected, loadApplePlaylists]);

  // Handle connection changes from ServiceConnect
  const handleConnectionChange = (
    service: "spotify" | "apple" | "youtube" | "tidal" | "deezer",
    connected: boolean,
    token?: string
  ) => {
    if (service === "apple") {
      setAppleConnected(connected);
      setAppleUserToken(token || null);
      if (connected) {
        toast.success("Connected to Apple Music");
      }
    } else if (service === "tidal") {
      setTidal((current) => ({ ...current, connected }));
    } else if (service === "deezer") {
      setDeezer((current) => ({ ...current, connected }));
    } else if (service === "youtube") {
      setYoutube((current) => ({ ...current, connected }));
    }
  };

  // Handle playlist sharing
  const handleShare = (playlist: SpotifyPlaylist | AppleMusicPlaylist, source: "spotify" | "apple") => {
    setSharingPlaylist(playlist);
    setSharingSource(source);
  };

  // Handle playlist conversion
  // Server-side destinations fetch source tracks, match them, and create a
  // private playlist without shipping provider tokens through the client.
  const convertToExternal = async (
    playlistName: string,
    sourceService: "spotify" | "apple",
    playlistId: string,
    targetService: "youtube" | "tidal" | "deezer"
  ) => {
    const serviceName =
      targetService === "youtube"
        ? "YouTube Music"
        : targetService === "tidal"
          ? "TIDAL"
          : "Deezer";
    setIsConverting(true);
    setConversionPlaylist({ name: playlistName, source: sourceService, target: targetService });
    setConversionResult(null);
    setConversionProgress(null);
    setCurrentTrack(null);
    setRecentTracks([]);

    try {
      const response = await fetch(`/api/${targetService}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: playlistName,
          source: { service: sourceService, playlistId },
          appleUserToken:
            sourceService === "apple"
              ? appleUserToken || sessionStorage.getItem("appleUserToken")
              : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        toast.error(data.error || `${serviceName} conversion failed`);
        setConversionResult({
          success: false,
          newPlaylistId: "",
          stats: { total: 0, matched: 0, isrcMatches: 0, fuzzyMatches: 0, unmatched: 0, averageConfidence: 0 },
          matches: [],
        });
        return;
      }
      setConversionResult({
        success: true,
        newPlaylistId: data.playlistId,
        stats: {
          total: data.total,
          matched: data.added,
          isrcMatches: data.isrcMatches ?? 0,
          fuzzyMatches: data.fuzzyMatches ?? data.added,
          unmatched: data.total - data.added,
          averageConfidence:
            data.added > 0
              ? Math.round(
                  (((data.isrcMatches ?? 0) * 100 +
                    (data.fuzzyMatches ?? data.added) * 70) /
                    data.added)
                )
              : 0,
        },
        matches: [],
      });
      if (data.quotaExceeded) {
        toast.warning(
          `Added ${data.added}/${data.total} tracks. Daily YouTube quota ran out; convert the rest tomorrow.`
        );
      } else if (data.warning) {
        toast.warning(`Added ${data.added}/${data.total} tracks to ${serviceName} (${data.warning})`);
      } else {
        toast.success(`Added ${data.added}/${data.total} tracks to ${serviceName}`);
      }
      window.open(data.playlistUrl, "_blank");
    } catch (error) {
      console.error(`${serviceName} conversion failed:`, error);
      toast.error(`${serviceName} conversion failed. Please try again.`);
    } finally {
      setIsConverting(false);
    }
  };

  const handleConvert = async (
    playlist: SpotifyPlaylist | AppleMusicPlaylist,
    targetService: ConvertTargetService
  ) => {
    const isSpotifyPlaylist = "tracks" in playlist && "owner" in playlist;
    const sourceService = isSpotifyPlaylist ? "spotify" : "apple";
    const playlistId = playlist.id;
    const playlistName = isSpotifyPlaylist
      ? (playlist as SpotifyPlaylist).name
      : (playlist as AppleMusicPlaylist).attributes.name;

    // Check if target service is connected
    if (targetService === "apple" && !appleConnected) {
      toast.error("Please connect your Apple Music account first");
      return;
    }
    if (targetService === "spotify" && !spotifyConnected) {
      toast.error("Please connect your Spotify account first");
      return;
    }
    if (targetService === "youtube" && !youtube.connected) {
      toast.error("Please connect your YouTube account first");
      return;
    }
    if (targetService === "tidal" && !tidal.connected) {
      toast.error("Please connect your TIDAL account first");
      return;
    }
    if (targetService === "deezer" && !deezer.connected) {
      toast.error("Connect Deezer from the advanced connection panel first");
      return;
    }

    if (
      targetService === "youtube" ||
      targetService === "tidal" ||
      targetService === "deezer"
    ) {
      await convertToExternal(playlistName, sourceService, playlistId, targetService);
      return;
    }

    setIsConverting(true);
    setConversionPlaylist({
      name: playlistName,
      source: sourceService,
      target: targetService,
    });
    setConversionResult(null);
    setConversionProgress(null);
    setCurrentTrack(null);
    setRecentTracks([]);

    try {
      const token = appleUserToken || sessionStorage.getItem("appleUserToken");
      
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({
          sourceService,
          targetService,
          playlistId,
          playlistName,
          appleUserToken: token,
        }),
      });

      if (!response.ok) {
        throw new Error("Conversion request failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            continue;
          }
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);
              
              if (data.total !== undefined && data.current === undefined) {
                // Init event
                setConversionProgress({ current: 0, total: data.total });
              } else if (data.current !== undefined && data.track) {
                // Progress event
                setConversionProgress({ current: data.current, total: data.total });
                setCurrentTrack(data.track);
                setRecentTracks(prev => [data.track, ...prev].slice(0, 10));
              } else if (data.success !== undefined) {
                // Complete event
                setConversionResult({
                  success: data.success,
                  newPlaylistId: data.newPlaylistId,
                  stats: data.stats,
                  matches: data.matches,
                });
                
                if (data.success) {
                  toast.success(`Successfully converted "${playlistName}"!`);
                  // Reload target playlists
                  if (targetService === "spotify") {
                    loadSpotifyPlaylists();
                  } else {
                    loadApplePlaylists();
                  }
                } else {
                  toast.error("Conversion failed. Please try again.");
                }
              } else if (data.error) {
                // Error event
                toast.error(data.error);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error("Conversion failed:", error);
      setConversionResult({
        success: false,
        newPlaylistId: "",
        stats: { total: 0, matched: 0, isrcMatches: 0, fuzzyMatches: 0, unmatched: 0, averageConfidence: 0 },
        matches: [],
      });
      toast.error("Conversion failed. Please try again.");
    } finally {
      setIsConverting(false);
      setCurrentTrack(null);
    }
  };

  const clearConversion = () => {
    setConversionPlaylist(null);
    setConversionResult(null);
  };

  if (sessionLoading) {
    return (
      <Stack direction="horizontal" className="flex min-h-screen items-center justify-center">
        <IconLoader2 className="h-8 w-8 animate-spin text-accent" />
      </Stack>
    );
  }

  return (
    <TooltipProvider>
      <Stack className="min-h-screen bg-body">
        <Stack className="container mx-auto px-4 py-4 pb-12">
          <Stack direction="horizontal" align="center" className="hidden gap-2 sm:flex">
            {spotifyConnected && (
              <Badge variant="outline" className="gap-1.5 border-green-ring bg-green-subtle px-3 py-1.5">
                <SpotifyLogo className="h-3.5 w-3.5 text-green-vivid" />
                <Text className="text-xs font-medium">Spotify</Text>
              </Badge>
            )}
            {appleConnected && (
              <Badge variant="outline" className="gap-1.5 border-red-ring bg-red-subtle px-3 py-1.5">
                <AppleLogo className="h-3.5 w-3.5 text-red-vivid" />
                <Text className="text-xs font-medium">Apple Music</Text>
              </Badge>
            )}
            {youtube.connected && (
              <Badge variant="outline" className="gap-1.5 border-red-ring bg-red-subtle px-3 py-1.5">
                <YouTubeMusicLogo className="h-3.5 w-3.5 text-red-vivid" />
                <Text className="text-xs font-medium">YouTube</Text>
              </Badge>
            )}
            {tidal.connected && (
              <Badge variant="outline" className="gap-1.5 border-gray-ring bg-gray-subtle px-3 py-1.5">
                <TidalLogo className="h-3.5 w-3.5" />
                <Text className="text-xs font-medium">TIDAL</Text>
              </Badge>
            )}
            {deezer.connected && (
              <Badge variant="outline" className="gap-1.5 border-purple-ring bg-purple-subtle px-3 py-1.5">
                <DeezerLogo className="h-3.5 w-3.5 text-purple-vivid" />
                <Text className="text-xs font-medium">Deezer</Text>
              </Badge>
            )}
          </Stack>

          {/* Universal link converter — compact utility placement */}
          <Stack className="mb-4">
            <LinkConverter showHistory={false} compact />
          </Stack>

          {/* Connection Cards (collapsed state) */}
          {(!spotifyConnected ||
            !appleConnected ||
            (youtube.configured && !youtube.connected) ||
            (tidal.configured && !tidal.connected) ||
            (deezer.configured && !deezer.connected)) && (
            <Stack className="mb-4">
              <ServiceConnect onConnectionChange={handleConnectionChange} />
            </Stack>
          )}

          {/* Conversion Progress/Result */}
          {(isConverting || conversionResult) && conversionPlaylist && (
            <Stack as="section" className="mb-6">
              <Stack direction="horizontal" align="center" justify="between" className="mb-1.5">
                <Heading level={2} className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {isConverting ? "Converting playlist" : "Conversion complete"}
                </Heading>
                {conversionResult && (
                  <Button variant="ghost" size="sm" onClick={clearConversion}>
                    Dismiss
                  </Button>
                )}
              </Stack>
              <Stack className="space-y-2">
                <ConversionProgress
                  isConverting={isConverting}
                  playlistName={conversionPlaylist.name}
                  sourceService={conversionPlaylist.source}
                  targetService={conversionPlaylist.target}
                  progress={conversionProgress || undefined}
                  currentTrack={currentTrack || undefined}
                  recentTracks={recentTracks}
                  result={conversionResult ? {
                    success: conversionResult.success,
                    stats: conversionResult.stats,
                    newPlaylistId: conversionResult.newPlaylistId,
                  } : undefined}
                />
                {conversionResult?.success &&
                  conversionResult.matches.length > 0 &&
                  (conversionPlaylist.target === "spotify" ||
                    conversionPlaylist.target === "apple") && (
                  <TrackMatchReport
                    matches={conversionResult.matches}
                    targetService={conversionPlaylist.target}
                    playlistId={conversionResult.newPlaylistId}
                    appleUserToken={appleUserToken || sessionStorage.getItem("appleUserToken") || undefined}
                  />
                )}
              </Stack>
            </Stack>
          )}

          {/* Playlists */}
          {(spotifyConnected || appleConnected) && (
            <VStack gap={3}>
              <Heading level={1} className="font-display text-xl font-semibold tracking-tight">Your library</Heading>
              <Stack
                direction="horizontal"
                align="center"
                justify="between"
                className="sticky top-14 z-20 mt-1 -mx-1 gap-2 border-b border-border bg-body/90 px-1 backdrop-blur"
              >
                <TabList
                  value={activeTab}
                  onChange={(value) => setActiveTab(value as "spotify" | "apple")}
                  size="sm"
                  hasDivider
                >
                  {spotifyConnected && (
                    <Tab
                      value="spotify"
                      label="Spotify"
                      icon={<SpotifyLogo className="h-4 w-4" />}
                      endContent={<AstryxBadge variant="green" label={spotifyPlaylists.length} />}
                    />
                  )}
                  {appleConnected && (
                    <Tab
                      value="apple"
                      label="Apple Music"
                      icon={<AppleLogo className="h-4 w-4" />}
                      endContent={<AstryxBadge variant="red" label={applePlaylists.length} />}
                    />
                  )}
                </TabList>
                <Stack direction="horizontal" align="center" className="gap-1.5">
                  <Tooltip>
                    <TooltipTrigger
                      onClick={() => activeTab === "spotify" ? loadSpotifyPlaylists() : loadApplePlaylists()}
                      disabled={activeTab === "spotify" ? loadingSpotify : loadingApple}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-sm font-medium text-secondary transition-colors hover:bg-accent-muted hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-bg disabled:pointer-events-none disabled:opacity-50 shrink-0"
                    >
                      <IconRefresh
                        size={14}
                        className={activeTab === "spotify" ? (loadingSpotify ? "animate-spin" : "") : (loadingApple ? "animate-spin" : "")}
                      />
                    </TooltipTrigger>
                    <TooltipContent>Refresh playlists</TooltipContent>
                  </Tooltip>
                  <TextInput
                      label="Search playlists"
                      isLabelHidden
                      placeholder="Search…"
                      value={searchQuery}
                      onChange={setSearchQuery}
                      startIcon={<IconSearch size={14} />}
                      hasClear
                      size="sm"
                      width={176}
                    />
                </Stack>
              </Stack>

              {/* Spotify Playlists */}
              {activeTab === "spotify" && (
                <Stack className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-5">
                      {loadingSpotify ? (
                        <PlaylistSkeletonList count={6} />
                      ) : (() => {
                        const normalizedQuery = normalizeForSearch(searchQuery);
                        const filtered = spotifyPlaylists.filter(p => 
                          normalizeForSearch(p.name).includes(normalizedQuery) ||
                          (p.description && normalizeForSearch(p.description).includes(normalizedQuery))
                        );
                        return filtered.length > 0 ? (
                          filtered.map((playlist) => (
                            <PlaylistCard
                              key={playlist.id}
                              playlist={playlist}
                              source="spotify"
                              targets={[
                                {
                                  service: "apple",
                                  disabled: isConverting || !appleConnected,
                                  disabledReason: appleConnected ? undefined : "Connect Apple Music first",
                                },
                                ...(tidal.configured
                                  ? [{
                                      service: "tidal" as const,
                                      disabled: isConverting || !tidal.connected,
                                      disabledReason: tidal.connected ? undefined : "Connect TIDAL first",
                                    }]
                                  : []),
                                ...(youtube.configured
                                  ? [{
                                      service: "youtube" as const,
                                      disabled: isConverting || !youtube.connected,
                                      disabledReason: youtube.connected ? undefined : "Connect YouTube first",
                                    }]
                                  : []),
                                ...(deezer.configured
                                  ? [{
                                      service: "deezer" as const,
                                      disabled: isConverting || !deezer.connected,
                                      disabledReason: deezer.connected ? undefined : "Connect Deezer (advanced) first",
                                    }]
                                  : []),
                              ]}
                              onConvert={handleConvert}
                              onShare={(p) => handleShare(p, "spotify")}
                              shareDisabled={isConverting}
                            />
                          ))
                        ) : (
                          <Stack className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                            <IconMusic size={28} className="mb-2.5 text-secondary/50" />
                            <Text as="p" className="text-sm text-secondary">
                              {searchQuery ? "No playlists match your search" : "No playlists found"}
                            </Text>
                          </Stack>
                        );
                      })()}
                </Stack>
              )}

              {/* Apple Music Playlists */}
              {activeTab === "apple" && (
                <Stack className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-5">
                      {loadingApple ? (
                        <PlaylistSkeletonList count={6} />
                      ) : (() => {
                        const normalizedQuery = normalizeForSearch(searchQuery);
                        const filtered = applePlaylists.filter(p => 
                          normalizeForSearch(p.attributes.name).includes(normalizedQuery) ||
                          (p.attributes.description?.standard && normalizeForSearch(p.attributes.description.standard).includes(normalizedQuery))
                        );
                        return filtered.length > 0 ? (
                          filtered.map((playlist) => (
                            <PlaylistCard
                              key={playlist.id}
                              playlist={playlist}
                              source="apple"
                              targets={[
                                {
                                  service: "spotify",
                                  disabled: isConverting || !spotifyConnected,
                                  disabledReason: spotifyConnected ? undefined : "Connect Spotify first",
                                },
                                ...(tidal.configured
                                  ? [{
                                      service: "tidal" as const,
                                      disabled: isConverting || !tidal.connected,
                                      disabledReason: tidal.connected ? undefined : "Connect TIDAL first",
                                    }]
                                  : []),
                                ...(youtube.configured
                                  ? [{
                                      service: "youtube" as const,
                                      disabled: isConverting || !youtube.connected,
                                      disabledReason: youtube.connected ? undefined : "Connect YouTube first",
                                    }]
                                  : []),
                                ...(deezer.configured
                                  ? [{
                                      service: "deezer" as const,
                                      disabled: isConverting || !deezer.connected,
                                      disabledReason: deezer.connected ? undefined : "Connect Deezer (advanced) first",
                                    }]
                                  : []),
                              ]}
                              onConvert={handleConvert}
                              onShare={(p) => handleShare(p, "apple")}
                              shareDisabled={isConverting}
                            />
                          ))
                        ) : (
                          <Stack className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                            <IconMusic size={28} className="mb-2.5 text-secondary/50" />
                            <Text as="p" className="text-sm text-secondary">
                              {searchQuery ? "No playlists match your search" : "No playlists found"}
                            </Text>
                          </Stack>
                        );
                      })()}
                </Stack>
              )}
            </VStack>
          )}

        </Stack>
      </Stack>

      {/* Share Dialog */}
      {sharingPlaylist && (
        <ShareDialog
          playlist={sharingPlaylist}
          source={sharingSource}
          appleUserToken={appleUserToken}
          onClose={() => setSharingPlaylist(null)}
        />
      )}
    </TooltipProvider>
  );
}
