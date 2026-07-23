import { pgTable, text, integer, timestamp, varchar, primaryKey } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull(), // "spotify" or "apple"
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: integer("expires_at"),
  tokenType: varchar("token_type", { length: 50 }),
  scope: text("scope"),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
});

export const conversionHistory = pgTable("conversion_history", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sourceService: varchar("source_service", { length: 20 }).notNull(), // "spotify" or "apple"
  targetService: varchar("target_service", { length: 20 }).notNull(),
  sourcePlaylistId: varchar("source_playlist_id", { length: 255 }).notNull(),
  sourcePlaylistName: varchar("source_playlist_name", { length: 500 }).notNull(),
  targetPlaylistId: varchar("target_playlist_id", { length: 255 }),
  targetPlaylistName: varchar("target_playlist_name", { length: 500 }),
  totalTracks: integer("total_tracks").notNull(),
  matchedTracks: integer("matched_tracks").notNull(),
  status: varchar("status", { length: 20 }).notNull(), // "pending", "in_progress", "completed", "failed"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const sharedPlaylists = pgTable("shared_playlists", {
  id: text("id").primaryKey(), // nanoid for URL-safe short IDs
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdByName: varchar("created_by_name", { length: 255 }), // Display name of sharer
  playlistName: varchar("playlist_name", { length: 500 }).notNull(),
  playlistImage: text("playlist_image"), // URL to playlist cover image
  sourceService: varchar("source_service", { length: 20 }).notNull(), // "spotify" or "apple"
  tracks: text("tracks").notNull(), // JSON array of track data
  trackCount: integer("track_count").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"), // Links expire after 48 hours (nullable for existing data)
});

// Every universal link page ever rendered, so the sitemap can enumerate them.
// Upserted on render; (service, type, itemId) mirrors the /link/... URL params.
export const universalLinks = pgTable(
  "universal_links",
  {
    service: varchar("service", { length: 20 }).notNull(),
    type: varchar("type", { length: 20 }).notNull(),
    itemId: varchar("item_id", { length: 64 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    artist: varchar("artist", { length: 500 }),
    artworkUrl: text("artwork_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.service, table.type, table.itemId] })]
);

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type ConversionHistory = typeof conversionHistory.$inferSelect;
export type SharedPlaylist = typeof sharedPlaylists.$inferSelect;
export type UniversalLink = typeof universalLinks.$inferSelect;
