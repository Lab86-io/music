"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IconCheck, IconLoader2, IconX, IconMusic } from "@tabler/icons-react";
import { SpotifyLogo, AppleLogo } from "@/components/icons";
import { cn } from "@/lib/utils";

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

interface ServiceConnectProps {
  onConnectionChange?: (service: "spotify" | "apple", connected: boolean, token?: string) => void;
}

export function ServiceConnect({ onConnectionChange }: ServiceConnectProps) {
  const [spotifySession, setSpotifySession] = useState<SpotifySession | null>(null);
  const [spotifyLoading, setSpotifyLoading] = useState(true);
  const [appleConnected, setAppleConnected] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleUserToken, setAppleUserToken] = useState<string | null>(null);
  const [musicKit, setMusicKit] = useState<MusicKitInstance | null>(null);

  const spotifyConnected = !!spotifySession;

  // Fetch Spotify session on mount
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
        
        if (!data.success) {
          console.log("Apple Music not configured");
          return;
        }

        const mk = await window.MusicKit.configure({
          developerToken: data.data.token,
          app: {
            name: "Playlist Converter",
            build: "1.0.0",
          },
        });
        
        setMusicKit(mk);
        
        if (mk.isAuthorized) {
          setAppleConnected(true);
        }
      } catch (error) {
        console.error("Failed to initialize MusicKit:", error);
      }
    };

    // Wait for MusicKit script to load
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
    // Use custom OAuth flow that bypasses Auth.js signin issues
    window.location.href = "/api/spotify/auth";
  };

  const disconnectSpotify = async () => {
    try {
      await fetch("/api/spotify/session", { method: "DELETE" });
      setSpotifySession(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to disconnect Spotify:", error);
    }
  };

  const connectApple = useCallback(async () => {
    if (!musicKit) {
      console.error("MusicKit not initialized");
      return;
    }

    setAppleLoading(true);
    try {
      const userToken = await musicKit.authorize();
      setAppleUserToken(userToken);
      setAppleConnected(true);
      onConnectionChange?.("apple", true, userToken);
    } catch (error) {
      console.error("Apple Music authorization failed:", error);
    } finally {
      setAppleLoading(false);
    }
  }, [musicKit, onConnectionChange]);

  const disconnectApple = useCallback(async () => {
    if (!musicKit) return;

    try {
      await musicKit.unauthorize();
      setAppleConnected(false);
      setAppleUserToken(null);
      onConnectionChange?.("apple", false);
    } catch (error) {
      console.error("Failed to disconnect Apple Music:", error);
    }
  }, [musicKit, onConnectionChange]);

  // Notify parent of Spotify connection changes
  useEffect(() => {
    if (spotifyConnected && spotifySession?.accessToken) {
      onConnectionChange?.("spotify", true, spotifySession.accessToken);
    }
  }, [spotifyConnected, spotifySession?.accessToken, onConnectionChange]);

  // Store Apple user token in sessionStorage for API calls
  useEffect(() => {
    if (appleUserToken) {
      sessionStorage.setItem("appleUserToken", appleUserToken);
    } else {
      sessionStorage.removeItem("appleUserToken");
    }
  }, [appleUserToken]);

  const userInitials = spotifySession?.user?.name
    ? spotifySession.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : spotifySession?.user?.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Spotify Card */}
      <Card 
        className={cn(
          "relative overflow-hidden border transition-all duration-300 card-lift",
          "glass-spotify",
          spotifyConnected 
            ? "border-[#1DB954]/40 animate-pulse-spotify" 
            : "border-border/50 hover:border-[#1DB954]/30"
        )}
      >
        <CardHeader className="relative pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl text-white transition-all duration-300",
                spotifyConnected 
                  ? "bg-[#1DB954] shadow-lg shadow-[#1DB954]/30" 
                  : "bg-[#1DB954]/80"
              )}>
                <SpotifyLogo className="h-7 w-7" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">Spotify</CardTitle>
                <CardDescription className="text-sm">Stream your playlists</CardDescription>
              </div>
            </div>
            {spotifyConnected ? (
              <Badge className="bg-[#1DB954] hover:bg-[#1aa34a] text-white border-0 shadow-sm">
                <IconCheck size={14} className="mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="opacity-60">
                <IconX size={14} className="mr-1" />
                Not connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="relative pt-0">
          {spotifyConnected ? (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                <Avatar className="h-10 w-10 ring-2 ring-[#1DB954]/20">
                  <AvatarImage src={spotifySession?.user?.image || undefined} alt={spotifySession?.user?.name || "User"} />
                  <AvatarFallback className="bg-[#1DB954] text-white font-medium">{userInitials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {spotifySession?.user?.name || "Spotify User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {spotifySession?.user?.email}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={disconnectSpotify}
                className="w-full border-[#1DB954]/30 hover:border-[#1DB954]/50 hover:bg-[#1DB954]/10 transition-all duration-200"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={connectSpotify}
              className="w-full bg-[#1DB954] hover:bg-[#1aa34a] text-white shadow-md hover:shadow-lg hover:shadow-[#1DB954]/20 transition-all duration-200 hover:-translate-y-0.5"
              disabled={spotifyLoading}
            >
              {spotifyLoading ? (
                <IconLoader2 className="mr-2 animate-spin" size={18} />
              ) : (
                <SpotifyLogo className="mr-2 h-5 w-5" />
              )}
              Connect Spotify
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Apple Music Card */}
      <Card 
        className={cn(
          "relative overflow-hidden border transition-all duration-300 card-lift",
          "glass-apple",
          appleConnected 
            ? "border-[#FC3C44]/40 animate-pulse-apple" 
            : "border-border/50 hover:border-[#FC3C44]/30"
        )}
      >
        <CardHeader className="relative pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl text-white transition-all duration-300",
                appleConnected 
                  ? "bg-gradient-to-br from-[#FC3C44] to-[#F94C57] shadow-lg shadow-[#FC3C44]/30" 
                  : "bg-gradient-to-br from-[#FC3C44]/80 to-[#F94C57]/80"
              )}>
                <AppleLogo className="h-7 w-7" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">Apple Music</CardTitle>
                <CardDescription className="text-sm">Access your library</CardDescription>
              </div>
            </div>
            {appleConnected ? (
              <Badge className="bg-gradient-to-r from-[#FC3C44] to-[#F94C57] hover:from-[#e03540] hover:to-[#e0444d] text-white border-0 shadow-sm">
                <IconCheck size={14} className="mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="opacity-60">
                <IconX size={14} className="mr-1" />
                Not connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="relative pt-0">
          {appleConnected ? (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#FC3C44] to-[#F94C57] ring-2 ring-[#FC3C44]/20">
                  <IconMusic size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Apple Music
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ready to transfer playlists
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={disconnectApple}
                className="w-full border-[#FC3C44]/30 hover:border-[#FC3C44]/50 hover:bg-[#FC3C44]/10 transition-all duration-200"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={connectApple}
              className="w-full bg-gradient-to-r from-[#FC3C44] to-[#F94C57] hover:from-[#e03540] hover:to-[#e0444d] text-white shadow-md hover:shadow-lg hover:shadow-[#FC3C44]/20 transition-all duration-200 hover:-translate-y-0.5"
              disabled={appleLoading || !musicKit}
            >
              {appleLoading ? (
                <IconLoader2 className="mr-2 animate-spin" size={18} />
              ) : (
                <AppleLogo className="mr-2 h-5 w-5" />
              )}
              {!musicKit ? "Loading..." : "Connect Apple Music"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
