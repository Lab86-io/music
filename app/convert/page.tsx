import type { Metadata } from "next";
import { Header } from "@/components/header";
import { LinkConverter } from "@/components/link-converter";

export const metadata: Metadata = {
  title: "Convert a Link | Playlist Converter",
  description:
    "Convert Spotify and Apple Music song, album, and artist links to the other service instantly. No sign-in required.",
};

export default function ConvertPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <LinkConverter />
        </div>
      </main>
    </div>
  );
}
