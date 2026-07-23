import type { Metadata } from "next";
import { SeoLanding, SeoSection, type SeoFaqItem } from "@/components/seo-landing";

export const metadata: Metadata = {
  title: "Soundiiz Alternative: Free Playlist Converter Without a Subscription",
  description:
    "A free alternative to Soundiiz for converting playlists between Spotify, Apple Music, TIDAL, Deezer, and YouTube Music. ISRC-exact matching, share links, no premium tier.",
  alternates: { canonical: "/soundiiz-alternative" },
  openGraph: {
    title: "Soundiiz Alternative",
    description:
      "Free playlist conversion between five services. ISRC-exact, no premium tier, no ads.",
    url: "/soundiiz-alternative",
  },
};

const FAQ: SeoFaqItem[] = [
  {
    question: "How is this different from Soundiiz?",
    answer:
      "Soundiiz is a subscription service for managing and syncing an entire music library across many platforms, with the useful parts mostly behind Premium. This is a free personal project focused on the everyday cases: convert a playlist between services, convert any music link, and share playlists or songs with people on other services. No tiers, no ads, no account here. It does not do continuous library sync or one-click migration of your whole collection.",
  },
  {
    question: "Do I need a subscription for big playlists?",
    answer:
      "No. Playlist imports into Spotify, Apple Music, TIDAL, and Deezer run to completion whatever the length. YouTube imports are the one exception, limited by Google's own daily API quota of roughly 60 track additions, resuming the next day.",
  },
  {
    question: "How does matching accuracy compare?",
    answer:
      "Matching is ISRC first, the industry's unique recording ID, which is the most exact signal available. Non-ISRC fallbacks are scored and shown, and a per-track report after every import lets you find and fix anything that missed by hand.",
  },
  {
    question: "Can I share a playlist with someone on another service?",
    answer:
      "Yes, and without them making an account either. A playlist link becomes a 48 hour share page; whoever opens it signs in to their own service and imports it there. Songs, albums, and artists get permanent universal pages covering all six services with a QR code.",
  },
  {
    question: "What is the catch?",
    answer:
      "There is no catch, but there are honest limits: no bulk library migration, no continuous sync, Amazon Music only gets search links because Amazon has no public API, and Deezer imports use an opt-in unofficial connection because Deezer closed its developer program.",
  },
];

export default function SoundiizAlternativePage() {
  return (
    <SeoLanding
      slug="soundiiz-alternative"
      h1="A free Soundiiz alternative"
      sub="Convert and share playlists across five services. ISRC-exact, no premium tier."
      faq={FAQ}
    >
      <SeoSection heading="Where each tool fits">
        <p>
          Soundiiz earns its subscription if you need your whole library mirrored across
          platforms continuously. Most people need something smaller: move this playlist
          there, open that link in my app, send this album to a friend on Apple Music. That
          smaller job is what this converter does, completely free, with exact ISRC matching
          and a report you can check instead of trusting a progress bar.
        </p>
      </SeoSection>
      <SeoSection heading="Built for links, not lock-in">
        <p>
          Everything here produces a link you can hand to anyone: a converted track, a
          universal page listing all six services, a QR code, a 48 hour playlist share page.
          No account exists on this site, so there is nothing to migrate away from later.
        </p>
      </SeoSection>
    </SeoLanding>
  );
}
