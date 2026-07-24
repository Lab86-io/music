"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Heading } from "@astryxdesign/core/Heading";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { toast } from "@/lib/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversionProgress } from "@/components/conversion-progress";
import { TrackMatchReport } from "@/components/track-match-report";
import { 
  IconMusic, 
  IconLoader2, 
  IconX,
  IconShare
} from "@tabler/icons-react";
import {
  SpotifyLogo,
  AppleLogo,
  YouTubeMusicLogo,
  TidalLogo,
  DeezerLogo,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { DeezerConnectDialog } from "@/components/deezer-connect-dialog";

interface SharedPlaylist {
  id: string;
  playlistName: string;
  playlistImage?: string;
  sourceService: string;
  trackCount: number;
  tracks: { 
    name: string; 
    artist: string; 
    album: string;
    albumArt?: string;
    isrc?: string;
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
  const [externalImporting, setExternalImporting] = useState<
    "youtube" | "tidal" | "deezer" | null
  >(null);
  const [deezerDialogOpen, setDeezerDialogOpen] = useState(false);
  const [importTarget, setImportTarget] = useState<"spotify" | "apple" | null>(null);
  
  // Streaming progress states
  const [conversionProgress, setConversionProgress] = useState<{ current: number; total: number } | undefined>();
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | undefined>();
  const [recentTracks, setRecentTracks] = useState<CurrentTrack[]>([]);
  const [conversionResult, setConversionResult] = useState<ConversionResult | undefined>();

  // YouTube availability (button only appears once OAuth is configured server-side)
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

  const handleExternalImport = async (targetService: "youtube" | "tidal" | "deezer") => {
    if (!sharedPlaylist || externalImporting) return;
    const serviceName =
      targetService === "youtube"
        ? "YouTube Music"
        : targetService === "tidal"
          ? "TIDAL"
          : "Deezer";
    setExternalImporting(targetService);
    try {
      const response = await fetch(`/api/${targetService}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sharedPlaylist.playlistName,
          tracks: sharedPlaylist.tracks.map((t) => ({
            name: t.name,
            artist: t.artist,
            isrc: t.isrc,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        toast.error(data.error || `${serviceName} import failed`);
        return;
      }
      const summary = `Added ${data.added}/${data.total} tracks to ${serviceName}`;
      if (data.quotaExceeded) {
        toast.warning(`${summary}. Daily YouTube quota ran out; try the rest tomorrow.`);
      } else if (data.warning) {
        toast.warning(`${summary} (${data.warning})`);
      } else {
        toast.success(summary);
      }
      window.open(data.playlistUrl, "_blank");
    } catch {
      toast.error(`${serviceName} import failed`);
    } finally {
      setExternalImporting(null);
    }
  };

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
          app: { name: "Lab86 Convert", build: "1.0.0" },
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
    // Pass current URL as return URL so we come back here after auth
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `/api/spotify/auth?returnUrl=${returnUrl}`;
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
      <Stack direction="horizontal" className="min-h-screen flex items-center justify-center bg-body">
        <IconLoader2 className="h-8 w-8 animate-spin text-accent" />
      </Stack>
    );
  }

  if (notFound || !sharedPlaylist) {
    return (
      <Stack direction="horizontal" className="min-h-screen flex items-center justify-center bg-body">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="flex flex-col items-center py-12">
            <IconX className="h-12 w-12 text-error mb-4" />
            <Heading level={2} className="text-xl font-semibold mb-2">Link Not Found</Heading>
            <Text as="p" className="text-secondary text-center mb-6">
              This share link doesn&apos;t exist or has already been claimed.
            </Text>
            <Button onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  // Show conversion progress during import
  if (importing || conversionResult) {
    return (
      <Stack className="min-h-screen bg-body">
        <Stack className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
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
            <Stack direction="horizontal" justify="center">
              <Button onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </Stack>
          )}
        </Stack>
      </Stack>
    );
  }

  const spotifyConnected = !!spotifySession;

  return (
    <Stack className="min-h-screen bg-body">
      <Stack className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Shared Playlist Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <Stack direction="horizontal" align="start" className="gap-4">
              {sharedPlaylist.playlistImage ? (
                <Image
                  src={sharedPlaylist.playlistImage} 
                  alt={sharedPlaylist.playlistName}
                  width={64}
                  height={64}
                  unoptimized
                  className="h-16 w-16 rounded-lg object-cover shrink-0"
                />
              ) : (
                <Stack direction="horizontal" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <IconMusic className="h-8 w-8 text-secondary" />
                </Stack>
              )}
              <Stack className="flex-1 min-w-0">
                <Stack direction="horizontal" align="center" className="mb-1 gap-2">
                  <IconShare className="h-4 w-4 text-secondary" />
                  <Text className="text-sm text-secondary">Shared Playlist</Text>
                </Stack>
                <CardTitle className="text-xl truncate">{sharedPlaylist.playlistName}</CardTitle>
                <Stack direction="horizontal" align="center" className="mt-2 gap-2">
                  <Badge variant="secondary" className="gap-1">
                    {sharedPlaylist.sourceService === "spotify" ? (
                      <SpotifyLogo className="h-3 w-3" />
                    ) : sharedPlaylist.sourceService === "deezer" ? (
                      <DeezerLogo className="h-3 w-3" />
                    ) : sharedPlaylist.sourceService === "tidal" ? (
                      <TidalLogo className="h-3 w-3" />
                    ) : sharedPlaylist.sourceService === "youtube" ? (
                      <YouTubeMusicLogo className="h-3 w-3" />
                    ) : (
                      <AppleLogo className="h-3 w-3" />
                    )}
                    From{" "}
                    {sharedPlaylist.sourceService === "spotify"
                      ? "Spotify"
                      : sharedPlaylist.sourceService === "deezer"
                        ? "Deezer"
                        : sharedPlaylist.sourceService === "tidal"
                          ? "TIDAL"
                          : sharedPlaylist.sourceService === "youtube"
                            ? "YouTube Music"
                            : "Apple Music"}
                  </Badge>
                  <Badge variant="outline">
                    {sharedPlaylist.trackCount} tracks
                  </Badge>
                </Stack>
                {sharedPlaylist.sourceService === "youtube" && (
                  <Text as="p" className="mt-2 text-xs text-secondary">
                    YouTube playlists have no track IDs, so tracks are matched by title
                    and accuracy may vary.
                  </Text>
                )}
              </Stack>
            </Stack>
          </CardHeader>
          <CardContent>
            <Heading level={3} className="text-sm font-medium mb-3">Track Preview</Heading>
            <ScrollArea className="h-80 rounded-lg border border-border">
              <Stack className="p-2 space-y-1">
                {sharedPlaylist.tracks.map((track, index) => (
                  <Stack
                    key={index}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                  >
                    <Text className="text-xs text-secondary w-6 text-right tabular-nums">
                      {index + 1}
                    </Text>
                    {track.albumArt ? (
                      <Image
                        src={track.albumArt} 
                        alt={track.album}
                        width={40}
                        height={40}
                        unoptimized
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <Stack direction="horizontal" className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                        <IconMusic className="h-5 w-5 text-secondary" />
                      </Stack>
                    )}
                    <Stack className="flex-1 min-w-0">
                      <Text as="p" className="text-sm font-medium truncate">{track.name}</Text>
                      <Text as="p" className="text-xs text-secondary truncate">
                        {track.artist} • {track.album}
                      </Text>
                    </Stack>
                    {track.duration_ms && (
                      <Text className="text-xs text-secondary tabular-nums">
                        {formatDuration(track.duration_ms)}
                      </Text>
                    )}
                  </Stack>
                ))}
              </Stack>
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
            <Stack direction="horizontal" align="center" className="gap-3">
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
                    "flex-1 gap-2 bg-green-ring text-on-dark hover:opacity-90",
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
            </Stack>

            {/* Apple Music Button */}
            <Stack direction="horizontal" align="center" className="gap-3">
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
                    "flex-1 gap-2 bg-red-ring text-on-dark hover:opacity-90",
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
            </Stack>

            {/* TIDAL Button (official OAuth) */}
            {tidal.configured && (
              <Stack direction="horizontal" align="center" className="gap-3">
                {tidal.connected ? (
                  <Button
                    onClick={() => handleExternalImport("tidal")}
                    disabled={Boolean(externalImporting) || importing}
                    className="flex-1 gap-2 bg-gray-ring text-on-dark ring-1 ring-border"
                  >
                    {externalImporting === "tidal" ? (
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <TidalLogo className="h-4 w-4" />
                    )}
                    {externalImporting === "tidal" ? "Importing..." : "Import to TIDAL"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      const returnTo = encodeURIComponent(window.location.pathname);
                      window.location.href = `/api/tidal/auth?returnTo=${returnTo}`;
                    }}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    <TidalLogo className="h-4 w-4" />
                    Connect TIDAL to Import
                  </Button>
                )}
              </Stack>
            )}

            {/* YouTube Music Button (shown when OAuth is configured) */}
            {youtube.configured && (
              <Stack direction="horizontal" align="center" className="gap-3">
                {youtube.connected ? (
                  <Button
                    onClick={() => handleExternalImport("youtube")}
                    disabled={Boolean(externalImporting) || importing}
                    className="flex-1 gap-2 bg-red-ring text-on-dark hover:opacity-90"
                  >
                    {externalImporting === "youtube" ? (
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <YouTubeMusicLogo className="h-4 w-4" />
                    )}
                    {externalImporting === "youtube" ? "Importing..." : "Import to YouTube Music"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      const returnTo = encodeURIComponent(window.location.pathname);
                      window.location.href = `/api/youtube/auth?returnTo=${returnTo}`;
                    }}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    <YouTubeMusicLogo className="h-4 w-4" />
                    Connect YouTube to Import
                  </Button>
                )}
              </Stack>
            )}

            {/* Deezer Button (advanced ARL connection) */}
            {deezer.configured && (
              <Stack direction="horizontal" align="center" className="gap-3">
                {deezer.connected ? (
                  <Button
                    onClick={() => handleExternalImport("deezer")}
                    disabled={Boolean(externalImporting) || importing}
                    className="flex-1 gap-2 bg-purple-ring text-on-dark hover:opacity-90"
                  >
                    {externalImporting === "deezer" ? (
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <DeezerLogo className="h-4 w-4" />
                    )}
                    {externalImporting === "deezer" ? "Importing..." : "Import to Deezer"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setDeezerDialogOpen(true)}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    <DeezerLogo className="h-4 w-4 text-purple-vivid" />
                    Connect Deezer (Advanced)
                  </Button>
                )}
              </Stack>
            )}

            <Text as="p" className="text-xs text-secondary text-center pt-2">
              This share link expires after 48 hours.
            </Text>
          </CardContent>
        </Card>
      </Stack>
      <DeezerConnectDialog
        open={deezerDialogOpen}
        onOpenChange={setDeezerDialogOpen}
        onConnected={(userName) => {
          setDeezer((current) => ({ ...current, connected: true }));
          toast.success(userName ? `Connected to Deezer as ${userName}` : "Connected to Deezer");
        }}
      />
    </Stack>
  );
}
