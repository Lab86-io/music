"use client";

import { useState, useEffect } from "react";
import { toast } from "@/lib/toast";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Code } from "@astryxdesign/core/Code";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { Spinner } from "@astryxdesign/core/Spinner";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { IconCopy, IconCheck, IconShare } from "@tabler/icons-react";
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
    <Dialog isOpen onOpenChange={(isOpen) => !isOpen && onClose()} width={480} purpose="info">
      <Layout
        height="auto"
        header={
          <DialogHeader
            title="Share playlist"
            subtitle="Create a private handoff to another music service."
            startContent={<IconShare size={20} />}
            onOpenChange={() => onClose()}
          />
        }
        content={
          <LayoutContent padding={4} isScrollable={false}>
            <VStack gap={4}>
              <Card variant="muted" padding={3}>
                <HStack gap={3} vAlign="center">
                  {source === "spotify" ? (
                    <SpotifyLogo className="h-5 w-5 text-green-vivid" />
                  ) : (
                    <AppleLogo className="h-5 w-5 text-red-vivid" />
                  )}
                  <VStack gap={0}>
                    <Text type="label" maxLines={1}>{playlistName}</Text>
                    <Text type="supporting">
                      {source === "spotify" ? "Spotify" : "Apple Music"} playlist
                    </Text>
                  </VStack>
                </HStack>
              </Card>

              {loading && <Spinner size="lg" label="Creating share link…" />}

              {error && !loading && (
                <Banner
                  status="error"
                  title="Could not create the link"
                  description={error}
                  endContent={<Button label="Close" variant="secondary" onClick={onClose} />}
                />
              )}

              {shareUrl && !loading && (
                <VStack gap={4}>
                  <VStack gap={2}>
                    <Text type="label">Share link</Text>
                    <Card variant="muted" padding={3}>
                      <Code>{shareUrl}</Code>
                    </Card>
                  </VStack>
                  <Banner
                    status="info"
                    title="One-time link"
                    description="The link expires after one successful import, or after 48 hours."
                  />
                  <Button
                    label={copied ? "Copied!" : "Copy link"}
                    icon={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    onClick={handleCopy}
                    variant="primary"
                    width="100%"
                  />
                </VStack>
              )}
            </VStack>
          </LayoutContent>
        }
      />
    </Dialog>
  );
}
