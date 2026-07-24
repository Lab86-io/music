"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { Button } from "@astryxdesign/core/Button";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import {
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconLink,
  IconQrcode,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import {
  SpotifyLogo,
  AppleLogo,
  DeezerLogo,
  TidalLogo,
  YouTubeMusicLogo,
  AmazonMusicLogo,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import type { MusicService } from "@/lib/url-parser";

const BRAND: Record<MusicService, { name: string; logo: string }> = {
  spotify: { name: "Spotify", logo: "text-green-vivid" },
  apple: { name: "Apple Music", logo: "text-red-vivid" },
  deezer: { name: "Deezer", logo: "text-purple-vivid" },
  tidal: { name: "TIDAL", logo: "text-primary" },
  youtube: { name: "YouTube Music", logo: "text-red-vivid" },
  amazon: { name: "Amazon Music", logo: "text-cyan-vivid" },
};

function Logo({ service, className }: { service: MusicService; className?: string }) {
  const props = { className: cn(className, BRAND[service].logo) };
  switch (service) {
    case "spotify":
      return <SpotifyLogo {...props} />;
    case "apple":
      return <AppleLogo {...props} />;
    case "tidal":
      return <TidalLogo {...props} />;
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
    <Stack
      direction="horizontal"
      align="center"
      className="group gap-3 rounded-lg border border-border/70 bg-body/70 py-2.5 pl-4 pr-2 backdrop-blur transition-colors hover:border-border hover:bg-body/90"
    >
      <Logo service={service} className="h-6 w-6 shrink-0" />
      <Stack className="min-w-0 flex-1">
        <Text as="p" className="text-sm font-medium leading-tight">{brand.name}</Text>
        <Text as="p" type="supporting" color="secondary">
          {kind === "search" ? "Opens search" : isSource ? "Original link" : "Direct match"}
        </Text>
      </Stack>
      <Button
        label={`Copy ${brand.name} link`}
        isIconOnly
        icon={copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
        variant="ghost"
        size="sm"
        className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
      />
      <Button
        label={kind === "search" ? "Search" : "Open"}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        endContent={kind === "search" ? <IconSearch size={12} /> : <IconExternalLink size={12} />}
        variant="secondary"
        size="sm"
      />
    </Stack>
  );
}

export function CopyPageUrlButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  const toggleQr = async () => {
    if (qr) {
      setQr(null);
      return;
    }
    try {
      const dataUrl = await QRCode.toDataURL(window.location.href, {
        width: 480,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setQr(dataUrl);
    } catch {
      // QR generation failed — copy still works
    }
  };

  return (
    <Stack className={cn("flex flex-col items-center gap-4", className)}>
      <Stack direction="horizontal" align="center" className="gap-2">
        <Button
          label={copied ? "Copied!" : "Copy this page's link"}
          icon={copied ? <IconCheck size={15} /> : <IconLink size={15} />}
          onClick={async () => {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
          variant="primary"
        />
        <Button
          label={qr ? "Hide QR code" : "Show QR code"}
          isIconOnly
          icon={qr ? <IconX size={16} /> : <IconQrcode size={16} />}
          onClick={toggleQr}
          variant="secondary"
        />
      </Stack>
      {qr && (
        <Stack className="animate-rise-in flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr}
            alt="QR code for this page"
            width={176}
            height={176}
            className="h-44 w-44 rounded-lg border border-border bg-on-dark p-2 shadow-lg"
          />
          <Text as="p" className="text-xs text-secondary">Scan to open on your phone</Text>
        </Stack>
      )}
    </Stack>
  );
}
