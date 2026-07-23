import type { Metadata } from "next";
import { SeoLanding, SeoSection, type SeoFaqItem } from "@/components/seo-landing";

export const metadata: Metadata = {
  title: "TuneMyMusic Alternative: Free Playlist Converter, No Track Caps",
  description:
    "A free alternative to TuneMyMusic. Convert playlists between Spotify, Apple Music, TIDAL, Deezer, and YouTube Music with ISRC-exact matching. No subscription, no ads, no track caps.",
  alternates: { canonical: "/tunemymusic-alternative" },
  openGraph: {
    title: "TuneMyMusic Alternative",
    description:
      "Free playlist conversion between five services with ISRC-exact matching and no subscription.",
    url: "/tunemymusic-alternative",
  },
};

const FAQ: SeoFaqItem[] = [
  {
    question: "How is this different from TuneMyMusic?",
    answer:
      "TuneMyMusic is a bulk migration service with a free tier that caps how much you can transfer before asking for a subscription. This is a free personal project with no tiers: playlist conversion, single link conversion, universal share pages, and a per-track match report, all without payment or ads. What it does not do is bulk-migrate your entire liked-songs library in one click; it works playlist by playlist and link by link.",
  },
  {
    question: "Are there track limits?",
    answer:
      "None of mine. Spotify, Apple Music, TIDAL, and Deezer playlist imports run to completion regardless of length. The one external limit is YouTube: Google's API quota allows roughly 60 track additions a day, so long YouTube imports continue the next day.",
  },
  {
    question: "How accurate is the matching?",
    answer:
      "Tracks match by ISRC, the unique recording ID, before any title matching happens, so most transfers are exact. Fallback matches show a confidence score, and a post-import report lets you search and add anything that missed, so nothing silently disappears.",
  },
  {
    question: "Which directions work?",
    answer:
      "Spotify, Apple Music, TIDAL, Deezer, and YouTube Music, in every direction, plus Amazon Music search links for single items. Playlists can also become 48 hour share pages that friends import into whatever they use.",
  },
  {
    question: "Do I have to make an account here?",
    answer:
      "No account exists here at all. You sign in to the destination music service itself when importing a playlist, through that service's own official flow, and single link conversion needs no sign in whatsoever.",
  },
];

export default function TuneMyMusicAlternativePage() {
  return (
    <SeoLanding
      slug="tunemymusic-alternative"
      h1="A free TuneMyMusic alternative"
      sub="Playlist conversion between five services. No subscription, no track caps, no ads."
      faq={FAQ}
    >
      <SeoSection heading="The honest comparison">
        <p>
          TuneMyMusic is good at what it charges for: migrating a whole library at once
          across a long list of services. If that is what you need, pay for it. This tool
          covers the everyday cases for free: convert a playlist, convert a link someone
          sent you, share a playlist with someone on a different service, and get exact
          ISRC matches with a visible confidence score instead of silent guesses.
        </p>
      </SeoSection>
      <SeoSection heading="What free means here">
        <p>
          I made this converter for myself and run it as a personal project, so free is not
          a trial. There is no account, no ad banner, no capped preview of a paid feature.
          The only hard limit in the whole system is YouTube's own daily API quota.
        </p>
      </SeoSection>
    </SeoLanding>
  );
}
