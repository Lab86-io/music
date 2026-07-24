import type { Metadata } from "next";
import { Text } from "@astryxdesign/core/Text";
import { SeoLanding, SeoSection, type SeoFaqItem } from "@/components/seo-landing";

export const metadata: Metadata = {
  title: "Songlink / Odesli Alternative: Free Universal Music Links",
  description:
    "A free alternative to Songlink and Odesli. Paste any music link and get a universal page covering Spotify, Apple Music, Deezer, TIDAL, YouTube Music, and Amazon Music, with a QR code. Playlists convert too.",
  alternates: { canonical: "/songlink-alternative" },
  openGraph: {
    title: "Songlink / Odesli Alternative",
    description:
      "Free universal music links across six services, plus playlist conversion, which smart-link tools don't do.",
    url: "/songlink-alternative",
  },
};

const FAQ: SeoFaqItem[] = [
  {
    question: "How is this different from Songlink / Odesli?",
    answer:
      "The core feature is the same: paste one music link, get a page that works for everyone. The differences are that this also converts entire playlists, shows a match confidence score on every result, adds a QR code to every universal page, and has no API rate tiers or accounts. It covers six services rather than trying to cover every service on earth.",
  },
  {
    question: "Do the universal links expire?",
    answer:
      "No. Universal pages for songs, albums, and artists are permanent. Only playlist share pages expire, after 48 hours, because they carry a snapshot of the playlist's tracks.",
  },
  {
    question: "Which services appear on a universal page?",
    answer:
      "Spotify, Apple Music, Deezer, TIDAL, and YouTube Music as direct matches, plus Amazon Music as a pre-filled search, since Amazon has no public catalog API. The source link is always listed first.",
  },
  {
    question: "Is there an API or iOS Shortcut?",
    answer:
      "Yes. A GET endpoint at /api/shortcut takes a url parameter and returns the converted links as JSON, built for iOS Shortcuts, and the share sheet flow works on Android through the installable web app.",
  },
  {
    question: "Is it really free?",
    answer:
      "Yes. I built it for myself, I use it myself, and there is no paid tier. No ads either.",
  },
];

export default function SonglinkAlternativePage() {
  return (
    <SeoLanding
      slug="songlink-alternative"
      h1="A free Songlink alternative"
      sub="Paste any music link. Get one page with every service on it, plus a QR code."
      faq={FAQ}
    >
      <SeoSection heading="What you get">
        <Text as="p">
          Every song, album, or artist you convert gets a permanent universal page listing
          the direct match on Spotify, Apple Music, Deezer, TIDAL, and YouTube Music, plus an
          Amazon Music search. Send that one page to a group chat and everyone opens it in
          their own app. Each page carries proper preview cards for iMessage, Slack, and
          social, and a QR code for handing a song to someone in person.
        </Text>
      </SeoSection>
      <SeoSection heading="The part smart-link tools skip">
        <Text as="p">
          Songlink stops at single songs and albums. This converts whole playlists too:
          paste a playlist link and get a 48 hour share page anyone can import into their own
          service, or sign in and move playlists between your own accounts directly with
          ISRC-exact matching.
        </Text>
      </SeoSection>
    </SeoLanding>
  );
}
