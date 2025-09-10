import { users, groups, gameStates, pointsGames, roomStates, combinedPayoutResults, type User, type UpsertUser, type Group, type InsertGroup, type GameState, type InsertGameState, type Player, type Card, type CustomCard, type CardAssignment, type CardValues, type PointsGame, type InsertPointsGame, type RoomState, type InsertRoomState, type CombinedPayoutResult, type InsertCombinedPayoutResult } from "@shared/schema";
import { db } from "./db";
import { eq, sql, lt, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users (for Replit Auth and local auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createLocalUser(user: { email: string; firstName: string; lastName: string; passwordHash: string; authMethod: string }): Promise<User>;
  // Subscription methods for V7.0
  updateUserSubscription(userId: string, data: { stripeCustomerId?: string; stripeSubscriptionId?: string; subscriptionStatus?: string; trialEndsAt?: Date; subscriptionEndsAt?: Date }): Promise<User | undefined>;
  
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
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createLocalUser(userData: { email: string; firstName: string; lastName: string; passwordHash: string; authMethod: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash: userData.passwordHash,
        authMethod: userData.authMethod,
      })
      .returning();
    return user;
  }

  // Subscription methods for V7.0
  async updateUserSubscription(userId: string, data: { stripeCustomerId?: string; stripeSubscriptionId?: string; subscriptionStatus?: string; trialEndsAt?: Date; subscriptionEndsAt?: Date }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  // Clean up old data on startup (older than 7 days)
  async cleanupOldData() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    try {
      // Delete old points games first (foreign key constraint)
      await db.delete(pointsGames).where(lt(pointsGames.createdAt, sevenDaysAgo));
      
      // Delete old game states
      await db.delete(gameStates).where(lt(gameStates.createdAt, sevenDaysAgo));
      
      // Delete old groups  
      await db.delete(groups).where(lt(groups.createdAt, sevenDaysAgo));
      
      console.log('Cleaned up data older than 7 days');
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      // Continue without failing the app
    }
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
