"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IconLoader2,
  IconArrowsExchange,
  IconCopy,
  IconCheck,
  IconExternalLink,
  IconTrash,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { SpotifyLogo, AppleLogo } from "@/components/icons";
import { parseMusicUrl } from "@/lib/url-parser";
import type { LinkMetadata, MusicItemType } from "@/lib/link-converter";

const SPOTIFY_GREEN = "#1DB954";
const APPLE_RED = "#FC3C44";
const HISTORY_KEY = "linkConversionHistory";
const HISTORY_LIMIT = 10;

interface ConversionResponse {
  kind: "conversion";
  direction: "spotify-to-apple" | "apple-to-spotify";
  type: MusicItemType;
  source: LinkMetadata;
  target: LinkMetadata | null;
  confidence: number;
  matchMethod: "isrc" | "fuzzy" | "none";
}

interface PlaylistShareResponse {
  kind: "playlist";
  shareUrl: string;
  playlistName: string;
  trackCount: number;
  service: string;
  image: string | null;
}

type ConvertApiResponse = ConversionResponse | PlaylistShareResponse;

interface HistoryItem {
  timestamp: number;
  result: ConversionResponse;
}

function serviceLabel(direction: ConversionResponse["direction"]) {
  return direction === "spotify-to-apple" ? "Apple Music" : "Spotify";
}

function formatDuration(ms?: number) {
  if (!ms) return null;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) => item && typeof item.timestamp === "number" && item.result?.source
    );
  } catch {
    return [];
  }
}

function TargetIcon({ direction, size = 16 }: { direction: ConversionResponse["direction"]; size?: number }) {
  return direction === "spotify-to-apple" ? (
    <AppleLogo style={{ width: size, height: size, color: APPLE_RED }} />
  ) : (
    <SpotifyLogo style={{ width: size, height: size, color: SPOTIFY_GREEN }} />
  );
}

function ResultCard({ result }: { result: ConversionResponse }) {
  const [copied, setCopied] = useState(false);
  const target = result.target;
  const targetService = serviceLabel(result.direction);

  const handleCopy = async () => {
    if (!target) return;
    await navigator.clipboard.writeText(target.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!target) {
    return (
      <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
        <p className="text-sm">
          Found <span className="font-medium">{result.source.title}</span>
          {result.type !== "artist" && <> by {result.source.artist}</>}, but no confident match on{" "}
          {targetService}.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
      <div className="flex items-start gap-3">
        {target.artworkUrl ? (
          <Image
            src={target.artworkUrl}
            alt={target.title}
            width={72}
            height={72}
            className={result.type === "artist" ? "rounded-full" : "rounded-md"}
          />
        ) : (
          <div className="h-[72px] w-[72px] rounded-md bg-muted flex items-center justify-center">
            <TargetIcon direction={result.direction} size={28} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <TargetIcon direction={result.direction} />
            <p className="font-medium text-sm truncate">{target.title}</p>
          </div>
          {result.type !== "artist" && (
            <p className="text-xs text-muted-foreground truncate">
              {target.artist}
              {target.album && result.type === "track" ? ` • ${target.album}` : ""}
            </p>
          )}
          {result.type === "artist" && target.genres && (
            <p className="text-xs text-muted-foreground truncate">{target.genres.slice(0, 3).join(", ")}</p>
          )}

          {/* Confidence */}
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${result.confidence}%`,
                  backgroundColor:
                    result.confidence >= 80 ? SPOTIFY_GREEN : result.confidence >= 50 ? "#eab308" : APPLE_RED,
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {result.confidence}% match{result.matchMethod === "isrc" ? " (ISRC)" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 text-xs bg-background px-2 py-1 rounded border truncate">
              {target.url}
            </code>
            <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
              {copied ? <IconCheck size={14} className="text-green-500" /> : <IconCopy size={14} />}
            </Button>
            <a
              href={target.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center justify-center h-8 px-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm"
            >
              <IconExternalLink size={14} />
            </a>
          </div>

          {target.previewUrl && (
            <audio controls preload="none" src={target.previewUrl} className="mt-2 w-full h-8" />
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryEntry({ item }: { item: HistoryItem }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { result } = item;
  const target = result.target;
  if (!target) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(target.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="p-2 rounded-lg border bg-background hover:bg-muted/40 cursor-pointer transition-colors"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-center gap-2">
        {target.artworkUrl ? (
          <Image
            src={target.artworkUrl}
            alt={target.title}
            width={32}
            height={32}
            className={result.type === "artist" ? "rounded-full" : "rounded"}
          />
        ) : (
          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
            <TargetIcon direction={result.direction} size={14} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{target.title}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {result.type === "artist" ? serviceLabel(result.direction) : target.artist} •{" "}
            {new Date(item.timestamp).toLocaleDateString()}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
          {result.type}
        </Badge>
        <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 w-7 p-0 shrink-0">
          {copied ? <IconCheck size={13} className="text-green-500" /> : <IconCopy size={13} />}
        </Button>
        {expanded ? (
          <IconChevronUp size={14} className="text-muted-foreground shrink-0" />
        ) : (
          <IconChevronDown size={14} className="text-muted-foreground shrink-0" />
        )}
      </div>

      {expanded && (
        <div className="mt-2 pl-10 space-y-1 text-xs text-muted-foreground">
          {result.type === "track" && target.album && <p>Album: {target.album}</p>}
          {target.releaseDate && <p>Released: {new Date(target.releaseDate).toLocaleDateString()}</p>}
          {target.duration && <p>Duration: {formatDuration(target.duration)}</p>}
          {target.genres && <p>Genres: {target.genres.slice(0, 4).join(", ")}</p>}
          <a
            href={target.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Open in {serviceLabel(result.direction)} <IconExternalLink size={12} />
          </a>
          {target.previewUrl && (
            <audio
              controls
              preload="none"
              src={target.previewUrl}
              className="mt-1 w-full h-8"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function LinkConverter() {
  const [url, setUrl] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConvertApiResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const detected = useMemo(() => parseMusicUrl(url), [url]);

  const handleConvert = async () => {
    if (!url.trim() || isConverting) return;
    setIsConverting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/convert/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Conversion failed. Please try again.");
        return;
      }
      setResult(data);
      setUrl("");

      if (data.kind === "conversion" && data.target) {
        const item: HistoryItem = { timestamp: Date.now(), result: data };
        setHistory((prev) => {
          const next = [item, ...prev].slice(0, HISTORY_LIMIT);
          try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
          } catch {
            // storage full/unavailable — history is best-effort
          }
          return next;
        });
      }
    } catch {
      setError("Conversion failed. Please try again.");
    } finally {
      setIsConverting(false);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  const copyShareUrl = async (shareUrl: string) => {
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  return (
    <Card>
      <CardContent className="px-4">
        <div className="flex items-center gap-2 mb-3">
          <IconArrowsExchange size={20} className="text-primary" />
          <h2 className="font-semibold">Convert a Link</h2>
          <span className="text-xs text-muted-foreground">(No sign-in required)</span>
        </div>

        <p className="text-sm text-muted-foreground mb-3">
          Paste a Spotify or Apple Music song, album, or artist link to get the matching link on the
          other service. Playlist links become share links.
        </p>

        <div className="flex gap-2">
          <Input
            placeholder="https://open.spotify.com/track/... or https://music.apple.com/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConvert()}
            disabled={isConverting}
            className="flex-1"
          />
          <Button onClick={handleConvert} disabled={!url.trim() || isConverting}>
            {isConverting ? <IconLoader2 className="h-4 w-4 animate-spin" /> : "Convert"}
          </Button>
        </div>

        {/* Live detection badge */}
        {url.trim() && (
          <div className="flex items-center gap-2 mt-2">
            {detected ? (
              <>
                {detected.service === "spotify" ? (
                  <SpotifyLogo className="h-4 w-4" style={{ color: SPOTIFY_GREEN }} />
                ) : (
                  <AppleLogo className="h-4 w-4" style={{ color: APPLE_RED }} />
                )}
                <span className="text-xs text-muted-foreground capitalize">
                  {detected.service === "spotify" ? "Spotify" : "Apple Music"} {detected.type} detected
                  {detected.type !== "playlist" && (
                    <> — will convert to {detected.service === "spotify" ? "Apple Music" : "Spotify"}</>
                  )}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                Not a recognized Spotify or Apple Music link yet
              </span>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive mt-2">{error}</p>}

        {result?.kind === "conversion" && <ResultCard result={result} />}

        {result?.kind === "playlist" && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-start gap-3">
              {result.image ? (
                <Image
                  src={result.image}
                  alt={result.playlistName}
                  width={56}
                  height={56}
                  className="rounded-md"
                />
              ) : (
                <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center">
                  <IconArrowsExchange size={20} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{result.playlistName}</p>
                <p className="text-xs text-muted-foreground">
                  {result.trackCount} tracks • {result.service} • share link (48h)
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 text-xs bg-background px-2 py-1 rounded border truncate">
                    {result.shareUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyShareUrl(result.shareUrl)}
                    className="shrink-0"
                  >
                    {shareCopied ? (
                      <IconCheck size={14} className="text-green-500" />
                    ) : (
                      <IconCopy size={14} />
                    )}
                  </Button>
                  <a
                    href={result.shareUrl}
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

        {/* History */}
        {history.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Recent Conversions</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearHistory}
                className="h-7 text-xs text-muted-foreground"
              >
                <IconTrash size={13} className="mr-1" /> Clear
              </Button>
            </div>
            <div className="space-y-1.5">
              {history.map((item) => (
                <HistoryEntry key={item.timestamp} item={item} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
