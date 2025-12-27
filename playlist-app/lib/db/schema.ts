import { pgTable, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";

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

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type ConversionHistory = typeof conversionHistory.$inferSelect;
