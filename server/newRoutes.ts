import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage.js";
import { setupAuth, isAuthenticated, generateRoomToken, requireAdmin } from "./replitAuth.js";
import { calculateCardGameDetails, calculate2916Points, validateCardAssignment, calculateCardsGame, calculatePointsGame, calculateFbtGame, buildFbtNetsFromPointsGame, combineGames, settleWhoOwesWho, combineTotals, generateSettlement, calculateBBBPointsGame, calculateBBBFbtGame } from "./secureGameLogic.js";
import { SecureWebSocketManager } from "./secureWebSocket.js";
import { registerUser, authenticateUser, registerSchema, loginSchema } from "./localAuth.js";
import { insertGroupSchema, insertGameStateSchema, insertPointsGameSchema, cardValuesSchema, pointsGameSettingsSchema, gameStates, roomStates, userPreferences, insertUserPreferencesSchema, passwordResetTokens, insertPasswordResetTokenSchema, users, type Card, type CardAssignment } from "@shared/schema";
import { db } from "./db.js";
import { sql, eq, and, gt, isNotNull } from "drizzle-orm";
import { sendForgotPasswordEmail } from "./emailService.js";
import { stripeService, SUBSCRIPTION_PLANS, stripe } from "./stripeService.js";
import { requireSubscriptionAccess, isPublicRoute } from "./subscriptionMiddleware.js";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Apply subscription middleware to protected routes only
  const subscriptionProtected = (req: any, res: any, next: any) => {
    return requireSubscriptionAccess(req, res, next);
  };

  // Offline sync endpoints
  app.post('/api/offline-sync/card-assignment', isAuthenticated, subscriptionProtected, async (req, res) => {
    try {
      const { gameId, playerId, cardType, timestamp } = req.body;
      const userId = (req as any).user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Validate game access
      const gameState = await storage.getGameState(gameId);
      if (!gameState) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Get group to verify user has access
      const group = await storage.getGroup(gameState.groupId);
      if (!group || group.createdBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Apply card assignment by updating game state
      const updatedPlayerCards = { ...gameState.playerCards };
      if (!updatedPlayerCards[playerId]) {
        updatedPlayerCards[playerId] = [];
      }
      
      // Add the card to player's cards
      const cardToAdd = gameState.deck.find(card => card.type === cardType);
      if (cardToAdd) {
        updatedPlayerCards[playerId].push(cardToAdd);
        
        // Get player and card details for proper CardAssignment record
        const group = await storage.getGroup(gameState.groupId);
        const player = group?.players.find(p => p.id === playerId);
        const cardValue = gameState.cardValues[cardType as keyof typeof gameState.cardValues] || 2;
        
        // Update card history with proper CardAssignment structure
        const updatedCardHistory = [...gameState.cardHistory, {
          cardId: cardToAdd.id,
          cardType,
          cardName: cardToAdd.name || cardType,
          cardEmoji: cardToAdd.emoji,
          cardValue,
          playerId,
          playerName: player?.name || 'Unknown',
          playerColor: player?.color || '#000000',
          timestamp: new Date(timestamp).toISOString()
        }];
        
        // Update game state
        await storage.updateGameState(gameId, {
          playerCards: updatedPlayerCards,
          cardHistory: updatedCardHistory
        });
      }

      res.json({ message: "Card assignment synced successfully" });
    } catch (error) {
      console.error('Error syncing card assignment:', error);
      res.status(500).json({ message: "Failed to sync card assignment" });
    }
  });

  app.post('/api/offline-sync/points-score', isAuthenticated, subscriptionProtected, async (req, res) => {
    try {
      const { gameId, playerId, hole, points, gameType, timestamp } = req.body;
      const userId = (req as any).user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Find the points game
      const pointsGames = await storage.getPointsGames(gameId, userId);
      const pointsGame = pointsGames.find((pg: any) => 
        pg.gameType === (gameType === 'bbb' ? 'bbb' : 'points')
      );

      if (!pointsGame) {
        return res.status(404).json({ message: "Points game not found" });
      }

      // Update the score using existing method
      await storage.updateHoleScores(pointsGame.id, hole, { [playerId]: 0 }, { [playerId]: points });

      res.json({ message: "Points score synced successfully" });
    } catch (error) {
      console.error('Error syncing points score:', error);
      res.status(500).json({ message: "Failed to sync points score" });
    }
  });

  // Auth routes - removed duplicate, using the one below

  // Local authentication routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      const user = await registerUser(validatedData);
      
      // Auto-grant 7-day trial to new users
      const trialDays = 7;
      const updatedUser = await storage.grantManualTrial(user.id, {
        grantedBy: null, // Auto-granted, not by a specific admin
        days: trialDays,
        reason: 'Auto-granted on registration'
      });
      
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
      console.log(`✅ Auto-granted ${trialDays}-day trial to new user ${user.id} (ends ${trialEndsAt.toISOString()})`);
      
      // Use the updated user object with trial fields
      const userWithTrial = updatedUser || user;
      
      // Auto-login the user after successful registration
      (req as any).user = {
        claims: {
          sub: userWithTrial.id,
          email: userWithTrial.email,
          first_name: userWithTrial.firstName,
          last_name: userWithTrial.lastName,
        },
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      };
      
      req.login((req as any).user, async (err) => {
        if (err) {
          console.error('Auto-login failed after registration:', err);
          // Still return success but user will need to login manually
          const { passwordHash, ...userResponse } = userWithTrial;
          return res.status(201).json({ 
            message: "User registered successfully. Please log in.",
            user: userResponse 
          });
        }
        
        // Return success - user now has trial access
        const { passwordHash, ...userResponse } = userWithTrial;
        res.status(201).json({ 
          message: "Account created successfully! Welcome to ForeScore.",
          user: userResponse,
          hasTrialAccess: true,
          trialEndsAt: trialEndsAt.toISOString()
        });
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
      
      req.login((req as any).user, async (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        
        // Check subscription status after successful login
        try {
          const accessInfo = await stripeService.hasAccess(user.id);
          
          // Return user data with subscription info for frontend routing
          const { passwordHash, ...userResponse } = user;
          res.json({ 
            message: "Login successful",
            user: userResponse,
            requiresSubscription: !accessInfo.hasAccess
          });
        } catch (error) {
          console.error('Error checking subscription during login:', error);
          // Still allow login but let middleware handle subscription later
          const { passwordHash, ...userResponse } = user;
          res.json({ 
            message: "Login successful",
            user: userResponse 
          });
        }
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

  // Subscription routes for V7.0
  app.get('/api/subscription/plans', (req, res) => {
    res.json(SUBSCRIPTION_PLANS);
  });

  app.post('/api/subscription/create', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { planKey } = req.body;
      
      if (!planKey || !SUBSCRIPTION_PLANS[planKey]) {
        return res.status(400).json({ message: 'Invalid plan selected' });
      }
      
      // STEP 1: Create SetupIntent to collect payment method first
      const setupIntent = await stripeService.createSetupIntent(userId, planKey);
      res.json({
        clientSecret: setupIntent.clientSecret,
        planKey: setupIntent.planKey,
      });
    } catch (error) {
      console.error('Setup intent creation error:', error);
      res.status(500).json({ 
        message: 'Failed to create subscription setup',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/subscription/status', isAuthenticated, async (req: any, res) => {
    try {
      // Force browser to always fetch fresh subscription data (no caching)
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const userId = req.user.claims.sub;
      const access = await stripeService.hasAccess(userId);
      res.json(access);
    } catch (error) {
      console.error('Subscription status error:', error);
      res.status(500).json({ message: 'Failed to check subscription status' });
    }
  });

  app.post('/api/subscription/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await stripeService.cancelSubscription(userId);
      res.json({ message: 'Subscription canceled successfully' });
    } catch (error) {
      console.error('Subscription cancellation error:', error);
      res.status(500).json({ 
        message: 'Failed to cancel subscription',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/subscription/sync', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await stripeService.syncSubscriptionFromStripe(userId);
      res.json({ message: 'Subscription data synced successfully' });
    } catch (error) {
      console.error('Subscription sync error:', error);
      res.status(500).json({ 
        message: 'Failed to sync subscription data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });


  // Temporary admin endpoint to sync all subscriptions (REMOVE IN PRODUCTION)
  app.post('/api/admin/sync-all-subscriptions', async (req, res) => {
    try {
      // Get all users with Stripe subscription IDs
      const usersWithSubscriptions = await db
        .select()
        .from(users)
        .where(isNotNull(users.stripeSubscriptionId));
      
      const results = [];
      
      for (const user of usersWithSubscriptions) {
        try {
          await stripeService.syncSubscriptionFromStripe(user.id);
          results.push({ userId: user.id, email: user.email, status: 'success' });
          console.log(`✅ Synced subscription for user: ${user.email}`);
        } catch (error) {
          results.push({ 
            userId: user.id, 
            email: user.email, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
          console.error(`❌ Failed to sync for user ${user.email}:`, error);
        }
      }
      
      res.json({ 
        message: `Synced subscriptions for ${results.filter(r => r.status === 'success').length}/${results.length} users`,
        results 
      });
    } catch (error) {
      console.error('Admin sync error:', error);
      res.status(500).json({ 
        message: 'Failed to sync subscriptions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // MISSING WEBHOOK ENDPOINT - This was the bug!
  app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!endpointSecret) {
        console.warn('No webhook secret configured - accepting all webhook events');
        const event = req.body;
        await stripeService.handleWebhook(event);
        return res.status(200).json({ received: true });
      }
      
      const event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret);
      await stripeService.handleWebhook(event);
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: 'Webhook signature verification failed' });
    }
  });

  // Create subscription after payment setup (called by frontend)
  app.post('/api/subscription/create-after-setup', isAuthenticated, async (req: any, res) => {
    try {
      const { setupIntentId } = req.body;
      
      if (!setupIntentId) {
        return res.status(400).json({ message: 'SetupIntent ID required' });
      }
      
      const result = await stripeService.createSubscriptionAfterPayment(setupIntentId);
      res.json({ message: 'Subscription created successfully', result });
    } catch (error) {
      console.error('Subscription creation after setup error:', error);
      res.status(500).json({ 
        message: 'Failed to create subscription',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Manual completion endpoint to fix current user
  app.post('/api/subscription/complete-setup', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log('🔧 Manual completion for user:', userId);
      
      const user = await storage.getUser(userId);
      console.log('👤 User found:', user ? { 
        id: user.id, 
        email: user.email, 
        stripeCustomerId: user.stripeCustomerId 
      } : 'null');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (!user.stripeCustomerId) {
        return res.status(400).json({ message: 'No Stripe customer ID found' });
      }
      
      // Find the most recent SetupIntent for this user
      console.log('🔍 Looking for SetupIntents for customer:', user.stripeCustomerId);
      const setupIntents = await stripe.setupIntents.list({
        customer: user.stripeCustomerId,
        limit: 10,
      });
      
      console.log('📋 Found SetupIntents:', setupIntents.data.map(si => ({
        id: si.id,
        status: si.status,
        metadata: si.metadata
      })));
      
      if (setupIntents.data.length === 0) {
        return res.status(400).json({ message: 'No SetupIntent found' });
      }
      
      const setupIntent = setupIntents.data[0];
      console.log('✅ Using SetupIntent:', setupIntent.id, 'Status:', setupIntent.status);
      
      if (setupIntent.status === 'succeeded') {
        console.log('🎯 Creating subscription after payment...');
        const result = await stripeService.createSubscriptionAfterPayment(setupIntent.id);
        console.log('🎉 Subscription creation result:', result);
        res.json({ message: 'Subscription created successfully', result });
      } else {
        res.status(400).json({ message: `SetupIntent not completed. Status: ${setupIntent.status}` });
      }
    } catch (error) {
      console.error('Manual completion error:', error);
      res.status(500).json({ 
        message: 'Failed to complete subscription',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // V6.8: Password Reset Routes
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      
      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      if (!user) {
        // Don't reveal whether email exists for security
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }
      
      // Only allow password reset for local auth users
      if (user.authMethod !== 'local') {
        return res.status(400).json({ message: "Password reset is not available for this account type." });
      }
      
      // Generate secure token
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      
      // Store token in database
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
        used: 0
      });
      
      // Create password reset link  
      const loginLink = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
      
      // Send email
      const emailSent = await sendForgotPasswordEmail({
        to: user.email!,
        firstName: user.firstName || 'User',
        loginLink
      });
      
      // Always return success for security (don't reveal if email send failed)
      // Log internally for debugging but don't expose to user
      if (!emailSent) {
        console.error('Magic link email failed to send for user:', user.id);
      }
      
      res.json({ message: "If an account with that email exists, a link to reset your password has been sent." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid email format', 
          errors: error.errors 
        });
      }
      console.error("Magic link error:", error);
      res.status(500).json({ message: "An error occurred. Please try again." });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token } = z.object({ 
        token: z.string()
      }).parse(req.body);
      
      // Find valid token
      const [resetToken] = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            eq(passwordResetTokens.used, 0),
            gt(passwordResetTokens.expiresAt, new Date())
          )
        )
        .limit(1);
      
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset token." });
      }
      
      // Get user for login
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, resetToken.userId))
        .limit(1);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid reset token." });
      }
      
      // Don't mark token as used yet - save for when password is actually updated
      
      // Token is valid - allow password reset
      res.json({ 
        message: "Token validated successfully.",
        success: true,
        userId: user.id
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid data', 
          errors: error.errors 
        });
      }
      console.error("Reset password validation error:", error);
      res.status(500).json({ message: "An error occurred. Please try again." });
    }
  });

  // Actually update the password
  app.post('/api/auth/update-password', async (req, res) => {
    try {
      const { token, userId, password } = z.object({ 
        token: z.string(),
        userId: z.string(),
        password: z.string().min(8, "Password must be at least 8 characters")
      }).parse(req.body);
      
      // Find valid token again
      const [resetToken] = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            eq(passwordResetTokens.userId, userId),
            eq(passwordResetTokens.used, 0),
            gt(passwordResetTokens.expiresAt, new Date())
          )
        )
        .limit(1);
      
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset token." });
      }
      
      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Update user password
      await db
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, userId));
      
      // Mark token as used
      await db
        .update(passwordResetTokens)
        .set({ used: 1 })
        .where(eq(passwordResetTokens.id, resetToken.id));
      
      res.json({ message: "Password reset successfully. You can now log in with your new password." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid data', 
          errors: error.errors 
        });
      }
      console.error("Update password error:", error);
      res.status(500).json({ message: "Failed to update password. Please try again." });
    }
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

  // V6.5: User Preferences Endpoints for tab persistence
  app.get('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      
      const [preference] = await db
        .select()
        .from(userPreferences)
        .where(sql`${userPreferences.userId} = ${userId}`)
        .limit(1);
      
      if (preference) {
        res.json(preference);
      } else {
        // Return default preferences if none exist
        res.json({ 
          userId,
          currentTab: 'groups',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error getting user preferences:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const { currentTab, selectedGroupId, selectedGameId } = req.body;
      
      // Validate currentTab value
      if (currentTab) {
        const validTabs = ['groups', 'games', 'scoreboard', 'rules'];
        if (!validTabs.includes(currentTab)) {
          return res.status(400).json({ message: 'Invalid tab value' });
        }
      }
      
      // Check if preferences exist
      const [existing] = await db
        .select()
        .from(userPreferences)
        .where(sql`${userPreferences.userId} = ${userId}`)
        .limit(1);
      
      // Build update object with only provided fields
      const updateData: any = { updatedAt: new Date() };
      if (currentTab !== undefined) updateData.currentTab = currentTab;
      if (selectedGroupId !== undefined) updateData.selectedGroupId = selectedGroupId;
      if (selectedGameId !== undefined) updateData.selectedGameId = selectedGameId;
      
      if (existing) {
        // Update existing preferences
        const [updated] = await db
          .update(userPreferences)
          .set(updateData)
          .where(sql`${userPreferences.userId} = ${userId}`)
          .returning();
        
        res.json(updated);
      } else {
        // Create new preferences
        const [created] = await db
          .insert(userPreferences)
          .values({
            userId,
            currentTab: currentTab || 'groups',
            selectedGroupId,
            selectedGameId
          })
          .returning();
        
        res.json(created);
      }
    } catch (error) {
      console.error('Error saving user preferences:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Email preferences endpoints
  app.get('/api/user/email-preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      
      const [user] = await db
        .select({
          marketingPreferenceStatus: users.marketingPreferenceStatus,
          marketingConsentAt: users.marketingConsentAt,
          marketingUnsubscribeAt: users.marketingUnsubscribeAt
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error getting email preferences:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/user/email-preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const { unsubscribe } = z.object({
        unsubscribe: z.boolean()
      }).parse(req.body);
      
      const marketingPreferenceStatus = unsubscribe ? 'unsubscribed' : 'subscribed';
      const marketingUnsubscribeAt = unsubscribe ? new Date() : null;
      
      // Update user's marketing preferences
      const updatedUser = await storage.updateMarketingPreferences(userId, {
        marketingPreferenceStatus,
        marketingUnsubscribeAt
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ 
        marketingPreferenceStatus: updatedUser.marketingPreferenceStatus,
        marketingUnsubscribeAt: updatedUser.marketingUnsubscribeAt,
        message: unsubscribe ? 
          'You have successfully unsubscribed from marketing emails. You may still receive essential account or service-related communications.' :
          'You have subscribed to marketing communications.'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid data', 
          errors: error.errors 
        });
      }
      console.error('Error updating email preferences:', error);
      res.status(500).json({ message: 'Internal server error' });
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
  app.get('/api/groups', isAuthenticated, subscriptionProtected, async (req: any, res) => {
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

  app.post('/api/groups', isAuthenticated, subscriptionProtected, async (req: any, res) => {
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
  app.post('/api/game-state', isAuthenticated, subscriptionProtected, async (req: any, res) => {
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
      
      // Automatically create a 2/9/16 points game linked to this card game session
      const pointsGameData = {
        groupId,
        gameStateId: gameState.id, // Link to the newly created card game
        name: `${name} - 2/9/16`,
        holes: {}, // Initialize empty holes object
        points: {}, // Initialize empty points object
        settings: { pointValue: 1, fbtValue: 10 }, // Default settings
        createdBy: userId
      };
      
      await storage.createPointsGame(pointsGameData);
      
      // Automatically create a BBB points game linked to this card game session
      const bbbGameData = {
        groupId,
        gameStateId: gameState.id, // Link to the newly created card game
        gameType: 'bbb' as const,
        name: `${name} - BBB`,
        holes: {}, // Initialize empty holes object
        points: {}, // Initialize empty points object  
        settings: { pointValue: 1, fbtValue: 10 }, // Default settings
        createdBy: userId
      };
      
      await storage.createPointsGame(bbbGameData);
      
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

      // Add cache-busting headers to ensure fresh calculations
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      // Log current card values for debugging
      console.log(`Calculating payouts for game ${req.params.id} with card values:`, gameState.cardValues);

      // Server-side calculation to prevent tampering
      const payoutResult = calculateCardGameDetails(gameState.cardHistory, group.players, gameState.cardValues);
      
      // Log calculation result for debugging
      console.log(`Payout calculation result:`, { 
        totalPot: payoutResult.totalPot, 
        payoutCount: payoutResult.payouts.length 
      });
      
      // Convert card game result to net payouts for settlement
      const netPayouts: Record<string, number> = {};
      payoutResult.payouts.forEach((p: any) => {
        netPayouts[p.playerId] = p.netPayout;
      });
      const whoOwesWho = settleWhoOwesWho(netPayouts).map(tx => ({
        fromPlayerId: tx.from,
        toPlayerId: tx.to,
        amount: tx.amount,
        fromPlayerName: group.players.find(p => p.id === tx.from)?.name || 'Unknown',
        toPlayerName: group.players.find(p => p.id === tx.to)?.name || 'Unknown'
      }));

      res.json({
        cardGame: payoutResult,
        whoOwesWho
      });
    } catch (error) {
      console.error('Error calculating payouts:', error);
      res.status(500).json({ message: 'Failed to calculate payouts' });
    }
  });

  // Update card values in game state
  // Legacy PATCH endpoint for card values (keep for backward compatibility)
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

  // New PUT endpoint for card values (autosave-compatible)
  app.put('/api/game-states/:gameId/card-values', isAuthenticated, async (req, res) => {
    try {
      // Validate card values input
      const validatedCardValues = cardValuesSchema.partial().parse(req.body.cardValues || req.body);
      
      const gameState = await storage.getGameStateById(req.params.gameId);
      if (!gameState) {
        return res.status(404).json({ message: 'Game state not found' });
      }

      // Log the card value update for debugging
      console.log(`Updating card values for game ${req.params.gameId}:`, {
        previous: gameState.cardValues,
        new: validatedCardValues,
        merged: { ...gameState.cardValues, ...validatedCardValues }
      });

      // Update with validated card values
      const updatedGameState = await storage.updateGameState(req.params.gameId, {
        cardValues: { ...gameState.cardValues, ...validatedCardValues }
      });

      if (!updatedGameState) {
        return res.status(500).json({ message: 'Failed to update game state' });
      }

      console.log(`Card values successfully updated. New values:`, updatedGameState.cardValues);

      res.json({ cardValues: updatedGameState.cardValues });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid card values', errors: error.errors });
      }
      console.error('Error updating card values:', error);
      res.status(500).json({ message: 'Failed to update card values' });
    }
  });

  // New PUT endpoint for points game settings (autosave-compatible)
  app.put('/api/points-games/:pointsGameId/settings', isAuthenticated, async (req, res) => {
    try {
      // Validate settings input
      const validatedSettings = pointsGameSettingsSchema.parse(req.body);
      
      const pointsGame = await storage.getPointsGame(req.params.pointsGameId);
      if (!pointsGame) {
        return res.status(404).json({ message: 'Points game not found' });
      }

      // Merge with existing settings
      const currentSettings = pointsGame.settings || { pointValue: 1, fbtValue: 10 };
      const newSettings = { ...currentSettings, ...validatedSettings };

      // Update the points game with new settings
      const updatedPointsGame = await storage.updatePointsGame(req.params.pointsGameId, {
        settings: newSettings
      });

      if (!updatedPointsGame) {
        return res.status(500).json({ message: 'Failed to update points game' });
      }

      res.json({ settings: updatedPointsGame.settings });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid settings', errors: error.errors });
      }
      console.error('Error updating points game settings:', error);
      res.status(500).json({ message: 'Failed to update points game settings' });
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
  app.get("/api/points-games/:groupId", isAuthenticated, subscriptionProtected, async (req: any, res) => {
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

  // V6 game sharing functionality removed in ForeScoreV5.20

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

  // BBB-specific hole update endpoint with comprehensive security and validation
  app.put('/api/bbb-games/:gameId/hole/:hole', isAuthenticated, subscriptionProtected, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request parameters
      const paramsSchema = z.object({
        gameId: z.string().uuid('Invalid game ID format'),
        hole: z.string().transform((val) => {
          const holeNumber = parseInt(val);
          if (isNaN(holeNumber) || holeNumber < 1 || holeNumber > 18) {
            throw new Error('Hole number must be between 1 and 18');
          }
          return holeNumber;
        })
      });
      
      // Validate request body
      const bodySchema = z.object({
        firstOn: z.string().optional(),
        closestTo: z.string().optional(),
        firstIn: z.string().optional()
      }).refine(data => 
        data.firstOn || data.closestTo || data.firstIn,
        { message: 'At least one BBB category must be provided' }
      );
      
      const { gameId, hole } = paramsSchema.parse(req.params);
      const { firstOn, closestTo, firstIn } = bodySchema.parse(req.body);
      
      const game = await storage.getPointsGame(gameId);
      if (!game) {
        return res.status(404).json({ message: 'BBB game not found' });
      }

      // Verify this is a BBB game
      if (game.gameType !== 'bbb') {
        return res.status(400).json({ message: 'This endpoint is only for BBB games' });
      }

      // Get group to get player list and verify user access
      const group = await storage.getGroup(game.groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // CRITICAL SECURITY: Verify user is member of this group
      if (group.createdBy !== userId) {
        const userIsMember = group.players.some(player => player.id === userId);
        if (!userIsMember) {
          return res.status(403).json({ message: 'Access denied: You are not a member of this group' });
        }
      }
      
      // Validate that all provided player IDs exist in the group
      const validPlayerIds = new Set(group.players.map(p => p.id));
      const providedPlayerIds = [firstOn, closestTo, firstIn].filter(Boolean);
      
      for (const playerId of providedPlayerIds) {
        if (!validPlayerIds.has(playerId!)) {
          return res.status(400).json({ 
            message: `Invalid player ID: ${playerId}. Player must be a member of this group.` 
          });
        }
      }

      // Build BBB hole data structure
      const bbbHoleData: { firstOn?: string; closestTo?: string; firstIn?: string } = {};
      if (firstOn) bbbHoleData.firstOn = firstOn;
      if (closestTo) bbbHoleData.closestTo = closestTo;
      if (firstIn) bbbHoleData.firstIn = firstIn;

      // Calculate BBB points (1 point per category won)
      const bbbPoints: Record<string, number> = {};
      
      // Initialize all players to 0 points for this hole
      group.players.forEach(player => {
        bbbPoints[player.id] = 0;
      });

      // Award points for each category
      if (firstOn) bbbPoints[firstOn] = (bbbPoints[firstOn] || 0) + 1;
      if (closestTo) bbbPoints[closestTo] = (bbbPoints[closestTo] || 0) + 1;
      if (firstIn) bbbPoints[firstIn] = (bbbPoints[firstIn] || 0) + 1;

      // Update the holes and points data
      const updatedHoles = { ...game.holes };
      const updatedPoints = { ...game.points };
      
      updatedHoles[hole] = bbbHoleData;
      updatedPoints[hole] = bbbPoints;

      const updatedGame = await storage.updatePointsGame(gameId, {
        holes: updatedHoles,
        points: updatedPoints
      });

      res.json(updatedGame);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid data', 
          errors: error.errors 
        });
      }
      console.error('Error updating BBB hole data:', error);
      res.status(500).json({ message: 'Failed to update BBB hole data' });
    }
  });

  // BBB Who Owes Who calculation endpoint with comprehensive security and validation
  app.get('/api/bbb-games/:gameId/who-owes-who', isAuthenticated, subscriptionProtected, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request parameters
      const paramsSchema = z.object({
        gameId: z.string().uuid('Invalid game ID format')
      });
      
      // Validate query parameters
      const querySchema = z.object({
        pointValue: z.string().optional().transform((val) => {
          if (!val) return 0;
          const num = parseFloat(val);
          if (isNaN(num) || num < 0) {
            throw new Error('Point value must be a non-negative number');
          }
          return num;
        }),
        payoutMode: z.enum(['points', 'fbt'], {
          errorMap: () => ({ message: 'Payout mode must be "points" or "fbt"' })
        }),
        fbtValue: z.string().optional().transform((val) => {
          if (!val) return 0;
          const num = parseFloat(val);
          if (isNaN(num) || num < 0) {
            throw new Error('FBT value must be a non-negative number');
          }
          return num;
        })
      }).refine(data => 
        (data.payoutMode === 'points' && data.pointValue > 0) ||
        (data.payoutMode === 'fbt' && data.fbtValue > 0),
        { message: 'Point value required for points mode, FBT value required for FBT mode' }
      );
      
      const { gameId } = paramsSchema.parse(req.params);
      const { pointValue, payoutMode, fbtValue } = querySchema.parse(req.query);

      const game = await storage.getPointsGame(gameId);
      if (!game) {
        return res.status(404).json({ message: 'BBB game not found' });
      }

      // Verify this is a BBB game
      if (game.gameType !== 'bbb') {
        return res.status(400).json({ message: 'This endpoint is only for BBB games' });
      }

      // Get group to access players and verify user access
      const group = await storage.getGroup(game.groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // CRITICAL SECURITY: Verify user is member of this group
      if (group.createdBy !== userId) {
        const userIsMember = group.players.some(player => player.id === userId);
        if (!userIsMember) {
          return res.status(403).json({ message: 'Access denied: You are not a member of this group' });
        }
      }

      const players = group.players;
      const payouts: Record<string, number> = {};

      // Initialize payouts
      players.forEach(player => {
        payouts[player.id] = 0;
      });

      // BBB uses the same payout calculation as 2/9/16 points game
      if (payoutMode === 'points' && pointValue > 0) {
        // Calculate point-based payouts (same logic as 2/9/16)
        const totalPointsByPlayer: Record<string, number> = {};
        players.forEach(player => {
          totalPointsByPlayer[player.id] = 0;
        });

        // Sum points across all holes
        Object.values(game.points || {}).forEach(holePoints => {
          Object.entries(holePoints).forEach(([playerId, points]) => {
            if (typeof points === 'number') {
              totalPointsByPlayer[playerId] += points;
            }
          });
        });

        // Head-to-head payout calculation
        for (let i = 0; i < players.length; i++) {
          for (let j = i + 1; j < players.length; j++) {
            const player1 = players[i];
            const player2 = players[j];
            
            const diff = totalPointsByPlayer[player1.id] - totalPointsByPlayer[player2.id];
            
            if (diff > 0) {
              // Player1 has more points, receives payment
              payouts[player1.id] += diff * pointValue;
              payouts[player2.id] -= diff * pointValue;
            } else if (diff < 0) {
              // Player2 has more points, receives payment  
              payouts[player2.id] += (-diff) * pointValue;
              payouts[player1.id] -= (-diff) * pointValue;
            }
          }
        }
      } else if (payoutMode === 'fbt' && fbtValue > 0) {
        // FBT calculation for BBB (same logic as 2/9/16)
        // Calculate point totals for FBT
        const front9Points: Record<string, number> = {};
        const back9Points: Record<string, number> = {};
        const totalPoints: Record<string, number> = {};
        
        players.forEach(player => {
          front9Points[player.id] = 0;
          back9Points[player.id] = 0;
          totalPoints[player.id] = 0;
          
          for (let hole = 1; hole <= 18; hole++) {
            const holePoints = game.points?.[hole]?.[player.id] || 0;
            const points = typeof holePoints === 'number' ? holePoints : 0;
            totalPoints[player.id] += points;
            
            if (hole <= 9) {
              front9Points[player.id] += points;
            } else {
              back9Points[player.id] += points;
            }
          }
        });

        const segments = [front9Points, back9Points, totalPoints];
        
        segments.forEach(segment => {
          const segmentPlayers = Object.keys(segment);
          if (segmentPlayers.length === 0) return;
          
          const maxPoints = Math.max(...segmentPlayers.map(id => segment[id]));
          const winners = segmentPlayers.filter(id => segment[id] === maxPoints && maxPoints > 0);
          
          if (winners.length > 0) {
            const payoutPerWinner = fbtValue / winners.length;
            const payoutPerLoser = fbtValue / segmentPlayers.length;
            
            segmentPlayers.forEach(playerId => {
              if (winners.includes(playerId)) {
                payouts[playerId] += payoutPerWinner;
              } else {
                payouts[playerId] -= payoutPerLoser;
              }
            });
          }
        });
      }

      // Use canonical settlement logic to ensure consistency with 2/9/16 payouts
      const whoOwesWho = settleWhoOwesWho(payouts).map(tx => ({
        fromPlayerId: tx.from,
        toPlayerId: tx.to,
        amount: tx.amount,
        fromPlayerName: players.find(p => p.id === tx.from)?.name || 'Unknown',
        toPlayerName: players.find(p => p.id === tx.to)?.name || 'Unknown'
      }));

      // Return same data structure as 2/9/16 payouts for consistency
      res.json({
        whoOwesWho,
        payouts,
        selectedGames: [payoutMode],
        success: true,
        totalTransactions: whoOwesWho.length,
        summary: payouts,
        cardGameDetails: null
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid data', 
          errors: error.errors 
        });
      }
      console.error('Error calculating BBB payouts:', error);
      res.status(500).json({ message: 'Failed to calculate BBB payouts' });
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
            const holeStrokesRaw = game.holes?.[hole]?.[player.id] || 0;
            // For 2/9/16 games, ensure we're working with numbers
            const holeStrokes = typeof holeStrokesRaw === 'number' ? holeStrokesRaw : parseInt(holeStrokesRaw as string) || 0;
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

      // Calculate Who Owes Who using canonical settlement logic
      const whoOwesWho = settleWhoOwesWho(payouts).map(tx => ({
        fromPlayerId: tx.from,
        toPlayerId: tx.to,
        amount: tx.amount,
        fromPlayerName: players.find(p => p.id === tx.from)?.name || 'Unknown',
        toPlayerName: players.find(p => p.id === tx.to)?.name || 'Unknown'
      }));

      res.json({ whoOwesWho, payouts });
    } catch (error) {
      console.error('Error calculating 2/9/16 who owes who:', error);
      res.status(500).json({ message: 'Failed to calculate who owes who' });
    }
  });

  // REMOVED: Legacy FBT endpoint - use /api/calculate-combined-games with selectedGames: ["fbt"]

  // REMOVED: Legacy points endpoint - use /api/calculate-combined-games with selectedGames: ["points"]

  // V6.5: Enhanced Calculate & Save Combined Games API
  app.post('/api/calculate-combined-games', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { groupId, gameStateId, pointsGameId, selectedGames, pointValue, fbtValue, saveResults = false } = req.body;
      
      console.log('🔍 ===== CALCULATE-COMBINED-GAMES REQUEST =====');
      console.log('🔍 REQUEST PARAMS:', {
        groupId,
        gameStateId,
        pointsGameId,
        selectedGames,
        pointValue,
        fbtValue,
        saveResults
      });
      
      if (!selectedGames || selectedGames.length === 0) {
        return res.status(400).json({ message: 'No games selected' });
      }

      const group = await storage.getGroup(groupId);
      const gameState = gameStateId ? await storage.getGameStateById(gameStateId) : null;
      const pointsGame = pointsGameId ? await storage.getPointsGame(pointsGameId) : null;
      
      // FIX: For mixed game scenarios, fetch ALL points games to access both types
      let allPointsGames = [];
      let regular2916Game = null;
      let bbbGame = null;
      
      // Always fetch all games if we have BBB games OR mixed scenarios
      const hasBBBGames = selectedGames.includes('bbb-points') || selectedGames.includes('bbb-fbt');
      const hasRegularGames = selectedGames.includes('points') || selectedGames.includes('fbt');
      
      if (hasBBBGames || hasRegularGames) {
        // Fetch all games to handle both individual and mixed scenarios - FIXED: pass gameStateId
        allPointsGames = await storage.getPointsGames(groupId, gameStateId || undefined);
        regular2916Game = allPointsGames.find(g => g.gameType === 'points');
        bbbGame = allPointsGames.find(g => g.gameType === 'bbb');
        console.log('🔍 MULTI-GAME FETCH - fetched games:', {
          regular2916GameId: regular2916Game?.id,
          bbbGameId: bbbGame?.id,
          selectedGames,
          totalGamesFound: allPointsGames.length,
          gameStateId: gameStateId || 'none'
        });
      }
      
      // DEBUG: Log what data we found
      console.log('🔍 DATA AVAILABLE:', {
        hasGroup: !!group,
        hasGameState: !!gameState,
        hasPointsGame: !!pointsGame,
        pointsGameType: pointsGame?.gameType,
        pointsGameName: pointsGame?.name,
        hasRegular2916Game: !!regular2916Game,
        hasBBBGame: !!bbbGame,
        regular2916GameId: regular2916Game?.id,
        bbbGameId: bbbGame?.id
      });
      if (!group) return res.status(404).json({ message: 'Group not found' });

      const nets: Record<string, number>[] = [];
      const activeGames: string[] = [];
      let cardGameDetails: any = null;

      // CARDS
      if (selectedGames.includes('cards') && gameState?.cardHistory?.length && gameState.cardHistory.length > 0) {
        // Use the exact same calculation as the working payouts endpoint
        const payoutResult = calculateCardGameDetails(gameState.cardHistory, group.players, gameState.cardValues || {});
        cardGameDetails = payoutResult;
        
        // Convert payouts to net amounts for settlement calculation
        const netPayouts: Record<string, number> = {};
        payoutResult.payouts.forEach((p: any) => {
          netPayouts[p.playerId] = p.netPayout;
        });
        
        nets.push(netPayouts);
        activeGames.push('cards');
      }

      // POINTS (Regular 2/9/16 game)
      const regularGameForPoints = regular2916Game || pointsGame;
      if (selectedGames.includes('points') && regularGameForPoints && parseFloat(pointValue) > 0) {
        console.log('🔍 REGULAR POINTS using game:', regularGameForPoints.id, 'type:', regularGameForPoints.gameType);
        const totals: Record<string, number> = {};
        for (const p of group.players) totals[p.id] = 0;
        for (const [, holePoints] of Object.entries(regularGameForPoints.points || {})) {
          for (const pid of Object.keys(totals)) {
            totals[pid] += holePoints?.[pid] || 0;
          }
        }
        nets.push(calculatePointsGame(totals, parseFloat(pointValue)));
        activeGames.push('points');
      }

      // FBT (Regular 2/9/16 game)
      const regularGameForFBT = regular2916Game || pointsGame;
      if (selectedGames.includes('fbt') && regularGameForFBT && parseFloat(fbtValue) > 0) {
        console.log('🔍 REGULAR FBT using game:', regularGameForFBT.id, 'type:', regularGameForFBT.gameType);
        // Convert null to undefined for type compatibility
        const pointsGameForFBT = {
          ...regularGameForFBT,
          points: regularGameForFBT.points || undefined
        };
        nets.push(buildFbtNetsFromPointsGame(group.players, pointsGameForFBT, parseFloat(fbtValue)));
        activeGames.push('fbt');
      }

      // BBB POINTS
      const bbbGameForPoints = bbbGame || (pointsGame?.gameType === 'bbb' ? pointsGame : null);
      const bbbPointsCondition = selectedGames.includes('bbb-points') && bbbGameForPoints && parseFloat(pointValue) > 0;
      console.log('🔍 BBB POINTS CHECK (UPDATED):', {
        includesBBBPoints: selectedGames.includes('bbb-points'),
        hasBBBGame: !!bbbGameForPoints,
        bbbGameId: bbbGameForPoints?.id,
        bbbGameType: bbbGameForPoints?.gameType,
        pointValue: parseFloat(pointValue),
        conditionMet: bbbPointsCondition
      });
      
      if (bbbPointsCondition) {
        const playerIds = group.players.map(p => p.id);
        const bbbHoleData = bbbGameForPoints.holes || {};
        console.log('🔍 BBB POINTS DATA (UPDATED):', {
          playerIds,
          bbbHoleDataKeys: Object.keys(bbbHoleData),
          bbbHoleData: JSON.stringify(bbbHoleData, null, 2)
        });
        
        const bbbPointsResult = calculateBBBPointsGame(bbbHoleData, playerIds, parseFloat(pointValue));
        console.log('🔍 BBB POINTS RESULT (UPDATED):', bbbPointsResult);
        
        nets.push(bbbPointsResult);
        activeGames.push('bbb-points');
      }

      // BBB FBT
      const bbbGameForFBT = bbbGame || (pointsGame?.gameType === 'bbb' ? pointsGame : null);
      const bbbFbtCondition = selectedGames.includes('bbb-fbt') && bbbGameForFBT && parseFloat(fbtValue) > 0;
      console.log('🔍 BBB FBT CHECK (UPDATED):', {
        includesBBBFbt: selectedGames.includes('bbb-fbt'),
        hasBBBGame: !!bbbGameForFBT,
        bbbGameId: bbbGameForFBT?.id,
        bbbGameType: bbbGameForFBT?.gameType,
        fbtValue: parseFloat(fbtValue),
        conditionMet: bbbFbtCondition
      });
      
      if (bbbFbtCondition) {
        const playerIds = group.players.map(p => p.id);
        const bbbHoleData = bbbGameForFBT.holes || {};
        console.log('🔍 BBB FBT DATA (UPDATED):', {
          playerIds,
          bbbHoleDataKeys: Object.keys(bbbHoleData),
          bbbHoleData: JSON.stringify(bbbHoleData, null, 2)
        });
        
        const bbbFbtResult = calculateBBBFbtGame(bbbHoleData, playerIds, parseFloat(fbtValue));
        console.log('🔍 BBB FBT RESULT (UPDATED):', bbbFbtResult);
        
        nets.push(bbbFbtResult);
        activeGames.push('bbb-fbt');
      }

      // Step 2: Combine nets by player KEY (canonical 3-step pipeline)
      console.log('🔍 COMBINATION STEP:', {
        totalNets: nets.length,
        netsData: nets.map((net, i) => ({ [`net${i}`]: net })),
        activeGames
      });
      
      const combinedNet = combineTotals(...nets);
      console.log('🔍 COMBINED RESULT:', combinedNet);
      
      // Step 3: Generate settlement from combined nets only (canonical pathway)
      const transactions = generateSettlement(combinedNet).map(t => {
        const fromPlayer = group.players.find(p => p.id === t.from);
        const toPlayer = group.players.find(p => p.id === t.to);
        return { ...t, fromName: fromPlayer?.name || 'Unknown', toName: toPlayer?.name || 'Unknown' };
      });
      
      console.log('🔍 FINAL TRANSACTIONS:', transactions);

      const result: any = { 
        payouts: combinedNet, 
        transactions, 
        selectedGames: activeGames, 
        success: true,
        totalTransactions: transactions.length,
        summary: combinedNet,
        cardGameDetails: cardGameDetails // Include detailed card game data for UI
      };

      // V6.5: Save results to database if requested
      if (saveResults && groupId) {
        try {
          const savedResult = await storage.saveCombinedPayoutResult({
            groupId,
            gameStateId: gameStateId || null,
            pointsGameId: pointsGameId || null,
            selectedGames: activeGames,
            pointValue: parseFloat(pointValue) || 1,
            fbtValue: parseFloat(fbtValue) || 10,
            calculationResult: {
              success: true,
              totalTransactions: transactions.length,
              transactions: transactions.map(t => ({
                from: t.from,
                fromName: t.fromName,
                to: t.to,
                toName: t.toName,
                amount: t.amount
              })),
              summary: combinedNet
            },
            createdBy: userId
          });
          result.savedId = savedResult.id;
          console.log('Combined payout results saved with ID:', savedResult.id);
        } catch (saveError) {
          console.error('Error saving combined payout results:', saveError);
          // Don't fail the request if save fails, just log it
        }
      }

      res.json(result);
    } catch (error) {
      console.error('Combined games calculation error:', error);
      res.status(500).json({ message: 'Failed to calculate combined games' });
    }
  });

  // V6.5: Get saved combined payout results
  app.get('/api/combined-payout-results/:groupId', isAuthenticated, async (req, res) => {
    try {
      const { groupId } = req.params;
      const { gameStateId, pointsGameId } = req.query;
      
      const result = await storage.getCombinedPayoutResult(
        groupId, 
        gameStateId as string, 
        pointsGameId as string
      );
      
      if (!result) {
        return res.status(404).json({ message: 'No saved results found' });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error retrieving combined payout results:', error);
      res.status(500).json({ message: 'Failed to retrieve saved results' });
    }
  });

  // DISABLED: Legacy Combined Cards + 2/9/16 Who Owes Who - use /api/calculate-combined-games
  /*
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
          const payoutResult = calculateProportionalShare(gameState.cardHistory || [], group.players, gameState.cardValues);
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

      // Calculate combined Who Owes Who using canonical settlement logic
      const combinedPayouts: Record<string, number> = {};
      const allPlayers = Array.from(new Set([
        ...cardPayouts.map(p => p.playerId),
        ...pointsPayouts.map(p => p.playerId)
      ]));
      
      allPlayers.forEach(playerId => {
        const cardPayout = cardPayouts.find(p => p.playerId === playerId)?.netPayout || 0;
        const pointsPayout = pointsPayouts.find(p => p.playerId === playerId)?.netPayout || 0;
        combinedPayouts[playerId] = cardPayout + pointsPayout;
      });
      
      const whoOwesWho = settleWhoOwesWho(combinedPayouts).map(tx => ({
        fromPlayerId: tx.from,
        toPlayerId: tx.to,
        amount: tx.amount,
        fromPlayerName: cardPayouts.find(p => p.playerId === tx.from)?.playerName || 
                       pointsPayouts.find(p => p.playerId === tx.from)?.playerName || 'Unknown',
        toPlayerName: cardPayouts.find(p => p.playerId === tx.to)?.playerName || 
                     pointsPayouts.find(p => p.playerId === tx.to)?.playerName || 'Unknown'
      }));

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
  */

  // Cleanup excess groups (beyond 5 most recent) that are 61+ days old
  app.post('/api/admin/cleanup-old-games', isAuthenticated, async (req, res) => {
    try {
      console.log('Starting cleanup of excess groups older than 61 days...');
      
      // Calculate date 61 days ago
      const sixtyOneDaysAgo = new Date();
      sixtyOneDaysAgo.setDate(sixtyOneDaysAgo.getDate() - 61);
      
      // Find groups to delete: users with 6+ groups, delete excess groups that are 61+ days old
      // Strategy: For each user, keep 5 most recent groups, delete older excess groups if 61+ days old
      const groupsToDelete = await db.execute(sql`
        WITH ranked_groups AS (
          SELECT 
            id,
            created_by,
            created_at,
            ROW_NUMBER() OVER (
              PARTITION BY created_by 
              ORDER BY COALESCE(last_played, created_at) DESC
            ) as row_num
          FROM groups
          WHERE created_by IS NOT NULL
        ),
        user_group_counts AS (
          SELECT created_by, COUNT(*) as total_groups
          FROM groups
          WHERE created_by IS NOT NULL
          GROUP BY created_by
          HAVING COUNT(*) > 5
        )
        SELECT rg.id
        FROM ranked_groups rg
        INNER JOIN user_group_counts ugc ON rg.created_by = ugc.created_by
        WHERE rg.row_num > 5 
          AND rg.created_at < ${sixtyOneDaysAgo.toISOString()}
      `);
      
      if (groupsToDelete.rows.length === 0) {
        return res.json({
          success: true,
          message: 'No excess groups older than 61 days found for cleanup',
          cleaned: {
            groups: 0,
            gameStates: 0,
            relatedData: 0
          }
        });
      }
      
      const groupIds = groupsToDelete.rows.map((row: any) => row.id);
      console.log(`Found ${groupIds.length} excess groups to clean up:`, groupIds);
      
      // Get associated game states for these groups
      const gameStatesToDelete = await db
        .select({ id: gameStates.id })
        .from(gameStates)
        .where(inArray(gameStates.groupId, groupIds));
      
      const gameStateIds = gameStatesToDelete.map(gs => gs.id);
      
      // Delete in correct order to respect foreign keys
      if (gameStateIds.length > 0) {
        // 1. Delete room states
        await db.delete(roomStates).where(inArray(roomStates.gameStateId, gameStateIds));
        
        // 2. Delete combined payout results
        await db.delete(combinedPayoutResults).where(inArray(combinedPayoutResults.gameStateId, gameStateIds));
        
        // 3. Delete points games
        await db.delete(pointsGames).where(inArray(pointsGames.gameStateId, gameStateIds));
        
        // 4. Delete game states
        await db.delete(gameStates).where(inArray(gameStates.id, gameStateIds));
      }
      
      // 5. Delete the groups themselves
      await db.delete(groups).where(inArray(groups.id, groupIds));
      
      console.log(`Cleanup completed: ${groupIds.length} groups and ${gameStateIds.length} game states deleted`);
      
      res.json({
        success: true,
        message: `Successfully cleaned up ${groupIds.length} excess groups older than 61 days`,
        cleaned: {
          groups: groupIds.length,
          gameStates: gameStateIds.length,
          relatedData: gameStateIds.length
        },
        cutoffDate: sixtyOneDaysAgo.toISOString()
      });
    } catch (error) {
      console.error('Error during cleanup:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to cleanup old games',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // User export endpoint (admin) - extracts all user data with live subscription status
  app.get('/api/admin/export-users', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      console.log('Admin user export requested by user:', (req as any).user?.claims?.sub);
      
      // Extract all users with basic info including marketing preferences
      const allUsers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          authMethod: users.authMethod,
          marketingPreferenceStatus: users.marketingPreferenceStatus,
          marketingConsentAt: users.marketingConsentAt,
          marketingUnsubscribeAt: users.marketingUnsubscribeAt,
          createdAt: users.createdAt
        })
        .from(users);
      
      console.log(`Found ${allUsers.length} users for export - fetching live subscription data...`);

      // Format for CSV export with live subscription information
      const csvData = await Promise.all(allUsers.map(async (user) => {
        // Get live subscription status for each user
        let subscriptionDisplay = 'No Subscription';
        let nextRenewal = '';
        
        try {
          const accessInfo = await stripeService.hasAccess(user.id);
          
          if (accessInfo.subscriptionStatus === 'active') {
            subscriptionDisplay = 'Active';
            if (accessInfo.nextRenewalDate) {
              nextRenewal = new Date(accessInfo.nextRenewalDate).toLocaleDateString();
            }
          } else if (accessInfo.subscriptionStatus === 'trialing') {
            if (accessInfo.trialEndsAt) {
              const trialEnd = new Date(accessInfo.trialEndsAt);
              subscriptionDisplay = `Trial (ends ${trialEnd.toLocaleDateString()})`;
            } else {
              subscriptionDisplay = 'Trial';
            }
          } else if (!accessInfo.hasAccess) {
            // Check the reason to determine status
            if (accessInfo.reason?.includes('Trial expired')) {
              subscriptionDisplay = 'Trial Expired';
            } else if (accessInfo.reason?.includes('Payment required')) {
              subscriptionDisplay = 'Payment Required';
            } else {
              subscriptionDisplay = 'No Subscription';
            }
          }
        } catch (error) {
          console.error(`Error fetching subscription for user ${user.id}:`, error);
          subscriptionDisplay = 'Status Check Failed';
        }
        
        return {
          'First Name': user.firstName || '',
          'Last Name': user.lastName || '',
          'Email Address': user.email || '',
          'Auth Method': user.authMethod || '',
          'Marketing Preference Status': user.marketingPreferenceStatus || 'pending',
          'Subscription Status': subscriptionDisplay,
          'Next Renewal': nextRenewal,
          'Created At': user.createdAt?.toISOString() || ''
        };
      }));

      // Set headers for CSV download
      const format = req.query.format || 'json';
      
      if (format === 'csv') {
        const csvHeaders = Object.keys(csvData[0] || {});
        const csvRows = csvData.map(row => 
          csvHeaders.map(header => `"${(row as any)[header]}"`).join(',')
        );
        const csvContent = [
          csvHeaders.join(','),
          ...csvRows
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="users_export.csv"');
        res.send(csvContent);
      } else {
        // Return JSON format
        res.json({
          success: true,
          count: allUsers.length,
          users: csvData,
          exportedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error exporting users:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to export user data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // WebSocket stats endpoint (admin) - only available in production
  app.get('/api/admin/websocket-stats', isAuthenticated, requireAdmin, async (req, res) => {
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

  // Manual Trial Management Endpoints (Admin)
  
  // Grant manual trial to a user
  app.post('/api/admin/grant-manual-trial', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const adminUserId = (req as any).user?.claims?.sub;
      const { userId, days = 10, reason } = z.object({
        userId: z.string(),
        days: z.number().min(1).max(365).default(10),
        reason: z.string().min(1, "Reason is required")
      }).parse(req.body);

      console.log(`Admin ${adminUserId} granting ${days}-day manual trial to user ${userId}: ${reason}`);

      const updatedUser = await storage.grantManualTrial(userId, {
        grantedBy: adminUserId,
        days,
        reason
      });

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        success: true,
        message: `Manual trial granted successfully for ${days} days`,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          manualTrialEndsAt: updatedUser.manualTrialEndsAt,
          manualTrialDays: updatedUser.manualTrialDays
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid data',
          errors: error.errors
        });
      }
      console.error('Error granting manual trial:', error);
      res.status(500).json({ message: 'Failed to grant manual trial' });
    }
  });

  // Search users for manual trial management
  app.get('/api/admin/users/search', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { q: searchTerm } = req.query;
      
      const users = await storage.getUsersForManualTrials(searchTerm as string);
      
      res.json({
        success: true,
        users: users.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          hasManualTrial: !!user.manualTrialEndsAt,
          manualTrialEndsAt: user.manualTrialEndsAt
        }))
      });
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ message: 'Failed to search users' });
    }
  });

  // Extend manual trial for a user
  app.put('/api/admin/extend-manual-trial/:userId', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const adminUserId = (req as any).user?.claims?.sub;
      const { userId } = req.params;
      const { additionalDays, reason } = z.object({
        additionalDays: z.number().min(1).max(365),
        reason: z.string().min(1, "Reason is required")
      }).parse(req.body);

      console.log(`Admin ${adminUserId} extending manual trial for user ${userId} by ${additionalDays} days: ${reason}`);

      const updatedUser = await storage.extendManualTrial(userId, additionalDays, reason);

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found or no active manual trial' });
      }

      res.json({
        success: true,
        message: `Manual trial extended by ${additionalDays} days`,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          manualTrialEndsAt: updatedUser.manualTrialEndsAt,
          manualTrialDays: updatedUser.manualTrialDays
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid data',
          errors: error.errors
        });
      }
      console.error('Error extending manual trial:', error);
      res.status(500).json({ message: 'Failed to extend manual trial' });
    }
  });

  // Revoke manual trial for a user
  app.delete('/api/admin/revoke-manual-trial/:userId', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const adminUserId = (req as any).user?.claims?.sub;
      const { userId } = req.params;

      console.log(`Admin ${adminUserId} revoking manual trial for user ${userId}`);

      const updatedUser = await storage.revokeManualTrial(userId);

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        success: true,
        message: 'Manual trial revoked successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName
        }
      });
    } catch (error) {
      console.error('Error revoking manual trial:', error);
      res.status(500).json({ message: 'Failed to revoke manual trial' });
    }
  });

  // List all active manual trials
  app.get('/api/admin/manual-trials', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const activeTrials = await storage.getActiveManualTrials();

      res.json({
        success: true,
        trials: activeTrials.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          manualTrialGrantedAt: user.manualTrialGrantedAt,
          manualTrialEndsAt: user.manualTrialEndsAt,
          manualTrialDays: user.manualTrialDays,
          manualTrialReason: user.manualTrialReason,
          daysRemaining: user.manualTrialEndsAt ? 
            Math.ceil((new Date(user.manualTrialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0
        }))
      });
    } catch (error) {
      console.error('Error listing manual trials:', error);
      res.status(500).json({ message: 'Failed to list manual trials' });
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