import { Metadata } from "next";
import { db, sharedPlaylists } from "@/lib/db";
import { eq } from "drizzle-orm";
import SharePageClient from "./client";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  const result = await db
    .select()
    .from(sharedPlaylists)
    .where(eq(sharedPlaylists.id, id))
    .limit(1);
  
  if (!result.length) {
    return { 
      title: "Playlist Not Found",
      description: "This share link doesn't exist or has expired.",
    };
  }
  
  const playlist = result[0];
  const sourceLabel =
    playlist.sourceService === "spotify"
      ? "Spotify"
      : playlist.sourceService === "deezer"
        ? "Deezer"
        : "Apple Music";
  const sharerName = playlist.createdByName || "Someone";
  
  const title = `${sharerName} shared "${playlist.playlistName}" with you`;
  const description = `${sharerName} shared a ${playlist.trackCount} track playlist from ${sourceLabel}. Import it to your account!`;
  
  return {
    title,
    description,
    openGraph: {
      title,
      description: `${playlist.trackCount} tracks from ${sourceLabel}`,
      images: playlist.playlistImage ? [{ url: playlist.playlistImage, alt: playlist.playlistName }] : undefined,
    },
    twitter: {
      card: playlist.playlistImage ? "summary_large_image" : "summary",
      title: `${sharerName} shared "${playlist.playlistName}"`,
      description: `${playlist.trackCount} tracks from ${sourceLabel}`,
      images: playlist.playlistImage ? [playlist.playlistImage] : undefined,
    },
  };
}

export default function SharePage() {
  return <SharePageClient />;
}

