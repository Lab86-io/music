import type { Metadata } from "next";
import { Figtree, Averia_Serif_Libre } from "next/font/google";
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

// Display face for titles and branding only — not body copy
const averia = Averia_Serif_Libre({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Lab86 Music",
    template: "%s | Lab86 Music",
  },
  description: "I made a universal music service converter",
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
    siteName: "Lab86 Music",
    title: "Lab86 Music",
    description: "I made a music converter",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Lab86 Music" }],
  },
  twitter: {
    card: "summary",
    title: "Lab86 Music",
    description: "I made a music converter",
    images: ["/icon-512.png"],
  },
  appleWebApp: {
    capable: true,
    title: "Lab86 Music",
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
    <html lang="en" className={`${figtree.variable} ${averia.variable}`} suppressHydrationWarning>
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
