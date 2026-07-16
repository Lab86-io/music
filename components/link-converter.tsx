"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  IconLoader2,
  IconArrowRight,
  IconCopy,
  IconCheck,
  IconExternalLink,
  IconTrash,
  IconChevronDown,
  IconAlertTriangle,
  IconLink,
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
} from "@tabler/icons-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SpotifyLogo, AppleLogo } from "@/components/icons";
import { Vinyl } from "@/components/animated-icons";
import { parseMusicUrl } from "@/lib/url-parser";
import { cn } from "@/lib/utils";
import type { LinkMetadata, MusicItemType } from "@/lib/link-converter";

const HISTORY_KEY = "linkConversionHistory";
const HISTORY_LIMIT = 10;

const BRAND = {
  spotify: {
    name: "Spotify",
    color: "#1DB954",
    chip: "bg-[#1DB954]/12 text-[#0f7a37] dark:text-[#3ddc74]",
    button: "bg-[#1DB954] text-[#07210f] hover:bg-[#22cc60]",
  },
  apple: {
    name: "Apple Music",
    color: "#FC3C44",
    chip: "bg-[#FC3C44]/12 text-[#c2202b] dark:text-[#ff6b71]",
    button: "bg-[#FC3C44] text-white hover:bg-[#ff4f56]",
  },
} as const;

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

function targetBrand(direction: ConversionResponse["direction"]) {
  return direction === "spotify-to-apple" ? BRAND.apple : BRAND.spotify;
}

function TargetLogo({
  direction,
  className,
}: {
  direction: ConversionResponse["direction"];
  className?: string;
}) {
  return direction === "spotify-to-apple" ? (
    <AppleLogo className={className} />
  ) : (
    <SpotifyLogo className={className} />
  );
}

function formatDuration(ms?: number) {
  if (!ms) return null;
  const totalSeconds = Math.round(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
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

function CopyIconButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip>
      <TooltipTrigger
        onClick={async (e) => {
          e.stopPropagation();
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground transition-colors hover:text-foreground hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        {copied ? (
          <IconCheck size={16} className="text-primary" />
        ) : (
          <IconCopy size={16} />
        )}
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied!" : label}</TooltipContent>
    </Tooltip>
  );
}

function ConfidenceMeter({ result }: { result: ConversionResponse }) {
  const explanation =
    result.matchMethod === "isrc"
      ? "Exact recording match — both services report the same ISRC code for this recording."
      : "Matched by comparing title, artist, and album across catalogs.";
  const tone =
    result.confidence >= 80
      ? "bg-primary"
      : result.confidence >= 50
        ? "bg-amber-500"
        : "bg-destructive";
  return (
    <Tooltip>
      <TooltipTrigger
        className="flex cursor-help items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        type="button"
      >
        <span className="h-1 w-20 overflow-hidden rounded-full bg-foreground/10">
          <span
            className={cn("block h-full rounded-full transition-all", tone)}
            style={{ width: `${result.confidence}%` }}
          />
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {result.confidence}% match
        </span>
      </TooltipTrigger>
      <TooltipContent>{explanation}</TooltipContent>
    </Tooltip>
  );
}

function PreviewButton({ url }: { url: string }) {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      audio?.pause();
    };
  }, [audio]);

  const toggle = () => {
    if (playing) {
      audio?.pause();
      setPlaying(false);
      return;
    }
    const el = audio ?? new Audio(url);
    if (!audio) {
      el.addEventListener("ended", () => setPlaying(false));
      setAudio(el);
    }
    el.play();
    setPlaying(true);
  };

  return (
    <Tooltip>
      <TooltipTrigger
        onClick={toggle}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground transition-colors hover:text-foreground hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {playing ? <IconPlayerPauseFilled size={15} /> : <IconPlayerPlayFilled size={15} />}
      </TooltipTrigger>
      <TooltipContent>{playing ? "Pause preview" : "Play 30s preview"}</TooltipContent>
    </Tooltip>
  );
}

function ConversionResult({ result }: { result: ConversionResponse }) {
  const target = result.target;
  const brand = targetBrand(result.direction);

  if (!target) {
    return (
      <div className="animate-rise-in mt-6 flex items-start gap-3 rounded-xl border border-border/70 bg-muted/40 px-4 py-3.5">
        <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
        <p className="text-sm leading-relaxed">
          Found <span className="font-medium">{result.source.title}</span>
          {result.type !== "artist" && <> by {result.source.artist}</>}, but nothing on{" "}
          {brand.name} matched confidently enough. It may not be available there.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-rise-in relative mt-6 overflow-hidden rounded-2xl border border-border/70 shadow-[0_12px_32px_-16px_rgb(0_0_0/0.25)]">
      {/* Artwork-derived backdrop, TIDAL-style */}
      {target.artworkUrl && (
        <Image
          src={target.artworkUrl}
          alt=""
          aria-hidden
          fill
          sizes="640px"
          className="scale-125 object-cover opacity-30 blur-2xl saturate-150 dark:opacity-25"
        />
      )}
      <div className="relative flex flex-col gap-4 bg-background/70 p-4 backdrop-blur-2xl sm:flex-row sm:items-center sm:p-5 dark:bg-background/55">
        {target.artworkUrl ? (
          <Image
            src={target.artworkUrl}
            alt={target.title}
            width={96}
            height={96}
            className={cn(
              "h-24 w-24 shrink-0 object-cover shadow-lg",
              result.type === "artist" ? "rounded-full" : "rounded-lg"
            )}
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-muted">
            <TargetLogo direction={result.direction} className="h-9 w-9 opacity-60" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <TargetLogo direction={result.direction} className="h-3.5 w-3.5" />
            {result.type} on {brand.name}
          </div>
          <h3 className="mt-1 truncate text-lg font-semibold leading-tight sm:text-xl">
            {target.title}
          </h3>
          {result.type !== "artist" ? (
            <p className="truncate text-sm text-muted-foreground">
              {target.artist}
              {result.type === "track" && target.album ? ` · ${target.album}` : ""}
            </p>
          ) : (
            target.genres && (
              <p className="truncate text-sm text-muted-foreground">
                {target.genres.slice(0, 3).join(" · ")}
              </p>
            )
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <a
              href={target.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium shadow-sm transition-colors",
                brand.button
              )}
            >
              Open in {brand.name}
              <IconExternalLink size={14} />
            </a>
            <CopyIconButton value={target.url} label="Copy link" />
            {target.previewUrl && <PreviewButton url={target.previewUrl} />}
            <div className="ml-auto hidden sm:block">
              <ConfidenceMeter result={result} />
            </div>
          </div>
          <div className="mt-2.5 sm:hidden">
            <ConfidenceMeter result={result} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaylistResult({ result }: { result: PlaylistShareResponse }) {
  return (
    <div className="animate-rise-in relative mt-6 overflow-hidden rounded-2xl border border-border/70 shadow-[0_12px_32px_-16px_rgb(0_0_0/0.25)]">
      {result.image && (
        <Image
          src={result.image}
          alt=""
          aria-hidden
          fill
          sizes="640px"
          className="scale-125 object-cover opacity-30 blur-2xl saturate-150 dark:opacity-25"
        />
      )}
      <div className="relative flex flex-col gap-4 bg-background/70 p-4 backdrop-blur-2xl sm:flex-row sm:items-center sm:p-5 dark:bg-background/55">
        {result.image ? (
          <Image
            src={result.image}
            alt={result.playlistName}
            width={96}
            height={96}
            className="h-24 w-24 shrink-0 rounded-lg object-cover shadow-lg"
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-muted">
            <IconLink size={28} className="opacity-50" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Share link · expires in 48 hours
          </div>
          <h3 className="mt-1 truncate text-lg font-semibold leading-tight sm:text-xl">
            {result.playlistName}
          </h3>
          <p className="text-sm text-muted-foreground">
            {result.trackCount} tracks · from {result.service}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <code className="min-w-0 flex-1 truncate rounded-full border border-border/70 bg-background/70 px-3.5 py-2 text-xs">
              {result.shareUrl}
            </code>
            <CopyIconButton value={result.shareUrl} label="Copy share link" />
            <Tooltip>
              <TooltipTrigger
                render={
                  <a
                    href={result.shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                  />
                }
              >
                <IconExternalLink size={16} />
              </TooltipTrigger>
              <TooltipContent>Open share page</TooltipContent>
            </Tooltip>
          </div>
          <p className="mt-2.5 text-xs text-muted-foreground">
            Anyone with this link can sign in on the page and import the playlist into their
            own service.
          </p>
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const [expanded, setExpanded] = useState(false);
  const { result } = item;
  const target = result.target;
  if (!target) return null;
  const brand = targetBrand(result.direction);

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {target.artworkUrl ? (
          <Image
            src={target.artworkUrl}
            alt=""
            width={40}
            height={40}
            className={cn(
              "h-10 w-10 shrink-0 object-cover",
              result.type === "artist" ? "rounded-full" : "rounded-md"
            )}
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <TargetLogo direction={result.direction} className="h-4 w-4 opacity-60" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{target.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {result.type === "artist" ? brand.name : target.artist} ·{" "}
            {new Date(item.timestamp).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        <span
          className={cn(
            "hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize sm:inline-flex",
            brand.chip
          )}
        >
          <TargetLogo direction={result.direction} className="h-2.5 w-2.5" />
          {result.type}
        </span>
        <span
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <CopyIconButton value={target.url} label="Copy link" className="h-8 w-8" />
        </span>
        <IconChevronDown
          size={15}
          className={cn(
            "shrink-0 text-muted-foreground/60 transition-transform",
            expanded && "rotate-180"
          )}
        />
      </div>

      {expanded && (
        <div className="animate-rise-in mb-2 ml-[3.25rem] mr-2 space-y-1 rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          {result.type === "track" && target.album && <p>Album · {target.album}</p>}
          {target.releaseDate && (
            <p>Released · {new Date(target.releaseDate).toLocaleDateString()}</p>
          )}
          {target.duration && <p>Duration · {formatDuration(target.duration)}</p>}
          {target.genres && <p>Genres · {target.genres.slice(0, 4).join(", ")}</p>}
          <a
            href={target.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
          >
            Open in {brand.name} <IconExternalLink size={11} />
          </a>
        </div>
      )}
    </li>
  );
}

export function LinkConverter({ showHistory = true }: { showHistory?: boolean }) {
  const [url, setUrl] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConvertApiResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

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

  const detectedBrand = detected
    ? detected.service === "spotify"
      ? BRAND.spotify
      : BRAND.apple
    : null;
  const oppositeName = detected
    ? detected.service === "spotify"
      ? "Apple Music"
      : "Spotify"
    : null;

  return (
    <div className="w-full">
      {/* The hero object: one input for everything */}
      <div
        className={cn(
          "relative flex items-center gap-2 rounded-full border bg-card py-1.5 pl-5 pr-1.5",
          "shadow-[0_1px_2px_rgb(0_0_0/0.05),0_16px_40px_-20px_rgb(0_0_0/0.25)]",
          "transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10",
          detected && !isConverting && "border-primary/40"
        )}
      >
        <IconLink size={18} className="shrink-0 text-muted-foreground/60" />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConvert()}
          disabled={isConverting}
          placeholder="Paste a Spotify or Apple Music link…"
          aria-label="Music link to convert"
          className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
        />
        <button
          onClick={handleConvert}
          disabled={!url.trim() || isConverting}
          className={cn(
            "inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground",
            "transition-all hover:brightness-105 active:scale-[0.98]",
            "disabled:cursor-not-allowed disabled:opacity-45"
          )}
        >
          {isConverting ? (
            <>
              <Vinyl spinning className="h-4.5 w-4.5" />
              <span className="hidden sm:inline">Matching…</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Convert</span>
              <IconArrowRight size={17} />
            </>
          )}
        </button>
      </div>

      {/* Live detection line */}
      <div className="mt-3 flex min-h-6 items-center justify-center">
        {url.trim() &&
          (detected && detectedBrand ? (
            <span
              className={cn(
                "animate-rise-in inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                detectedBrand.chip
              )}
            >
              {detected.service === "spotify" ? (
                <SpotifyLogo className="h-3.5 w-3.5" />
              ) : (
                <AppleLogo className="h-3.5 w-3.5" />
              )}
              {detectedBrand.name} {detected.type}
              <IconArrowRight size={12} className="opacity-60" />
              {detected.type === "playlist" ? "48-hour share link" : oppositeName}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/70">
              Keep pasting — that doesn&apos;t look like a Spotify or Apple Music link yet
            </span>
          ))}
      </div>

      {error && (
        <div className="animate-rise-in mt-3 flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
          <IconAlertTriangle size={16} className="mt-0.5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {isConverting && (
        <p className="animate-rise-in mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <IconLoader2 size={15} className="animate-spin" />
          Searching the other catalog…
        </p>
      )}

      {result?.kind === "conversion" && <ConversionResult result={result} />}
      {result?.kind === "playlist" && <PlaylistResult result={result} />}

      {showHistory && history.length > 0 && (
        <section className="mt-12">
          <div className="flex items-baseline justify-between px-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Recent conversions
            </h2>
            <Tooltip>
              <TooltipTrigger
                onClick={clearHistory}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground/70 transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <IconTrash size={12} />
                Clear
              </TooltipTrigger>
              <TooltipContent>Stored only in this browser</TooltipContent>
            </Tooltip>
          </div>
          <ul className="mt-2 divide-y divide-border/50">
            {history.map((item) => (
              <HistoryRow key={item.timestamp} item={item} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
