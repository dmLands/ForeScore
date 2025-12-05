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
  // Stripe subscription fields for V7.0
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status").$type<'trialing' | 'active' | 'canceled' | 'incomplete' | 'past_due' | null>(),
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  // Consent tracking fields for V8.2
  termsAcceptedAt: timestamp("terms_accepted_at"),
  marketingConsentAt: timestamp("marketing_consent_at"),
  marketingUnsubscribeAt: timestamp("marketing_unsubscribe_at"),
  marketingPreferenceStatus: varchar("marketing_preference_status").$type<'subscribed' | 'unsubscribed'>().default('subscribed'),
  // Manual trial fields for admin-granted trial access
  manualTrialGrantedBy: varchar("manual_trial_granted_by").references(() => users.id),
  manualTrialGrantedAt: timestamp("manual_trial_granted_at"),
  manualTrialEndsAt: timestamp("manual_trial_ends_at"),
  manualTrialDays: integer("manual_trial_days"),
  manualTrialReason: text("manual_trial_reason"),
  // Feature flags
  hasGirGameAccess: integer("has_gir_game_access").notNull().default(0), // 0 = no access, 1 = access (for GIR game feature)
  // Auto-trial fields for self-serve registration (V9.0)
  autoTrialStatus: varchar("auto_trial_status").$type<'eligible' | 'active' | 'expired' | null>(),
  autoTrialActivatedAt: timestamp("auto_trial_activated_at"),
  autoTrialEndsAt: timestamp("auto_trial_ends_at"),
  // Quick signup fields for QR landing email-only registration
  isQuickSignup: integer("is_quick_signup").notNull().default(0), // 0 = full account, 1 = email-only quick signup
  quickSignupConvertedAt: timestamp("quick_signup_converted_at"), // When user set password and converted to full account
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Preferences Table - V6.5 Feature for tab persistence AND game context
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  currentTab: varchar("current_tab").$type<'groups' | 'games' | 'scoreboard' | 'rules'>().default('groups'),
  selectedGroupId: varchar("selected_group_id"), // Persist selected group
  selectedGameId: varchar("selected_game_id"),   // Persist selected game
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

export const pointsGameSettingsSchema = z.object({
  pointValue: z.number().min(0).optional(),
  nassauValue: z.number().min(0).optional(),
});

// BBB-specific types
export interface BBBHoleData {
  firstOn?: string; // player ID
  closestTo?: string; // player ID
  firstIn?: string; // player ID
}

export interface BBBGameHoles {
  [hole: number]: BBBHoleData;
}

// Types
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;
export type InsertGameState = z.infer<typeof insertGameStateSchema>;
export type GameState = typeof gameStates.$inferSelect;

// GIR Hole Configuration Interface
export interface GIRHoleConfig {
  penalty: number[];  // Array of hole numbers designated as penalty holes
  bonus: number[];    // Array of hole numbers designated as bonus holes
}

// Points Game Tables - Extended to support both 2/9/16 and BBB games
export const pointsGames = pgTable("points_games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  gameStateId: varchar("game_state_id").references(() => gameStates.id, { onDelete: "cascade" }), // Link to specific card game session
  name: varchar("name").notNull(),
  gameType: varchar("game_type").$type<'points' | 'bbb' | 'gir'>().notNull().default('points'), // Distinguish between 2/9/16, BBB, and GIR
  holes: jsonb("holes").$type<Record<number, Record<string, number | string>>>().default({}), // For 2/9/16: hole -> playerId -> strokes; For BBB: hole -> category -> playerId
  points: jsonb("points").$type<Record<number, Record<string, number>>>().default({}), // hole -> playerId -> points (calculated for both game types)
  settings: jsonb("settings").$type<{ pointValue?: number; nassauValue?: number }>().default({ pointValue: 1, nassauValue: 10 }), // Point and Nassau values
  girHoleConfig: jsonb("gir_hole_config").$type<GIRHoleConfig>().default({ penalty: [], bonus: [] }), // User-configured penalty/bonus holes for GIR games
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

// Combined Payout Results Table - V6.5 Feature
export const combinedPayoutResults = pgTable("combined_payout_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  gameStateId: varchar("game_state_id").references(() => gameStates.id, { onDelete: "cascade" }),
  pointsGameId: varchar("points_game_id").references(() => pointsGames.id, { onDelete: "cascade" }),
  selectedGames: json("selected_games").$type<string[]>().notNull(), // Array of game types: ["cards", "points", "nassau"]
  pointValue: json("point_value").$type<number>().notNull().default(1),
  nassauValue: json("nassau_value").$type<number>().notNull().default(10),
  calculationResult: jsonb("calculation_result").$type<{
    success: boolean;
    totalTransactions: number;
    transactions: Array<{
      from: string;
      fromName: string;
      to: string;
      toName: string;
      amount: number;
    }>;
    summary: Record<string, number>;
  }>().notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCombinedPayoutResultSchema = createInsertSchema(combinedPayoutResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CombinedPayoutResult = typeof combinedPayoutResults.$inferSelect;
export type InsertCombinedPayoutResult = z.infer<typeof insertCombinedPayoutResultSchema>;

// User Preferences Schema
export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;

// Password Reset Tokens Table - V6.8 Feature
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: integer("used").notNull().default(0), // 0 = not used, 1 = used
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// Stripe Subscriptions Table - Canonical Stripe Schema Alignment
export const stripeSubscriptions = pgTable("stripe_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stripeSubscriptionId: varchar("stripe_subscription_id").notNull().unique(),
  stripeCustomerId: varchar("stripe_customer_id").notNull(),
  stripePriceId: varchar("stripe_price_id").notNull(),
  status: varchar("status").$type<'trialing' | 'active' | 'canceled' | 'incomplete' | 'past_due' | 'unpaid' | 'paused'>().notNull(),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  cancelAt: timestamp("cancel_at"),
  cancelAtPeriodEnd: integer("cancel_at_period_end").notNull().default(0),
  latestInvoiceId: varchar("latest_invoice_id"),
  collectionMethod: varchar("collection_method").$type<'charge_automatically' | 'send_invoice'>().default('charge_automatically'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStripeSubscriptionSchema = createInsertSchema(stripeSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type StripeSubscription = typeof stripeSubscriptions.$inferSelect;
export type InsertStripeSubscription = z.infer<typeof insertStripeSubscriptionSchema>;

