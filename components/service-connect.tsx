"use client";

import { useState, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IconLoader2 } from "@tabler/icons-react";
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
    <ConnectionPanel
      spotify={{
        connected: spotifyConnected,
        loading: spotifyLoading,
        userName: spotifySession?.user?.name,
        userImage: spotifySession?.user?.image,
        userInitials,
        onConnect: connectSpotify,
        onDisconnect: disconnectSpotify,
      }}
      apple={{
        connected: appleConnected,
        loading: appleLoading,
        ready: !!musicKit,
        onConnect: connectApple,
        onDisconnect: disconnectApple,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      {connected && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 [animation-duration:2.5s]" />
      )}
      <span
        className={cn(
          "relative inline-flex h-2 w-2 rounded-full",
          connected ? "bg-primary" : "bg-muted-foreground/30"
        )}
      />
    </span>
  );
}

interface RowProps {
  logo: React.ReactNode;
  tileClass: string;
  name: string;
  status: React.ReactNode;
  action: React.ReactNode;
}

function ConnectionRow({ logo, tileClass, name, status, action }: RowProps) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm",
          tileClass
        )}
      >
        {logo}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{name}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {status}
        </div>
      </div>
      {action}
    </div>
  );
}

interface ConnectionPanelProps {
  spotify: {
    connected: boolean;
    loading: boolean;
    userName?: string | null;
    userImage?: string | null;
    userInitials: string;
    onConnect: () => void;
    onDisconnect: () => void;
  };
  apple: {
    connected: boolean;
    loading: boolean;
    ready: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
  };
}

function ConnectionPanel({ spotify, apple }: ConnectionPanelProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 divide-y divide-border/60">
      <ConnectionRow
        logo={<SpotifyLogo className="h-5.5 w-5.5" />}
        tileClass="bg-[#1DB954]"
        name="Spotify"
        status={
          <>
            <StatusDot connected={spotify.connected} />
            {spotify.connected ? (
              <span className="truncate">
                Connected{spotify.userName ? ` as ${spotify.userName}` : ""}
              </span>
            ) : (
              <span>Browse your library and convert playlists</span>
            )}
          </>
        }
        action={
          spotify.connected ? (
            <div className="flex items-center gap-2.5">
              <Avatar className="h-7 w-7">
                <AvatarImage src={spotify.userImage || undefined} alt={spotify.userName || "User"} />
                <AvatarFallback className="text-[10px]">{spotify.userInitials}</AvatarFallback>
              </Avatar>
              <button
                onClick={spotify.onDisconnect}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={spotify.onConnect}
              disabled={spotify.loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#1DB954] px-4 text-sm font-medium text-[#07210f] shadow-sm transition-colors hover:bg-[#22cc60] disabled:opacity-50"
            >
              {spotify.loading ? (
                <IconLoader2 size={15} className="animate-spin" />
              ) : (
                <SpotifyLogo className="h-4 w-4" />
              )}
              Connect
            </button>
          )
        }
      />
      <ConnectionRow
        logo={<AppleLogo className="h-5.5 w-5.5" />}
        tileClass="bg-[#FC3C44]"
        name="Apple Music"
        status={
          <>
            <StatusDot connected={apple.connected} />
            {apple.connected ? (
              <span>Connected</span>
            ) : (
              <span>Import shared playlists into your library</span>
            )}
          </>
        }
        action={
          apple.connected ? (
            <button
              onClick={apple.onDisconnect}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={apple.onConnect}
              disabled={apple.loading || !apple.ready}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#FC3C44] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#ff4f56] disabled:opacity-50"
            >
              {apple.loading ? (
                <IconLoader2 size={15} className="animate-spin" />
              ) : (
                <AppleLogo className="h-4 w-4" />
              )}
              {!apple.ready ? "Loading…" : "Connect"}
            </button>
          )
        }
      />
    </div>
  );
}
