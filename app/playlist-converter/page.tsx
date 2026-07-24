import type { Metadata } from "next";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { SeoLanding, SeoSection, type SeoFaqItem } from "@/components/seo-landing";

export const metadata: Metadata = {
  title: "Free Playlist Converter: Spotify, Apple Music, TIDAL, Deezer & YouTube Music",
  description:
    "Convert playlists between Spotify, Apple Music, TIDAL, Deezer, and YouTube Music for free. ISRC-exact matching, 48 hour share links, no ads, no track caps on conversion.",
  alternates: { canonical: "/playlist-converter" },
  openGraph: {
    title: "Free Playlist Converter",
    description:
      "Convert playlists between Spotify, Apple Music, TIDAL, Deezer, and YouTube Music for free.",
    url: "/playlist-converter",
  },
};

const FAQ: SeoFaqItem[] = [
  {
    question: "Is it actually free?",
    answer:
      "Yes. No ads, no premium tier, no track caps on conversion. I built it for myself and run it as a personal project, so there is nothing to upsell. The only real limit is YouTube's own API quota, which caps YouTube imports at roughly 60 tracks a day.",
  },
  {
    question: "Which services are supported?",
    answer:
      "Spotify, Apple Music, TIDAL, Deezer, and YouTube Music playlists convert in every direction. Amazon Music has no public API, so single songs, albums, and artists get pre-filled Amazon searches instead of playlist support.",
  },
  {
    question: "How accurate are playlist conversions?",
    answer:
      "Tracks match by ISRC first, the recording industry's unique recording ID, so most of a playlist comes across exactly. Anything without an ISRC falls back to title and artist comparison with a confidence score, and after the import you get a per-track report where you can search and fix the stragglers by hand.",
  },
  {
    question: "Do I need accounts on both services?",
    answer:
      "Only on the destination, and only for direct imports. The share link route needs no account at all on your side: paste a playlist link, send the 48 hour share page to anyone, and they sign in to their own service to import it.",
  },
  {
    question: "Is there a track limit?",
    answer:
      "No limit of mine. Spotify, Apple Music, TIDAL, and Deezer imports run through the whole playlist. YouTube is the exception because Google's API quota allows roughly 60 track additions a day, so long YouTube imports continue the next day.",
  },
];

export default function PlaylistConverterPage() {
  return (
    <SeoLanding
      slug="playlist-converter"
      h1="Convert playlists between six music services"
      sub="Paste a playlist link from Spotify, Apple Music, TIDAL, Deezer, or YouTube Music. Free, ISRC-exact, no ads."
      faq={FAQ}
    >
      <SeoSection heading="Two ways to move a playlist">
        <Text as="p">
          <Text className="font-medium text-primary">Share link.</Text> Paste a playlist
          link above and get a 48 hour share page. Anyone who opens it signs in to their own
          service and imports the playlist there. Good for sending a playlist to a friend on
          a different service, no account needed on your side.
        </Text>
        <Text as="p">
          <Text className="font-medium text-primary">Direct import.</Text>{" "}
          <Link href="/" className="font-medium text-primary hover:underline">
            Sign in
          </Link>{" "}
          to your services and convert playlists from your library straight into another
          service. You watch it match track by track, then get a report of anything that
          needs attention.
        </Text>
      </SeoSection>
      <SeoSection heading="Why matches are exact">
        <Text as="p">
          Most converters guess by searching song titles. This one matches by ISRC, the
          unique ID the recording industry assigns to each recording, and only falls back to
          title and artist comparison when a catalog does not report one. Fallback matches
          show a confidence score instead of pretending to be certain.
        </Text>
      </SeoSection>
    </SeoLanding>
  );
}
