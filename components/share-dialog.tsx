"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconX, IconCopy, IconCheck, IconLoader2, IconShare, IconLink } from "@tabler/icons-react";
import { SpotifyLogo, AppleLogo } from "@/components/icons";
import type { SpotifyPlaylist, AppleMusicPlaylist } from "@/types";

interface ShareDialogProps {
  playlist: SpotifyPlaylist | AppleMusicPlaylist | null;
  source: "spotify" | "apple";
  appleUserToken?: string | null;
  onClose: () => void;
}

export function ShareDialog({ playlist, source, appleUserToken, onClose }: ShareDialogProps) {
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const playlistName = playlist
    ? source === "spotify"
      ? (playlist as SpotifyPlaylist).name
      : (playlist as AppleMusicPlaylist).attributes.name
    : "";

  const playlistId = playlist?.id || "";

  // Get playlist cover image
  const playlistImage = playlist
    ? source === "spotify"
      ? (playlist as SpotifyPlaylist).images?.[0]?.url
      : (playlist as AppleMusicPlaylist).attributes.artwork?.url
          ?.replace("{w}", "300")
          .replace("{h}", "300")
    : undefined;

  useEffect(() => {
    if (!playlist) return;

    const createShareLink = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceService: source,
            playlistId,
            playlistName,
            playlistImage,
            appleUserToken: source === "apple" ? appleUserToken : undefined,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to create share link");
        }

        setShareUrl(data.data.shareUrl);
      } catch (err) {
        console.error("Share link creation error:", err);
        setError(err instanceof Error ? err.message : "Failed to create share link");
      } finally {
        setLoading(false);
      }
    };

    createShareLink();
  }, [playlist, source, playlistId, playlistName, playlistImage, appleUserToken]);

  const handleCopy = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (!playlist) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog */}
      <Card className="relative z-10 w-full max-w-md mx-4 animate-in zoom-in-95 fade-in duration-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <IconShare className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-lg">Share Playlist</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <IconX className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Playlist Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
              {source === "spotify" ? (
                <SpotifyLogo className="h-5 w-5 text-[#1DB954]" />
              ) : (
                <AppleLogo className="h-5 w-5 text-[#FC3C44]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{playlistName}</p>
              <p className="text-sm text-muted-foreground">
                {source === "spotify" ? "Spotify" : "Apple Music"} playlist
              </p>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center py-6">
              <IconLoader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Creating share link...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                <IconX className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm text-destructive mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          )}

          {/* Success State */}
          {shareUrl && !loading && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Share Link</label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-sm font-mono truncate">
                    <IconLink className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{shareUrl}</span>
                  </div>
                  <Button
                    onClick={handleCopy}
                    variant={copied ? "default" : "outline"}
                    size="sm"
                    className="shrink-0"
                  >
                    {copied ? (
                      <IconCheck className="h-4 w-4" />
                    ) : (
                      <IconCopy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">One-time link</p>
                <p>This link can only be used once. After someone imports the playlist, the link will expire.</p>
              </div>

              <Button onClick={handleCopy} className="w-full gap-2">
                {copied ? (
                  <>
                    <IconCheck className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <IconCopy className="h-4 w-4" />
                    Copy Link
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

