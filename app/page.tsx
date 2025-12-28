"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ServiceConnect } from "@/components/service-connect";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconLoader2, IconLink, IconCopy, IconCheck, IconExternalLink } from "@tabler/icons-react";
import { SpotifyLogo, AppleLogo } from "@/components/icons";
import Image from "next/image";

interface ShareResult {
  shareUrl: string;
  playlistName: string;
  trackCount: number;
  service: string;
  image: string | null;
}

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Check Spotify session and redirect to dashboard if authenticated
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/spotify/session");
        const data = await response.json();
        if (data.session) {
          router.push("/dashboard");
          return;
        }
      } catch (error) {
        console.error("Failed to check session:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, [router]);

  const handleCreateShareLink = async () => {
    if (!playlistUrl.trim()) return;

    setIsCreatingShare(true);
    setShareError(null);
    setShareResult(null);

    try {
      const response = await fetch("/api/share/from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: playlistUrl }),
      });

      const data = await response.json();

      if (!data.success) {
        setShareError(data.error || "Failed to create share link");
        return;
      }

      setShareResult(data.data);
      setPlaylistUrl("");
    } catch (error) {
      console.error("Share error:", error);
      setShareError("Failed to create share link. Please try again.");
    } finally {
      setIsCreatingShare(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareResult) return;
    
    try {
      await navigator.clipboard.writeText(shareResult.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = shareResult.shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Quick Share Section */}
          <Card>
            <CardContent className="px-4">
              <div className="flex items-center gap-2 mb-3">
                <IconLink size={20} className="text-primary" />
                <h2 className="font-semibold">Quick Share</h2>
                <span className="text-xs text-muted-foreground">(No sign-in required)</span>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                Paste a public Spotify or Apple Music playlist link to create a shareable link.
              </p>

              <div className="flex gap-2">
                <Input
                  placeholder="https://open.spotify.com/playlist/... or https://music.apple.com/..."
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateShareLink()}
                  disabled={isCreatingShare}
                  className="flex-1"
                />
                <Button 
                  onClick={handleCreateShareLink}
                  disabled={!playlistUrl.trim() || isCreatingShare}
                >
                  {isCreatingShare ? (
                    <IconLoader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create Link"
                  )}
                </Button>
              </div>

              {/* Error Message */}
              {shareError && (
                <p className="text-sm text-destructive mt-2">{shareError}</p>
              )}

              {/* Success Result */}
              {shareResult && (
                <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-start gap-3">
                    {/* Playlist Image */}
                    {shareResult.image ? (
                      <Image
                        src={shareResult.image}
                        alt={shareResult.playlistName}
                        width={56}
                        height={56}
                        className="rounded-md"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center">
                        {shareResult.service === "Spotify" ? (
                          <SpotifyLogo className="h-6 w-6 text-[#1DB954]" />
                        ) : (
                          <AppleLogo className="h-6 w-6 text-[#FC3C44]" />
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{shareResult.playlistName}</p>
                      <p className="text-xs text-muted-foreground">
                        {shareResult.trackCount} tracks • {shareResult.service}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <code className="flex-1 text-xs bg-background px-2 py-1 rounded border truncate">
                          {shareResult.shareUrl}
                        </code>
                        <Button size="sm" variant="outline" onClick={handleCopyLink} className="shrink-0">
                          {copied ? (
                            <IconCheck size={14} className="text-green-500" />
                          ) : (
                            <IconCopy size={14} />
                          )}
                        </Button>
                        <a 
                          href={shareResult.shareUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center justify-center h-8 px-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm"
                        >
                          <IconExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or sign in to manage your playlists</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Service Connect */}
          <ServiceConnect />
        </div>
      </main>
    </div>
  );
}
