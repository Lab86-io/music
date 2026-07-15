import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@/lib/auth";
import "./globals.css";

const figtree = Figtree({ 
  subsets: ["latin"], 
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Playlist Converter | Spotify ↔ Apple Music",
    template: "%s | Playlist Converter",
  },
  description: "Convert playlists, songs, albums, and artists between Spotify and Apple Music seamlessly. Share playlists across platforms with friends.",
  metadataBase: new URL("https://music.lab86.io"),
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    siteName: "Playlist Converter",
    title: "Playlist Converter | Spotify ↔ Apple Music",
    description: "Convert your playlists between Spotify and Apple Music seamlessly.",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Playlist Converter" }],
  },
  twitter: {
    card: "summary",
    title: "Playlist Converter",
    description: "Convert playlists between Spotify and Apple Music",
    images: ["/icon-512.png"],
  },
  appleWebApp: {
    capable: true,
    title: "Playlist Converter",
    statusBarStyle: "black-translucent",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className={figtree.variable} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#09090b" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('musickitloaded', function() {
                if (window.MusicKit) {
                  console.log('MusicKit loaded');
                }
              });
            `,
          }}
        />
        <script
          src="https://js-cdn.music.apple.com/musickit/v3/musickit.js"
          async
          data-web-components
        />
      </head>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground">
        <ThemeProvider>
          <SessionProvider session={session}>
            {children}
            <Toaster richColors position="bottom-right" />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
