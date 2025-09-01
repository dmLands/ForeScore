import { sql } from "drizzle-orm";
import { pgTable, text, varchar, json, jsonb, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table supporting both Replit Auth and local authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"), // For local authentication
  authMethod: varchar("auth_method").notNull().default("local"), // "replit" or "local"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  players: json("players").$type<Player[]>().notNull(),
  cardValues: json("card_values").$type<CardValues>().notNull().default({
    camel: 2,
    fish: 2,
    roadrunner: 2,
    ghost: 2,
    skunk: 2,
    snake: 2,
    yeti: 2
  }),
  customCards: json("custom_cards").$type<CustomCard[]>().notNull().default([]),
  groupPhoto: text("group_photo"), // base64 image data
  shareCode: varchar("share_code", { length: 8 }).unique(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastPlayed: timestamp("last_played"),
});

export const gameStates = pgTable("game_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  name: text("name").notNull().default("Game"),
  deck: json("deck").$type<Card[]>().notNull(),
  playerCards: json("player_cards").$type<Record<string, Card[]>>().notNull(),
  cardHistory: json("card_history").$type<CardAssignment[]>().notNull().default([]),
  currentCard: json("current_card").$type<Card | null>(),
  isActive: integer("is_active").notNull().default(1),
  shareCode: varchar("share_code", { length: 8 }).unique(),
  cardValues: json("card_values").$type<CardValues>().notNull().default({
    camel: 2, fish: 2, roadrunner: 2, ghost: 2, skunk: 2, snake: 2, yeti: 2
  }),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Room state persistence for scalability
export const roomStates = pgTable("room_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().unique(),
  gameStateId: varchar("game_state_id").references(() => gameStates.id),
  pointsGameId: varchar("points_game_id").references(() => pointsGames.id),
  state: jsonb("state").notNull(), // Current room state for persistence
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Types
export interface Player {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface Card {
  id: string;
  type: 'camel' | 'fish' | 'roadrunner' | 'ghost' | 'skunk' | 'snake' | 'yeti' | 'custom';
  emoji: string;
  name?: string; // For custom cards
}

export interface CustomCard {
  id: string;
  name: string;
  emoji: string;
  value: number;
}

export interface CardValues {
  camel: number;
  fish: number;
  roadrunner: number;
  ghost: number;
  skunk: number;
  snake: number;
  yeti: number;
  [key: string]: number; // For custom cards
}

export interface CardAssignment {
  cardId: string;
  cardType: 'camel' | 'fish' | 'roadrunner' | 'ghost' | 'skunk' | 'snake' | 'yeti' | 'custom';
  cardName: string;
  cardEmoji: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  cardValue: number;
  timestamp: string;
}

// Schemas
export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
});

export const insertGameStateSchema = createInsertSchema(gameStates).omit({
  id: true,
  createdAt: true,
});



export const playerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  initials: z.string().min(1).max(3),
  color: z.string().default("#0EA5E9"),
});

export const cardValuesSchema = z.object({
  camel: z.number().min(0),
  fish: z.number().min(0),
  roadrunner: z.number().min(0),
  ghost: z.number().min(0),
  skunk: z.number().min(0),
  snake: z.number().min(0),
  yeti: z.number().min(0),
}).catchall(z.number().min(0)); // Allow custom card values

// Types
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;
export type InsertGameState = z.infer<typeof insertGameStateSchema>;
export type GameState = typeof gameStates.$inferSelect;

// Points Game Tables
export const pointsGames = pgTable("points_games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  gameStateId: varchar("game_state_id").references(() => gameStates.id, { onDelete: "cascade" }), // NEW: Link to specific card game session
  name: varchar("name").notNull(),
  holes: jsonb("holes").$type<Record<number, Record<string, number>>>().default({}), // hole -> playerId -> strokes
  points: jsonb("points").$type<Record<number, Record<string, number>>>().default({}), // hole -> playerId -> points
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPointsGameSchema = createInsertSchema(pointsGames).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PointsGame = typeof pointsGames.$inferSelect;
export type InsertPointsGame = z.infer<typeof insertPointsGameSchema>;

// User types for Replit Auth
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Room state types
export type RoomState = typeof roomStates.$inferSelect;
export type InsertRoomState = z.infer<typeof insertRoomStateSchema>;

export const insertRoomStateSchema = createInsertSchema(roomStates).omit({
  id: true,
  createdAt: true,
});

