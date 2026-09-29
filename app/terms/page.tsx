import type { Metadata } from "next";
import {
  ContactEmail,
  LegalBullets,
  LegalLink,
  LegalPage,
  LegalParagraph,
  LegalSection,
} from "@/components/legal-page";
import { GOOGLE_PRIVACY_POLICY_URL, YOUTUBE_TERMS_URL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms for your use of Lab86 Music, the free converter for music links and playlists.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service | Lab86 Music",
    url: "/terms",
  },
};

// The page has no request data. Keep it static.
export const dynamic = "force-static";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <>
          <LegalParagraph>
            These terms apply to your use of Lab86 Music at music.lab86.io and
            playlist.jakoblangtry.com. They also apply to its API and iOS
            Shortcut. Lab86 operates the service.
          </LegalParagraph>
          <LegalParagraph>
            When you use the service, you agree to these terms. If you do not
            agree, do not use the service.
          </LegalParagraph>
        </>
      }
    >
      <LegalSection id="the-service" heading="The service">
        <LegalParagraph>
          Lab86 Music converts songs, albums, artists, and playlists between
          music services. The service is free. We can change, pause, or stop
          all or part of the service at any time, without notice.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="other-services" heading="Your accounts on other services">
        <LegalParagraph>
          You connect your own music service accounts. You are responsible for
          the tasks that you tell the service to do in those accounts. The
          terms of each music service also apply to you.
        </LegalParagraph>
        <LegalParagraph>
          Lab86 Music uses YouTube API Services. When you use the YouTube
          functions, you agree to the YouTube Terms of Service at{" "}
          <LegalLink href={YOUTUBE_TERMS_URL}>{YOUTUBE_TERMS_URL}</LegalLink>.
          The Google Privacy Policy at{" "}
          <LegalLink href={GOOGLE_PRIVACY_POLICY_URL}>
            {GOOGLE_PRIVACY_POLICY_URL}
          </LegalLink>{" "}
          applies to the data that Google collects.
        </LegalParagraph>
        <LegalParagraph>
          The Deezer ARL connection is not official. It can be against the
          Deezer terms, and it can stop at any time. If you use it, you accept
          this risk.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="acceptable-use" heading="Acceptable use">
        <LegalParagraph>When you use the service, do not do these things:</LegalParagraph>
        <LegalBullets
          items={[
            "Do not break the law or the rights of other persons.",
            "Do not break the terms of a music service.",
            "Do not try to get access to accounts, tokens, or data that are not yours.",
            "Do not attack or overload the service or its API.",
            "Do not send automated calls at a rate that causes damage to the service or its quota at a music service.",
          ]}
        />
        <LegalParagraph>
          We can block access to the service if you do not obey these terms.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="content" heading="Music data and content">
        <LegalParagraph>
          Song, album, artist, and playlist data and cover art belong to their
          owners and to the music services. We do not claim to own them. A
          share link shows a copy of a playlist for 48 hours.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="privacy" heading="Privacy">
        <LegalParagraph>
          Our <LegalLink href="/privacy">Privacy Policy</LegalLink> tells you
          which data we collect and what we do with it.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="no-warranty" heading="No warranty">
        <LegalParagraph>
          We supply the service &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo;. We give no warranty of any type, express or
          implied. This includes warranties of merchantability, fitness for a
          particular purpose, and non-infringement.
        </LegalParagraph>
        <LegalParagraph>
          We do not guarantee that matches are correct or that imports are
          complete. We do not guarantee that the service is always available.
          Examine your playlists after a conversion.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="liability" heading="Limitation of liability">
        <LegalParagraph>
          To the maximum extent that the law permits, Lab86 is not liable for
          indirect, incidental, special, consequential, or punitive damages.
          Lab86 is not liable for loss of data, playlists, or profits.
        </LegalParagraph>
        <LegalParagraph>
          To the same extent, the total liability of Lab86 for all claims about
          the service is not more than 50 US dollars.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="changes" heading="Changes to these terms">
        <LegalParagraph>
          We can change these terms. When we change them, we put the new
          effective date at the top of this page. If you use the service after
          a change, you agree to the new terms.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="contact" heading="Contact">
        <LegalParagraph>
          Send questions about these terms to <ContactEmail />.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}
