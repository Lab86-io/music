"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { ServiceConnect } from "@/components/service-connect";
import { PlaylistCard } from "@/components/playlist-card";
import { PlaylistSkeletonList } from "@/components/playlist-skeleton";
import { ConversionProgress } from "@/components/conversion-progress";
import { TrackMatchReport } from "@/components/track-match-report";
import { ShareDialog } from "@/components/share-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  IconMusic, 
  IconRefresh, 
  IconLoader2,
  IconArrowsExchange,
  IconSearch,
  IconX
} from "@tabler/icons-react";
import { SpotifyLogo, AppleLogo } from "@/components/icons";
import { Header } from "@/components/header";
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
    target: "spotify" | "apple";
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
  const handleConnectionChange = (service: "spotify" | "apple", connected: boolean, token?: string) => {
    if (service === "apple") {
      setAppleConnected(connected);
      setAppleUserToken(token || null);
      if (connected) {
        toast.success("Connected to Apple Music");
      }
    }
  };

  // Handle playlist sharing
  const handleShare = (playlist: SpotifyPlaylist | AppleMusicPlaylist, source: "spotify" | "apple") => {
    setSharingPlaylist(playlist);
    setSharingSource(source);
  };

  // Handle playlist conversion
  const handleConvert = async (playlist: SpotifyPlaylist | AppleMusicPlaylist) => {
    const isSpotifyPlaylist = "tracks" in playlist && "owner" in playlist;
    const sourceService = isSpotifyPlaylist ? "spotify" : "apple";
    const targetService = isSpotifyPlaylist ? "apple" : "spotify";
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
            const eventType = line.slice(7);
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
      <div className="flex min-h-screen items-center justify-center">
        <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen overflow-hidden bg-background flex flex-col">
        <Header>
          <div className="hidden sm:flex items-center gap-2">
            {spotifyConnected && (
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3 border-[#1DB954]/30 bg-[#1DB954]/10">
                <SpotifyLogo className="h-3.5 w-3.5 text-[#1DB954]" />
                <span className="text-xs font-medium">Spotify</span>
              </Badge>
            )}
            {appleConnected && (
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3 border-[#FC3C44]/30 bg-[#FC3C44]/10">
                <AppleLogo className="h-3.5 w-3.5 text-[#FC3C44]" />
                <span className="text-xs font-medium">Apple Music</span>
              </Badge>
            )}
          </div>
        </Header>
        
        <div className="flex-1 overflow-hidden container mx-auto px-4 py-3 flex flex-col">

          {/* Universal link converter — same bar as the home page */}
          <div className="mb-3">
            <LinkConverter showHistory={false} />
          </div>

          {/* Connection Cards (collapsed state) */}
          {(!spotifyConnected || !appleConnected) && (
            <div className="mb-3">
              <ServiceConnect onConnectionChange={handleConnectionChange} />
            </div>
          )}

          {/* Conversion Progress/Result */}
          {(isConverting || conversionResult) && conversionPlaylist && (
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Conversion Status</h2>
                {conversionResult && (
                  <Button variant="ghost" size="sm" onClick={clearConversion}>
                    Dismiss
                  </Button>
                )}
              </div>
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
              {conversionResult?.success && conversionResult.matches.length > 0 && (
                <TrackMatchReport 
                  matches={conversionResult.matches}
                  targetService={conversionPlaylist.target}
                  playlistId={conversionResult.newPlaylistId}
                  appleUserToken={appleUserToken || sessionStorage.getItem("appleUserToken") || undefined}
                />
              )}
            </div>
          )}

          {/* Playlists */}
          {(spotifyConnected || appleConnected) && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between gap-2 border-b border-border">
                <div className="flex gap-1 shrink-0">
                  {spotifyConnected && (
                    <button
                      onClick={() => setActiveTab("spotify")}
                      className={cn(
                        "relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors",
                        activeTab === "spotify"
                          ? "text-[#1DB954]"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <SpotifyLogo className="h-4 w-4" />
                      <span className="hidden sm:inline">Spotify</span>
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                        activeTab === "spotify"
                          ? "bg-[#1DB954]/15 text-[#1DB954]"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {spotifyPlaylists.length}
                      </span>
                      {activeTab === "spotify" && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1DB954]" />
                      )}
                    </button>
                  )}
                  {appleConnected && (
                    <button
                      onClick={() => setActiveTab("apple")}
                      className={cn(
                        "relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors",
                        activeTab === "apple"
                          ? "text-[#FC3C44]"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <AppleLogo className="h-4 w-4" />
                      <span className="hidden sm:inline">Apple Music</span>
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                        activeTab === "apple"
                          ? "bg-[#FC3C44]/15 text-[#FC3C44]"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {applePlaylists.length}
                      </span>
                      {activeTab === "apple" && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FC3C44]" />
                      )}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Tooltip>
                    <TooltipTrigger
                      onClick={() => activeTab === "spotify" ? loadSpotifyPlaylists() : loadApplePlaylists()}
                      disabled={activeTab === "spotify" ? loadingSpotify : loadingApple}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 shrink-0"
                    >
                      <IconRefresh
                        size={14}
                        className={activeTab === "spotify" ? (loadingSpotify ? "animate-spin" : "") : (loadingApple ? "animate-spin" : "")}
                      />
                    </TooltipTrigger>
                    <TooltipContent>Refresh playlists</TooltipContent>
                  </Tooltip>
                  <div className="relative w-36">
                    <IconSearch size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-7 pr-7 h-7 text-xs"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <IconX size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Spotify Playlists */}
              <TabsContent value="spotify" className="flex-1 min-h-0 mt-2">
                <div className="relative h-full">
                  {/* Top gradient fade */}
                  <div className="pointer-events-none absolute top-0 left-0 right-4 h-6 bg-gradient-to-b from-background to-transparent z-10" />
                  {/* Bottom gradient fade */}
                  <div className="pointer-events-none absolute bottom-0 left-0 right-4 h-12 bg-gradient-to-t from-background to-transparent z-10" />
                  <ScrollArea className="h-full">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-5 pr-4 py-3 pl-1">
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
                              targetService="apple"
                              onConvert={handleConvert}
                              onShare={(p) => handleShare(p, "spotify")}
                              disabled={isConverting || !appleConnected}
                              shareDisabled={isConverting}
                            />
                          ))
                        ) : (
                          <Card className="col-span-full">
                            <CardContent className="flex flex-col items-center justify-center py-8">
                              <IconMusic size={32} className="mb-3 text-muted-foreground" />
                              <p className="text-muted-foreground text-sm">
                                {searchQuery ? "No playlists match your search" : "No playlists found"}
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })()}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              {/* Apple Music Playlists */}
              <TabsContent value="apple" className="flex-1 min-h-0 mt-2">
                <div className="relative h-full">
                  {/* Top gradient fade */}
                  <div className="pointer-events-none absolute top-0 left-0 right-4 h-6 bg-gradient-to-b from-background to-transparent z-10" />
                  {/* Bottom gradient fade */}
                  <div className="pointer-events-none absolute bottom-0 left-0 right-4 h-12 bg-gradient-to-t from-background to-transparent z-10" />
                  <ScrollArea className="h-full">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-5 pr-4 py-3 pl-1">
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
                              targetService="spotify"
                              onConvert={handleConvert}
                              onShare={(p) => handleShare(p, "apple")}
                              disabled={isConverting || !spotifyConnected}
                              shareDisabled={isConverting}
                            />
                          ))
                        ) : (
                          <Card className="col-span-full">
                            <CardContent className="flex flex-col items-center justify-center py-8">
                              <IconMusic size={32} className="mb-3 text-muted-foreground" />
                              <p className="text-muted-foreground text-sm">
                                {searchQuery ? "No playlists match your search" : "No playlists found"}
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })()}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          )}

        </div>
      </div>

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
