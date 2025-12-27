// Spotify Types
export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: { url: string; height: number; width: number }[];
  tracks: {
    total: number;
    href: string;
  };
  owner: {
    id: string;
    display_name: string;
  };
  public: boolean;
  collaborative: boolean;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string; height: number; width: number }[];
  };
  duration_ms: number;
  external_ids?: {
    isrc?: string;
    ean?: string;
    upc?: string;
  };
  uri: string;
}

// Apple Music Types
export interface AppleMusicPlaylist {
  id: string;
  type: "library-playlists" | "playlists";
  attributes: {
    name: string;
    description?: { standard: string };
    artwork?: { url: string; width: number; height: number };
    canEdit: boolean;
    isPublic: boolean;
    hasCatalog: boolean;
  };
  relationships?: {
    tracks?: {
      data: AppleMusicTrack[];
    };
  };
}

export interface AppleMusicTrack {
  id: string;
  type: "songs" | "library-songs";
  attributes: {
    name: string;
    artistName: string;
    albumName: string;
    durationInMillis: number;
    isrc?: string;
    artwork?: { url: string; width: number; height: number };
  };
}

// Conversion Types
export interface TrackMatch {
  sourceTrack: SpotifyTrack | AppleMusicTrack;
  targetTrack: SpotifyTrack | AppleMusicTrack | null;
  matchConfidence: number; // 0-100
  matchMethod: "isrc" | "fuzzy" | "none";
}

export interface ConversionResult {
  playlistId: string;
  playlistName: string;
  totalTracks: number;
  matchedTracks: number;
  matches: TrackMatch[];
  status: "success" | "partial" | "failed";
}

// Service connection status
export interface ServiceConnection {
  service: "spotify" | "apple";
  connected: boolean;
  userName?: string;
  userImage?: string;
  expiresAt?: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

