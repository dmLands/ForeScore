import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage.js";
import { setupAuth, isAuthenticated, generateRoomToken } from "./replitAuth.js";
import { calculateProportionalShare, calculate2916Points, validateCardAssignment, calculateWhoOwesWho, calculate2916WhoOwesWho, calculateCombinedWhoOwesWho, calculateCardsGame, calculatePointsGame, calculateFbtGame, combineGames, settleWhoOwesWho } from "./secureGameLogic.js";
import { SecureWebSocketManager } from "./secureWebSocket.js";
import { registerUser, authenticateUser, registerSchema, loginSchema } from "./localAuth.js";
import { insertGroupSchema, insertGameStateSchema, insertPointsGameSchema, type Card, type CardAssignment } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth routes - removed duplicate, using the one below

  // Local authentication routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      const user = await registerUser(validatedData);
      
      // Return user without sensitive data
      const { passwordHash, ...userResponse } = user;
      res.status(201).json({ 
        message: "User registered successfully",
        user: userResponse 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid data', 
          errors: error.errors 
        });
      }
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Registration failed" 
      });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const user = await authenticateUser(validatedData);
      
      // Create session (similar to Replit auth)
      (req as any).user = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
        },
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      };
      
      req.login((req as any).user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        
        // Return user without sensitive data
        const { passwordHash, ...userResponse } = user;
        res.json({ 
          message: "Login successful",
          user: userResponse 
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid data', 
          errors: error.errors 
        });
      }
      res.status(401).json({ 
        message: error instanceof Error ? error.message : "Authentication failed" 
      });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Session cleanup failed" });
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  // Get current user endpoint
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Extract user data from the session (set during login)
      const userData = req.user.claims ? {
        id: req.user.claims.sub,
        email: req.user.claims.email,
        firstName: req.user.claims.first_name,
        lastName: req.user.claims.last_name
      } : req.user;
      
      res.json(userData);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Generate room token for WebSocket authentication
  app.post('/api/auth/room-token', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { roomId } = req.body;
      
      if (!roomId) {
        return res.status(400).json({ message: 'Room ID required' });
      }
      
      const token = generateRoomToken(userId, roomId);
      res.json({ token });
    } catch (error) {
      console.error("Error generating room token:", error);
      res.status(500).json({ message: "Failed to generate room token" });
    }
  });

  // Groups endpoints (protected) - User isolation
  app.get('/api/groups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groups = await storage.getGroupsByUser(userId);
      res.json(groups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      res.status(500).json({ message: 'Failed to fetch groups' });
    }
  });

  app.get('/api/groups/:id', isAuthenticated, async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      res.json(group);
    } catch (error) {
      console.error('Error fetching group:', error);
      res.status(500).json({ message: 'Failed to fetch group' });
    }
  });

  app.post('/api/groups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertGroupSchema.parse(req.body);
      
      const group = await storage.createGroup({
        ...validatedData,
        createdBy: userId
      });
      
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      console.error('Error creating group:', error);
      res.status(500).json({ message: 'Failed to create group' });
    }
  });

  app.patch('/api/groups/:id', isAuthenticated, async (req, res) => {
    try {
      const updates = insertGroupSchema.partial().parse(req.body);
      const group = await storage.updateGroup(req.params.id, updates);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      res.json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      console.error('Error updating group:', error);
      res.status(500).json({ message: 'Failed to update group' });
    }
  });

  app.delete('/api/groups/:id', isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteGroup(req.params.id);
      if (!success) {
        return res.status(404).json({ message: 'Group not found' });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting group:', error);
      res.status(500).json({ message: 'Failed to delete group' });
    }
  });

  // Game states endpoints (protected)
  app.get('/api/game-state/:id', isAuthenticated, async (req, res) => {
    try {
      const gameState = await storage.getGameStateById(req.params.id);
      if (!gameState) {
        return res.status(404).json({ message: 'Game state not found' });
      }
      res.json(gameState);
    } catch (error) {
      console.error('Error fetching game state:', error);
      res.status(500).json({ message: 'Failed to fetch game state' });
    }
  });

  app.get('/api/groups/:groupId/game-state', isAuthenticated, async (req, res) => {
    try {
      const gameState = await storage.getGameState(req.params.groupId);
      if (!gameState) {
        return res.status(404).json({ message: 'Game state not found' });
      }
      res.json(gameState);
    } catch (error) {
      console.error('Error fetching game state:', error);
      res.status(500).json({ message: 'Failed to fetch game state' });
    }
  });

  // Simple game creation endpoint
  app.post('/api/game-state', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { groupId, name } = req.body;
      
      // Validate basic required fields
      if (!groupId || !name) {
        return res.status(400).json({ message: 'groupId and name are required' });
      }
      
      // Get the group to access player data
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Initialize game with default deck plus custom cards
      const standardDeck = [
        { id: 'camel-1', type: 'camel', emoji: '🐫' },
        { id: 'camel-2', type: 'camel', emoji: '🐫' },
        { id: 'fish-1', type: 'fish', emoji: '🐟' },
        { id: 'fish-2', type: 'fish', emoji: '🐟' },
        { id: 'roadrunner-1', type: 'roadrunner', emoji: '🏃' },
        { id: 'roadrunner-2', type: 'roadrunner', emoji: '🏃' },
        { id: 'ghost-1', type: 'ghost', emoji: '👻' },
        { id: 'ghost-2', type: 'ghost', emoji: '👻' },
        { id: 'skunk-1', type: 'skunk', emoji: '🦨' },
        { id: 'skunk-2', type: 'skunk', emoji: '🦨' },
        { id: 'snake-1', type: 'snake', emoji: '🐍' },
        { id: 'snake-2', type: 'snake', emoji: '🐍' },
        { id: 'yeti-1', type: 'yeti', emoji: '☃️' },
        { id: 'yeti-2', type: 'yeti', emoji: '☃️' }
      ];
      
      // Add custom cards to deck
      const customCardsInDeck = (group.customCards || []).map(customCard => ({
        id: customCard.id,
        type: 'custom' as const,
        emoji: customCard.emoji,
        name: customCard.name
      }));
      

      
      const fullDeck = [...standardDeck, ...customCardsInDeck];
      
      // Initialize empty player cards for each player
      const playerCards: Record<string, any[]> = {};
      group.players.forEach(player => {
        playerCards[player.id] = [];
      });
      
      const gameStateData = {
        groupId,
        name,
        deck: fullDeck,
        playerCards,
        cardHistory: [],
        currentCard: null,
        isActive: 1,
        cardValues: group.cardValues,
        createdBy: userId
      };
      
      const gameState = await storage.createGameState(gameStateData);
      res.status(201).json(gameState);
    } catch (error) {
      console.error('Error creating game state:', error);
      res.status(500).json({ message: 'Failed to create game state' });
    }
  });

  // Secure card assignment endpoint
  app.post('/api/game-state/:id/assign-card', isAuthenticated, async (req, res) => {
    try {
      const { cardId, playerId, groupId, cardType } = req.body;
      
      if (!playerId) {
        return res.status(400).json({ message: 'Player ID is required' });
      }
      
      // Handle both cardId (direct assignment) and cardType (from deck)
      if (!cardId && !cardType) {
        return res.status(400).json({ message: 'Either Card ID or Card Type is required' });
      }

      const gameState = await storage.getGameStateById(req.params.id);
      if (!gameState) {
        return res.status(404).json({ message: 'Game state not found' });
      }

      // Get group to validate players and get card values
      const group = await storage.getGroup(gameState.groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      // Find the card in the static deck (all cards always exist)
      let card: Card | undefined;
      let currentlyAssignedPlayerId: string | null = null;
      let updatedPlayerCards = { ...gameState.playerCards };
      
      if (cardId) {
        // Direct card assignment by ID - find in deck
        card = gameState.deck.find((deckCard: Card) => deckCard.id === cardId);
      } else if (cardType) {
        // Find card in deck by type
        card = gameState.deck.find((deckCard: Card) => {
          if (deckCard.type === 'custom') {
            return deckCard.name?.toLowerCase() === cardType.toLowerCase();
          }
          return deckCard.type === cardType;
        });
      }
      
      if (!card) {
        console.log(`[DEBUG] Card not found - cardType: ${cardType}, available cards:`, gameState.deck.map(c => ({ type: c.type, name: c.name })));
        return res.status(404).json({ message: `Card of type '${cardType}' not found in deck` });
      }

      // Check if card is currently assigned to someone else and remove it
      for (const [pid, cards] of Object.entries(gameState.playerCards)) {
        const assignedCardIndex = cards.findIndex(assignedCard => assignedCard.id === card!.id);
        if (assignedCardIndex !== -1) {
          currentlyAssignedPlayerId = pid;
          // Remove from current player
          updatedPlayerCards[pid] = cards.filter(assignedCard => assignedCard.id !== card!.id);
          break;
        }
      }
      
      const player = group.players.find(p => p.id === playerId);
      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }

      // Add card to new player's cards (deck stays unchanged)
      if (!updatedPlayerCards[playerId]) {
        updatedPlayerCards[playerId] = [];
      }
      updatedPlayerCards[playerId] = [...updatedPlayerCards[playerId], card];

      // Get card value (server-side calculation)
      let cardValue = 0;
      if (card.type === 'custom') {
        const customCard = group?.customCards.find(c => c.id === card.id);
        cardValue = customCard?.value || 0;
        console.log(`[DEBUG] Custom card lookup - cardId: ${card.id}, found: ${!!customCard}, value: ${cardValue}, available custom cards:`, group?.customCards?.map(c => ({ id: c.id, name: c.name, value: c.value })));
      } else {
        cardValue = gameState.cardValues[card.type] || 0;
      }
      
      console.log(`[DEBUG] Card assignment - cardType: ${card.type}, cardName: ${card.name}, cardValue: ${cardValue}`);

      // Create card assignment record
      const assignment: CardAssignment = {
        cardId: card.id,
        playerId: player!.id,
        cardType: card.type,
        cardName: card.name || '',
        cardEmoji: card.emoji,
        playerName: player!.name,
        playerColor: player!.color,
        cardValue: cardValue,
        timestamp: new Date().toISOString()
      };

      // Add to card history
      const newCardHistory = [...gameState.cardHistory, assignment];

      // Update game state (deck stays unchanged, only assignments change)
      const updatedGameState = await storage.updateGameState(req.params.id, {
        playerCards: updatedPlayerCards,
        cardHistory: newCardHistory,
        currentCard: card
      });

      res.json(updatedGameState);
    } catch (error) {
      console.error('Error assigning card:', error);
      res.status(500).json({ message: 'Failed to assign card' });
    }
  });

  // Secure payout calculation endpoint
  app.get('/api/game-state/:id/payouts', isAuthenticated, async (req, res) => {
    try {
      const gameState = await storage.getGameStateById(req.params.id);
      if (!gameState) {
        return res.status(404).json({ message: 'Game state not found' });
      }

      const group = await storage.getGroup(gameState.groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      // Server-side calculation to prevent tampering
      const payoutResult = calculateProportionalShare(gameState.cardHistory, group.players);
      const whoOwesWho = calculateWhoOwesWho(payoutResult.payouts);

      res.json({
        proportionalShare: payoutResult,
        whoOwesWho
      });
    } catch (error) {
      console.error('Error calculating payouts:', error);
      res.status(500).json({ message: 'Failed to calculate payouts' });
    }
  });

  // Update card values in game state
  app.patch('/api/games/:id/card-values', isAuthenticated, async (req, res) => {
    try {
      const gameState = await storage.getGameStateById(req.params.id);
      if (!gameState) {
        return res.status(404).json({ message: 'Game state not found' });
      }

      // Merge new card values with existing ones
      const updatedCardValues = { 
        ...gameState.cardValues, 
        ...req.body 
      };

      const updatedGameState = await storage.updateGameState(req.params.id, {
        cardValues: updatedCardValues
      });

      res.json(updatedGameState);
    } catch (error) {
      console.error('Error updating card values:', error);
      res.status(500).json({ message: 'Failed to update card values' });
    }
  });

  // Create game under group
  app.post('/api/groups/:groupId/games', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name } = req.body;
      const groupId = req.params.groupId;
      
      // Validate basic required fields
      if (!name) {
        return res.status(400).json({ message: 'name is required' });
      }
      
      // Get the group to access player data
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Initialize game with default deck plus custom cards
      const standardDeck = [
        { id: 'camel-1', type: 'camel', emoji: '🐫' },
        { id: 'camel-2', type: 'camel', emoji: '🐫' },
        { id: 'fish-1', type: 'fish', emoji: '🐟' },
        { id: 'fish-2', type: 'fish', emoji: '🐟' },
        { id: 'roadrunner-1', type: 'roadrunner', emoji: '🏃' },
        { id: 'roadrunner-2', type: 'roadrunner', emoji: '🏃' },
        { id: 'ghost-1', type: 'ghost', emoji: '👻' },
        { id: 'ghost-2', type: 'ghost', emoji: '👻' },
        { id: 'skunk-1', type: 'skunk', emoji: '🦨' },
        { id: 'skunk-2', type: 'skunk', emoji: '🦨' },
        { id: 'snake-1', type: 'snake', emoji: '🐍' },
        { id: 'snake-2', type: 'snake', emoji: '🐍' },
        { id: 'yeti-1', type: 'yeti', emoji: '☃️' },
        { id: 'yeti-2', type: 'yeti', emoji: '☃️' }
      ];
      
      // Add custom cards to deck
      const customCardsInDeck = (group.customCards || []).map(customCard => ({
        id: customCard.id,
        type: 'custom' as const,
        emoji: customCard.emoji,
        name: customCard.name
      }));
      
      const fullDeck = [...standardDeck, ...customCardsInDeck];
      
      // Initialize empty player cards for each player
      const playerCards: Record<string, any[]> = {};
      group.players.forEach(player => {
        playerCards[player.id] = [];
      });
      
      const gameStateData = {
        groupId,
        name,
        deck: fullDeck,
        playerCards,
        cardHistory: [],
        currentCard: null,
        isActive: 1,
        cardValues: group.cardValues,
        createdBy: userId
      };
      
      const gameState = await storage.createGameState(gameStateData);
      res.status(201).json(gameState);
    } catch (error) {
      console.error('Error creating game state:', error);
      res.status(500).json({ message: 'Failed to create game state' });
    }
  });

  // Games endpoints (protected) - return game states for deck/card game functionality
  app.get('/api/groups/:groupId/games', isAuthenticated, async (req, res) => {
    try {
      const gameStates = await storage.getGameStates(req.params.groupId);
      res.json(gameStates);
    } catch (error) {
      console.error('Error fetching game states:', error);
      res.status(500).json({ message: 'Failed to fetch game states' });
    }
  });

  app.post('/api/points-games', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { groupId, gameStateId, name } = req.body;
      
      if (!groupId || !name) {
        return res.status(400).json({ message: 'groupId and name are required' });
      }
      
      // Require gameStateId for proper isolation
      if (!gameStateId) {
        return res.status(400).json({ 
          message: 'gameStateId is required to create a 2/9/16 game linked to a specific card game session.' 
        });
      }

      // Check if a points game already exists for this specific game session
      const existingGames = await storage.getPointsGames(groupId, gameStateId);
      if (existingGames.length > 0) {
        return res.status(400).json({ 
          message: 'A 2/9/16 game already exists for this game session. Only one points game per game session is allowed.' 
        });
      }
      
      // Simple points game creation with user isolation and game session linking
      const pointsGameData = {
        groupId,
        gameStateId, // Link to specific card game session
        name,
        holes: {}, // Initialize empty holes object
        points: {}, // Initialize empty points object
        isActive: true,
        payoutMode: 'points',
        pointValue: 1.00,
        fbtValue: 10.00,
        createdBy: userId
      };
      
      const game = await storage.createPointsGame(pointsGameData);
      res.status(201).json(game);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      console.error('Error creating points game:', error);
      res.status(500).json({ message: 'Failed to create points game' });
    }
  });

  // Add missing game state queries for frontend compatibility
  app.get('/api/groups/:groupId/games', isAuthenticated, async (req, res) => {
    try {
      const gameStates = await storage.getGameStates(req.params.groupId);
      res.json(gameStates);
    } catch (error) {
      console.error('Error fetching game states:', error);
      res.status(500).json({ message: 'Failed to fetch game states' });
    }
  });

  // Add missing draw card endpoint
  app.post('/api/game-state/:id/draw-card', isAuthenticated, async (req, res) => {
    try {
      const gameState = await storage.getGameStateById(req.params.id);
      if (!gameState) {
        return res.status(404).json({ message: 'Game state not found' });
      }

      if (gameState.deck.length === 0) {
        return res.status(400).json({ message: 'No cards left in deck' });
      }

      // Draw random card from deck
      const randomIndex = Math.floor(Math.random() * gameState.deck.length);
      const drawnCard = gameState.deck[randomIndex];
      
      // Update game state with current card
      const updatedGameState = await storage.updateGameState(req.params.id, {
        currentCard: drawnCard
      });

      res.json(updatedGameState);
    } catch (error) {
      console.error('Error drawing card:', error);
      res.status(500).json({ message: 'Failed to draw card' });
    }
  });

  // CRITICAL: Add missing points games routes that were in routes.ts but not here
  // Points Game routes - Get all points games for a group/gameState
  app.get("/api/points-games/:groupId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { gameStateId } = req.query; // Optional gameStateId filter
      console.log(`Fetching points games for group ${req.params.groupId}, gameState: ${gameStateId}, by user ${userId}`);
      const allPointsGames = await storage.getPointsGames(req.params.groupId, gameStateId as string);
      console.log(`Found ${allPointsGames.length} total points games:`, allPointsGames.map(g => ({ id: g.id, name: g.name, gameStateId: g.gameStateId })));
      
      // CRITICAL FIX: Don't filter by user ownership for points games - they should be shared within groups
      // Legacy points games don't have createdBy field, and group members should see all games
      console.log(`Returning all ${allPointsGames.length} points games for group`);
      
      res.json(allPointsGames);
    } catch (error) {
      console.error('Error fetching points games:', error);
      res.status(500).json({ message: "Failed to fetch points games" });
    }
  });

  // Get specific points game by ID
  app.get("/api/points-games/:id", isAuthenticated, async (req, res) => {
    try {
      const pointsGame = await storage.getPointsGame(req.params.id);
      if (!pointsGame) {
        return res.status(404).json({ message: "Points game not found" });
      }
      res.json(pointsGame);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch points game" });
    }
  });

  // Update hole scores for a points game
  app.put("/api/points-games/:id/hole/:hole", isAuthenticated, async (req, res) => {
    try {
      const { id, hole } = req.params;
      const { strokes } = req.body; // { playerId: strokes }
      
      const pointsGame = await storage.getPointsGame(id);
      if (!pointsGame) {
        return res.status(404).json({ message: "Points game not found" });
      }

      // Calculate points for this hole using the secure calculation
      const holePoints = calculate2916Points(strokes);
      
      // Update the holes and points data
      const updatedHoles = { ...pointsGame.holes };
      const updatedPoints = { ...pointsGame.points };
      
      updatedHoles[parseInt(hole)] = strokes;
      updatedPoints[parseInt(hole)] = holePoints;

      const updatedGame = await storage.updatePointsGame(id, {
        holes: updatedHoles,
        points: updatedPoints
      });

      res.json(updatedGame);
    } catch (error) {
      console.error('Error updating hole scores:', error);
      res.status(500).json({ message: "Failed to update hole scores" });
    }
  });

  // Add missing join group endpoint
  app.post('/api/groups/join', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { shareCode } = req.body;
      
      if (!shareCode) {
        return res.status(400).json({ message: 'Share code is required' });
      }

      const group = await storage.getGroupByShareCode(shareCode);
      if (!group) {
        return res.status(404).json({ message: 'Invalid share code' });
      }

      // In a real implementation, you might want to add the user to the group
      // For now, just return the group if they can access it
      res.json(group);
    } catch (error) {
      console.error('Error joining group:', error);
      res.status(500).json({ message: 'Failed to join group' });
    }
  });

  // Add custom card management endpoints
  app.post('/api/groups/:groupId/custom-cards', isAuthenticated, async (req, res) => {
    try {
      const { name, emoji, value } = req.body;
      
      if (!name || !emoji || value === undefined) {
        return res.status(400).json({ message: 'Name, emoji, and value are required' });
      }

      const group = await storage.getGroup(req.params.groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      const newCard = {
        id: `custom-${Date.now()}`,
        name,
        emoji,
        value: parseFloat(value)
      };

      const updatedCustomCards = [...group.customCards, newCard];
      const updatedGroup = await storage.updateGroup(req.params.groupId, {
        customCards: updatedCustomCards
      });

      // CRITICAL FIX: Add the new custom card to any active game decks
      const activeGameStates = await storage.getActiveGamesByGroup(req.params.groupId);
      for (const gameState of activeGameStates) {
        // Add the new custom card to the deck
        const newDeckCard = {
          id: newCard.id,
          type: 'custom' as const,
          emoji: newCard.emoji,
          name: newCard.name
        };
        
        const updatedDeck = [...gameState.deck, newDeckCard];
        await storage.updateGameState(gameState.id, {
          deck: updatedDeck
        });
        
        console.log(`Added custom card "${newCard.name}" to deck of active game "${gameState.name}" - NOT auto-assigned to any player`);
      }

      res.json(updatedGroup);
    } catch (error) {
      console.error('Error creating custom card:', error);
      res.status(500).json({ message: 'Failed to create custom card' });
    }
  });

  app.delete('/api/groups/:groupId/custom-cards/:cardId', isAuthenticated, async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      const cardToDelete = group.customCards.find(card => card.id === req.params.cardId);
      if (!cardToDelete) {
        return res.status(404).json({ message: 'Custom card not found' });
      }

      const updatedCustomCards = group.customCards.filter(card => card.id !== req.params.cardId);
      const updatedGroup = await storage.updateGroup(req.params.groupId, {
        customCards: updatedCustomCards
      });

      // CRITICAL FIX: Remove deleted custom card from all active game states
      const activeGameStates = await storage.getActiveGamesByGroup(req.params.groupId);
      for (const gameState of activeGameStates) {
        let needsUpdate = false;
        
        // Remove from deck
        const updatedDeck = gameState.deck.filter(card => card.id !== req.params.cardId);
        if (updatedDeck.length !== gameState.deck.length) {
          needsUpdate = true;
          console.log(`Removed custom card "${cardToDelete.name}" from deck of game "${gameState.name}"`);
        }
        
        // Remove from player cards
        const updatedPlayerCards = { ...gameState.playerCards };
        for (const playerId in updatedPlayerCards) {
          const originalLength = updatedPlayerCards[playerId].length;
          updatedPlayerCards[playerId] = updatedPlayerCards[playerId].filter(card => card.id !== req.params.cardId);
          if (updatedPlayerCards[playerId].length !== originalLength) {
            needsUpdate = true;
            console.log(`Removed custom card "${cardToDelete.name}" from player ${playerId} in game "${gameState.name}"`);
          }
        }
        
        // Remove from card history - filter out assignments and also update the history
        const updatedCardHistory = gameState.cardHistory.filter(historyItem => historyItem.cardId !== req.params.cardId);
        if (updatedCardHistory.length !== gameState.cardHistory.length) {
          needsUpdate = true;
          console.log(`Removed custom card "${cardToDelete.name}" from card history of game "${gameState.name}"`);
        }
        
        // Update current card if it's the deleted custom card
        let updatedCurrentCard = gameState.currentCard;
        if (gameState.currentCard && gameState.currentCard.id === req.params.cardId) {
          updatedCurrentCard = null;
          needsUpdate = true;
          console.log(`Removed custom card "${cardToDelete.name}" from current card of game "${gameState.name}"`);
        }
        
        if (needsUpdate) {
          await storage.updateGameState(gameState.id, {
            deck: updatedDeck,
            playerCards: updatedPlayerCards,
            cardHistory: updatedCardHistory,
            currentCard: updatedCurrentCard
          });
        }
      }

      res.json(updatedGroup);
    } catch (error) {
      console.error('Error deleting custom card:', error);
      res.status(500).json({ message: 'Failed to delete custom card' });
    }
  });

  // Add missing PUT endpoint for points game hole updates
  app.put('/api/points-games/:gameId/hole/:hole', isAuthenticated, async (req, res) => {
    try {
      const { gameId, hole } = req.params;
      const { strokes, points } = req.body;
      
      if (!strokes || !points) {
        return res.status(400).json({ message: 'Strokes and points are required' });
      }

      const updatedGame = await storage.updateHoleScores(gameId, parseInt(hole), strokes, points);
      if (!updatedGame) {
        return res.status(404).json({ message: 'Points game not found' });
      }

      res.json(updatedGame);
    } catch (error) {
      console.error('Error updating hole scores:', error);
      res.status(500).json({ message: 'Failed to update hole scores' });
    }
  });

  // Secure hole scores update with server-side points calculation
  app.post('/api/games/:gameId/holes/:hole/scores', isAuthenticated, async (req, res) => {
    try {
      const { gameId, hole } = req.params;
      const { scores } = req.body; // scores: { playerId: strokes }
      
      const game = await storage.getPointsGame(gameId);
      if (!game) {
        return res.status(404).json({ message: 'Points game not found' });
      }

      // Server-side points calculation to prevent tampering
      const points = calculate2916Points(scores);

      // Update both holes and points
      await storage.updateHoleScores(gameId, parseInt(hole), scores, points);

      const updatedGame = await storage.getPointsGame(gameId);
      res.json(updatedGame);
    } catch (error) {
      console.error('Error updating hole scores:', error);
      res.status(500).json({ message: 'Failed to update hole scores' });
    }
  });

  // 2/9/16 Who Owes Who calculation endpoint
  app.get('/api/points-games/:gameId/who-owes-who', isAuthenticated, async (req, res) => {
    try {
      const { gameId } = req.params;
      const { pointValue, payoutMode, fbtValue } = req.query;

      const game = await storage.getPointsGame(gameId);
      if (!game) {
        return res.status(404).json({ message: 'Points game not found' });
      }

      const group = await storage.getGroup(game.groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      // Calculate payouts based on the mode
      const players = group.players;
      let payouts: Record<string, number> = {};

      if (payoutMode === 'points' && pointValue) {
        // Points-based payouts - Each player compares to every other player
        const pointValueNum = parseFloat(pointValue as string) || 0;
        const totalPoints: Record<string, number> = {};
        
        players.forEach(player => {
          totalPoints[player.id] = 0;
          Object.values(game.points || {}).forEach(holePoints => {
            totalPoints[player.id] += holePoints[player.id] || 0;
          });
        });

        // Initialize net payouts to 0
        players.forEach(player => {
          payouts[player.id] = 0;
        });

        // Points Algorithm: Compare every pair of players (i < j to avoid double counting)
        for (let i = 0; i < players.length; i++) {
          for (let j = i + 1; j < players.length; j++) {
            const player1 = players[i];
            const player2 = players[j];
            const points1 = totalPoints[player1.id] || 0;
            const points2 = totalPoints[player2.id] || 0;
            
            const diff = points1 - points2;
            if (diff > 0) {
              // Player1 has more points, receives payment
              payouts[player1.id] += diff * pointValueNum;
              payouts[player2.id] -= diff * pointValueNum;
            } else if (diff < 0) {
              // Player2 has more points, receives payment  
              payouts[player2.id] += (-diff) * pointValueNum;
              payouts[player1.id] -= (-diff) * pointValueNum;
            }
            // If diff === 0, no payment needed
          }
        }
      } else if (payoutMode === 'fbt' && fbtValue) {
        // FBT-based payouts
        const fbtValueNum = parseFloat(fbtValue as string) || 0;
        
        players.forEach(player => {
          payouts[player.id] = 0;
        });

        // Calculate stroke totals
        const front9Strokes: Record<string, number> = {};
        const back9Strokes: Record<string, number> = {};
        const totalStrokes: Record<string, number> = {};
        
        players.forEach(player => {
          front9Strokes[player.id] = 0;
          back9Strokes[player.id] = 0;
          totalStrokes[player.id] = 0;
          
          for (let hole = 1; hole <= 18; hole++) {
            const holeStrokes = game.holes?.[hole]?.[player.id] || 0;
            totalStrokes[player.id] += holeStrokes;
            
            if (hole <= 9) {
              front9Strokes[player.id] += holeStrokes;
            } else {
              back9Strokes[player.id] += holeStrokes;
            }
          }
        });

        // FBT Algorithm: Each segment is a separate fixed pot game
        // Convert strokes to points (higher points = better performance for FBT)
        const front9Points: Record<string, number> = {};
        const back9Points: Record<string, number> = {};
        const totalPoints: Record<string, number> = {};
        
        players.forEach(player => {
          // For FBT, we need to convert strokes to points where lower strokes = higher points
          // We'll use negative strokes so that Math.max gives us the winner (lowest stroke count)
          if (front9Strokes[player.id] > 0) {
            front9Points[player.id] = -front9Strokes[player.id];
          }
          if (back9Strokes[player.id] > 0) {
            back9Points[player.id] = -back9Strokes[player.id];  
          }
          if (totalStrokes[player.id] > 0) {
            totalPoints[player.id] = -totalStrokes[player.id];
          }
        });

        const segments = [front9Points, back9Points, totalPoints];
        
        segments.forEach(segment => {
          const segmentPlayers = Object.keys(segment);
          if (segmentPlayers.length === 0) return;
          
          // Find max score (winner - remember we negated strokes)
          const maxScore = Math.max(...Object.values(segment));
          const winners = segmentPlayers.filter(p => segment[p] === maxScore);
          const losers = segmentPlayers.filter(p => !winners.includes(p));
          
          // If all tied, skip (no payouts)
          if (winners.length === segmentPlayers.length) {
            return;
          }
          
          // Winner and loser shares
          const winShare = fbtValueNum / winners.length;
          const loseShare = fbtValueNum / losers.length;
          
          winners.forEach(winner => {
            payouts[winner] += winShare;
          });
          
          losers.forEach(loser => {
            payouts[loser] -= loseShare;
          });
        });
      }

      // Calculate Who Owes Who
      const whoOwesWho = calculate2916WhoOwesWho(players, payouts);

      res.json({ whoOwesWho, payouts });
    } catch (error) {
      console.error('Error calculating 2/9/16 who owes who:', error);
      res.status(500).json({ message: 'Failed to calculate who owes who' });
    }
  });

  // Get FBT-specific payouts for combined calculations
  app.get('/api/points-games/:gameId/fbt-payouts/:fbtValue', isAuthenticated, async (req, res) => {
    try {
      const { gameId, fbtValue } = req.params;
      
      const game = await storage.getPointsGame(gameId);
      if (!game) {
        return res.status(404).json({ message: 'Points game not found' });
      }
      
      const group = await storage.getGroup(game.groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      const players = group.players;
      const fbtValueNum = parseFloat(fbtValue) || 0;
      let payouts: Record<string, number> = {};

      if (fbtValueNum <= 0) {
        players.forEach(player => {
          payouts[player.id] = 0;
        });
      } else {
        // FBT-based payouts calculation - same logic as above
        players.forEach(player => {
          payouts[player.id] = 0;
        });

        // Calculate stroke totals
        const front9Strokes: Record<string, number> = {};
        const back9Strokes: Record<string, number> = {};
        const totalStrokes: Record<string, number> = {};
        
        players.forEach(player => {
          front9Strokes[player.id] = 0;
          back9Strokes[player.id] = 0;
          totalStrokes[player.id] = 0;
          
          for (let hole = 1; hole <= 18; hole++) {
            const holeStrokes = game.holes?.[hole]?.[player.id] || 0;
            totalStrokes[player.id] += holeStrokes;
            
            if (hole <= 9) {
              front9Strokes[player.id] += holeStrokes;
            } else {
              back9Strokes[player.id] += holeStrokes;
            }
          }
        });

        // FBT Algorithm: Each segment is a separate fixed pot game
        // Convert strokes to points (higher points = better performance for FBT)
        const front9Points: Record<string, number> = {};
        const back9Points: Record<string, number> = {};
        const totalPoints: Record<string, number> = {};
        
        players.forEach(player => {
          // For FBT, we need to convert strokes to points where lower strokes = higher points
          // We'll use negative strokes so that Math.max gives us the winner (lowest stroke count)
          if (front9Strokes[player.id] > 0) {
            front9Points[player.id] = -front9Strokes[player.id];
          }
          if (back9Strokes[player.id] > 0) {
            back9Points[player.id] = -back9Strokes[player.id];  
          }
          if (totalStrokes[player.id] > 0) {
            totalPoints[player.id] = -totalStrokes[player.id];
          }
        });

        const segments = [front9Points, back9Points, totalPoints];
        
        segments.forEach(segment => {
          const segmentPlayers = Object.keys(segment);
          if (segmentPlayers.length === 0) return;
          
          // Find max score (winner - remember we negated strokes)
          const maxScore = Math.max(...Object.values(segment));
          const winners = segmentPlayers.filter(p => segment[p] === maxScore);
          const losers = segmentPlayers.filter(p => !winners.includes(p));
          
          // If all tied, skip (no payouts)
          if (winners.length === segmentPlayers.length) {
            return;
          }
          
          // Winner and loser shares
          const winShare = fbtValueNum / winners.length;
          const loseShare = fbtValueNum / losers.length;
          
          winners.forEach(winner => {
            payouts[winner] += winShare;
          });
          
          losers.forEach(loser => {
            payouts[loser] -= loseShare;
          });
        });
      }
      
      const transactions = calculate2916WhoOwesWho(players, payouts);
      
      res.json({
        payouts,
        transactions
      });
    } catch (error) {
      console.error('Error calculating FBT payouts:', error);
      res.status(500).json({ message: 'Failed to calculate FBT payouts' });
    }
  });

  // Get points-only payouts for a specific points game
  app.get('/api/points-games/:gameId/points-payouts/:pointValue', isAuthenticated, async (req, res) => {
    try {
      const { gameId, pointValue } = req.params;
      const pointValueNum = parseFloat(pointValue);
      
      if (isNaN(pointValueNum) || pointValueNum <= 0) {
        return res.json({ payouts: {}, transactions: [] });
      }

      const pointsGame = await storage.getPointsGame(gameId);
      if (!pointsGame) {
        return res.status(404).json({ message: 'Points game not found' });
      }

      // Get the group to access player information
      const group = await storage.getGroup(pointsGame.groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      // Calculate total points for each player - SERVER SIDE ONLY
      const totalPoints: Record<string, number> = {};
      group.players.forEach(player => {
        totalPoints[player.id] = 0;
        Object.values(pointsGame.points || {}).forEach(holePoints => {
          totalPoints[player.id] += holePoints[player.id] || 0;
        });
      });
      
      // Points Algorithm: Compare every pair of players (i < j to avoid double counting)
      const payouts: Record<string, number> = {};
      group.players.forEach(player => {
        payouts[player.id] = 0;
      });
      
      for (let i = 0; i < group.players.length; i++) {
        for (let j = i + 1; j < group.players.length; j++) {
          const player1 = group.players[i];
          const player2 = group.players[j];
          const points1 = totalPoints[player1.id] || 0;
          const points2 = totalPoints[player2.id] || 0;
          
          const diff = points1 - points2;
          if (diff > 0) {
            // Player1 has more points, receives payment
            payouts[player1.id] += diff * pointValueNum;
            payouts[player2.id] -= diff * pointValueNum;
          } else if (diff < 0) {
            // Player2 has more points, receives payment  
            payouts[player2.id] += (-diff) * pointValueNum;
            payouts[player1.id] -= (-diff) * pointValueNum;
          }
          // If diff === 0, no payment needed
        }
      }
      
      console.log(`Points payouts for game ${gameId} (Point Value: $${pointValue}):`, payouts);

      res.json({
        payouts,
        transactions: [] // Could implement transaction logic here if needed
      });
    } catch (error) {
      console.error('Error calculating points payouts:', error);
      res.status(500).json({ message: 'Failed to calculate points payouts' });
    }
  });

  // Advanced Combined Games API using Python reference implementation
  app.post('/api/calculate-combined-games', isAuthenticated, async (req, res) => {
    try {
      const { 
        groupId, 
        gameStateId, 
        pointsGameId, 
        selectedGames, // ['cards', 'points', 'fbt']
        pointValue, 
        fbtValue 
      } = req.body;

      // Validation
      if (!groupId || !selectedGames || !Array.isArray(selectedGames) || selectedGames.length === 0) {
        return res.status(400).json({ message: 'Group ID and selected games are required' });
      }

      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      const gameNets: Record<string, number>[] = [];

      // Cards game calculation
      if (selectedGames.includes('cards') && gameStateId) {
        const gameState = await storage.getGameStateById(gameStateId);
        if (gameState && gameState.cardHistory && gameState.cardHistory.length > 0) {
          // Calculate card debts
          const cardDebts: Record<string, number> = {};
          group.players.forEach(player => {
            cardDebts[player.id] = 0;
          });

          // Get current card assignments (latest for each card)
          const currentAssignments: Record<string, any> = {};
          gameState.cardHistory.forEach(assignment => {
            currentAssignments[assignment.cardId] = assignment;
          });

          // Sum up debts from current assignments
          Object.values(currentAssignments).forEach((assignment: any) => {
            if (cardDebts[assignment.playerId] !== undefined) {
              cardDebts[assignment.playerId] += assignment.cardValue || 0;
            }
          });

          const cardsNet = calculateCardsGame(cardDebts);
          console.log('Cards Game Debug:', { cardDebts, cardsNet });
          gameNets.push(cardsNet);
        }
      }

      // Points game calculation
      if (selectedGames.includes('points') && pointsGameId && pointValue) {
        const pointsGame = await storage.getPointsGame(pointsGameId);
        if (pointsGame) {
          // Calculate total points for each player
          const totalPoints: Record<string, number> = {};
          group.players.forEach(player => {
            totalPoints[player.id] = 0;
            Object.values(pointsGame.points || {}).forEach(holePoints => {
              totalPoints[player.id] += holePoints[player.id] || 0;
            });
          });

          const pointsNet = calculatePointsGame(totalPoints, parseFloat(pointValue));
          console.log('Points Game Debug:', { totalPoints, pointValue, pointsNet });
          gameNets.push(pointsNet);
        }
      }

      // FBT game calculation
      if (selectedGames.includes('fbt') && pointsGameId && fbtValue) {
        const pointsGame = await storage.getPointsGame(pointsGameId);
        if (pointsGame) {
          // Calculate stroke totals for front 9, back 9, and total
          const front9Strokes: Record<string, number> = {};
          const back9Strokes: Record<string, number> = {};
          const totalStrokes: Record<string, number> = {};
          
          group.players.forEach(player => {
            front9Strokes[player.id] = 0;
            back9Strokes[player.id] = 0;
            totalStrokes[player.id] = 0;
            
            for (let hole = 1; hole <= 18; hole++) {
              const holeStrokes = pointsGame.holes?.[hole]?.[player.id] || 0;
              totalStrokes[player.id] += holeStrokes;
              
              if (hole <= 9) {
                front9Strokes[player.id] += holeStrokes;
              } else {
                back9Strokes[player.id] += holeStrokes;
              }
            }
          });

          // For FBT, we work directly with strokes - lower strokes win each segment
          // The calculateFbtGame function expects "points" where higher = better
          // So we convert strokes to negative values so lower strokes = higher "points"
          const front9Points: Record<string, number> = {};
          const back9Points: Record<string, number> = {};
          const totalPoints: Record<string, number> = {};

          Object.entries(front9Strokes).forEach(([playerId, strokes]) => {
            if (strokes > 0) {
              // Convert strokes to negative points so lower strokes = higher points
              front9Points[playerId] = -strokes;
            }
          });

          Object.entries(back9Strokes).forEach(([playerId, strokes]) => {
            if (strokes > 0) {
              back9Points[playerId] = -strokes;
            }
          });

          Object.entries(totalStrokes).forEach(([playerId, strokes]) => {
            if (strokes > 0) {
              totalPoints[playerId] = -strokes;
            }
          });

          console.log('FBT Combined Games Debug:', {
            front9Strokes,
            back9Strokes,
            totalStrokes,
            front9Points,
            back9Points,
            totalPoints,
            fbtValue: parseFloat(fbtValue)
          });

          const fbtNet = calculateFbtGame(front9Points, back9Points, totalPoints, parseFloat(fbtValue));
          console.log('FBT Game Debug:', { fbtNet });
          gameNets.push(fbtNet);
        }
      }

      // Combine all games
      const combinedNet = combineGames(...gameNets);
      console.log('Combined Games Final Debug:', { 
        gameNets, 
        combinedNet, 
        selectedGames 
      });
      
      // Calculate who owes who
      const transactions = settleWhoOwesWho(combinedNet);

      // Convert to expected format
      const payouts: Record<string, number> = {};
      group.players.forEach(player => {
        payouts[player.id] = combinedNet[player.id] || 0;
      });

      // Convert transactions to expected format
      const formattedTransactions = transactions.map(t => ({
        from: t.from,
        fromName: group.players.find(p => p.id === t.from)?.name || '',
        to: t.to,
        toName: group.players.find(p => p.id === t.to)?.name || '',
        amount: t.amount
      }));

      res.json({
        payouts,
        transactions: formattedTransactions,
        selectedGames,
        success: true
      });

    } catch (error) {
      console.error('Error calculating combined games:', error);
      res.status(500).json({ message: 'Failed to calculate combined games' });
    }
  });

  // Combined Cards + 2/9/16 Who Owes Who calculation endpoint
  app.get('/api/combined-who-owes-who/:groupId', isAuthenticated, async (req, res) => {
    try {
      const { groupId } = req.params;
      const { gameId, pointsGameId, pointValue, payoutMode, fbtValue } = req.query;

      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      let cardPayouts: any[] = [];
      let pointsPayouts: any[] = [];

      // Get card game payouts if gameId provided
      if (gameId) {
        const gameState = await storage.getGameStateById(gameId as string);
        if (gameState) {
          const payoutResult = calculateProportionalShare(gameState.cardHistory || [], group.players);
          cardPayouts = payoutResult.payouts;
        }
      }

      // Get points game payouts if pointsGameId provided
      if (pointsGameId && (pointValue || fbtValue)) {
        const pointsGame = await storage.getPointsGame(pointsGameId as string);
        if (pointsGame) {
          const players = group.players;
          let payouts: Record<string, number> = {};

          if (payoutMode === 'points' && pointValue) {
            // Points-based payouts calculation (same as above)
            const pointValueNum = parseFloat(pointValue as string) || 0;
            const totalPoints: Record<string, number> = {};
            
            players.forEach(player => {
              totalPoints[player.id] = 0;
              Object.values(pointsGame.points || {}).forEach(holePoints => {
                totalPoints[player.id] += holePoints[player.id] || 0;
              });
            });

            players.forEach(player => {
              payouts[player.id] = 0;
            });

            // Points Algorithm: Compare every pair of players (i < j to avoid double counting)
            for (let i = 0; i < players.length; i++) {
              for (let j = i + 1; j < players.length; j++) {
                const player1 = players[i];
                const player2 = players[j];
                const points1 = totalPoints[player1.id] || 0;
                const points2 = totalPoints[player2.id] || 0;
                
                const diff = points1 - points2;
                if (diff > 0) {
                  // Player1 has more points, receives payment
                  payouts[player1.id] += diff * pointValueNum;
                  payouts[player2.id] -= diff * pointValueNum;
                } else if (diff < 0) {
                  // Player2 has more points, receives payment  
                  payouts[player2.id] += (-diff) * pointValueNum;
                  payouts[player1.id] -= (-diff) * pointValueNum;
                }
                // If diff === 0, no payment needed
              }
            }
          } else if (payoutMode === 'fbt' && fbtValue) {
            // FBT-based payouts calculation (same as above)
            const fbtValueNum = parseFloat(fbtValue as string) || 0;
            
            players.forEach(player => {
              payouts[player.id] = 0;
            });

            const front9Strokes: Record<string, number> = {};
            const back9Strokes: Record<string, number> = {};
            const totalStrokes: Record<string, number> = {};
            
            players.forEach(player => {
              front9Strokes[player.id] = 0;
              back9Strokes[player.id] = 0;
              totalStrokes[player.id] = 0;
              
              for (let hole = 1; hole <= 18; hole++) {
                const holeStrokes = pointsGame.holes?.[hole]?.[player.id] || 0;
                totalStrokes[player.id] += holeStrokes;
                
                if (hole <= 9) {
                  front9Strokes[player.id] += holeStrokes;
                } else {
                  back9Strokes[player.id] += holeStrokes;
                }
              }
            });

            let totalWinnings = 0;
            const winners = new Set<string>();

            if (Object.values(front9Strokes).some(s => s > 0)) {
              const front9Winner = players.reduce((winner, player) => 
                front9Strokes[player.id] > 0 && (front9Strokes[winner.id] === 0 || front9Strokes[player.id] < front9Strokes[winner.id]) ? player : winner
              );
              if (front9Strokes[front9Winner.id] > 0) {
                payouts[front9Winner.id] += fbtValueNum;
                totalWinnings += fbtValueNum;
                winners.add(front9Winner.id);
              }
            }

            if (Object.values(back9Strokes).some(s => s > 0)) {
              const back9Winner = players.reduce((winner, player) => 
                back9Strokes[player.id] > 0 && (back9Strokes[winner.id] === 0 || back9Strokes[player.id] < back9Strokes[winner.id]) ? player : winner
              );
              if (back9Strokes[back9Winner.id] > 0) {
                payouts[back9Winner.id] += fbtValueNum;
                totalWinnings += fbtValueNum;
                winners.add(back9Winner.id);
              }
            }

            if (Object.values(totalStrokes).some(s => s > 0)) {
              const totalWinner = players.reduce((winner, player) => 
                totalStrokes[player.id] > 0 && (totalStrokes[winner.id] === 0 || totalStrokes[player.id] < totalStrokes[winner.id]) ? player : winner
              );
              if (totalStrokes[totalWinner.id] > 0) {
                payouts[totalWinner.id] += fbtValueNum;
                totalWinnings += fbtValueNum;
                winners.add(totalWinner.id);
              }
            }

            // CRITICAL FIX: Only non-winners pay the cost, not ALL players
            const nonWinners = players.filter(p => !winners.has(p.id) && totalStrokes[p.id] > 0);
            if (nonWinners.length > 0 && totalWinnings > 0) {
              const costPerLoser = totalWinnings / nonWinners.length;
              nonWinners.forEach(player => {
                payouts[player.id] -= costPerLoser;
              });
            }
          }

          pointsPayouts = players.map(player => ({
            playerId: player.id,
            playerName: player.name,
            netPayout: payouts[player.id] || 0
          }));
        }
      }

      // Calculate combined Who Owes Who
      const whoOwesWho = calculateCombinedWhoOwesWho(cardPayouts, pointsPayouts);

      res.json({ 
        whoOwesWho, 
        cardPayouts, 
        pointsPayouts,
        combinedPayouts: whoOwesWho.length > 0 
      });
    } catch (error) {
      console.error('Error calculating combined who owes who:', error);
      res.status(500).json({ message: 'Failed to calculate combined who owes who' });
    }
  });

  // WebSocket stats endpoint (admin) - only available in production
  app.get('/api/admin/websocket-stats', isAuthenticated, async (req, res) => {
    if (process.env.NODE_ENV !== 'production') {
      return res.json({ message: 'WebSocket stats only available in production', rooms: 0, connections: 0 });
    }
    try {
      // wsManager would be available in production scope
      res.json({ message: 'WebSocket manager not initialized', rooms: 0, connections: 0 });
    } catch (error) {
      console.error('Error getting WebSocket stats:', error);
      res.status(500).json({ message: 'Failed to get WebSocket stats' });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Only setup WebSocket in production or when specifically needed
  // In development, avoid conflicts with Vite's WebSocket
  if (process.env.NODE_ENV === 'production') {
    try {
      const wsManager = new SecureWebSocketManager(httpServer);
      console.log('WebSocket manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebSocket manager:', error);
      console.log('Application will continue without WebSocket functionality');
    }
  }
  
  return httpServer;
}