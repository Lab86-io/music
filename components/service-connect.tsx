"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IconCheck, IconLoader2, IconX, IconUser } from "@tabler/icons-react";
import { SpotifyLogo, AppleLogo } from "@/components/icons";

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
  const { data: session, status } = useSession();
  const [appleConnected, setAppleConnected] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleUserToken, setAppleUserToken] = useState<string | null>(null);
  const [musicKit, setMusicKit] = useState<MusicKitInstance | null>(null);

  const spotifyConnected = status === "authenticated";

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
    // Use the current origin for the callback URL to ensure proper redirect
    const callbackUrl = typeof window !== "undefined" 
      ? `${window.location.origin}/dashboard` 
      : "/dashboard";
    signIn("spotify", { callbackUrl });
  };

  const disconnectSpotify = () => {
    signOut({ callbackUrl: "/" });
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
    if (spotifyConnected && session?.accessToken) {
      onConnectionChange?.("spotify", true, session.accessToken);
    }
  }, [spotifyConnected, session?.accessToken, onConnectionChange]);

  // Store Apple user token in sessionStorage for API calls
  useEffect(() => {
    if (appleUserToken) {
      sessionStorage.setItem("appleUserToken", appleUserToken);
    } else {
      sessionStorage.removeItem("appleUserToken");
    }
  }, [appleUserToken]);

  const userInitials = session?.user?.name
    ? session.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : session?.user?.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Spotify Card */}
      <Card className="relative overflow-hidden border-2 transition-all hover:shadow-lg hover:border-[#1DB954]/50">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1DB954]/10 to-transparent dark:from-[#1DB954]/5" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1DB954] text-white">
                <SpotifyLogo className="h-7 w-7" />
              </div>
              <div>
                <CardTitle className="text-xl">Spotify</CardTitle>
                <CardDescription>Connect your Spotify account</CardDescription>
              </div>
            </div>
            {spotifyConnected ? (
              <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">
                <IconCheck size={14} className="mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">
                <IconX size={14} className="mr-1" />
                Not connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="relative">
          {spotifyConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={session?.user?.image || undefined} alt={session?.user?.name || "User"} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {session?.user?.name || "Spotify User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {session?.user?.email}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={disconnectSpotify}
                className="w-full"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={connectSpotify}
              className="w-full bg-[#1DB954] hover:bg-[#1aa34a] text-white"
              disabled={status === "loading"}
            >
              {status === "loading" ? (
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
      <Card className="relative overflow-hidden border-2 transition-all hover:shadow-lg hover:border-[#FC3C44]/50">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FC3C44]/10 to-transparent dark:from-[#FC3C44]/5" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#FC3C44] to-[#F94C57] text-white">
                <AppleLogo className="h-7 w-7" />
              </div>
              <div>
                <CardTitle className="text-xl">Apple Music</CardTitle>
                <CardDescription>Connect your Apple Music account</CardDescription>
              </div>
            </div>
            {appleConnected ? (
              <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">
                <IconCheck size={14} className="mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">
                <IconX size={14} className="mr-1" />
                Not connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="relative">
          {appleConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-gradient-to-br from-[#FC3C44] to-[#F94C57] text-white">
                    <IconUser size={16} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Apple Music User
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Account connected
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={disconnectApple}
                className="w-full"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={connectApple}
              className="w-full bg-gradient-to-r from-[#FC3C44] to-[#F94C57] hover:from-[#e03540] hover:to-[#e0444d] text-white"
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
