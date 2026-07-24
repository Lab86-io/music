# Playlist Converter

Convert and share playlists, songs, albums, and artists across Spotify, Apple Music,
Deezer, TIDAL, YouTube Music, and Amazon Music.

Website: [music.lab86.io](https://music.lab86.io) (also at [playlist.jakoblangtry.com](https://playlist.jakoblangtry.com))  
iOS Shortcut: [Download](https://www.icloud.com/shortcuts/4e940db6e96547389ab95c53069e0839)

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)

## Features

### Playlist Conversion
- Create share links from public Spotify, Apple Music, Deezer, TIDAL, and YouTube playlists
- Import shared playlists into Spotify, Apple Music, YouTube Music, or TIDAL
- Convert playlists from the dashboard directly into connected destination services
- Optional advanced Deezer import using a user-supplied ARL browser session
- Smart track matching using ISRC codes with fuzzy search fallback
- Real-time progress streaming during conversion
- Manual matching for unmatched tracks

### Link Conversion (No Sign-In Required)
- Convert individual song, album, and artist links across all supported catalog services
- ISRC-based matching for songs with fuzzy search fallback (tribute/karaoke filtering)
- Match confidence scoring with full metadata display (artwork, release date, genres)
- Audio preview playback when available
- Local conversion history (last 10, stored in your browser)
- Available on the home page and at `/convert`

### Playlist Sharing (No Sign-In Required)
- Share public playlists without creating an account
- Paste a Spotify, Apple Music, Deezer, TIDAL, or YouTube playlist URL
- Get a shareable link with rich Open Graph previews
- Links expire after 48 hours (multi-use)

### iOS Shortcut
- Share songs, albums, artists, and playlists directly from the iOS share sheet
- Songs/albums/artists convert to the other service; playlists become share links
- Works with supported music-service share URLs
- Automatically copies the resulting link to clipboard

### User Interface
- Clean, responsive design with dark/light mode
- Sticky header navigation
- Grid layout with playlist search
- Album art and track metadata display

### Service Matrix

| Service | Link conversion | Playlist source | Playlist destination |
|---------|-----------------|-----------------|----------------------|
| Spotify | Yes | Yes | Yes |
| Apple Music | Yes | Yes | Yes |
| TIDAL | Yes | Yes | Yes — official OAuth |
| YouTube Music | Yes | Yes | Yes — quota-aware |
| Deezer | Yes | Yes | Advanced — unofficial ARL session |
| Amazon Music | Search link | No public API | No public API |

## Quick Start

### Share a Public Playlist (No Account Needed)

1. Go to [music.lab86.io](https://music.lab86.io)
2. Paste any supported public playlist URL
3. Get your shareable link instantly!

### Convert a Song, Album, or Artist Link (No Account Needed)

1. Go to [music.lab86.io/convert](https://music.lab86.io/convert)
2. Paste a supported song/album/artist link or type a song title
3. Get matching links across Spotify, Apple Music, Deezer, TIDAL, YouTube Music, and Amazon Music

### iOS Shortcut

[**Download the Shortcut**](https://www.icloud.com/shortcuts/4e940db6e96547389ab95c53069e0839)

1. Install the shortcut on your iPhone/iPad
2. Open Spotify or Apple Music
3. Share a playlist -> Choose "Share Playlist" shortcut
4. Link is copied to your clipboard!

### Convert Playlists

1. Connect one or more destination services
2. Select a playlist from your library
3. Click to convert to the other service
4. Review matches and manually fix any unmatched tracks

## API

Public API for integrations and shortcuts:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/convert/link` | POST / GET `?url=...` | Convert a song/album/artist link; playlist links become share links |
| `/api/shortcut` | POST / GET `?url=...&redirect=1` | One-shot endpoint for iOS Shortcuts (optionally 302-redirects) |
| `/api/share/from-url` | POST | Create share link from public playlist URL |
| `/api/share/from-url?url=...` | GET | Same, for simpler integrations |
| `/api/share/[id]` | GET | Get shared playlist data |
| `/api/share/[id]` | POST | Import shared playlist (requires auth) |
| `/api/youtube/import` | POST | Import tracks to a connected YouTube account |
| `/api/tidal/import` | POST | Import tracks to a connected TIDAL account |
| `/api/deezer/import` | POST | Advanced import using the connected Deezer browser session |

### Example: Convert a Song Link

```bash
curl "https://music.lab86.io/api/shortcut?url=https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"
```

Response:
```json
{
  "original": "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
  "converted": "https://music.apple.com/us/album/never-gonna-give-you-up/1558533900?i=1558534271",
  "kind": "track",
  "name": "Never Gonna Give You Up",
  "artist": "Rick Astley",
  "confidence": 100
}
```

### Example: Create Share Link

```bash
curl -X POST https://music.lab86.io/api/share/from-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "shareUrl": "https://music.lab86.io/share/abc123xyz",
    "playlistName": "Today's Top Hits",
    "trackCount": 50,
    "service": "Spotify"
  }
}
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | Astryx Design System + Tailwind CSS v4 token bridge |
| Icons | Tabler Icons + Official Brand Logos |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Spotify OAuth (PKCE), Apple MusicKit JS, Google OAuth, TIDAL OAuth 2.1 + PKCE |
| Hosting | Railway |

## Self-Hosting

### Prerequisites

- Node.js 20+
- PostgreSQL database
- [Spotify Developer App](https://developer.spotify.com/dashboard)
- [Apple Developer Account](https://developer.apple.com/account) with MusicKit key

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/playlist

# Spotify
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

# TIDAL catalog + user OAuth
TIDAL_CLIENT_ID=your_client_id
TIDAL_CLIENT_SECRET=your_client_secret

# YouTube playlist import
YOUTUBE_API_KEY=your_api_key
YOUTUBE_OAUTH_CLIENT_ID=your_client_id
YOUTUBE_OAUTH_CLIENT_SECRET=your_client_secret

# Apple Music
APPLE_TEAM_ID=ABC123DEF4
APPLE_KEY_ID=XXXXXXXXXX
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...your .p8 key contents...
-----END PRIVATE KEY-----"

# Auth
AUTH_SECRET=generate_with_openssl_rand_base64_32
AUTH_URL=https://your-domain.com
```

Register `{origin}/api/tidal/callback` and `{origin}/api/youtube/callback/` with
their respective OAuth applications. Deezer does not require an application key:
advanced import is explicitly opt-in and stores the user-provided ARL only in an
HTTP-only browser cookie. An ARL is a full-account session secret; this unofficial
integration may violate Deezer's terms or stop working without notice.

### Installation

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm db:push

# Start development server
pnpm dev

# Or build for production
pnpm build
pnpm start
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm test` | Run tests in watch mode |
| `pnpm test:run` | Run tests once (CI) |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Drizzle Studio |

## License

MIT
