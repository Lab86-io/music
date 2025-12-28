"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversionProgress } from "@/components/conversion-progress";
import { TrackMatchReport } from "@/components/track-match-report";
import { 
  IconMusic, 
  IconLoader2, 
  IconCheck, 
  IconX,
  IconPlayerPlay,
  IconShare
} from "@tabler/icons-react";
import { SpotifyLogo, AppleLogo } from "@/components/icons";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";

interface SharedPlaylist {
  id: string;
  playlistName: string;
  playlistImage?: string;
  sourceService: "spotify" | "apple";
  trackCount: number;
  tracks: { 
    name: string; 
    artist: string; 
    album: string;
    albumArt?: string;
    duration_ms?: number;
  }[];
  createdAt: string;
}

function formatDuration(ms?: number): string {
  if (!ms) return "";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

interface MusicKitInstance {
  authorize: () => Promise<string>;
  unauthorize: () => Promise<void>;
  isAuthorized: boolean;
}

declare global {
  interface Window {
    MusicKit: {
      configure: (config: { developerToken: string; app: { name: string; build: string } }) => Promise<MusicKitInstance>;
      getInstance: () => MusicKitInstance;
    };
  }
}

interface SpotifySession {
  user: { id: string; name: string; email: string; image?: string };
  accessToken: string;
}

interface CurrentTrack {
  name: string;
  artist: string;
  status: "matched" | "not_found" | "low_confidence";
  matchedTo?: { name: string; artist: string };
  confidence?: number;
}

interface TrackMatchData {
  sourceTrack: { name: string; artist: string };
  targetTrack: { name: string; artist: string } | null;
  matchConfidence: number;
  matchMethod: "isrc" | "fuzzy" | "none";
}

interface ConversionResult {
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
  matches: TrackMatchData[];
}

export default function SharePageClient() {
  const params = useParams();
  const router = useRouter();
  const shareId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sharedPlaylist, setSharedPlaylist] = useState<SharedPlaylist | null>(null);

  // Auth states
  const [spotifySession, setSpotifySession] = useState<SpotifySession | null>(null);
  const [spotifyLoading, setSpotifyLoading] = useState(true);
  const [appleConnected, setAppleConnected] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleUserToken, setAppleUserToken] = useState<string | null>(null);
  const [musicKit, setMusicKit] = useState<MusicKitInstance | null>(null);

  // Import states
  const [importing, setImporting] = useState(false);
  const [importTarget, setImportTarget] = useState<"spotify" | "apple" | null>(null);
  
  // Streaming progress states
  const [conversionProgress, setConversionProgress] = useState<{ current: number; total: number } | undefined>();
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | undefined>();
  const [recentTracks, setRecentTracks] = useState<CurrentTrack[]>([]);
  const [conversionResult, setConversionResult] = useState<ConversionResult | undefined>();

  // Fetch shared playlist data
  useEffect(() => {
    const fetchSharedPlaylist = async () => {
      try {
        const response = await fetch(`/api/share/${shareId}`);
        const data = await response.json();

        if (!data.success) {
          setNotFound(true);
          return;
        }

        setSharedPlaylist(data.data);
      } catch (error) {
        console.error("Failed to fetch shared playlist:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSharedPlaylist();
  }, [shareId]);

  // Fetch Spotify session
  useEffect(() => {
    const fetchSpotifySession = async () => {
      try {
        const response = await fetch("/api/spotify/session");
        const data = await response.json();
        if (data.session) {
          setSpotifySession(data.session);
        }
      } catch (error) {
        console.error("Failed to fetch Spotify session:", error);
      } finally {
        setSpotifyLoading(false);
      }
    };
    fetchSpotifySession();
  }, []);

  // Initialize MusicKit
  useEffect(() => {
    const initMusicKit = async () => {
      if (typeof window === "undefined" || !window.MusicKit) return;

      try {
        const response = await fetch("/api/apple/token");
        const data = await response.json();
        
        if (!data.success) return;

        const mk = await window.MusicKit.configure({
          developerToken: data.data.token,
          app: { name: "Playlist Converter", build: "1.0.0" },
        });
        
        setMusicKit(mk);
        if (mk.isAuthorized) {
          setAppleConnected(true);
        }
      } catch (error) {
        console.error("Failed to initialize MusicKit:", error);
      }
    };

    const checkMusicKit = () => {
      if (window.MusicKit) {
        initMusicKit();
      } else {
        document.addEventListener("musickitloaded", initMusicKit);
      }
    };

    checkMusicKit();
    return () => {
      document.removeEventListener("musickitloaded", initMusicKit);
    };
  }, []);

  const connectSpotify = () => {
    // Save current URL to redirect back after auth
    sessionStorage.setItem("shareRedirect", window.location.href);
    window.location.href = "/api/spotify/auth";
  };

  const connectApple = useCallback(async () => {
    if (!musicKit) {
      toast.error("Apple Music is not available");
      return;
    }

    setAppleLoading(true);
    try {
      const token = await musicKit.authorize();
      setAppleUserToken(token);
      setAppleConnected(true);
      sessionStorage.setItem("appleUserToken", token);
      toast.success("Connected to Apple Music!");
    } catch (error) {
      console.error("Apple Music auth error:", error);
      toast.error("Failed to connect to Apple Music");
    } finally {
      setAppleLoading(false);
    }
  }, [musicKit]);

  const handleImport = async (target: "spotify" | "apple") => {
    setImporting(true);
    setImportTarget(target);
    setConversionProgress(undefined);
    setCurrentTrack(undefined);
    setRecentTracks([]);
    setConversionResult(undefined);

    try {
      const response = await fetch(`/api/share/${shareId}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({
          targetService: target,
          appleUserToken: target === "apple" ? (appleUserToken || sessionStorage.getItem("appleUserToken")) : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Import failed");
      }

      // Handle SSE streaming
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response reader");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
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
                  matches: data.matches || [],
                });
                
                if (data.success) {
                  toast.success(`Successfully imported "${sharedPlaylist?.playlistName}"!`);
                } else {
                  toast.error("Import failed. Please try again.");
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
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import playlist");
      setConversionResult(undefined);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !sharedPlaylist) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="flex flex-col items-center py-12">
            <IconX className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Link Not Found</h2>
            <p className="text-muted-foreground text-center mb-6">
              This share link doesn&apos;t exist or has already been claimed.
            </p>
            <Button onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show conversion progress during import
  if (importing || conversionResult) {
    const hasUnmatched = conversionResult?.stats && conversionResult.stats.unmatched > 0;
    
    return (
      <div className="min-h-screen bg-background">
        <Header />

        <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
          <ConversionProgress
            isConverting={importing}
            playlistName={sharedPlaylist.playlistName}
            sourceService={sharedPlaylist.sourceService}
            targetService={importTarget || "spotify"}
            progress={conversionProgress}
            currentTrack={currentTrack}
            recentTracks={recentTracks}
            result={conversionResult}
          />
          
          {/* Track Match Report for manual matching */}
          {conversionResult?.success && conversionResult.matches && conversionResult.matches.length > 0 && (
            <TrackMatchReport
              matches={conversionResult.matches}
              targetService={importTarget || "spotify"}
              playlistId={conversionResult.newPlaylistId}
              appleUserToken={importTarget === "apple" ? (appleUserToken || sessionStorage.getItem("appleUserToken") || undefined) : undefined}
            />
          )}
          
          {conversionResult?.success && (
            <div className="flex justify-center">
              <Button onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          )}
        </main>
      </div>
    );
  }

  const spotifyConnected = !!spotifySession;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Shared Playlist Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              {sharedPlaylist.playlistImage ? (
                <img 
                  src={sharedPlaylist.playlistImage} 
                  alt={sharedPlaylist.playlistName}
                  className="h-16 w-16 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <IconMusic className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <IconShare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Shared Playlist</span>
                </div>
                <CardTitle className="text-xl truncate">{sharedPlaylist.playlistName}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="gap-1">
                    {sharedPlaylist.sourceService === "spotify" ? (
                      <SpotifyLogo className="h-3 w-3" />
                    ) : (
                      <AppleLogo className="h-3 w-3" />
                    )}
                    From {sharedPlaylist.sourceService === "spotify" ? "Spotify" : "Apple Music"}
                  </Badge>
                  <Badge variant="outline">
                    {sharedPlaylist.trackCount} tracks
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-sm font-medium mb-3">Track Preview</h3>
            <ScrollArea className="h-80 rounded-lg border border-border">
              <div className="p-2 space-y-1">
                {sharedPlaylist.tracks.map((track, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                  >
                    <span className="text-xs text-muted-foreground w-6 text-right tabular-nums">
                      {index + 1}
                    </span>
                    {track.albumArt ? (
                      <img 
                        src={track.albumArt} 
                        alt={track.album}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <IconMusic className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{track.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {track.artist} • {track.album}
                      </p>
                    </div>
                    {track.duration_ms && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatDuration(track.duration_ms)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Import Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Import to Your Library</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Spotify Button */}
            <div className="flex items-center gap-3">
              {spotifyLoading ? (
                <Button disabled className="flex-1 gap-2">
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                  Checking Spotify...
                </Button>
              ) : spotifyConnected ? (
                <Button
                  onClick={() => handleImport("spotify")}
                  disabled={importing}
                  className={cn(
                    "flex-1 gap-2 bg-[#1DB954] hover:bg-[#1aa34a] text-white",
                  )}
                >
                  {importing && importTarget === "spotify" ? (
                    <IconLoader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SpotifyLogo className="h-4 w-4" />
                  )}
                  {importing && importTarget === "spotify" ? "Importing..." : "Import to Spotify"}
                </Button>
              ) : (
                <Button
                  onClick={connectSpotify}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <SpotifyLogo className="h-4 w-4" />
                  Connect Spotify to Import
                </Button>
              )}
            </div>

            {/* Apple Music Button */}
            <div className="flex items-center gap-3">
              {appleLoading ? (
                <Button disabled className="flex-1 gap-2">
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                  Connecting Apple Music...
                </Button>
              ) : appleConnected ? (
                <Button
                  onClick={() => handleImport("apple")}
                  disabled={importing}
                  className={cn(
                    "flex-1 gap-2 bg-[#FC3C44] hover:bg-[#e03540] text-white",
                  )}
                >
                  {importing && importTarget === "apple" ? (
                    <IconLoader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <AppleLogo className="h-4 w-4" />
                  )}
                  {importing && importTarget === "apple" ? "Importing..." : "Import to Apple Music"}
                </Button>
              ) : (
                <Button
                  onClick={connectApple}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <AppleLogo className="h-4 w-4" />
                  Connect Apple Music to Import
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2">
              This share link expires after 48 hours.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
