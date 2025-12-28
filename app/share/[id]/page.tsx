"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  IconMusic, 
  IconLoader2, 
  IconCheck, 
  IconX,
  IconPlayerPlay,
  IconShare
} from "@tabler/icons-react";
import { SpotifyLogo, AppleLogo, MusicNote } from "@/components/icons";
import { cn } from "@/lib/utils";

interface SharedPlaylist {
  id: string;
  playlistName: string;
  sourceService: "spotify" | "apple";
  trackCount: number;
  tracks: { name: string; artist: string; album: string }[];
  createdAt: string;
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

export default function SharePage() {
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
  const [importResult, setImportResult] = useState<{
    success: boolean;
    matchedTracks: number;
    totalTracks: number;
  } | null>(null);

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

    try {
      const response = await fetch(`/api/share/${shareId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetService: target,
          appleUserToken: target === "apple" ? (appleUserToken || sessionStorage.getItem("appleUserToken")) : undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Import failed");
      }

      setImportResult({
        success: true,
        matchedTracks: data.data.matchedTracks,
        totalTracks: data.data.totalTracks,
      });

      toast.success(`Playlist imported! ${data.data.matchedTracks}/${data.data.totalTracks} tracks matched.`);
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import playlist");
      setImportResult(null);
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

  if (importResult?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
              <IconCheck className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Playlist Imported!</h2>
            <p className="text-muted-foreground text-center mb-2">
              <span className="font-medium text-foreground">{sharedPlaylist.playlistName}</span>
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {importResult.matchedTracks} of {importResult.totalTracks} tracks added to your {importTarget === "spotify" ? "Spotify" : "Apple Music"} library
            </p>
            <Button onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const spotifyConnected = !!spotifySession;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MusicNote className="h-5 w-5" />
          </div>
          <span className="font-semibold">Playlist Converter</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Shared Playlist Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <IconMusic className="h-8 w-8 text-muted-foreground" />
              </div>
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
            <ScrollArea className="h-64 rounded-lg border border-border">
              <div className="p-2 space-y-1">
                {sharedPlaylist.tracks.map((track, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                  >
                    <span className="text-xs text-muted-foreground w-6 text-right tabular-nums">
                      {index + 1}
                    </span>
                    <IconPlayerPlay className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{track.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
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
              This share link can only be used once. After importing, it will expire.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

