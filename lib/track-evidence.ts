import type { AppleMusicTrack, SpotifyTrack } from "@/types";
import type { TrackEvidence } from "./jev";

export function toTrackEvidence(track: SpotifyTrack | AppleMusicTrack): TrackEvidence {
  if ("artists" in track) {
    return {
      title: track.name,
      artist: track.artists.map(artist => artist.name).join(", "),
      album: track.album.name,
      duration: track.duration_ms,
      isrc: track.external_ids?.isrc,
    };
  }
  return {
    title: track.attributes.name,
    artist: track.attributes.artistName,
    album: track.attributes.albumName,
    duration: track.attributes.durationInMillis,
    isrc: track.attributes.isrc,
  };
}
