import { users, groups, gameStates, pointsGames, roomStates, combinedPayoutResults, stripeSubscriptions, type User, type UpsertUser, type Group, type InsertGroup, type GameState, type InsertGameState, type Player, type Card, type CustomCard, type CardAssignment, type CardValues, type PointsGame, type InsertPointsGame, type RoomState, type InsertRoomState, type CombinedPayoutResult, type InsertCombinedPayoutResult, type StripeSubscription, type InsertStripeSubscription } from "@shared/schema";
import { db } from "./db";
import { eq, sql, lt, and, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users (for Replit Auth and local auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createLocalUser(user: { email: string; firstName: string; lastName: string; passwordHash: string; authMethod: string; termsAcceptedAt?: Date; marketingConsentAt?: Date; marketingPreferenceStatus?: 'subscribed' | 'unsubscribed' }): Promise<User>;
  deleteUser(userId: string): Promise<boolean>;
  updateMarketingPreferences(userId: string, data: { marketingPreferenceStatus: 'subscribed' | 'unsubscribed'; marketingUnsubscribeAt?: Date }): Promise<User | undefined>;
  // Legacy subscription methods for V7.0 (deprecated - use Stripe subscription methods below)
  updateUserSubscription(userId: string, data: { stripeCustomerId?: string; stripeSubscriptionId?: string; subscriptionStatus?: 'trialing' | 'active' | 'canceled' | 'incomplete' | 'past_due' | null; trialEndsAt?: Date; subscriptionEndsAt?: Date }): Promise<User | undefined>;
  
  // Stripe Subscriptions (V8.0 - canonical Stripe schema)
  getStripeSubscription(userId: string): Promise<StripeSubscription | undefined>;
  getStripeSubscriptionByStripeId(stripeSubscriptionId: string): Promise<StripeSubscription | undefined>;
  upsertStripeSubscription(subscription: InsertStripeSubscription): Promise<StripeSubscription>;
  updateStripeSubscription(stripeSubscriptionId: string, updates: Partial<InsertStripeSubscription>): Promise<StripeSubscription | undefined>;
  
  // Manual Trial Management
  grantManualTrial(userId: string, data: { grantedBy: string | null; days: number; reason: string }): Promise<User | undefined>;
  revokeManualTrial(userId: string): Promise<User | undefined>;
  extendManualTrial(userId: string, additionalDays: number, reason: string): Promise<User | undefined>;
  getActiveManualTrials(): Promise<User[]>;
  getUsersForManualTrials(searchTerm?: string): Promise<Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'manualTrialEndsAt'>[]>;
  
  // Auto-Trial Management (V9.0 - Self-serve trials)
  startAutoTrial(userId: string, days?: number): Promise<User | undefined>;
  checkAutoTrialStatus(userId: string): Promise<{ status: 'eligible' | 'active' | 'expired' | null; endsAt?: Date }>;
  
  // Groups
  getGroups(): Promise<Group[]>;
  getGroupsByUser(userId: string): Promise<Group[]>;
  getGroup(id: string): Promise<Group | undefined>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: string, updates: Partial<InsertGroup>): Promise<Group | undefined>;
  deleteGroup(id: string): Promise<boolean>;
  
  // Game States
  getGameState(groupId: string): Promise<GameState | undefined>;
  getGameStates(groupId: string): Promise<GameState[]>;
  getActiveGamesByGroup(groupId: string): Promise<GameState[]>;
  getGameStateById(id: string): Promise<GameState | undefined>;
  createGameState(gameState: InsertGameState): Promise<GameState>;
  updateGameState(id: string, updates: Partial<InsertGameState>): Promise<GameState | undefined>;
  deleteGameState(id: string): Promise<boolean>;
  
  // Points Games
  getPointsGames(groupId: string): Promise<PointsGame[]>;
  getPointsGamesByGroup(groupId: string): Promise<PointsGame[]>;
  getPointsGame(id: string): Promise<PointsGame | undefined>;
  createPointsGame(pointsGame: InsertPointsGame): Promise<PointsGame>;
  updatePointsGame(id: string, updates: Partial<PointsGame>): Promise<PointsGame | undefined>;
  updateHoleScores(gameId: string, hole: number, strokes: Record<string, number>, points: Record<string, number>): Promise<PointsGame | undefined>;
  deletePointsGame(id: string): Promise<boolean>;
  
  // Room States (for scalability)
  getRoomState(roomId: string): Promise<RoomState | undefined>;
  upsertRoomState(roomState: InsertRoomState): Promise<RoomState>;
  deleteRoomState(roomId: string): Promise<boolean>;
  cleanupOldRoomStates(): Promise<void>;
  
  // Combined Payout Results (V6.5)
  getCombinedPayoutResult(groupId: string, gameStateId?: string, pointsGameId?: string): Promise<CombinedPayoutResult | undefined>;
  saveCombinedPayoutResult(result: InsertCombinedPayoutResult): Promise<CombinedPayoutResult>;
  updateCombinedPayoutResult(id: string, updates: Partial<InsertCombinedPayoutResult>): Promise<CombinedPayoutResult | undefined>;
  deleteCombinedPayoutResult(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  
  // Users (for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Always normalize email to lowercase for consistency
    const normalizedData = {
      ...userData,
      email: userData.email?.toLowerCase(),
    };
    
    const [user] = await db
      .insert(users)
      .values(normalizedData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...normalizedData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createLocalUser(userData: { email: string; firstName: string; lastName: string; passwordHash: string; authMethod: string; termsAcceptedAt?: Date; marketingConsentAt?: Date; marketingPreferenceStatus?: 'subscribed' | 'unsubscribed' }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        email: userData.email.toLowerCase(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash: userData.passwordHash,
        authMethod: userData.authMethod,
        termsAcceptedAt: userData.termsAcceptedAt,
        marketingConsentAt: userData.marketingConsentAt,
        marketingPreferenceStatus: userData.marketingPreferenceStatus || 'subscribed',
      })
      .returning();
    return user;
  }

  async updateMarketingPreferences(userId: string, data: { marketingPreferenceStatus: 'subscribed' | 'unsubscribed'; marketingUnsubscribeAt?: Date }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        marketingPreferenceStatus: data.marketingPreferenceStatus,
        marketingUnsubscribeAt: data.marketingUnsubscribeAt,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUser(userId: string): Promise<boolean> {
    // Delete user and all related data (cascades via foreign key constraints)
    const result = await db
      .delete(users)
      .where(eq(users.id, userId));
    return true;
  }

  // Legacy subscription methods for V7.0 (deprecated)
  async updateUserSubscription(userId: string, data: { stripeCustomerId?: string; stripeSubscriptionId?: string; subscriptionStatus?: 'trialing' | 'active' | 'canceled' | 'incomplete' | 'past_due' | null; trialEndsAt?: Date; subscriptionEndsAt?: Date }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  // Stripe Subscriptions (V8.0 - canonical Stripe schema)
  async getStripeSubscription(userId: string): Promise<StripeSubscription | undefined> {
    const [subscription] = await db.select().from(stripeSubscriptions).where(eq(stripeSubscriptions.userId, userId));
    return subscription;
  }

  async getStripeSubscriptionByStripeId(stripeSubscriptionId: string): Promise<StripeSubscription | undefined> {
    const [subscription] = await db.select().from(stripeSubscriptions).where(eq(stripeSubscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return subscription;
  }

  async upsertStripeSubscription(subscription: InsertStripeSubscription): Promise<StripeSubscription> {
    const [result] = await db
      .insert(stripeSubscriptions)
      .values(subscription)
      .onConflictDoUpdate({
        target: stripeSubscriptions.stripeSubscriptionId,
        set: {
          ...subscription,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async updateStripeSubscription(stripeSubscriptionId: string, updates: Partial<InsertStripeSubscription>): Promise<StripeSubscription | undefined> {
    const [subscription] = await db
      .update(stripeSubscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(stripeSubscriptions.stripeSubscriptionId, stripeSubscriptionId))
      .returning();
    return subscription;
  }

  // Manual Trial Management
  async grantManualTrial(userId: string, data: { grantedBy: string | null; days: number; reason: string }): Promise<User | undefined> {
    const now = new Date();
    const endsAt = new Date(now.getTime() + data.days * 24 * 60 * 60 * 1000);
    
    const [user] = await db
      .update(users)
      .set({
        manualTrialGrantedBy: data.grantedBy,
        manualTrialGrantedAt: now,
        manualTrialEndsAt: endsAt,
        manualTrialDays: data.days,
        manualTrialReason: data.reason,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async revokeManualTrial(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        manualTrialGrantedBy: null,
        manualTrialGrantedAt: null,
        manualTrialEndsAt: null,
        manualTrialDays: null,
        manualTrialReason: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async extendManualTrial(userId: string, additionalDays: number, reason: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user || !user.manualTrialEndsAt) {
      return undefined;
    }

    const newEndsAt = new Date(user.manualTrialEndsAt.getTime() + additionalDays * 24 * 60 * 60 * 1000);
    const newTotalDays = (user.manualTrialDays || 0) + additionalDays;

    const [updatedUser] = await db
      .update(users)
      .set({
        manualTrialEndsAt: newEndsAt,
        manualTrialDays: newTotalDays,
        manualTrialReason: `${user.manualTrialReason} | Extended: ${reason}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async getActiveManualTrials(): Promise<User[]> {
    const now = new Date();
    return await db
      .select()
      .from(users)
      .where(and(
        sql`${users.manualTrialEndsAt} IS NOT NULL`,
        sql`${users.manualTrialEndsAt} > ${now}`
      ));
  }

  async getUsersForManualTrials(searchTerm?: string): Promise<Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'manualTrialEndsAt'>[]> {
    let query = db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        manualTrialEndsAt: users.manualTrialEndsAt
      })
      .from(users);

    if (searchTerm) {
      query = query.where(
        sql`(${users.email} ILIKE ${`%${searchTerm}%`} OR 
             ${users.firstName} ILIKE ${`%${searchTerm}%`} OR 
             ${users.lastName} ILIKE ${`%${searchTerm}%`})`
      );
    }

    return await query;
  }

  // Auto-Trial Management (V9.0)
  async startAutoTrial(userId: string, days: number = 7): Promise<User | undefined> {
    const now = new Date();
    const endsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    const [user] = await db
      .update(users)
      .set({
        autoTrialStatus: 'active',
        autoTrialActivatedAt: now,
        autoTrialEndsAt: endsAt,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async checkAutoTrialStatus(userId: string): Promise<{ status: 'eligible' | 'active' | 'expired' | null; endsAt?: Date }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { status: null };
    }

    const now = new Date();
    
    // If trial is active and not expired
    if (user.autoTrialStatus === 'active' && user.autoTrialEndsAt && user.autoTrialEndsAt > now) {
      return { status: 'active', endsAt: user.autoTrialEndsAt };
    }
    
    // If trial was active but is now expired, update status
    if (user.autoTrialStatus === 'active' && user.autoTrialEndsAt && user.autoTrialEndsAt <= now) {
      await db
        .update(users)
        .set({
          autoTrialStatus: 'expired',
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      return { status: 'expired', endsAt: user.autoTrialEndsAt };
    }
    
    return { status: user.autoTrialStatus as 'eligible' | 'active' | 'expired' | null };
  }
  
  // DISABLED: Automatic cleanup removed - use manual /api/admin/cleanup-old-games endpoint instead
  async cleanupOldData() {
    // No automatic cleanup - data retention is managed manually via admin endpoint
    console.log('Automatic cleanup disabled - use /api/admin/cleanup-old-games for manual cleanup');
  }

  // Groups
  async getGroups(): Promise<Group[]> {
    const result = await db.select().from(groups).orderBy(sql`COALESCE(${groups.lastPlayed}, ${groups.createdAt}) DESC`);
    return result;
  }

  async getGroupsByUser(userId: string): Promise<Group[]> {
    // Get groups where user is creator
    const result = await db.select().from(groups)
      .where(eq(groups.createdBy, userId))
      .orderBy(sql`COALESCE(${groups.lastPlayed}, ${groups.createdAt}) DESC`);
    return result;
  }

  async getGroup(id: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }



  async createGroup(insertGroup: InsertGroup): Promise<Group> {
    const [group] = await db.insert(groups).values({
      ...insertGroup,
      players: insertGroup.players as any,
      cardValues: insertGroup.cardValues as any,
      customCards: insertGroup.customCards as any
    }).returning();
    return group;
  }

  async updateGroup(id: string, updates: Partial<InsertGroup>): Promise<Group | undefined> {
    const [updatedGroup] = await db.update(groups)
      .set({ 
        ...updates, 
        players: updates.players as any,
        cardValues: updates.cardValues as any,
        customCards: updates.customCards as any,

        lastPlayed: new Date() 
      })
      .where(eq(groups.id, id))
      .returning();
    return updatedGroup;
  }

  async deleteGroup(id: string): Promise<boolean> {
    try {
      await db.delete(groups).where(eq(groups.id, id));
      return true;
    } catch {
      return false;
    }
  }

  // Game States
  async getGameState(groupId: string): Promise<GameState | undefined> {
    const [gameState] = await db.select().from(gameStates)
      .where(sql`${gameStates.groupId} = ${groupId} AND ${gameStates.isActive} = 1`);
    return gameState;
  }

  async getGameStates(groupId: string): Promise<GameState[]> {
    const result = await db.select().from(gameStates)
      .where(eq(gameStates.groupId, groupId))
      .orderBy(sql`${gameStates.createdAt} DESC`);
    return result;
  }

  async getActiveGamesByGroup(groupId: string): Promise<GameState[]> {
    const activeGames = await db.select().from(gameStates)
      .where(sql`${gameStates.groupId} = ${groupId} AND ${gameStates.isActive} = 1`);
    return activeGames;
  }

  async getGameStateById(id: string): Promise<GameState | undefined> {
    const [gameState] = await db.select().from(gameStates).where(eq(gameStates.id, id));
    return gameState;
  }



  async createGameState(insertGameState: InsertGameState): Promise<GameState> {
    const [gameState] = await db.insert(gameStates).values({
      ...insertGameState,
      deck: insertGameState.deck as any,
      playerCards: insertGameState.playerCards as any,
      cardHistory: insertGameState.cardHistory as any,
      currentCard: insertGameState.currentCard as any,
      cardValues: insertGameState.cardValues as any,

    }).returning();
    return gameState;
  }

  async updateGameState(id: string, updates: Partial<InsertGameState>): Promise<GameState | undefined> {
    const [updatedGameState] = await db.update(gameStates)
      .set({
        ...updates,
        deck: updates.deck as any,
        playerCards: updates.playerCards as any,
        cardHistory: updates.cardHistory as any,
        currentCard: updates.currentCard as any,
        cardValues: updates.cardValues as any
      })
      .where(eq(gameStates.id, id))
      .returning();
    return updatedGameState;
  }

  async deleteGameState(id: string): Promise<boolean> {
    try {
      await db.delete(gameStates).where(eq(gameStates.id, id));
      return true;
    } catch {
      return false;
    }
  }

  // Points Games
  async getPointsGames(groupId: string, gameStateId?: string): Promise<PointsGame[]> {
    if (gameStateId) {
      // Only return points games that are specifically linked to this game session
      const result = await db.select().from(pointsGames)
        .where(sql`${pointsGames.groupId} = ${groupId} AND ${pointsGames.gameStateId} = ${gameStateId}`)
        .orderBy(sql`${pointsGames.createdAt} DESC`);
      return result;
    } else {
      // When no gameStateId is provided, don't return any games to enforce proper scoping
      return [];
    }
  }

  async getPointsGamesByGroup(groupId: string): Promise<PointsGame[]> {
    return this.getPointsGames(groupId);
  }

  async getPointsGame(id: string): Promise<PointsGame | undefined> {
    const [pointsGame] = await db.select().from(pointsGames).where(eq(pointsGames.id, id));
    return pointsGame;
  }

  async createPointsGame(insertPointsGame: InsertPointsGame): Promise<PointsGame> {
    const [pointsGame] = await db.insert(pointsGames).values({
      ...insertPointsGame,
      holes: insertPointsGame.holes as any,
      points: insertPointsGame.points as any,
      settings: insertPointsGame.settings as any
    }).returning();
    return pointsGame;
  }

  async updatePointsGame(id: string, updates: Partial<PointsGame>): Promise<PointsGame | undefined> {
    const [updatedPointsGame] = await db.update(pointsGames)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pointsGames.id, id))
      .returning();
    return updatedPointsGame;
  }

  async updateHoleScores(gameId: string, hole: number, strokes: Record<string, number>, points: Record<string, number>): Promise<PointsGame | undefined> {
    const existingGame = await this.getPointsGame(gameId);
    if (!existingGame) return undefined;

    const [updatedPointsGame] = await db.update(pointsGames)
      .set({
        holes: {
          ...existingGame.holes,
          [hole]: strokes
        },
        points: {
          ...existingGame.points,
          [hole]: points
        },
        updatedAt: new Date(),
      })
      .where(eq(pointsGames.id, gameId))
      .returning();
    
    return updatedPointsGame;
  }

  async deletePointsGame(id: string): Promise<boolean> {
    try {
      await db.delete(pointsGames).where(eq(pointsGames.id, id));
      return true;
    } catch {
      return false;
    }
  }
  
  // Room States (for scalability)
  async getRoomState(roomId: string): Promise<RoomState | undefined> {
    const [roomState] = await db.select().from(roomStates).where(eq(roomStates.roomId, roomId));
    return roomState;
  }

  async upsertRoomState(roomStateData: InsertRoomState): Promise<RoomState> {
    const [roomState] = await db
      .insert(roomStates)
      .values(roomStateData)
      .onConflictDoUpdate({
        target: roomStates.roomId,
        set: {
          ...roomStateData,
          lastActivity: new Date(),
        },
      })
      .returning();
    return roomState;
  }

  async deleteRoomState(roomId: string): Promise<boolean> {
    try {
      await db.delete(roomStates).where(eq(roomStates.roomId, roomId));
      return true;
    } catch {
      return false;
    }
  }

  async cleanupOldRoomStates(): Promise<void> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
      await db.delete(roomStates).where(lt(roomStates.lastActivity, oneDayAgo));
    } catch (error) {
      console.error('Error cleaning up old room states:', error);
    }
  }
  
  // Combined Payout Results (V6.5)
  async getCombinedPayoutResult(groupId: string, gameStateId?: string, pointsGameId?: string): Promise<CombinedPayoutResult | undefined> {
    // Build query conditions dynamically using 'and' helper
    if (gameStateId && pointsGameId) {
      const [result] = await db.select().from(combinedPayoutResults)
        .where(and(
          eq(combinedPayoutResults.groupId, groupId),
          eq(combinedPayoutResults.gameStateId, gameStateId),
          eq(combinedPayoutResults.pointsGameId, pointsGameId)
        ))
        .orderBy(sql`${combinedPayoutResults.createdAt} DESC`)
        .limit(1);
      return result;
    } else if (gameStateId) {
      const [result] = await db.select().from(combinedPayoutResults)
        .where(and(
          eq(combinedPayoutResults.groupId, groupId),
          eq(combinedPayoutResults.gameStateId, gameStateId)
        ))
        .orderBy(sql`${combinedPayoutResults.createdAt} DESC`)
        .limit(1);
      return result;
    } else if (pointsGameId) {
      const [result] = await db.select().from(combinedPayoutResults)
        .where(and(
          eq(combinedPayoutResults.groupId, groupId),
          eq(combinedPayoutResults.pointsGameId, pointsGameId)
        ))
        .orderBy(sql`${combinedPayoutResults.createdAt} DESC`)
        .limit(1);
      return result;
    } else {
      const [result] = await db.select().from(combinedPayoutResults)
        .where(eq(combinedPayoutResults.groupId, groupId))
        .orderBy(sql`${combinedPayoutResults.createdAt} DESC`)
        .limit(1);
      return result;
    }
  }

  async saveCombinedPayoutResult(resultData: InsertCombinedPayoutResult): Promise<CombinedPayoutResult> {
    const [result] = await db
      .insert(combinedPayoutResults)
      .values([resultData])
      .returning();
    return result;
  }

  async updateCombinedPayoutResult(id: string, updates: Partial<InsertCombinedPayoutResult>): Promise<CombinedPayoutResult | undefined> {
    const [result] = await db
      .update(combinedPayoutResults)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(combinedPayoutResults.id, id))
      .returning();
    return result;
  }

  async deleteCombinedPayoutResult(id: string): Promise<boolean> {
    try {
      await db.delete(combinedPayoutResults).where(eq(combinedPayoutResults.id, id));
      return true;
    } catch {
      return false;
    }
  }

}

export const storage = new DatabaseStorage();

// Initialize cleanup on startup
storage.cleanupOldData();

// Utility function to create a deck with exactly one card of each type
export function createShuffledDeck(group?: any): Card[] {
  const cards: Card[] = [
    {
      id: randomUUID(),
      type: 'camel',
      emoji: '🐪'
    },
    {
      id: randomUUID(),
      type: 'fish',
      emoji: '🐟'
    },
    {
      id: randomUUID(),
      type: 'roadrunner',
      emoji: '🐦'
    },
    {
      id: randomUUID(),
      type: 'ghost',
      emoji: '👻'
    },
    {
      id: randomUUID(),
      type: 'skunk',
      emoji: '🦨'
    },
    {
      id: randomUUID(),
      type: 'snake',
      emoji: '🐍'
    },
    {
      id: randomUUID(),
      type: 'yeti',
      emoji: '🌲'
    }
  ];
  
  // Add custom cards if group is provided
  if (group?.customCards) {
    group.customCards.forEach((customCard: any) => {
      cards.push({
        id: randomUUID(),
        type: 'custom',
        emoji: customCard.emoji,
        name: customCard.name
      });
    });
  }
  
  return cards;
}
