# Playlist Converter

Convert and share playlists, songs, albums, and artists between Spotify and Apple Music seamlessly.

Website: [music.lab86.io](https://music.lab86.io) (also at [playlist.jakoblangtry.com](https://playlist.jakoblangtry.com))  
iOS Shortcut: [Download](https://www.icloud.com/shortcuts/4e940db6e96547389ab95c53069e0839)

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)

## Features

### Playlist Conversion
- Convert playlists from Spotify -> Apple Music or Apple Music -> Spotify
- Smart track matching using ISRC codes with fuzzy search fallback
- Real-time progress streaming during conversion
- Manual matching for unmatched tracks

### Link Conversion (No Sign-In Required)
- Convert individual song, album, and artist links between Spotify and Apple Music
- ISRC-based matching for songs with fuzzy search fallback (tribute/karaoke filtering)
- Match confidence scoring with full metadata display (artwork, release date, genres)
- Audio preview playback when available
- Local conversion history (last 10, stored in your browser)
- Available on the home page and at `/convert`

### Playlist Sharing (No Sign-In Required)
- Share public playlists without creating an account
- Just paste a Spotify or Apple Music playlist URL
- Get a shareable link with rich Open Graph previews
- Links expire after 48 hours (multi-use)

### iOS Shortcut
- Share songs, albums, artists, and playlists directly from the iOS share sheet
- Songs/albums/artists convert to the other service; playlists become share links
- Works with Spotify and Apple Music apps
- Automatically copies the resulting link to clipboard

### User Interface
- Clean, responsive design with dark/light mode
- Sticky header navigation
- Grid layout with playlist search
- Album art and track metadata display

## Quick Start

### Share a Public Playlist (No Account Needed)

1. Go to [music.lab86.io](https://music.lab86.io)
2. Paste any public Spotify or Apple Music playlist URL
3. Get your shareable link instantly!

### Convert a Song, Album, or Artist Link (No Account Needed)

1. Go to [music.lab86.io/convert](https://music.lab86.io/convert)
2. Paste a Spotify or Apple Music song/album/artist link
3. Get the matching link on the other service, with a confidence score

### iOS Shortcut

[**Download the Shortcut**](https://www.icloud.com/shortcuts/4e940db6e96547389ab95c53069e0839)

1. Install the shortcut on your iPhone/iPad
2. Open Spotify or Apple Music
3. Share a playlist -> Choose "Share Playlist" shortcut
4. Link is copied to your clipboard!

### Convert Playlists

1. Sign in with Spotify and/or Apple Music
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
| UI | shadcn/ui + Tailwind CSS v4 |
| Icons | Tabler Icons + Official Brand Logos |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Spotify OAuth (PKCE), Apple MusicKit JS |
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
