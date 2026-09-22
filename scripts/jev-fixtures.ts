import type { LinkMetadata } from "../lib/link-converter";

// Synthetic metadata, not verified catalog records. Labels encode our proposed
// recording-preservation policy and are never included in model requests.
export interface MatchFixture {
  name: string;
  source: LinkMetadata;
  candidates: LinkMetadata[];
  expected: number | null;
}

function track(title: string, artist = "The Harbour", extra: Partial<LinkMetadata> = {}): LinkMetadata {
  return { type: "track", title, artist, url: "https://example.com/synthetic", ...extra };
}

export const fixtures: MatchFixture[] = [
  { name: "exact", source: track("Northern Lights"), candidates: [track("Southern Sky"), track("Northern Lights")], expected: 1 },
  { name: "studio-not-live", source: track("Northern Lights"), candidates: [track("Northern Lights (Live)"), track("Northern Lights")], expected: 1 },
  { name: "studio-not-remix", source: track("Northern Lights"), candidates: [track("Northern Lights (Club Remix)"), track("Northern Lights")], expected: 1 },
  { name: "studio-not-acoustic", source: track("Northern Lights"), candidates: [track("Northern Lights (Acoustic Version)"), track("Northern Lights")], expected: 1 },
  { name: "preserve-live", source: track("Northern Lights (Live at the Pier)"), candidates: [track("Northern Lights"), track("Northern Lights (Live at the Pier)")], expected: 1 },
  { name: "different-live-performance", source: track("Northern Lights (Live at the Pier)"), candidates: [track("Northern Lights (Live at Town Hall)")], expected: null },
  { name: "only-remix", source: track("Northern Lights"), candidates: [track("Northern Lights (Club Remix)")], expected: null },
  { name: "only-acoustic", source: track("Northern Lights"), candidates: [track("Northern Lights (Acoustic)")], expected: null },
  { name: "only-cover", source: track("Northern Lights"), candidates: [track("Northern Lights", "Maya Rivers")], expected: null },
  { name: "tribute", source: track("Northern Lights"), candidates: [track("Northern Lights", "The Harbour Tribute Band"), track("Northern Lights")], expected: 1 },
  { name: "remaster-allowed", source: track("Northern Lights"), candidates: [track("Northern Lights (2024 Remaster)")], expected: 0 },
  { name: "different-remix", source: track("Northern Lights (Harbor Club Remix)"), candidates: [track("Northern Lights (Sunset Remix)")], expected: null },
  { name: "radio-edit", source: track("Northern Lights", "The Harbour", { duration: 240000 }), candidates: [track("Northern Lights (Radio Edit)", "The Harbour", { duration: 180000 })], expected: null },
  { name: "unrelated", source: track("Northern Lights"), candidates: [track("Fire Escape", "Maya Rivers")], expected: null },
  { name: "featuring-format", source: track("Northern Lights (feat. Maya Rivers)"), candidates: [track("Northern Lights", "The Harbour, Maya Rivers")], expected: 0 },
  { name: "youtube-title-noise", source: track("The Harbour - Northern Lights (Official Audio)", "The Harbour - Topic"), candidates: [track("Northern Lights (Live)"), track("Northern Lights")], expected: 1 },
];
