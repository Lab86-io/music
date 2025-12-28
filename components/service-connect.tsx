"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IconCheck, IconLoader2, IconX } from "@tabler/icons-react";
import { SpotifyLogo, AppleLogo } from "@/components/icons";

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

  // Initialize MusicKit and validate stored token
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
        
        // Check if we have a stored token and validate it
        // Using sessionStorage for security (clears when browser closes)
        const storedToken = sessionStorage.getItem("appleUserToken");
        if (storedToken) {
          // Validate the token by making a lightweight API call
          try {
            const validateResponse = await fetch("/api/apple/playlists?limit=1", {
              headers: { "Music-User-Token": storedToken },
            });
            if (validateResponse.ok) {
              setAppleConnected(true);
              setAppleUserToken(storedToken);
              onConnectionChange?.("apple", true, storedToken);
            } else {
              // Token is stale or invalid, clear it
              console.log("Apple Music token is stale, clearing...");
              sessionStorage.removeItem("appleUserToken");
              if (mk.isAuthorized) {
                await mk.unauthorize();
              }
            }
          } catch {
            // Token validation failed, clear it
            sessionStorage.removeItem("appleUserToken");
            if (mk.isAuthorized) {
              await mk.unauthorize();
            }
          }
        } else if (mk.isAuthorized) {
          // MusicKit thinks we're authorized but we have no token - clear state
          await mk.unauthorize();
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
  }, [onConnectionChange]);

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

  // Store Apple user token in sessionStorage for security
  // (clears when browser closes - this is intentional for security)
  // MusicKit tokens must be client-side accessible, unlike Spotify which uses HTTP-only cookies
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
    <div className="grid gap-2 md:grid-cols-2">
      {/* Spotify Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1DB954]/5 to-transparent" />
        <CardContent className="relative p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1DB954] text-white">
                <SpotifyLogo className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">Spotify</p>
              </div>
            </div>
            {spotifyConnected ? (
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-xs py-0.5">
                <IconCheck size={10} className="mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs py-0.5">
                <IconX size={10} className="mr-1" />
                Not connected
              </Badge>
            )}
          </div>
          {spotifyConnected ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={spotifySession?.user?.image || undefined} alt={spotifySession?.user?.name || "User"} />
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
              <p className="text-xs font-medium truncate flex-1">
                {spotifySession?.user?.name || "Spotify User"}
              </p>
              <Button variant="outline" size="sm" onClick={disconnectSpotify} className="h-6 text-xs px-2">
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={connectSpotify}
              className="w-full bg-[#1DB954] hover:bg-[#1aa34a] text-white h-8"
              disabled={spotifyLoading}
            >
              {spotifyLoading ? (
                <IconLoader2 className="mr-2 animate-spin" size={14} />
              ) : (
                <SpotifyLogo className="mr-2 h-4 w-4" />
              )}
              Connect Spotify
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Apple Music Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FC3C44]/5 to-transparent" />
        <CardContent className="relative p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FC3C44] text-white">
                <AppleLogo className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">Apple Music</p>
              </div>
            </div>
            {appleConnected ? (
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-xs py-0.5">
                <IconCheck size={10} className="mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs py-0.5">
                <IconX size={10} className="mr-1" />
                Not connected
              </Badge>
            )}
          </div>
          {appleConnected ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-[#FC3C44] text-white">
                  <AppleLogo className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
              <p className="text-xs font-medium flex-1">Apple Music Connected</p>
              <Button variant="outline" size="sm" onClick={disconnectApple} className="h-6 text-xs px-2">
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={connectApple}
              className="w-full bg-[#FC3C44] hover:bg-[#e03540] text-white h-8"
              disabled={appleLoading || !musicKit}
            >
              {appleLoading ? (
                <IconLoader2 className="mr-2 animate-spin" size={14} />
              ) : (
                <AppleLogo className="mr-2 h-4 w-4" />
              )}
              {!musicKit ? "Loading..." : "Connect Apple Music"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
