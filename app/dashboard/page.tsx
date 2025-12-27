"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { ServiceConnect } from "@/components/service-connect";
import { PlaylistCard } from "@/components/playlist-card";
import { PlaylistSkeletonList } from "@/components/playlist-skeleton";
import { ConversionProgress } from "@/components/conversion-progress";
import { TrackMatchReport } from "@/components/track-match-report";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  IconMusic, 
  IconRefresh, 
  IconLoader2,
  IconArrowLeft,
  IconArrowsExchange
} from "@tabler/icons-react";
import { SpotifyLogo, AppleLogo } from "@/components/icons";
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

  // Active tab
  const [activeTab, setActiveTab] = useState<string>("spotify");

  const spotifyConnected = !!spotifySession;

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
    toast.info(`Starting conversion of "${playlistName}"...`);

    try {
      const token = appleUserToken || sessionStorage.getItem("appleUserToken");
      
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceService,
          targetService,
          playlistId,
          playlistName,
          appleUserToken: token,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setConversionResult({
          success: true,
          newPlaylistId: data.data.newPlaylistId,
          stats: data.data.stats,
          matches: data.data.matches,
        });
        toast.success(`Successfully converted "${playlistName}"!`);

        // Reload target playlists
        if (targetService === "spotify") {
          loadSpotifyPlaylists();
        } else {
          loadApplePlaylists();
        }
      } else {
        setConversionResult({
          success: false,
          newPlaylistId: "",
          stats: { total: 0, matched: 0, isrcMatches: 0, fuzzyMatches: 0, unmatched: 0, averageConfidence: 0 },
          matches: [],
        });
        toast.error("Conversion failed. Please try again.");
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
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Tooltip>
                <TooltipTrigger
                  onClick={() => router.push("/")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <IconArrowLeft size={20} />
                </TooltipTrigger>
                <TooltipContent>Back to home</TooltipContent>
              </Tooltip>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground">
                  Convert your playlists between services
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {spotifyConnected && (
                <Badge variant="outline" className="gap-1.5 py-1.5">
                  <SpotifyLogo className="h-3.5 w-3.5 text-[#1DB954]" />
                  Spotify
                </Badge>
              )}
              {appleConnected && (
                <Badge variant="outline" className="gap-1.5 py-1.5">
                  <AppleLogo className="h-3.5 w-3.5 text-[#FC3C44]" />
                  Apple Music
                </Badge>
              )}
              <ThemeToggle />
            </div>
          </div>

          {/* Connection Cards (collapsed state) */}
          {(!spotifyConnected || !appleConnected) && (
            <div className="mb-8">
              <ServiceConnect onConnectionChange={handleConnectionChange} />
            </div>
          )}

          {/* Conversion Progress/Result */}
          {(isConverting || conversionResult) && conversionPlaylist && (
            <div className="mb-8 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Conversion Status</h2>
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
                result={conversionResult ? {
                  success: conversionResult.success,
                  stats: conversionResult.stats,
                  newPlaylistId: conversionResult.newPlaylistId,
                } : undefined}
              />
              {conversionResult?.success && conversionResult.matches.length > 0 && (
                <TrackMatchReport matches={conversionResult.matches} />
              )}
            </div>
          )}

          {/* Playlists */}
          {spotifyConnected && appleConnected && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="spotify" className="gap-2">
                    <SpotifyLogo className="h-4 w-4" />
                    Spotify
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {spotifyPlaylists.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="apple" className="gap-2">
                    <AppleLogo className="h-4 w-4" />
                    Apple Music
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {applePlaylists.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
                <Tooltip>
                  <TooltipTrigger
                    onClick={() => activeTab === "spotify" ? loadSpotifyPlaylists() : loadApplePlaylists()}
                    disabled={activeTab === "spotify" ? loadingSpotify : loadingApple}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    <IconRefresh
                      size={18}
                      className={activeTab === "spotify" ? (loadingSpotify ? "animate-spin" : "") : (loadingApple ? "animate-spin" : "")}
                    />
                  </TooltipTrigger>
                  <TooltipContent>Refresh playlists</TooltipContent>
                </Tooltip>
              </div>

              {/* Spotify Playlists */}
              <TabsContent value="spotify">
                <ScrollArea className="h-[calc(100vh-350px)]">
                  <div className="space-y-3 pr-4">
                    {loadingSpotify ? (
                      <PlaylistSkeletonList count={5} />
                    ) : spotifyPlaylists.length > 0 ? (
                      spotifyPlaylists.map((playlist) => (
                        <PlaylistCard
                          key={playlist.id}
                          playlist={playlist}
                          source="spotify"
                          targetService="apple"
                          onConvert={handleConvert}
                          disabled={isConverting || !appleConnected}
                        />
                      ))
                    ) : (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <IconMusic size={48} className="mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">No playlists found</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Apple Music Playlists */}
              <TabsContent value="apple">
                <ScrollArea className="h-[calc(100vh-350px)]">
                  <div className="space-y-3 pr-4">
                    {loadingApple ? (
                      <PlaylistSkeletonList count={5} />
                    ) : applePlaylists.length > 0 ? (
                      applePlaylists.map((playlist) => (
                        <PlaylistCard
                          key={playlist.id}
                          playlist={playlist}
                          source="apple"
                          targetService="spotify"
                          onConvert={handleConvert}
                          disabled={isConverting || !spotifyConnected}
                        />
                      ))
                    ) : (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <IconMusic size={48} className="mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">No playlists found</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}

          {/* Not both connected message */}
          {(!spotifyConnected || !appleConnected) && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconArrowsExchange size={24} />
                  Connect Both Services
                </CardTitle>
                <CardDescription>
                  To convert playlists, you need to connect both your Spotify and Apple Music accounts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-8 py-8">
                  <div className={`flex flex-col items-center gap-2 ${spotifyConnected ? "opacity-100" : "opacity-40"}`}>
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
                      spotifyConnected ? "bg-[#1DB954]" : "bg-muted"
                    } text-white`}>
                      <SpotifyLogo className="h-8 w-8" />
                    </div>
                    <span className="text-sm font-medium">
                      {spotifyConnected ? "Connected" : "Not connected"}
                    </span>
                  </div>
                  <IconArrowsExchange size={24} className="text-muted-foreground" />
                  <div className={`flex flex-col items-center gap-2 ${appleConnected ? "opacity-100" : "opacity-40"}`}>
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
                      appleConnected 
                        ? "bg-gradient-to-br from-[#FC3C44] to-[#F94C57]" 
                        : "bg-muted"
                    } text-white`}>
                      <AppleLogo className="h-8 w-8" />
                    </div>
                    <span className="text-sm font-medium">
                      {appleConnected ? "Connected" : "Not connected"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
