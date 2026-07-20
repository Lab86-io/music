"use client";

import { useState } from "react";
import { IconCheck, IconCopy, IconExternalLink, IconLink, IconSearch } from "@tabler/icons-react";
import {
  SpotifyLogo,
  AppleLogo,
  DeezerLogo,
  YouTubeMusicLogo,
  AmazonMusicLogo,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import type { MusicService } from "@/lib/url-parser";

const BRAND: Record<MusicService, { name: string; color: string }> = {
  spotify: { name: "Spotify", color: "#1DB954" },
  apple: { name: "Apple Music", color: "#FC3C44" },
  deezer: { name: "Deezer", color: "#A238FF" },
  youtube: { name: "YouTube Music", color: "#FF0000" },
  amazon: { name: "Amazon Music", color: "#25D1DA" },
};

function Logo({ service, className }: { service: MusicService; className?: string }) {
  const props = { className, style: { color: BRAND[service].color } };
  switch (service) {
    case "spotify":
      return <SpotifyLogo {...props} />;
    case "apple":
      return <AppleLogo {...props} />;
    case "deezer":
      return <DeezerLogo {...props} />;
    case "youtube":
      return <YouTubeMusicLogo {...props} />;
    case "amazon":
      return <AmazonMusicLogo {...props} />;
  }
}

export function ServiceRow({
  service,
  url,
  kind,
  isSource,
}: {
  service: MusicService;
  url: string;
  kind: "direct" | "search";
  isSource: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const brand = BRAND[service];

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border/70 bg-background/70 py-2.5 pl-4 pr-2 backdrop-blur transition-colors hover:border-border hover:bg-background/90">
      <Logo service={service} className="h-6 w-6 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{brand.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {kind === "search" ? "Opens search" : isSource ? "Original link" : "Direct match"}
        </p>
      </div>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
        aria-label={`Copy ${brand.name} link`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/70 opacity-0 transition-all hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
      >
        {copied ? <IconCheck size={15} className="text-primary" /> : <IconCopy size={15} />}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3.5 text-xs font-semibold transition-colors hover:bg-muted"
      >
        {kind === "search" ? "Search" : "Open"}
        {kind === "search" ? <IconSearch size={12} /> : <IconExternalLink size={12} />}
      </a>
    </div>
  );
}

export function CopyPageUrlButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:brightness-105 active:scale-[0.98]",
        className
      )}
    >
      {copied ? <IconCheck size={15} /> : <IconLink size={15} />}
      {copied ? "Copied!" : "Copy this page's link"}
    </button>
  );
}
