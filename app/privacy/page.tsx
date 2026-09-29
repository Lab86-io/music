import type { Metadata } from "next";
import {
  ContactEmail,
  LegalBullets,
  LegalLink,
  LegalList,
  LegalPage,
  LegalParagraph,
  LegalSection,
} from "@/components/legal-page";
import {
  GOOGLE_API_USER_DATA_POLICY_URL,
  GOOGLE_LIMITED_USE_STATEMENT,
  GOOGLE_PERMISSIONS_URL,
  GOOGLE_PRIVACY_POLICY_URL,
  SPOTIFY_APPS_URL,
  YOUTUBE_OAUTH_SCOPE,
  YOUTUBE_TERMS_URL,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Lab86 Music collects, keeps, and shares data when you convert music links and playlists, and how to disconnect or ask for deletion.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | Lab86 Music",
    url: "/privacy",
  },
};

// The page has no request data. Keep it static.
export const dynamic = "force-static";

function Code({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-xs text-primary">{children}</code>;
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <>
          <LegalParagraph>
            Lab86 Music is a service from Lab86. It is at music.lab86.io and
            playlist.jakoblangtry.com. It converts songs, albums, artists, and
            playlists between music services.
          </LegalParagraph>
          <LegalParagraph>
            This policy tells you which data we collect, why we collect it, and
            what we do with it. It applies to the website, the API, and the iOS
            Shortcut. If you have a question, send an email to <ContactEmail />.
          </LegalParagraph>
        </>
      }
    >
      <LegalSection id="summary" heading="Summary">
        <LegalBullets
          items={[
            "You can convert links and share public playlists without an account.",
            "We do not have user accounts. Our database has no record for each user.",
            "When you connect a music service, we keep its tokens in a cookie in your browser. We do not keep them in our database.",
            "We use the access that you give only for the tasks that you start.",
            "We do not sell your data. We do not use it for ads. We do not use analytics or ad trackers.",
          ]}
        />
      </LegalSection>

      <LegalSection id="data-we-collect" heading="Data that we collect and why">
        <LegalList
          items={[
            {
              term: "Links and search text",
              description: (
                <>
                  <LegalParagraph>
                    When you convert a link or search for a song, our server
                    reads the link or text. It then searches the music services
                    for the same item.
                  </LegalParagraph>
                  <LegalParagraph>
                    We keep a public record of each song, album, or artist that
                    you convert: its title, artist name, and cover art address.
                    We use this record to show a public page for the item and
                    to put that page in our sitemap. The record does not
                    identify you.
                  </LegalParagraph>
                </>
              ),
            },
            {
              term: "Shared playlists",
              description: (
                <>
                  <LegalParagraph>
                    When you make a share link, we copy the playlist into our
                    database. The copy has the playlist name, cover art address,
                    and source service. For each track, it has the title,
                    artist, album, cover art address, ISRC code, and length.
                  </LegalParagraph>
                  <LegalParagraph>
                    The copy can also have the name of the playlist owner. If
                    you share a playlist from your Spotify library, it has your
                    Spotify display name.
                  </LegalParagraph>
                  <LegalParagraph>
                    A share link stops working 48 hours after you make it. We
                    delete the copy when a person opens the expired link. Until
                    then, an expired copy can stay in our database. To delete a
                    copy before then, send an email to <ContactEmail />.
                  </LegalParagraph>
                </>
              ),
            },
            {
              term: "Data from connected music services",
              description: (
                <LegalParagraph>
                  When you connect a music service, we read only the data that
                  is necessary for the task that you start. The next section
                  tells you about each service.
                </LegalParagraph>
              ),
            },
            {
              term: "Technical data",
              description: (
                <LegalParagraph>
                  Our hosting provider gets standard technical data for each
                  page that you open, such as your IP address and browser type.
                  Our server writes error logs to find problems. Our code does
                  not write your tokens to these logs.
                </LegalParagraph>
              ),
            },
          ]}
        />
      </LegalSection>

      <LegalSection id="connected-services" heading="Connected music services">
        <LegalParagraph>
          You connect a service only when you want to convert or import a
          playlist in your own account. Spotify, Apple, Google, and TIDAL show
          you the permissions before you agree.
        </LegalParagraph>
        <LegalList
          items={[
            {
              term: "Spotify",
              description: (
                <>
                  <LegalParagraph>
                    You sign in with Spotify OAuth with PKCE. The permissions let
                    us read your email address, your Spotify profile, and your
                    private and collaborative playlists. They also let us change
                    your public and private playlists.
                  </LegalParagraph>
                  <LegalParagraph>
                    We use this access to show your playlists and read their
                    tracks. When you start a conversion, we make a new playlist
                    and add tracks to it. We keep your Spotify user ID, display name, email
                    address, profile image address, and tokens in the{" "}
                    <Code>spotify_session</Code> cookie.
                  </LegalParagraph>
                </>
              ),
            },
            {
              term: "Apple Music",
              description: (
                <>
                  <LegalParagraph>
                    You connect Apple Music with Apple MusicKit JS. Apple gives
                    your browser a Music User Token. We keep this token in the
                    session storage of your browser. Your browser deletes it
                    when you close the tab.
                  </LegalParagraph>
                  <LegalParagraph>
                    Your browser sends the token to our server with each Apple
                    Music task. Our server uses it to read your library
                    playlists and their tracks. When you start a conversion, it
                    makes a new playlist and adds tracks to it. Our server does not keep
                    this token.
                  </LegalParagraph>
                </>
              ),
            },
            {
              term: "YouTube (Google)",
              description: (
                <>
                  <LegalParagraph>
                    You connect YouTube with Google OAuth. We use one
                    permission: <Code>{YOUTUBE_OAUTH_SCOPE}</Code>. Google shows
                    this permission as access to manage your YouTube account.
                  </LegalParagraph>
                  <LegalParagraph>
                    We use this access only when you start a playlist import into
                    YouTube. For that import, our server does these tasks:
                  </LegalParagraph>
                  <LegalBullets
                    items={[
                      "It searches YouTube for a video for each track of the playlist.",
                      "It makes a new private playlist in your YouTube account.",
                      "It adds the videos that it found to that new playlist.",
                    ]}
                  />
                  <LegalParagraph>
                    We do not read, change, or delete your other YouTube
                    playlists, videos, or channel data. We do not get your name
                    or email address from Google. We keep the Google access
                    token and refresh token in the <Code>youtube_session</Code>{" "}
                    cookie. We do not keep YouTube data or Google tokens in our
                    database.
                  </LegalParagraph>
                  <LegalParagraph>
                    When you share a public YouTube playlist, we read it with
                    our own API key. We do not use your Google account for that
                    task.
                  </LegalParagraph>
                </>
              ),
            },
            {
              term: "TIDAL",
              description: (
                <LegalParagraph>
                  You sign in with TIDAL OAuth 2.1 with PKCE. We use the{" "}
                  <Code>user.read</Code>, <Code>playlists.read</Code>, and{" "}
                  <Code>playlists.write</Code> permissions. We read the country of
                  your account to find tracks that you can play. When you start
                  a conversion, we make a new playlist and add tracks to it. We keep the tokens
                  and your country code in the <Code>tidal_session</Code>{" "}
                  cookie.
                </LegalParagraph>
              ),
            },
            {
              term: "Deezer",
              description: (
                <>
                  <LegalParagraph>
                    We read public Deezer playlists and the Deezer catalog
                    without your account. The Deezer account connection is
                    optional, because Deezer has no official method for apps to
                    change playlists.
                  </LegalParagraph>
                  <LegalParagraph>
                    If you paste your Deezer ARL, we check it with Deezer and
                    keep it only in the <Code>deezer_arl</Code> cookie. An ARL
                    gives full access to your Deezer account. Our server uses
                    it only to make a new private playlist and add tracks to it
                    when you start a conversion. This connection is not official and can be
                    against the Deezer terms.
                  </LegalParagraph>
                </>
              ),
            },
            {
              term: "Amazon Music",
              description: (
                <LegalParagraph>
                  We do not connect to your Amazon account. We only make links
                  to Amazon Music search pages.
                </LegalParagraph>
              ),
            },
          ]}
        />
      </LegalSection>

      <LegalSection id="google-user-data" heading="Google user data and YouTube API Services">
        <LegalParagraph>{GOOGLE_LIMITED_USE_STATEMENT}</LegalParagraph>
        <LegalParagraph>
          The policy is at{" "}
          <LegalLink href={GOOGLE_API_USER_DATA_POLICY_URL}>
            {GOOGLE_API_USER_DATA_POLICY_URL}
          </LegalLink>
          .
        </LegalParagraph>
        <LegalParagraph>
          Lab86 Music uses YouTube API Services. When you connect YouTube to
          Lab86 Music, you agree to the YouTube Terms of Service at{" "}
          <LegalLink href={YOUTUBE_TERMS_URL}>{YOUTUBE_TERMS_URL}</LegalLink>.
          The Google Privacy Policy at{" "}
          <LegalLink href={GOOGLE_PRIVACY_POLICY_URL}>
            {GOOGLE_PRIVACY_POLICY_URL}
          </LegalLink>{" "}
          applies to the data that Google collects.
        </LegalParagraph>
        <LegalBullets
          items={[
            "We use Google user data only for the YouTube import that you start.",
            "We do not sell Google user data. We do not use it for ads.",
            "We do not use Google user data to develop, improve, or train AI or machine learning models.",
            "No person reads your Google user data, except with your permission, to keep the service safe, or when the law makes it necessary.",
          ]}
        />
        <LegalParagraph>
          You can cancel our access to your Google account at any time at{" "}
          <LegalLink href={GOOGLE_PERMISSIONS_URL}>{GOOGLE_PERMISSIONS_URL}</LegalLink>.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="third-parties" heading="Who gets data">
        <LegalList
          items={[
            {
              term: "Music services",
              description: (
                <LegalParagraph>
                  Spotify, Apple, Google (YouTube), TIDAL, and Deezer get the
                  calls that our server makes for you. A call can contain your
                  token for that service and the names of the tracks, artists,
                  and playlists that you convert.
                </LegalParagraph>
              ),
            },
            {
              term: "OpenRouter",
              description: (
                <>
                  <LegalParagraph>
                    Our server can use OpenRouter and the TypeSafe Jev model to
                    select the correct recording of a track. When this function
                    is on, our server sends track data to OpenRouter. The data is the title, artist, album,
                    length, and ISRC code of the source track and of the
                    candidate tracks.
                  </LegalParagraph>
                  <LegalParagraph>
                    For a YouTube import, the candidates are video titles and
                    channel names from YouTube search results. We do not send
                    tokens, account identifiers, or playlist names. Our server
                    keeps the result in memory for one hour.
                  </LegalParagraph>
                </>
              ),
            },
            {
              term: "Railway",
              description: (
                <LegalParagraph>
                  Railway hosts our website and server. Our PostgreSQL database
                  keeps the shared playlist copies and the public link records.
                </LegalParagraph>
              ),
            },
            {
              term: "Apple",
              description: (
                <LegalParagraph>
                  Each page gets the Apple MusicKit JS library from Apple
                  servers. Apple then gets your IP address and browser data. The
                  Apple privacy policy applies to that data.
                </LegalParagraph>
              ),
            },
            {
              term: "Image servers",
              description: (
                <LegalParagraph>
                  Some pages show cover art directly from the image servers of
                  the music services. Those servers get your IP address.
                </LegalParagraph>
              ),
            },
            {
              term: "The law",
              description: (
                <LegalParagraph>
                  We can share data when the law makes it necessary.
                </LegalParagraph>
              ),
            },
          ]}
        />
        <LegalParagraph>We do not sell or rent your data to any person or company.</LegalParagraph>
      </LegalSection>

      <LegalSection id="cookies-and-storage" heading="Cookies and browser storage">
        <LegalParagraph>
          We use cookies only to keep you connected to your music services and
          to make sign-in safe. We do not use cookies for ads or tracking. On
          our website, the cookies that hold tokens have the HttpOnly and
          Secure attributes. Scripts on the page cannot read them.
        </LegalParagraph>
        <LegalList
          items={[
            {
              term: "Service cookies",
              description: (
                <LegalParagraph>
                  <Code>spotify_session</Code>, <Code>youtube_session</Code>,
                  and <Code>tidal_session</Code> hold tokens for 30 days.{" "}
                  <Code>deezer_arl</Code> holds your Deezer ARL for 180 days.
                  When you disconnect a service, we delete its cookie.
                </LegalParagraph>
              ),
            },
            {
              term: "Sign-in cookies",
              description: (
                <LegalParagraph>
                  During sign-in, short cookies hold a security value, a PKCE
                  code, and the page to return to. They expire after 10 minutes.
                  We delete them when the sign-in is complete.
                </LegalParagraph>
              ),
            },
            {
              term: "Session storage",
              description: (
                <LegalParagraph>
                  Your Apple Music User Token. Your browser deletes it when you
                  close the tab.
                </LegalParagraph>
              ),
            },
            {
              term: "Local storage",
              description: (
                <LegalParagraph>
                  Your last 10 link conversions and your light or dark theme.
                  This data stays in your browser. We do not get it. Select
                  Clear in the history list to delete your conversions.
                </LegalParagraph>
              ),
            },
          ]}
        />
      </LegalSection>

      <LegalSection id="your-choices" heading="Disconnect and deletion">
        <LegalBullets
          items={[
            "To disconnect a service, select Disconnect for that service on the dashboard. This deletes the token from your browser.",
            <>
              Disconnect does not cancel the access at the service. To cancel
              Google access, go to{" "}
              <LegalLink href={GOOGLE_PERMISSIONS_URL}>{GOOGLE_PERMISSIONS_URL}</LegalLink>
              . To cancel Spotify access, go to{" "}
              <LegalLink href={SPOTIFY_APPS_URL}>{SPOTIFY_APPS_URL}</LegalLink>. For
              other services, use the account page of that service.
            </>,
            "To delete all cookies and browser storage for Lab86 Music, clear the site data in your browser.",
            <>
              To delete a shared playlist or other data, send an email to{" "}
              <ContactEmail />. Tell us the share link or the data. We delete it
              and send you a reply.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection id="security" heading="Security">
        <LegalParagraph>
          Our website uses HTTPS. Cookies that hold tokens are HttpOnly.
          No method to send or keep data on the internet is fully safe. We
          cannot make sure that your data is always safe.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="children" heading="Children">
        <LegalParagraph>
          Lab86 Music is not for children younger than 13. We do not knowingly
          collect data from children younger than 13. If you think that a child gave us data,
          send an email to <ContactEmail />. We then delete the data.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="changes" heading="Changes to this policy">
        <LegalParagraph>
          We can change this policy. When we change it, we put the new
          effective date at the top of this page. If a change is important, we
          show a notice on the website.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="contact" heading="Contact">
        <LegalParagraph>
          Lab86 operates Lab86 Music. Send questions about this policy or your
          data to <ContactEmail />.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}
