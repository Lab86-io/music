# Playlist Converter

Convert playlists between **Spotify** and **Apple Music** seamlessly.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)

## Features

- **Bidirectional Transfer**: Convert playlists from Spotify → Apple Music or Apple Music → Spotify
- **Smart Track Matching**: Uses ISRC codes for exact matches, with fuzzy search fallback
- **Real-time Progress**: See conversion progress and match confidence for each track
- **Dark/Light Theme**: Follows system preference with manual toggle
- **Production Ready**: Designed for deployment on Sevalla with PostgreSQL

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| UI | shadcn/ui (maia preset, stone/emerald theme) |
| Styling | Tailwind CSS v4 |
| Icons | Tabler Icons + Official Brand Logos |
| Auth | Auth.js (NextAuth v5) |
| Database | PostgreSQL + Drizzle ORM |
| APIs | Spotify Web API, Apple MusicKit JS |
| Hosting | Sevalla (by Kinsta) |

## Prerequisites

### 1. Spotify Developer Account

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add Redirect URIs:
   - Local: `http://localhost:3000/api/auth/callback/spotify`
   - Production: `https://your-app.sevalla.app/api/auth/callback/spotify`
4. Copy your **Client ID** and **Client Secret**

### 2. Apple Developer Account

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles** → **Keys**
3. Create a new key with **MusicKit** enabled
4. Download the `.p8` file (one-time download!)
5. Note your **Key ID** and **Team ID**

## Deployment on Sevalla

### 1. Create PostgreSQL Database

1. In Sevalla dashboard, go to **Databases** → **Add Database**
2. Select **PostgreSQL**
3. Choose your region and size
4. Copy the **External connection string**

### 2. Create Application

1. Go to **Applications** → **Create an app**
2. Connect your GitHub repository
3. Select the `playlist-app` directory as build path
4. Set **Build command**: `pnpm build`
5. Set **Start command**: `pnpm start`

### 3. Configure Environment Variables

Add these environment variables in Sevalla:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string from Sevalla |
| `SPOTIFY_CLIENT_ID` | From Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | From Spotify Developer Dashboard |
| `APPLE_TEAM_ID` | Your Apple Developer Team ID |
| `APPLE_KEY_ID` | Your MusicKit Key ID |
| `APPLE_PRIVATE_KEY` | Contents of your .p8 file |
| `AUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `AUTH_URL` | Your Sevalla app URL (e.g., `https://your-app.sevalla.app`) |

### 4. Run Database Migrations

After first deployment, run migrations via Sevalla's web terminal or locally:

```bash
pnpm db:push
```

## Local Development

### 1. Install Dependencies

```bash
cd playlist-app
pnpm install
```

### 2. Set Up Environment Variables

Create `.env.local`:

```env
# Database (use local PostgreSQL or Sevalla's external connection)
DATABASE_URL=postgresql://user:password@localhost:5432/playlist_converter

# Spotify
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

# Apple Music
APPLE_TEAM_ID=ABC123DEF4
APPLE_KEY_ID=XXXXXXXXXX
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...your key...
-----END PRIVATE KEY-----"

# Auth
AUTH_SECRET=generate_with_openssl_rand
AUTH_URL=http://localhost:3000
```

### 3. Push Database Schema

```bash
pnpm db:push
```

### 4. Start Development Server

```bash
pnpm dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm db:generate` | Generate migrations |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Drizzle Studio |

## Project Structure

```
playlist-app/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # Auth.js routes
│   │   ├── spotify/             # Spotify API routes
│   │   ├── apple/               # Apple Music API routes
│   │   └── convert/             # Conversion endpoint
│   ├── dashboard/               # Main dashboard page
│   └── page.tsx                 # Landing page
├── components/
│   ├── ui/                      # shadcn components
│   ├── icons.tsx                # Official brand logos
│   ├── theme-provider.tsx       # Dark/light theme
│   └── ...                      # App components
├── lib/
│   ├── auth.ts                  # Auth.js configuration
│   ├── spotify.ts               # Spotify API client
│   ├── apple-music.ts           # Apple Music API client
│   ├── converter.ts             # Track matching logic
│   └── db/                      # Database schema & client
└── drizzle/                     # Database migrations
```

## License

MIT
