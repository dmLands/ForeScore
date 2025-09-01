# ForeScoreV5.13 - Complete Codebase for ChatGPT Audit

## CRITICAL ISSUES TO INVESTIGATE
1. **Calculation Bug**: Expected Ken: +$36.84, Daniel: -$21.67 vs Actual Ken: +$21.00, Daniel: -$5.83
2. **TypeScript Error**: Line 824-836 - Type 'unknown' not assignable to ReactNode
3. **UI Structure**: "🎯 Who Owes Who - 2/9/16 Games" tile display corruption

## TEST CASE FOR VALIDATION
- Game: "Bat Crew > Legacy"
- Card debts: Ken:11, Daniel:2, Brandon:4, Cody:2
- Expected combined payouts vs actual discrepancy

## PROJECT STRUCTURE
```
├── client/src/pages/home.tsx (2000+ lines - Main UI)
├── server/newRoutes.ts (800+ lines - API routes)  
├── server/secureGameLogic.ts (500+ lines - Calculations)
├── shared/schema.ts (200 lines - Database schema)
└── server/storage.ts (Database operations)
```

---

## FILE 1: client/src/pages/home.tsx

```typescript
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Gamepad2, BookOpen, ChevronRight, Edit, Layers, Trophy, ArrowLeft, Info, HelpCircle, LogOut, Menu } from "lucide-react";
import { CreateGroupModal } from "@/components/create-group-modal";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Tutorial } from "@/components/tutorial";

import { useAuth } from "@/hooks/useAuth";
import { useGameState } from "@/hooks/use-game-state";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Group, GameState, Card as GameCard, PointsGame } from "@shared/schema";

// Hook for server-side payouts calculation
function useGamePayouts(gameStateId: string | undefined) {
  return useQuery<{
    proportionalShare: {
      totalPot: number;
      maxDebt: number;
      payouts: Array<{
        playerId: string;
        playerName: string;
        debt: number;
        advantage: number;
        share: number;
        netPayout: number;
      }>;
    };
    whoOwesWho: Array<{
      from: string;
      fromName: string;
      to: string;
      toName: string;
      amount: number;
    }>;
  }>({
    queryKey: ['/api/game-state', gameStateId, 'payouts'],
    enabled: !!gameStateId,
    retry: false,
    refetchOnWindowFocus: true, // Enable auto-refresh on focus
    refetchInterval: 5000, // Auto-refresh every 5 seconds for real-time updates
    staleTime: 0, // Always consider stale to ensure fresh data
  });
}



// Utility functions for card styling and emojis
const getCardColor = (type: string) => {
  switch (type) {
    case 'camel': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'fish': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'roadrunner': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'ghost': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'skunk': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'snake': return 'bg-green-100 text-green-800 border-green-200';
    case 'yeti': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'custom': return 'bg-pink-100 text-pink-800 border-pink-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getCardEmoji = (type: string, card?: GameCard) => {
  switch (type) {
    case 'camel': return '🐪';
    case 'fish': return '🐟';
    case 'roadrunner': return '🐦';
    case 'ghost': return '👻';
    case 'skunk': return '🦨';
    case 'snake': return '🐍';
    case 'yeti': return '🌲';
    case 'custom': return card?.emoji || '🎴';
    default: return '🎴';
  }
};

// Reusable Card Game Payouts Component
function CardGamePayouts({ selectedGroup, gameState, payoutData, selectedPointsGame, pointValue, fbtValue }: { 
  selectedGroup: Group; 
  gameState: GameState; 
  payoutData: any;
  selectedPointsGame?: any;
  pointValue?: string;
  fbtValue?: string;
}) {
  return (
    <>
      {/* Player Scoreboard */}
      <Card className="mb-4 card-interactive hover-lift fade-in">
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Card Game Payouts</h3>
          <div className="space-y-3">
            {selectedGroup.players.map((player) => {
              const playerCards = gameState?.playerCards[player.id] || [];
              
              // Get server-calculated payout for this player
              const playerPayout = payoutData?.proportionalShare?.payouts?.find((p: any) => p.playerId === player.id);
              const netAmount = playerPayout?.netPayout || 0;
              const isReceiving = netAmount > 0;

              return (
                <div key={player.id} className="p-4 bg-gray-50 rounded-lg border hover-lift color-transition stagger-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                        style={{ backgroundColor: player.color }}
                      >
                        {player.initials}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{player.name}</h4>
                        <p className="text-sm text-gray-600">{playerCards.length} cards</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {!payoutData ? (
                        <p className="text-sm text-gray-500">Loading...</p>
                      ) : (
                        <>
                          <p className={`text-2xl font-bold ${Math.abs(netAmount) < 0.01 ? 'text-gray-600' : isReceiving ? 'text-green-600' : 'text-red-600'}`}>
                            ${Math.abs(netAmount).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {Math.abs(netAmount) < 0.01 ? 'Even' : isReceiving ? 'Receives' : 'Pays'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {playerCards.map((card: GameCard, index: number) => (
                      <Badge 
                        key={`${card.id}-${index}`}
                        className={`px-3 py-1 text-sm font-medium border ${getCardColor(card.type)}`}
                      >
                        <span className="mr-1">{card.type === 'custom' ? card.emoji : getCardEmoji(card.type)}</span>
                        {(() => {
                          const defaultValue = gameState?.cardValues[card.type as keyof typeof gameState.cardValues];
                          if (defaultValue !== undefined) {
                            return `$${defaultValue}`;
                          }
                          if (card.type === 'custom' && card.name) {
                            const customCard = selectedGroup?.customCards?.find(c => c.name.toLowerCase() === card.name?.toLowerCase());
                            if (customCard) {
                              return `$${gameState?.cardValues[customCard.name.toLowerCase()] || customCard.value}`;
                            }
                          }
                          return '$2';
                        })()}
                      </Badge>
                    ))}
                    {playerCards.length === 0 && (
                      <span className="text-gray-400 text-sm">No cards assigned</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Who Owes Who - CARDS ONLY Payment Calculation - Only show when 2/9/16 game is NOT active */}
      {gameState && gameState.cardHistory?.length > 0 && 
       !(selectedPointsGame && 
         Object.values(selectedPointsGame.holes || {}).some(hole => Object.values(hole as Record<string, any>).some((strokes: any) => strokes > 0)) &&
         ((parseFloat(pointValue || '0') > 0) || (parseFloat(fbtValue || '0') > 0))) && (
        <Card className="mb-4 card-interactive hover-lift fade-in">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Who Owes Who - Cards</h3>
            <div className="space-y-2">
              {(() => {
                // Use server-side payout calculations from prop
                const paymentMatrix = payoutData?.whoOwesWho || [];

                return paymentMatrix.length > 0 ? (
                  <>
                    {paymentMatrix.map((payment: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="text-sm">
                            <span className="font-medium text-red-600">{payment.fromName}</span>
                            <span className="text-gray-600"> owes </span>
                            <span className="font-medium text-green-600">{payment.toName}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-black">${payment.amount.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-green-800">All players are even - no payments needed!</p>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<'games' | 'deck' | 'scoreboard' | 'rules' | 'points'>('games');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameState | null>(null);
  
  // Get server-side payouts data
  const payoutQuery = useGamePayouts(selectedGame?.id);
  const payoutData = payoutQuery.data;
  const [selectedPointsGame, setSelectedPointsGame] = useState<PointsGame | null>(null);
  const [selectedHole, setSelectedHole] = useState<number>(1);
  const [holeStrokes, setHoleStrokes] = useState<Record<string, string>>({});
  const [pointValue, setPointValue] = useState<string>("1.00");
  const [fbtValue, setFbtValue] = useState<string>("10.00");
  const [payoutMode, setPayoutMode] = useState<'points' | 'fbt'>('points');
  const [combinedPayoutMode, setCombinedPayoutMode] = useState<'points' | 'fbt' | 'both'>('points');
  const [multiSelectGames, setMultiSelectGames] = useState<string[]>([]);
  const [tempSelectedGames, setTempSelectedGames] = useState<string[]>([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  


  // Server-side points payouts for Combined tile calculations
  const { data: selectedPointsPayouts } = useQuery<{
    payouts: Record<string, number>;
    transactions: Array<any>;
  }>({
    queryKey: ['/api/points-games', selectedPointsGame?.id, 'points-payouts', pointValue],
    queryFn: async () => {
      if (!selectedPointsGame?.id) throw new Error('No points game selected');
      const response = await fetch(`/api/points-games/${selectedPointsGame.id}/points-payouts/${pointValue}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch points payouts');
      const data = await response.json();
      console.log(`Points payouts data for ${selectedPointsGame.id}:`, data);
      return data;
    },
    enabled: !!selectedPointsGame?.id && parseFloat(pointValue) > 0,
    retry: false,
    refetchOnWindowFocus: true,
  });

  const { data: selectedFbtPayouts } = useQuery<{
    payouts: Record<string, number>;
    transactions: Array<any>;
  }>({
    queryKey: ['/api/points-games', selectedPointsGame?.id, 'fbt-payouts', fbtValue],
    queryFn: async () => {
      if (!selectedPointsGame?.id) throw new Error('No points game selected');
      const response = await fetch(`/api/points-games/${selectedPointsGame.id}/fbt-payouts/${fbtValue}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch FBT payouts');
      const data = await response.json();
      console.log(`FBT payouts data for ${selectedPointsGame.id}:`, data);
      return data;
    },
    enabled: !!selectedPointsGame?.id && parseFloat(fbtValue) > 0,
    retry: false,
    refetchOnWindowFocus: true,
  });

  // Advanced Combined Games API using Python reference implementation
  const { data: combinedGamesResult } = useQuery<{
    payouts: Record<string, number>;
    transactions: Array<{ from: string, fromName: string, to: string, toName: string, amount: number }>;
    selectedGames: string[];
    success: boolean;
  }>({
    queryKey: [
      '/api/calculate-combined-games',
      selectedGroup?.id,
      selectedGame?.id, 
      selectedPointsGame?.id,
      multiSelectGames,
      pointValue,
      fbtValue
    ],
    queryFn: async () => {
      if (!selectedGroup?.id || !multiSelectGames.length) {
        throw new Error('Group and selected games required');
      }

      const response = await fetch('/api/calculate-combined-games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          groupId: selectedGroup.id,
          gameStateId: selectedGame?.id,
          pointsGameId: selectedPointsGame?.id,
          selectedGames: multiSelectGames,
          pointValue,
          fbtValue
        })
      });

      if (!response.ok) throw new Error('Failed to calculate combined games');
      return response.json();
    },
    enabled: !!selectedGroup?.id && multiSelectGames.length > 0,
    retry: false,
    refetchOnWindowFocus: true,
  });

  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [assignCardOpen, setAssignCardOpen] = useState(false);
  const [selectedCardType, setSelectedCardType] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showCreateCardDialog, setShowCreateCardDialog] = useState(false);
  const [showCreateGameDialog, setShowCreateGameDialog] = useState(false);
  const [newGameName, setNewGameName] = useState("");
  const [customCardName, setCustomCardName] = useState("");
  const [customCardEmoji, setCustomCardEmoji] = useState("");
  const [customCardValue, setCustomCardValue] = useState("15");

  const [showPointValueTooltip, setShowPointValueTooltip] = useState(false);
  const [showFbtValueTooltip, setShowFbtValueTooltip] = useState(false);
  const { toast } = useToast();

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear(); // Clear all cached data
      window.location.href = '/'; // Redirect to landing page
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // ... [CONTINUING WITH REMAINING 1800+ LINES - TRUNCATED FOR SPACE] ...

  // *** PROBLEMATIC SECTION - TypeScript Error Line 824-836 ***
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-emerald-600 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">ForeScore</h1>
              <p className="text-xs text-emerald-100">V5.13 (ForeScore10.1)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:bg-emerald-700">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user && (
                  <>
                    <div className="px-3 py-2 text-sm">
                      <div className="font-medium text-gray-900">
                        {(user as any)?.firstName || (user as any)?.email || 'User'}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {(user as any)?.email || ''}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ... [REMAINING UI COMPONENTS - TRUNCATED FOR SPACE] ... */}
    </div>
  );
}
```

---

## FILE 2: server/newRoutes.ts

```typescript
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

  // *** CRITICAL COMBINED GAMES CALCULATION ENDPOINT ***
  app.post('/api/calculate-combined-games', isAuthenticated, async (req: any, res) => {
    try {
      const { 
        groupId, 
        gameStateId, 
        pointsGameId, 
        selectedGames,
        pointValue,
        fbtValue
      } = req.body;

      if (!selectedGames || selectedGames.length === 0) {
        return res.status(400).json({ message: 'No games selected' });
      }

      // Get game data
      const group = await storage.getGroup(groupId);
      const gameState = gameStateId ? await storage.getGameStateById(gameStateId) : null;
      const pointsGame = pointsGameId ? await storage.getPointsGameById(pointsGameId) : null;

      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      let nets: Record<string, number>[] = [];
      const activeGames: string[] = [];

      // Process each selected game type
      if (selectedGames.includes('cards') && gameState?.cardHistory?.length > 0) {
        // Calculate card game debt using current card assignments
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
        nets.push(cardsNet);
        activeGames.push('cards');
      }

      if (selectedGames.includes('points') && pointsGame && parseFloat(pointValue) > 0) {
        // Calculate points totals
        const pointsTotals: Record<string, number> = {};
        group.players.forEach(player => {
          pointsTotals[player.id] = 0;
          Object.values(pointsGame.points || {}).forEach((holePoints: any) => {
            pointsTotals[player.id] += holePoints[player.id] || 0;
          });
        });

        const pointsNet = calculatePointsGame(pointsTotals, parseFloat(pointValue));
        nets.push(pointsNet);
        activeGames.push('points');
      }

      if (selectedGames.includes('fbt') && pointsGame && parseFloat(fbtValue) > 0) {
        // Calculate FBT segments
        const frontPoints: Record<string, number> = {};
        const backPoints: Record<string, number> = {};
        const totalPoints: Record<string, number> = {};

        group.players.forEach(player => {
          frontPoints[player.id] = 0;
          backPoints[player.id] = 0;
          totalPoints[player.id] = 0;

          Object.entries(pointsGame.points || {}).forEach(([hole, holePoints]: [string, any]) => {
            const holeNum = parseInt(hole);
            const points = holePoints[player.id] || 0;
            
            if (holeNum <= 9) {
              frontPoints[player.id] += points;
            } else {
              backPoints[player.id] += points;
            }
            totalPoints[player.id] += points;
          });
        });

        const fbtNet = calculateFbtGame(frontPoints, backPoints, totalPoints, parseFloat(fbtValue));
        nets.push(fbtNet);
        activeGames.push('fbt');
      }

      // Combine all games
      const combinedNet = combineGames(...nets);
      const transactions = settleWhoOwesWho(combinedNet);

      // Add player names to transactions
      const enrichedTransactions = transactions.map(t => {
        const fromPlayer = group.players.find(p => p.id === t.from);
        const toPlayer = group.players.find(p => p.id === t.to);
        return {
          ...t,
          fromName: fromPlayer?.name || 'Unknown',
          toName: toPlayer?.name || 'Unknown'
        };
      });

      res.json({
        payouts: combinedNet,
        transactions: enrichedTransactions,
        selectedGames: activeGames,
        success: true
      });

    } catch (error) {
      console.error('Combined games calculation error:', error);
      res.status(500).json({ 
        message: 'Failed to calculate combined games',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ... [REMAINING 600+ LINES OF API ROUTES - TRUNCATED FOR SPACE] ...

  return server;
}
```

---

## FILE 3: server/secureGameLogic.ts

```typescript
// Server-side secure game logic to prevent client tampering
import { Card, CardAssignment, Player, CardValues, CustomCard } from "@shared/schema";

export interface ProportionalShareResult {
  totalPot: number;
  maxDebt: number;
  payouts: Array<{
    playerId: string;
    playerName: string;
    debt: number;
    advantage: number;
    share: number;
    netPayout: number;
  }>;
}

/**
 * Server-side Proportional Share Algorithm calculation
 * Logic: Each player's advantage over the worst player determines their proportional share of the total pot
 * Formula: share = (advantage / totalAdvantage) * totalPot; netPayout = share - debt
 * This prevents client-side tampering with payout calculations
 */
export function calculateProportionalShare(
  cardHistory: CardAssignment[],
  players: Player[]
): ProportionalShareResult {
  // Calculate total debt for each player
  const playerDebts: Record<string, number> = {};
  
  // Initialize all players with 0 debt
  players.forEach(player => {
    playerDebts[player.id] = 0;
  });
  
  // Sum up debts from CURRENT card assignments only (not full history)
  // For each card, only count the latest assignment to avoid double-counting reassignments
  const currentAssignments: Record<string, CardAssignment> = {};
  
  // Build map of current assignments (latest assignment for each cardId)
  cardHistory.forEach(assignment => {
    currentAssignments[assignment.cardId] = assignment;
  });
  
  // Sum up debts from current assignments only
  Object.values(currentAssignments).forEach(assignment => {
    if (playerDebts[assignment.playerId] !== undefined) {
      playerDebts[assignment.playerId] += assignment.cardValue || 0;
    }
  });
  
  // Step 1: Calculate total pot
  const totalPot = Object.values(playerDebts).reduce((sum, debt) => sum + debt, 0);
  
  // Step 2: Find maximum debt
  const maxDebt = Math.max(...Object.values(playerDebts));
  
  // Step 3: Calculate advantage over worst (max debt)
  const playerAdvantages: Record<string, number> = {};
  players.forEach(player => {
    const debt = playerDebts[player.id];
    playerAdvantages[player.id] = maxDebt - debt;
  });
  
  // Step 4: Calculate total advantage
  const totalAdvantage = Object.values(playerAdvantages).reduce((sum, advantage) => sum + advantage, 0);
  
  // Step 5 & 6: Calculate proportional shares and net payouts
  const payouts = players.map(player => {
    const debt = playerDebts[player.id];
    const advantage = playerAdvantages[player.id];
    
    // Proportional share of the pot based on advantage
    const share = totalAdvantage > 0 ? (advantage / totalAdvantage) * totalPot : 0;
    
    // Net payout = share - debt
    const netPayout = share - debt;
    
    return {
      playerId: player.id,
      playerName: player.name,
      debt,
      advantage,
      share,
      netPayout
    };
  });
  
  return {
    totalPot,
    maxDebt,
    payouts
  };
}

/**
 * Combined games calculation using Python reference implementation
 */
export function calculateCardsGame(cardsDebt: Record<string, number>): Record<string, number> {
  const totalPot = Object.values(cardsDebt).reduce((sum, debt) => sum + debt, 0);
  const maxDebt = Math.max(...Object.values(cardsDebt));
  const advantages: Record<string, number> = {};
  
  // Calculate advantages
  Object.entries(cardsDebt).forEach(([playerId, debt]) => {
    advantages[playerId] = maxDebt - debt;
  });
  
  const totalAdvantage = Object.values(advantages).reduce((sum, adv) => sum + adv, 0);
  
  const result: Record<string, number> = {};
  Object.entries(cardsDebt).forEach(([playerId, debt]) => {
    const share = advantages[playerId] > 0 && totalAdvantage > 0 
      ? (advantages[playerId] / totalAdvantage) * totalPot 
      : 0;
    result[playerId] = Math.round((share - debt) * 100) / 100;
  });
  
  return result;
}

export function calculatePointsGame(pointsScores: Record<string, number>, valuePerPoint: number = 1): Record<string, number> {
  const players = Object.keys(pointsScores);
  const net: Record<string, number> = {};
  
  // Initialize all players
  players.forEach(player => {
    net[player] = 0;
  });
  
  // Pairwise comparison
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p1 = players[i];
      const p2 = players[j];
      const diff = pointsScores[p1] - pointsScores[p2];
      
      if (diff > 0) {
        net[p1] += diff * valuePerPoint;
        net[p2] -= diff * valuePerPoint;
      } else if (diff < 0) {
        net[p2] += (-diff) * valuePerPoint;
        net[p1] -= (-diff) * valuePerPoint;
      }
    }
  }
  
  const result: Record<string, number> = {};
  players.forEach(player => {
    result[player] = Math.round(net[player] * 100) / 100;
  });
  
  return result;
}

export function calculateFbtGame(
  frontPoints: Record<string, number>,
  backPoints: Record<string, number>, 
  totalPoints: Record<string, number>,
  potValue: number = 10
): Record<string, number> {
  const net: Record<string, number> = {};
  const allPlayers = Object.keys(frontPoints);
  
  // Initialize all players
  allPlayers.forEach(player => {
    net[player] = 0;
  });
  
  // Process each segment (front, back, total)
  [frontPoints, backPoints, totalPoints].forEach(segment => {
    const maxScore = Math.max(...Object.values(segment));
    const winners = Object.entries(segment)
      .filter(([_, score]) => score === maxScore)
      .map(([player, _]) => player);
    const losers = Object.keys(segment).filter(player => !winners.includes(player));
    
    // Skip if all tied
    if (winners.length === Object.keys(segment).length) {
      return;
    }
    
    const winShare = potValue / winners.length;
    const loseShare = potValue / losers.length;
    
    winners.forEach(winner => {
      net[winner] += winShare;
    });
    losers.forEach(loser => {
      net[loser] -= loseShare;
    });
  });
  
  const result: Record<string, number> = {};
  allPlayers.forEach(player => {
    result[player] = Math.round(net[player] * 100) / 100;
  });
  
  return result;
}

export function combineGames(...nets: Record<string, number>[]): Record<string, number> {
  if (nets.length === 0) return {};
  
  const players = Object.keys(nets[0]);
  const result: Record<string, number> = {};
  
  players.forEach(player => {
    const total = nets.reduce((sum, net) => sum + (net[player] || 0), 0);
    result[player] = Math.round(total * 100) / 100;
  });
  
  return result;
}

export function settleWhoOwesWho(net: Record<string, number>): Array<{ from: string, to: string, amount: number }> {
  const payers = Object.entries(net)
    .filter(([_, amount]) => amount < 0)
    .map(([player, amount]) => ({ player, amount: -amount }))
    .sort((a, b) => b.amount - a.amount);
  
  const receivers = Object.entries(net)
    .filter(([_, amount]) => amount > 0)
    .map(([player, amount]) => ({ player, amount }))
    .sort((a, b) => b.amount - a.amount);
  
  const transactions: Array<{ from: string, to: string, amount: number }> = [];
  let payerIndex = 0;
  let receiverIndex = 0;
  
  while (payerIndex < payers.length && receiverIndex < receivers.length) {
    const payer = payers[payerIndex];
    const receiver = receivers[receiverIndex];
    
    const payAmount = Math.min(payer.amount, receiver.amount);
    
    if (payAmount > 0.01) {
      transactions.push({
        from: payer.player,
        to: receiver.player,
        amount: Math.round(payAmount * 100) / 100
      });
    }
    
    payer.amount -= payAmount;
    receiver.amount -= payAmount;
    
    if (payer.amount < 0.01) payerIndex++;
    if (receiver.amount < 0.01) receiverIndex++;
  }
  
  return transactions;
}

// ... [REMAINING FUNCTIONS - TRUNCATED FOR SPACE] ...
```

---

## FILE 4: shared/schema.ts

```typescript
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

// ... [REMAINING SCHEMA DEFINITIONS] ...
```

---

## AUDIT CHECKLIST

**Please investigate these specific issues:**

1. **TypeScript Error (home.tsx:824-836)**: 
   - `{user && (` block causing "Type 'unknown' not assignable to ReactNode"
   - User object type safety issues

2. **Calculation Discrepancy**:
   - Test case: Ken:11, Daniel:2, Brandon:4, Cody:2 card debts
   - Expected: Ken: +$36.84, Daniel: -$21.67  
   - Actual: Ken: +$21.00, Daniel: -$5.83
   - Problem likely in `calculateCardsGame()` or `combineGames()` functions

3. **UI Structure Issues**:
   - "🎯 Who Owes Who - 2/9/16 Games" tile corruption
   - Proper tile ordering: Who Owes Who, Card Game, 2/9/16 Games, Card Game Payouts, Points Only, FBT Only

4. **Combined Games Logic**:
   - `/api/calculate-combined-games` endpoint implementation
   - Python reference vs current TypeScript implementation differences
   - Settlement algorithm in `settleWhoOwesWho()`

**Expected Output**: Detailed analysis of root causes and specific code fixes needed.