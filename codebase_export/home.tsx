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

  // Queries
  const { data: groups = [], isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
  });

  const { data: groupGames = [] } = useQuery<GameState[]>({
    queryKey: ['/api/groups', selectedGroup?.id, 'games'],
    enabled: !!selectedGroup?.id,
  });

  const { data: pointsGames = [] } = useQuery<PointsGame[]>({
    queryKey: ['/api/points-games', selectedGroup?.id, selectedGame?.id],
    queryFn: async () => {
      if (!selectedGroup?.id) throw new Error('No group selected');
      const url = selectedGame?.id 
        ? `/api/points-games/${selectedGroup.id}?gameStateId=${selectedGame.id}`
        : `/api/points-games/${selectedGroup.id}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch points games');
      return response.json();
    },
    enabled: !!selectedGroup?.id,
  });

  // Clear selectedPointsGame and invalidate all caches when selectedGame changes
  useEffect(() => {
    setSelectedPointsGame(null);
    // Clear hole strokes when switching games to prevent stale data
    setHoleStrokes({});
    
    // Invalidate all relevant caches when switching game instances
    if (selectedGame?.id) {
      queryClient.invalidateQueries({ queryKey: ['/api/points-games'] });
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', selectedGroup?.id, 'games'] });
      // Force fresh data fetch for the new game
      queryClient.refetchQueries({ queryKey: ['/api/points-games', selectedGroup?.id, selectedGame.id] });
      queryClient.refetchQueries({ queryKey: ['/api/game-state', selectedGame.id, 'payouts'] });
    }
  }, [selectedGame?.id, selectedGroup?.id, queryClient]);

  // Auto-select 2/9/16 game for current game session - GAME SESSION ISOLATION FIX
  useEffect(() => {
    if (selectedGroup && selectedGame && pointsGames.length > 0) {
      // If we have a selectedPointsGame but it's not in the current game session's games, clear it
      if (selectedPointsGame && !pointsGames.find(game => game.id === selectedPointsGame.id)) {
        setSelectedPointsGame(null);
      }
      // Auto-select the single 2/9/16 game for this game session
      if (!selectedPointsGame) {
        const existingGame = pointsGames[0]; // Only one game per game session allowed
        if (existingGame) {
          setSelectedPointsGame(existingGame);
          console.log(`Auto-selected 2/9/16 game: ${existingGame.name} for game session: ${selectedGame.id}`);
        }
      }
    }
    // Also ensure the selected game persists even when pointsGames array is updated
    if (selectedPointsGame && pointsGames.length > 0) {
      const updatedGame = pointsGames.find(game => game.id === selectedPointsGame.id);
      if (updatedGame) {
        setSelectedPointsGame(updatedGame); // Update with latest data
      }
    }
  }, [selectedGroup, selectedGame, pointsGames, selectedPointsGame]);

  const { gameState, isLoading: gameLoading, drawCard, assignCard, startGame } = useGameState(selectedGroup?.id);
  
  // Defensive check for gameState to prevent crashes
  const safeGameState = gameState || {
    playerCards: {},
    deck: [],
    cardHistory: [],
    currentCard: null,
    isActive: false
  };
  const { isConnected } = useWebSocket(selectedGroup?.id);

  // Mutations
  const updateCardValuesMutation = useMutation({
    mutationFn: async (data: { gameId: string; cardValues: any }) => {
      const response = await apiRequest('PATCH', `/api/games/${data.gameId}/card-values`, data.cardValues);
      return response.json();
    },
    onSuccess: (updatedGame, variables) => {
      // Invalidate and refetch game state to get updated card values for payout calculations
      queryClient.invalidateQueries({ queryKey: ['/api/groups', selectedGroup?.id, 'games'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', selectedGroup?.id, 'game-state'] });
      queryClient.invalidateQueries({ queryKey: ['/api/game-state', variables.gameId, 'payouts'] });
      queryClient.refetchQueries({ queryKey: ['/api/groups', selectedGroup?.id, 'games'] });
      queryClient.refetchQueries({ queryKey: ['/api/groups', selectedGroup?.id, 'game-state'] });
      queryClient.refetchQueries({ queryKey: ['/api/game-state', variables.gameId, 'payouts'] });
    },
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (shareCode: string) => {
      const response = await apiRequest('POST', '/api/groups/join', { shareCode });
      if (!response.ok) {
        throw new Error('Invalid share code');
      }
      return response.json();
    },
    onSuccess: (group: Group) => {
      setSelectedGroup(group);
      setCurrentTab('deck');
      setShowJoinDialog(false);
      setJoinCode("");
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', group.id, 'games'] });
    },
    onError: (error: any) => {
      toast({
        title: "Could not join game",
        description: "Please check the share code and try again.",
        variant: "destructive",
      });
    },
  });

  const createCustomCardMutation = useMutation({
    mutationFn: async (cardData: { name: string; emoji: string; value: number }) => {
      if (!selectedGroup) throw new Error("No group selected");
      
      const response = await apiRequest('POST', `/api/groups/${selectedGroup.id}/custom-cards`, cardData);
      return response.json();
    },
    onSuccess: (updatedGroup: Group) => {
      setSelectedGroup(updatedGroup);
      setShowCreateCardDialog(false);
      setCustomCardName("");
      setCustomCardEmoji("");
      setCustomCardValue("15");
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', updatedGroup.id, 'games'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not create custom card. Try again.",
        variant: "destructive",
      });
    },
  });



  const deleteCustomCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      if (!selectedGroup) throw new Error("No group selected");
      
      const response = await apiRequest('DELETE', `/api/groups/${selectedGroup.id}/custom-cards/${cardId}`);
      return response.json();
    },
    onSuccess: (updatedGroup: Group) => {
      setSelectedGroup(updatedGroup);
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', updatedGroup.id, 'games'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not delete custom card. Try again.",
        variant: "destructive",
      });
    },
  });

  const createGameMutation = useMutation({
    mutationFn: async (gameData: { groupId: string; name: string }) => {
      const response = await apiRequest('POST', '/api/game-state', gameData);
      return response.json();
    },
    onSuccess: (newGame: GameState) => {
      setSelectedGame(newGame);
      setShowCreateGameDialog(false);
      setNewGameName("");
      setCurrentTab('deck');
      queryClient.invalidateQueries({ queryKey: ['/api/groups', selectedGroup?.id, 'games'] });
      queryClient.invalidateQueries({ queryKey: ['/api/game-state', selectedGroup?.id] });
      queryClient.refetchQueries({ queryKey: ['/api/groups', selectedGroup?.id, 'games'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not create game. Try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to create group and then immediately create a game with it
  const createGroupAndGameMutation = useMutation({
    mutationFn: async (data: { 
      groupName: string; 
      players: Array<{ name: string; initials: string; color: string }>; 
      gameName: string;
      customCards?: Array<{ name: string; emoji: string; value: number }>;
      cardValues?: Record<string, number>;
    }) => {
      // First create the group
      const groupResponse = await apiRequest('POST', '/api/groups', {
        name: data.groupName,
        players: data.players,
        customCards: data.customCards || [],
        cardValues: data.cardValues || {
          camel: 2,
          fish: 5,
          roadrunner: 10
        }
      });
      const newGroup = await groupResponse.json();
      
      // Then create the game with the new group
      const gameResponse = await apiRequest('POST', '/api/game-state', {
        groupId: newGroup.id,
        name: data.gameName
      });
      const newGame = await gameResponse.json();
      
      return { group: newGroup, game: newGame };
    },
    onSuccess: ({ group, game }) => {
      setSelectedGroup(group);
      setSelectedGame(game);
      setShowCreateGameDialog(false);
      setNewGameName("");
      setCurrentTab('deck');
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', group.id, 'games'] });
      queryClient.invalidateQueries({ queryKey: ['/api/game-state', group.id] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Could not create group and game. Try again.",
        variant: "destructive",
      });
    }
  });

  const deleteGameMutation = useMutation({
    mutationFn: async (gameId: string) => {
      const response = await apiRequest('DELETE', `/api/games/${gameId}`);
      return response.json();
    },
    onSuccess: () => {
      setSelectedGame(null);
      queryClient.invalidateQueries({ queryKey: ['/api/groups', selectedGroup?.id, 'games'] });
      queryClient.invalidateQueries({ queryKey: ['/api/game-state', selectedGroup?.id] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Could not delete game. Try again.",
        variant: "destructive",
      });
    },
  });

  const createPointsGameMutation = useMutation({
    mutationFn: async (data: { groupId: string; gameStateId?: string; name: string }) => {
      const response = await apiRequest('POST', '/api/points-games', data);
      return response.json();
    },
    onSuccess: (newGame: PointsGame) => {
      setSelectedPointsGame(newGame);
      queryClient.invalidateQueries({ queryKey: ['/api/points-games', selectedGroup?.id, selectedGame?.id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not create points game. Try again.",
        variant: "destructive",
      });
    }
  });

  const updateHoleScoresMutation = useMutation({
    mutationFn: async (data: { gameId: string; hole: number; strokes: Record<string, number> }) => {
      const response = await apiRequest('POST', `/api/games/${data.gameId}/holes/${data.hole}/scores`, { scores: data.strokes });
      return response.json();
    },
    onSuccess: (updatedGame: PointsGame) => {
      setSelectedPointsGame(updatedGame);
      // Force immediate data refresh for instant updates
      queryClient.invalidateQueries({ queryKey: ['/api/points-games', selectedGroup?.id] });
      queryClient.refetchQueries({ queryKey: ['/api/points-games', selectedGroup?.id] });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Could not update hole scores. Try again.",
        variant: "destructive",
      });
    }
  });

  const handleGroupSelect = (group: Group) => {
    setSelectedGroup(group);
    setSelectedGame(null); // Reset game selection when switching groups
    // DON'T reset selectedPointsGame - preserve it for reaccess
    // Stay on groups tab to show game selection
  };

  const handleCardValueChange = (type: string, value: number) => {
    if (!selectedGame) return;
    
    const newValues = { ...selectedGame.cardValues, [type]: value };
    
    // Update local state immediately
    setSelectedGame({ ...selectedGame, cardValues: newValues });
    
    updateCardValuesMutation.mutate({
      gameId: selectedGame.id,
      cardValues: newValues
    });
  };

  const handleCardTypeSelect = (cardType: string) => {
    setSelectedCardType(cardType);
    setAssignCardOpen(true);
  };

  const handleDrawCard = () => {
    if (!selectedGame || !selectedGroup) return;
    drawCard.mutate({ gameStateId: selectedGame.id, groupId: selectedGroup.id });
  };

  const handleAssignCard = (playerId: string) => {
    if (!selectedGame || !selectedGroup || !selectedGame.currentCard) return;
    const cardType = selectedGame.currentCard.type === 'custom' 
      ? selectedGame.currentCard.name?.toLowerCase() || 'custom'
      : selectedGame.currentCard.type;
    assignCard.mutate({ 
      gameStateId: selectedGame.id, 
      playerId, 
      groupId: selectedGroup.id,
      cardType
    });
  };

  const handleStartGame = () => {
    if (!selectedGroup) return;
    startGame.mutate(selectedGroup.id);
  };

  const handleShareGame = async () => {
    if (!selectedGame?.shareCode) return;
    
    const shareText = `Join my ForeScore game "${selectedGame.name}"!\n\nGame Code: ${selectedGame.shareCode}\n\nOpen your ForeScore app and enter this code to join.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ForeScore Game - ${selectedGame.name}`,
          text: shareText,
        });
      } catch (error) {
        // User cancelled sharing, fallback to clipboard
        navigator.clipboard.writeText(selectedGame.shareCode);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(selectedGame.shareCode);
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

  const handleAssignCardType = (cardType: string, playerId: string) => {
    if (!selectedGame || !selectedGroup) return;
    assignCard.mutate({ 
      gameStateId: selectedGame.id, 
      playerId, 
      groupId: selectedGroup.id,
      cardType 
    });
  };

  // REMOVED: Frontend calculation replaced with server-side payouts data
  // All player totals now come from payoutData.cardGamePayouts which is calculated server-side

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

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg">
      {/* Header */}
      <header className="bg-emerald-600 text-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">ForeScore</h1>
            <Badge variant="outline" className="text-emerald-100 border-emerald-100">
              V5 Secure
            </Badge>
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
                        {String((user as any)?.firstName || (user as any)?.email || 'User')}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {String((user as any)?.email || '')}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {/* Games Tab - Primary workflow entry point */}
        {currentTab === 'games' && (
          <div className="p-4">
            <div className="mb-6 space-y-3">
              <Button 
                onClick={() => setShowCreateGameDialog(true)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white p-4 h-auto text-lg font-semibold shadow-lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create New Game
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => setShowJoinDialog(true)}
                  variant="outline"
                  className="p-3 h-auto font-medium border-emerald-200 hover:bg-emerald-50"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Join Game
                </Button>
                
                <Button 
                  onClick={() => setCreateGroupOpen(true)}
                  variant="outline"
                  className="p-3 h-auto font-medium border-gray-200 hover:bg-gray-50"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Group
                </Button>
              </div>
            </div>

            {/* Selected Group Games */}
            {selectedGroup && (
              <div className="mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-3">
                        <Button
                          onClick={() => setSelectedGroup(null)}
                          variant="ghost"
                          size="sm"
                          className="text-gray-600 hover:text-gray-800 p-1"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h3 className="text-lg font-semibold text-gray-800">{selectedGroup.name} Games</h3>
                      </div>
                      <div className="flex justify-center">
                        <Button
                          onClick={() => setShowCreateGameDialog(true)}
                          size="sm"
                          className="bg-emerald-500 hover:bg-emerald-600 text-white btn-interactive btn-bouncy"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          New Game
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {groupGames.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No games yet. Create your first game!</p>
                      ) : (
                        groupGames.map((game) => (
                          <div key={game.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 hover-lift color-transition">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-800">{game.name}</h4>
                                {game.isActive === 1 && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-700">Active</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                Share Code: {game.shareCode} • Created {new Date(game.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => {
                                  setSelectedGame(game);
                                  setCurrentTab('deck');
                                }}
                                size="sm"
                                variant="outline"
                                className="btn-interactive btn-bouncy"
                              >
                                Play
                              </Button>
                              <Button
                                onClick={() => {
                                  setSelectedGame(game);
                                  handleShareGame();
                                }}
                                size="sm"
                                variant="outline"
                                className="btn-interactive btn-bouncy"
                              >
                                Share
                              </Button>
                              <Button
                                onClick={() => deleteGameMutation.mutate(game.id)}
                                size="sm"
                                variant="destructive"
                                className="px-2"
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Groups</h2>
              
              {groupsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-gray-100 rounded-xl p-4 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : groups.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No groups yet. Create your first group to get started!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {groups.map((group) => (
                    <Card 
                      key={group.id} 
                      className="card-interactive hover-lift cursor-pointer fade-in"
                      onClick={() => handleGroupSelect(group)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {group.groupPhoto ? (
                              <img
                                src={group.groupPhoto}
                                alt="Group photo"
                                className="w-12 h-12 rounded-full object-cover border-2 border-gray-300"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                                <Users className="h-6 w-6 text-emerald-600" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-semibold text-gray-800">{group.name}</h3>
                              <p className="text-sm text-gray-500">
                                {group.lastPlayed 
                                  ? `Last played ${new Date(group.lastPlayed).toLocaleDateString()}`
                                  : 'Never played'
                                }
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {group.players.length} player{group.players.length !== 1 ? 's' : ''}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deck Tab */}
        {currentTab === 'deck' && (
          <div className="p-4">
            {!selectedGroup ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Layers className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Select a group from the Groups tab to start playing</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Game Header */}
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <h2 className="text-lg font-semibold text-gray-800">{selectedGroup.name}</h2>
                      {selectedGame && (
                        <div className="flex items-center justify-between mt-2">
                          <div>
                            <p className="text-sm text-gray-600">Game: {selectedGame.name}</p>
                            <p className="text-xs text-gray-500">Share Code: {selectedGame.shareCode}</p>
                          </div>
                          <Button
                            onClick={handleShareGame}
                            size="sm"
                            variant="outline"
                          >
                            Share Game
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Game Selection or Start */}
                {!selectedGame ? (
                  <Card className="mb-4">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-gray-600 mb-4">Choose a game to play or create a new one</p>
                        <div className="space-y-2">
                          {groupGames.length > 0 && (
                            <div className="mb-4">
                              <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Games</h3>
                              {groupGames.slice(0, 3).map(game => (
                                <Button
                                  key={game.id}
                                  onClick={() => setSelectedGame(game)}
                                  variant="outline"
                                  className="w-full mb-2 justify-between"
                                >
                                  <span>{game.name}</span>
                                  {game.isActive === 1 && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-700">Active</Badge>
                                  )}
                                </Button>
                              ))}
                            </div>
                          )}
                          <Button 
                            onClick={() => setShowCreateGameDialog(true)}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white p-4 h-auto text-lg font-semibold"
                          >
                            <Plus className="mr-2 h-5 w-5" />
                            Create New Game
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {/* Card Selection */}
                {selectedGame && (
                  <Card className="mb-4">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Card to Assign</h3>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {(() => {
                          // Create array of all available cards (default + custom)
                          const defaultCards = ['camel', 'fish', 'roadrunner', 'ghost', 'skunk', 'snake', 'yeti'];
                          const customCardNames = selectedGroup.customCards?.map(card => card.name.toLowerCase()) || [];
                          const allCardTypes = [...defaultCards, ...customCardNames];
                          
                          return allCardTypes.map(cardType => {
                            const value = selectedGame.cardValues[cardType as keyof typeof selectedGame.cardValues] || 
                                         selectedGroup.customCards?.find(c => c.name.toLowerCase() === cardType)?.value || 2;
                          const getCardDisplay = (type: string) => {
                            const cardMap: Record<string, { emoji: string; name: string; color: string }> = {
                              camel: { emoji: '🐪', name: 'Camel', color: 'bg-gray-50 border-gray-200 hover:bg-gray-100' },
                              fish: { emoji: '🐟', name: 'Fish', color: 'bg-gray-50 border-gray-200 hover:bg-gray-100' },
                              roadrunner: { emoji: '🐦', name: 'Roadrunner', color: 'bg-gray-50 border-gray-200 hover:bg-gray-100' },
                              ghost: { emoji: '👻', name: 'Ghost', color: 'bg-gray-50 border-gray-200 hover:bg-gray-100' },
                              skunk: { emoji: '🦨', name: 'Skunk', color: 'bg-gray-50 border-gray-200 hover:bg-gray-100' },
                              snake: { emoji: '🐍', name: 'Snake', color: 'bg-gray-50 border-gray-200 hover:bg-gray-100' },
                              yeti: { emoji: '🌲', name: 'Yeti', color: 'bg-gray-50 border-gray-200 hover:bg-gray-100' }
                            };
                            
                            // Check if it's a custom card
                            const customCard = selectedGroup.customCards?.find(c => c.name.toLowerCase() === type);
                            if (customCard) {
                              return { 
                                emoji: customCard.emoji, 
                                name: customCard.name, 
                                color: 'bg-gray-50 border-gray-200 hover:bg-gray-100' 
                              };
                            }
                            
                            return cardMap[type] || { emoji: '🎴', name: type.charAt(0).toUpperCase() + type.slice(1), color: 'bg-gray-50 border-gray-200 hover:bg-gray-100' };
                          };
                          
                          const cardDisplay = getCardDisplay(cardType);
                          // Find which player has this card assigned - use fresh game state
                          const assignedPlayer = gameState && selectedGroup ? 
                            selectedGroup.players.find(player => 
                              safeGameState.playerCards[player.id]?.some(card => {
                                if (card.type === cardType) return true;
                                if (card.type === 'custom' && card.name && card.name.toLowerCase() === cardType.toLowerCase()) return true;
                                return false;
                              })
                            ) : null;
                          
                          const isAssigned = !!assignedPlayer;
                          
                          return (
                            <Card 
                              key={cardType} 
                              className={`transition-colors border-2 cursor-pointer ${
                                isAssigned 
                                  ? 'bg-amber-50 border-amber-300 hover:bg-amber-100' 
                                  : cardDisplay.color
                              }`}
                              onClick={() => handleCardTypeSelect(cardType as any)}
                            >
                              <CardContent className="p-4 text-center">
                                <div className="text-3xl mb-2">{cardDisplay.emoji}</div>
                                <p className="text-xs font-medium text-gray-700">{cardDisplay.name}</p>
                                <p className="text-xs text-gray-500">${value}</p>
                                {isAssigned ? (
                                  <div className="mt-2">
                                    <div 
                                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold mx-auto mb-1"
                                      style={{ backgroundColor: assignedPlayer?.color }}
                                    >
                                      {assignedPlayer?.initials}
                                    </div>
                                    <p className="text-xs text-gray-600">{assignedPlayer?.name}</p>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 mt-2">Available</p>
                                )}
                              </CardContent>
                            </Card>
                          );
                          });
                        })()}
                      </div>

                      <p className="text-sm text-gray-600 text-center">Click a card above to assign it to a player</p>
                    </CardContent>
                  </Card>
                )}

                {/* Card Values - Only show for selected game */}
                {selectedGame && (
                  <Card>
                    <CardContent className="p-4">
                      {/* Create Custom Card Button */}
                      <div className="mb-4 pb-4 border-b border-gray-200">
                        <Button 
                          onClick={() => setShowCreateCardDialog(true)}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create Custom Card
                        </Button>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Card Values for {selectedGame.name}</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🐪</span>
                          <span className="font-medium text-gray-800">Camel</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">$</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={selectedGame?.cardValues?.camel?.toString() || '2'}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              handleCardValueChange('camel', parseInt(value) || 0);
                            }}
                            className="w-16 text-center font-semibold"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🐟</span>
                          <span className="font-medium text-gray-800">Fish</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">$</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={selectedGame?.cardValues?.fish?.toString() || '2'}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              handleCardValueChange('fish', parseInt(value) || 0);
                            }}
                            className="w-16 text-center font-semibold"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🐦</span>
                          <span className="font-medium text-gray-800">Roadrunner</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">$</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={selectedGame?.cardValues?.roadrunner?.toString() || '2'}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              handleCardValueChange('roadrunner', parseInt(value) || 0);
                            }}
                            className="w-16 text-center font-semibold"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">👻</span>
                          <span className="font-medium text-gray-800">Ghost</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">$</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={selectedGame?.cardValues?.ghost?.toString() || '2'}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              handleCardValueChange('ghost' as any, parseInt(value) || 0);
                            }}
                            className="w-16 text-center font-semibold"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🦨</span>
                          <span className="font-medium text-gray-800">Skunk</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">$</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={selectedGame?.cardValues?.skunk?.toString() || '2'}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              handleCardValueChange('skunk' as any, parseInt(value) || 0);
                            }}
                            className="w-16 text-center font-semibold"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🐍</span>
                          <span className="font-medium text-gray-800">Snake</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">$</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={selectedGame?.cardValues?.snake?.toString() || '2'}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              handleCardValueChange('snake' as any, parseInt(value) || 0);
                            }}
                            className="w-16 text-center font-semibold"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🌲</span>
                          <span className="font-medium text-gray-800">Yeti</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">$</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={selectedGame?.cardValues?.yeti?.toString() || '2'}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              handleCardValueChange('yeti' as any, parseInt(value) || 0);
                            }}
                            className="w-16 text-center font-semibold"
                          />
                        </div>
                      </div>
                      
                      {/* Custom Cards */}
                      {selectedGroup.customCards && selectedGroup.customCards.length > 0 && selectedGroup.customCards.map((customCard) => (
                        <div key={customCard.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{customCard.emoji}</span>
                                <span className="font-medium text-gray-800">{customCard.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">$</span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={selectedGame?.cardValues?.[customCard.name.toLowerCase()]?.toString() || customCard.value.toString()}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    handleCardValueChange(customCard.name.toLowerCase() as any, parseInt(value) || 0);
                                  }}
                                  className="w-16 text-center font-semibold"
                                />

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteCustomCardMutation.mutate(customCard.id)}
                                  disabled={deleteCustomCardMutation.isPending}
                                  className="p-1 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  🗑️
                                </Button>
                              </div>
                            </div>
                      ))}
                    </div>
                    
                    </CardContent>
                  </Card>
                )}

                {/* Reusable Card Game Payouts Component */}
                {selectedGame && gameState && (
                  <CardGamePayouts 
                    selectedGroup={selectedGroup} 
                    gameState={gameState} 
                    payoutData={payoutData}
                    selectedPointsGame={selectedPointsGame}
                    pointValue={pointValue}
                    fbtValue={fbtValue}
                  />
                )}

                {/* Card History */}
                {gameState && safeGameState.cardHistory?.length > 0 && (
                  <Card className="mb-4">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Card History</h3>
                      <div className="space-y-2">
                        {(() => {
                          // For standard cards, group by type to show assignment flows
                          // For custom cards, show each assignment individually (no grouping)
                          const standardCardTypes = ['camel', 'fish', 'roadrunner', 'ghost', 'skunk', 'snake', 'yeti'];
                          
                          const cardGroups = safeGameState.cardHistory.reduce((groups: Record<string, any[]>, entry) => {
                            const cardType = entry.cardType.toLowerCase();
                            
                            // For standard cards, group by type
                            if (standardCardTypes.includes(cardType)) {
                              if (!groups[cardType]) {
                                groups[cardType] = [];
                              }
                              groups[cardType].push(entry);
                            } else {
                              // For custom cards, group by cardId to show progression
                              const groupKey = entry.cardId;
                              if (!groups[groupKey]) {
                                groups[groupKey] = [];
                              }
                              groups[groupKey].push(entry);
                            }
                            return groups;
                          }, {});

                          return Object.entries(cardGroups).map(([groupKey, assignments]) => {
                            const assignment = assignments[0]; // Get the first assignment for display info
                            const cardType = assignment.cardType.toLowerCase();
                            const isCustomCard = !standardCardTypes.includes(cardType);
                            
                            return (
                              <div key={groupKey} className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-xl">
                                    {cardType === 'camel' ? '🐪' :
                                     cardType === 'fish' ? '🐟' :
                                     cardType === 'roadrunner' ? '🐦' :
                                     cardType === 'ghost' ? '👻' :
                                     cardType === 'skunk' ? '🦨' :
                                     cardType === 'snake' ? '🐍' :
                                     cardType === 'yeti' ? '🌲' :
                                     assignment.cardEmoji || '🎴'}
                                  </span>
                                  <span className="font-medium text-gray-800 capitalize">
                                    {assignment.cardName || assignment.cardType}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap ml-8">
                                  {assignments.map((assignment, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                      <span className="px-2 py-1 bg-white rounded border text-gray-700 text-sm">
                                        {assignment.playerName}
                                      </span>
                                      {index < assignments.length - 1 && (
                                        <span className="text-gray-400">→</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* Scoreboard Tab */}
        {currentTab === 'scoreboard' && (
          <div className="p-4">
            {!selectedGroup ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Trophy className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Select a group from the Groups tab to view scoreboard</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {!selectedGame ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Trophy className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Select a game to see the scoreboard</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Game Header */}
                    <Card className="mb-4">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {selectedGroup.groupPhoto && (
                            <img
                              src={selectedGroup.groupPhoto}
                              alt="Group photo"
                              className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
                            />
                          )}
                          <div className="flex-1">
                            <h2 className="text-lg font-semibold text-gray-800">{selectedGroup.name} - {selectedGame.name}</h2>
                            <p className="text-sm text-gray-600">Share Code: {selectedGame.shareCode}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* MODAL-BASED WHO OWES WHO - MOVED TO TOP */}
                    {(() => {
                      const isCardsActive = selectedGame && gameState && gameState.cardHistory?.length > 0;
                      const is2916Active = selectedPointsGame && 
                        Object.values(selectedPointsGame.holes || {}).some(hole => 
                          Object.values(hole as Record<string, any>).some((strokes: any) => strokes > 0)
                        );
                      const hasPayoutValues = (parseFloat(pointValue) > 0) || (parseFloat(fbtValue) > 0);
                      
                      // Show when any game is active
                      return isCardsActive || (is2916Active && hasPayoutValues);
                    })() && (
                      <Card className="mb-4 card-interactive hover-lift">
                        <CardContent className="p-4">
                          <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">💰 Who Owes Who</h3>
                            <div className="text-sm text-gray-600">
                              Calculate combined payouts across games
                            </div>
                          </div>
                          
                          {/* Calculate Payouts Button or Results */}
                          {multiSelectGames.length === 0 ? (
                            <Button 
                              onClick={() => {
                                setTempSelectedGames([]); // Reset temp selection
                                setShowPayoutModal(true);
                              }}
                              className="w-full btn-interactive btn-bouncy bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              Calculate Payouts
                            </Button>
                          ) : (
                            <div className="space-y-4">
                              {/* Edit Payouts Button */}
                              <div className="flex justify-between items-center">
                                <h4 className="text-md font-semibold text-gray-700">Combined Settlement</h4>
                                <Button 
                                  onClick={() => {
                                    setTempSelectedGames(multiSelectGames); // Set current selection as temp
                                    setShowPayoutModal(true);
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="btn-interactive hover-lift"
                                >
                                  Edit Payouts
                                </Button>
                              </div>
                              
                              {/* Selected Games Display */}
                              <div className="flex flex-wrap gap-2 mb-4">
                                {multiSelectGames.includes('cards') && (
                                  <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium fade-in">
                                    🎴 Card Game
                                  </div>
                                )}
                                {multiSelectGames.includes('points') && (
                                  <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium fade-in stagger-1">
                                    🎯 Points
                                  </div>
                                )}
                                {multiSelectGames.includes('fbt') && (
                                  <div className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium fade-in stagger-2">
                                    ⛳ FBT
                                  </div>
                                )}
                              </div>
                              
                              {(() => {
                                // Use server-side combined games calculation
                                if (!combinedGamesResult || !combinedGamesResult.success) {
                                  return (
                                    <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                                      <p className="text-purple-800">Calculating combined payouts...</p>
                                    </div>
                                  );
                                }

                                const transactions = combinedGamesResult.transactions || [];

                                if (transactions.length === 0) {
                                  return (
                                    <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                                      <p className="text-purple-800">All players are even across selected games - no payments needed!</p>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="space-y-2">
                                    {transactions.map((transaction, index) => (
                                      <div key={index} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                                        <div className="flex items-center gap-3">
                                          <div className="text-sm">
                                            <span className="font-medium text-red-600">{transaction.fromName}</span>
                                            <span className="text-gray-600"> owes </span>
                                            <span className="font-medium text-green-600">{transaction.toName}</span>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-lg font-bold text-purple-800">${transaction.amount.toFixed(2)}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Combined Cards + 2/9/16 Settlement - ONLY show when BOTH games are active */}
                    {(() => {
                      const isCardsActive = selectedGame && gameState && gameState.cardHistory?.length > 0;
                      const is2916Active = selectedPointsGame && 
                        Object.values(selectedPointsGame.holes || {}).some(hole => 
                          Object.values(hole as Record<string, any>).some((strokes: any) => strokes > 0)
                        );
                      const hasPayoutValues = (parseFloat(pointValue) > 0) || (parseFloat(fbtValue) > 0);
                      const bothGamesActive = isCardsActive && is2916Active && hasPayoutValues;
                      
                      return bothGamesActive;
                    })() && (
                      <Card className="mb-4">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">🎯 Who Owes Who - 2/9/16 Games</h3>
                            <Select value={combinedPayoutMode} onValueChange={(value: 'points' | 'fbt' | 'both') => setCombinedPayoutMode(value)}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="points">Points Only</SelectItem>
                                <SelectItem value="fbt">FBT Only</SelectItem>
                                <SelectItem value="both">Both</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <p className="text-sm text-gray-600 mb-4">
                            {combinedPayoutMode === 'points' ? 'Points-based settlement from 2/9/16 games only.' :
                             combinedPayoutMode === 'fbt' ? 'FBT settlement from 2/9/16 games only.' :
                             'Combined settlement for your selected payout method from both games.'}
                          </p>
                          
                          {(() => {
                            // Get card game payouts from server-side data
                            const cardPayouts: Record<string, number> = {};
                            if (payoutData?.proportionalShare?.payouts) {
                              payoutData.proportionalShare.payouts.forEach((payout: any) => {
                                cardPayouts[payout.playerId] = payout.netPayout || 0;
                              });
                            }

                            // Get 2/9/16 payouts from server-side data based on mode
                            const pointsPayouts: Record<string, number> = {};
                            const fbtPayouts: Record<string, number> = {};
                            
                            // Initialize with zeros
                            selectedGroup.players.forEach(player => {
                              pointsPayouts[player.id] = 0;
                              fbtPayouts[player.id] = 0;
                            });

                            const pointValueNum = parseFloat(pointValue);
                            const fbtValueNum = parseFloat(fbtValue);

                            // Get FBT payouts from server-side API
                            if ((combinedPayoutMode === 'fbt' || combinedPayoutMode === 'both') && fbtValueNum > 0) {
                              if (selectedFbtPayouts?.payouts) {
                                selectedGroup.players.forEach(player => {
                                  fbtPayouts[player.id] = selectedFbtPayouts.payouts[player.id] || 0;
                                });
                              }
                            }

                            // Get points payouts from server-side API
                            if ((combinedPayoutMode === 'points' || combinedPayoutMode === 'both') && pointValueNum > 0) {
                              if (selectedPointsPayouts?.payouts) {
                                selectedGroup.players.forEach(player => {
                                  pointsPayouts[player.id] = selectedPointsPayouts.payouts[player.id] || 0;
                                });
                              }
                            }
                            
                            // Apply FBT payouts to final calculation
                            if ((combinedPayoutMode === 'fbt' || combinedPayoutMode === 'both') && fbtValueNum > 0) {
                              selectedGroup.players.forEach(player => {
                                if (combinedPayoutMode === 'fbt') {
                                  // FBT only - replace points payouts with FBT payouts
                                  pointsPayouts[player.id] = fbtPayouts[player.id] || 0;
                                } else if (combinedPayoutMode === 'both') {
                                  // Both - add FBT payouts to existing points payouts
                                  pointsPayouts[player.id] += fbtPayouts[player.id] || 0;
                                }
                              });
                            }

                            // Combine card and points payouts into net balances
                            const combinedBalances: Record<string, number> = {};
                            selectedGroup.players.forEach(player => {
                              combinedBalances[player.id] = (cardPayouts[player.id] || 0) + (pointsPayouts[player.id] || 0);
                            });

                            // Apply pay-up algorithm to combined balances
                            const creditors = selectedGroup.players.filter(p => (combinedBalances[p.id] || 0) > 0.01);
                            const debtors = selectedGroup.players.filter(p => (combinedBalances[p.id] || 0) < -0.01);
                            
                            const transactions: Array<{
                              from: string;
                              fromName: string;
                              to: string;
                              toName: string;
                              amount: number;
                            }> = [];

                            const creditorsCopy = creditors.map(p => ({
                              ...p,
                              remaining: combinedBalances[p.id] || 0
                            })).sort((a, b) => b.remaining - a.remaining);

                            const debtorsCopy = debtors.map(p => ({
                              ...p,
                              remaining: Math.abs(combinedBalances[p.id] || 0)
                            })).sort((a, b) => b.remaining - a.remaining);

                            // Pay-up algorithm: match largest debtor with largest creditor until settled
                            let creditorIndex = 0;
                            let debtorIndex = 0;

                            while (creditorIndex < creditorsCopy.length && debtorIndex < debtorsCopy.length) {
                              const creditor = creditorsCopy[creditorIndex];
                              const debtor = debtorsCopy[debtorIndex];
                              
                              const paymentAmount = Math.min(creditor.remaining, debtor.remaining);
                              
                              if (paymentAmount > 0.01) {
                                transactions.push({
                                  from: debtor.id,
                                  fromName: debtor.name,
                                  to: creditor.id,
                                  toName: creditor.name,
                                  amount: Math.round(paymentAmount * 100) / 100
                                });
                              }
                              
                              creditor.remaining -= paymentAmount;
                              debtor.remaining -= paymentAmount;
                              
                              if (creditor.remaining < 0.01) creditorIndex++;
                              if (debtor.remaining < 0.01) debtorIndex++;
                            }

                            if (transactions.length === 0) {
                              return (
                                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                                  <p className="text-purple-800">All players are even across both games - no payments needed!</p>
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-2">
                                {transactions.map((transaction, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                                    <div className="flex items-center gap-3">
                                      <div className="text-sm">
                                        <span className="font-medium text-red-600">{transaction.fromName}</span>
                                        <span className="text-gray-600"> owes </span>
                                        <span className="font-medium text-green-600">{transaction.toName}</span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-lg font-bold text-purple-800">${transaction.amount.toFixed(2)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    )}

                    {/* Card Game Payouts */}
                    <CardGamePayouts 
                      selectedGroup={selectedGroup}
                      gameState={gameState}
                      payoutData={payoutData}
                    />

                    {(() => {
                      // Determine which games are active
                      const isCardsActive = selectedGame && gameState && gameState.cardHistory?.length > 0;
                      const is2916Active = selectedPointsGame && 
                        Object.values(selectedPointsGame.holes || {}).some(hole => 
                          Object.values(hole as Record<string, any>).some((strokes: any) => strokes > 0)
                        );
                      const hasPayoutValues = (parseFloat(pointValue) > 0) || (parseFloat(fbtValue) > 0);

                      return (
                        <>
                          {/* WHO OWES WHO - CARD GAME */}
                          {isCardsActive && !(is2916Active && hasPayoutValues) && (
                            <Card className="mb-4 card-interactive hover-lift fade-in">
                              <CardContent className="p-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">Who Owes Who - Cards</h3>
                                <div className="space-y-2">
                                  {(() => {
                                    // Use server-side payout calculations
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
                    })()}










                    {/* NEW TILES AT BOTTOM: Points and FBT Payouts matching 2/9/16 tab results */}
                    {(() => {
                      const is2916Active = selectedPointsGame && 
                        Object.values(selectedPointsGame.holes || {}).some(hole => 
                          Object.values(hole as Record<string, any>).some((strokes: any) => strokes > 0)
                        );
                      const pointValueNum = parseFloat(pointValue) || 0;
                      const fbtValueNum = parseFloat(fbtValue) || 0;
                      
                      if (!is2916Active || (pointValueNum <= 0 && fbtValueNum <= 0)) return null;

                      // Calculate total points for Points tile
                      const totalPoints: Record<string, number> = {};
                      selectedGroup.players.forEach(player => {
                        totalPoints[player.id] = 0;
                        Object.values(selectedPointsGame?.points || {}).forEach(holePoints => {
                          totalPoints[player.id] += holePoints[player.id] || 0;
                        });
                      });

                      // Get payouts from server-side APIs
                      const pointsPayouts: Record<string, number> = {};
                      const fbtPayouts: Record<string, number> = {};
                      
                      // Initialize with zeros
                      selectedGroup.players.forEach(player => {
                        pointsPayouts[player.id] = 0;
                        fbtPayouts[player.id] = 0;
                      });

                      // Get Points payouts from API
                      if (pointValueNum > 0 && selectedPointsPayouts?.payouts) {
                        selectedGroup.players.forEach(player => {
                          pointsPayouts[player.id] = selectedPointsPayouts.payouts[player.id] || 0;
                        });
                      }

                      // Get FBT payouts from API
                      if (fbtValueNum > 0 && selectedFbtPayouts?.payouts) {
                        selectedGroup.players.forEach(player => {
                          fbtPayouts[player.id] = selectedFbtPayouts.payouts[player.id] || 0;
                        });
                      }

                      return (
                        <>
                          {/* Points Only Tile */}
                          {pointValueNum > 0 && (
                            <Card className="mb-4">
                              <CardContent className="p-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">🎯 Points Only Payouts</h3>
                                <div className="space-y-2">
                                  {[...selectedGroup.players]
                                    .sort((a, b) => {
                                      const payoutA = pointsPayouts[a.id] || 0;
                                      const payoutB = pointsPayouts[b.id] || 0;
                                      return payoutB - payoutA; // Most profitable first
                                    })
                                    .map((player) => {
                                      const netAmount = pointsPayouts[player.id] || 0;
                                      const payout = {
                                        amount: Math.abs(netAmount),
                                        type: netAmount >= 0 ? 'receives' : 'pays'
                                      };
                                      
                                      return (
                                        <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                          <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold`}
                                                 style={{ backgroundColor: player.color }}>
                                              {player.initials}
                                            </div>
                                            <span className="font-medium text-gray-800">{player.name}</span>
                                          </div>
                                          <div className="text-right">
                                            <p className={`text-lg font-bold ${payout.type === 'receives' ? 'text-green-600' : 'text-red-600'}`}>
                                              ${payout.amount.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                              {payout.type === 'receives' ? 'Receives' : 'Pays'}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* FBT Only Tile */}
                          {fbtValueNum > 0 && (
                            <Card className="mb-4">
                              <CardContent className="p-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">⛳ FBT Only Payouts</h3>
                                <div className="space-y-2">
                                  {[...selectedGroup.players]
                                    .sort((a, b) => {
                                      const payoutA = fbtPayouts[a.id] || 0;
                                      const payoutB = fbtPayouts[b.id] || 0;
                                      return payoutB - payoutA; // Most profitable first
                                    })
                                    .map((player) => {
                                      const netAmount = fbtPayouts[player.id] || 0;
                                      const payout = {
                                        amount: Math.abs(netAmount),
                                        type: netAmount >= 0 ? 'receives' : 'pays'
                                      };
                                      
                                      return (
                                        <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                          <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold`}
                                                 style={{ backgroundColor: player.color }}>
                                              {player.initials}
                                            </div>
                                            <span className="font-medium text-gray-800">{player.name}</span>
                                          </div>
                                          <div className="text-right">
                                            <p className={`text-lg font-bold ${payout.type === 'receives' ? 'text-green-600' : 'text-red-600'}`}>
                                              ${payout.amount.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                              {payout.type === 'receives' ? 'Receives' : 'Pays'}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </>
                      );
                    })()}

              </>
            )}
            </>
          )}
        </div>
        )}

        {/* Points Tab */}
        {currentTab === 'points' && (
          <div className="p-4 space-y-4">
            {selectedGroup ? (
              <>
                {/* Points Game Selection or Creation */}
                {!selectedPointsGame ? (
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="text-2xl font-bold text-gray-800 mb-4">2/9/16 Game</h2>
                      
                      {pointsGames.length > 0 ? (
                        <div className="text-center space-y-4">
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-emerald-800 mb-2">
                              {pointsGames[0].name}
                            </h3>
                            <p className="text-sm text-emerald-600">
                              Loading your 2/9/16 game...
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center space-y-4">

                          <p className="text-gray-600">No 2/9/16 games yet. Create one to start tracking scores.</p>
                          <Button 
                            onClick={() => createPointsGameMutation.mutate({
                              groupId: selectedGroup.id,
                              gameStateId: selectedGame?.id, // Link to specific card game session
                              name: selectedGame ? `${selectedGame.name} - 2/9/16 Game ${new Date().toLocaleDateString()}` : `2/9/16 Game ${new Date().toLocaleDateString()}`
                            })}
                            disabled={createPointsGameMutation.isPending}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            {createPointsGameMutation.isPending ? "Creating..." : "Create 2/9/16 Game"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <>




                    {/* Hole Selection */}
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Select Hole</h3>
                        <div className="grid grid-cols-6 gap-2">
                          {Array.from({ length: 18 }, (_, i) => i + 1).map(hole => (
                            <Button 
                              key={hole}
                              variant={selectedHole === hole ? "default" : "outline"}
                              onClick={() => {
                                setSelectedHole(hole);
                                const existingStrokes = selectedPointsGame.holes?.[hole] || {};
                                const strokesAsStrings: Record<string, string> = {};
                                selectedGroup.players.forEach(player => {
                                  strokesAsStrings[player.id] = existingStrokes[player.id]?.toString() || '';
                                });
                                setHoleStrokes(strokesAsStrings);
                              }}
                              className="p-2 text-sm"
                            >
                              {hole}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Stroke Entry */}
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">
                          Net Strokes
                        </h3>
                        <div className="space-y-3">
                          {[...selectedGroup.players].map((player) => (
                            <div key={player.id} className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold`}
                                   style={{ backgroundColor: player.color }}>
                                {player.initials}
                              </div>
                              <span className="flex-1 font-medium text-gray-800">{player.name}</span>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={holeStrokes[player.id] || ''}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9]/g, '');
                                  setHoleStrokes(prev => ({ ...prev, [player.id]: value }));
                                }}
                                className="w-16 text-center"
                                placeholder="0"
                              />
                            </div>
                          ))}
                          
                          <Button 
                            onClick={() => {
                              const strokes: Record<string, number> = {};
                              selectedGroup.players.forEach(player => {
                                const strokeValue = parseInt(holeStrokes[player.id]) || 0;
                                if (strokeValue > 0) {
                                  strokes[player.id] = strokeValue;
                                }
                              });
                              
                              if (Object.keys(strokes).length === selectedGroup.players.length) {
                                updateHoleScoresMutation.mutate({
                                  gameId: selectedPointsGame.id,
                                  hole: selectedHole,
                                  strokes
                                });
                              } else {
                                toast({
                                  title: "Invalid Scores",
                                  description: "Please enter valid scores for all players.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            disabled={updateHoleScoresMutation.isPending}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                          >
                            {updateHoleScoresMutation.isPending ? "Saving..." : "Save Scores"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Score Summary */}
                    {(() => {
                      const totalPoints: Record<string, number> = {};
                      selectedGroup.players.forEach(player => {
                        totalPoints[player.id] = 0;
                        Object.values(selectedPointsGame.points || {}).forEach(holePoints => {
                          totalPoints[player.id] += holePoints[player.id] || 0;
                        });
                      });

                      return (
                        <Card>
                          <CardContent className="p-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">Scores</h3>
                            <div className="space-y-2">
                              {[...selectedGroup.players]
                                .sort((a, b) => (totalPoints[b.id] || 0) - (totalPoints[a.id] || 0))
                                .map((player) => (
                                <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold`}
                                         style={{ backgroundColor: player.color }}>
                                      {player.initials}
                                    </div>
                                    <span className="font-medium text-gray-800">{player.name}</span>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-gray-800">
                                      {totalPoints[player.id] || 0}
                                    </p>
                                    <p className="text-xs text-gray-600">points</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()}

                    {/* Payouts Calculator */}
                    {(() => {
                      const totalPoints: Record<string, number> = {};
                      selectedGroup.players.forEach(player => {
                        totalPoints[player.id] = 0;
                        Object.values(selectedPointsGame.points || {}).forEach(holePoints => {
                          totalPoints[player.id] += holePoints[player.id] || 0;
                        });
                      });

                      const pointValueNum = parseFloat(pointValue) || 0;
                      const fbtValueNum = parseFloat(fbtValue) || 0;
                      
                      // Calculate both payout systems
                      const pointsPayouts: Record<string, number> = {};
                      const fbtPayouts: Record<string, number> = {};
                      
                      // Points-based payouts (existing system)
                      if (pointValueNum > 0) {
                        selectedGroup.players.forEach(player => {
                          pointsPayouts[player.id] = 0;
                        });
                        
                        for (let i = 0; i < selectedGroup.players.length; i++) {
                          for (let j = i + 1; j < selectedGroup.players.length; j++) {
                            const player1 = selectedGroup.players[i];
                            const player2 = selectedGroup.players[j];
                            const points1 = totalPoints[player1.id] || 0;
                            const points2 = totalPoints[player2.id] || 0;
                            
                            const pointDifference = points1 - points2;
                            const transaction = pointDifference * pointValueNum;
                            
                            pointsPayouts[player1.id] += transaction;
                            pointsPayouts[player2.id] -= transaction;
                          }
                        }
                      }
                      
                      // FBT payouts (use server-side API instead of frontend calculation)
                      if (fbtValueNum > 0 && selectedFbtPayouts?.payouts) {
                        selectedGroup.players.forEach(player => {
                          fbtPayouts[player.id] = selectedFbtPayouts.payouts[player.id] || 0;
                        });
                      } else {
                        selectedGroup.players.forEach(player => {
                          fbtPayouts[player.id] = 0;
                        });
                      }
                      
                      // Convert to display format based on selected mode
                      const activePayouts = payoutMode === 'fbt' ? fbtPayouts : pointsPayouts;
                      const payouts: Record<string, { amount: number; type: 'pays' | 'receives' }> = {};
                      selectedGroup.players.forEach(player => {
                        const netAmount = activePayouts[player.id] || 0;
                        payouts[player.id] = {
                          amount: Math.abs(netAmount),
                          type: netAmount >= 0 ? 'receives' : 'pays'
                        };
                      });
                      
                      return (
                        <Card>
                          <CardContent className="p-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">Payouts</h3>
                            
                            {/* Payout Mode Toggle */}
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Payout System
                              </label>
                              <div className="flex gap-2 mb-3">
                                <Button
                                  variant={payoutMode === 'points' ? 'default' : 'outline'}
                                  onClick={() => setPayoutMode('points')}
                                  size="sm"
                                  className="flex-1"
                                >
                                  Points
                                </Button>
                                <Button
                                  variant={payoutMode === 'fbt' ? 'default' : 'outline'}
                                  onClick={() => setPayoutMode('fbt')}
                                  size="sm"
                                  className="flex-1"
                                >
                                  FBT
                                </Button>
                              </div>
                            </div>

                            {/* Value Inputs */}
                            <div className="mb-4 grid grid-cols-2 gap-3">
                              <div>
                                <div className="flex items-center gap-1 mb-2">
                                  <label className="text-sm font-medium text-gray-700">
                                    Point Value ($)
                                  </label>
                                  <button
                                    onClick={() => setShowPointValueTooltip(true)}
                                    className="text-gray-500 hover:text-gray-700"
                                  >
                                    <Info className="h-4 w-4" />
                                  </button>
                                </div>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={pointValue}
                                  onChange={(e) => setPointValue(e.target.value)}
                                  className="w-full"
                                  placeholder="1.00"
                                />
                              </div>
                              
                              <div>
                                <div className="flex items-center gap-1 mb-2">
                                  <label className="text-sm font-medium text-gray-700">
                                    FBT Value ($)
                                  </label>
                                  <button
                                    onClick={() => setShowFbtValueTooltip(true)}
                                    className="text-gray-500 hover:text-gray-700"
                                  >
                                    <Info className="h-4 w-4" />
                                  </button>
                                </div>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={fbtValue}
                                  onChange={(e) => setFbtValue(e.target.value)}
                                  className="w-full"
                                  placeholder="5.00"
                                />
                              </div>
                            </div>

                            {/* Payout Calculations */}
                            <div className="space-y-2">
                              {[...selectedGroup.players]
                                .sort((a, b) => {
                                  const payoutA = payouts[a.id] || { amount: 0, type: 'pays' };
                                  const payoutB = payouts[b.id] || { amount: 0, type: 'pays' };
                                  const netAmountA = payoutA.type === 'receives' ? payoutA.amount : -payoutA.amount;
                                  const netAmountB = payoutB.type === 'receives' ? payoutB.amount : -payoutB.amount;
                                  return netAmountB - netAmountA; // Most profitable first, most indebted last
                                })
                                .map((player) => {
                                  const payout = payouts[player.id] || { amount: 0, type: 'pays' };
                                  
                                  return (
                                    <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold`}
                                             style={{ backgroundColor: player.color }}>
                                          {player.initials}
                                        </div>
                                        <span className="font-medium text-gray-800">{player.name}</span>
                                      </div>
                                      <div className="text-right">
                                        <p className={`text-lg font-bold ${payout.type === 'receives' ? 'text-green-600' : 'text-red-600'}`}>
                                          ${payout.amount.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                          {payout.type === 'receives' ? 'Receives' : 'Pays'}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>

                            {((payoutMode === 'points' && pointValueNum > 0) || (payoutMode === 'fbt' && fbtValueNum > 0)) && (
                              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                  {payoutMode === 'points' ? (
                                    <>
                                      <strong>Points System:</strong> Each player pays or receives money from every other player based on point differences. 
                                      The net result shows each player's total amount owed or received.
                                    </>
                                  ) : (
                                    <>
                                      <strong>FBT System:</strong> Winners are determined by lowest stroke count for Front 9, Back 9, and Total 18 holes. 
                                      Each winner receives the FBT value amount.
                                    </>
                                  )}
                                </p>
                              </div>
                            )}

                            {/* 2/9/16 Who Owes Who Section - Only show when Cards game is NOT active */}
                            {((payoutMode === 'points' && pointValueNum > 0) || (payoutMode === 'fbt' && fbtValueNum > 0)) && 
                             !(selectedGame && gameState && gameState.cardHistory?.length > 0) && (
                              <div className="mt-4">
                                <h4 className="text-md font-semibold text-gray-800 mb-3">Who Owes Who - 2/9/16</h4>
                                {(() => {
                                  // Calculate who owes who for 2/9/16 game
                                  const pointsPayouts: Record<string, number> = {};
                                  
                                  if (payoutMode === 'points' && pointValueNum > 0) {
                                    selectedGroup.players.forEach(player => {
                                      pointsPayouts[player.id] = 0;
                                    });

                                    for (let i = 0; i < selectedGroup.players.length; i++) {
                                      for (let j = i + 1; j < selectedGroup.players.length; j++) {
                                        const player1 = selectedGroup.players[i];
                                        const player2 = selectedGroup.players[j];
                                        const points1 = totalPoints[player1.id] || 0;
                                        const points2 = totalPoints[player2.id] || 0;
                                        
                                        const pointDifference = points1 - points2;
                                        const transaction = pointDifference * pointValueNum;
                                        
                                        pointsPayouts[player1.id] += transaction;
                                        pointsPayouts[player2.id] -= transaction;
                                      }
                                    }
                                  } else if (payoutMode === 'fbt' && fbtValueNum > 0) {
                                    // CRITICAL FIX: Recalculate FBT payouts here to ensure they update when scores change
                                    selectedGroup.players.forEach(player => {
                                      pointsPayouts[player.id] = 0;
                                    });

                                    const front9Strokes: Record<string, number> = {};
                                    const back9Strokes: Record<string, number> = {};
                                    const totalStrokes: Record<string, number> = {};
                                    
                                    selectedGroup.players.forEach(player => {
                                      front9Strokes[player.id] = 0;
                                      back9Strokes[player.id] = 0;
                                      totalStrokes[player.id] = 0;
                                      
                                      for (let hole = 1; hole <= 18; hole++) {
                                        const holeStrokes = selectedPointsGame.holes?.[hole]?.[player.id] || 0;
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
                                      const front9Winner = selectedGroup.players.reduce((winner, player) => 
                                        front9Strokes[player.id] > 0 && (front9Strokes[winner.id] === 0 || front9Strokes[player.id] < front9Strokes[winner.id]) ? player : winner
                                      );
                                      if (front9Strokes[front9Winner.id] > 0) {
                                        pointsPayouts[front9Winner.id] += fbtValueNum;
                                        totalWinnings += fbtValueNum;
                                        winners.add(front9Winner.id);
                                      }
                                    }

                                    if (Object.values(back9Strokes).some(s => s > 0)) {
                                      const back9Winner = selectedGroup.players.reduce((winner, player) => 
                                        back9Strokes[player.id] > 0 && (back9Strokes[winner.id] === 0 || back9Strokes[player.id] < back9Strokes[winner.id]) ? player : winner
                                      );
                                      if (back9Strokes[back9Winner.id] > 0) {
                                        pointsPayouts[back9Winner.id] += fbtValueNum;
                                        totalWinnings += fbtValueNum;
                                        winners.add(back9Winner.id);
                                      }
                                    }

                                    if (Object.values(totalStrokes).some(s => s > 0)) {
                                      const totalWinner = selectedGroup.players.reduce((winner, player) => 
                                        totalStrokes[player.id] > 0 && (totalStrokes[winner.id] === 0 || totalStrokes[player.id] < totalStrokes[winner.id]) ? player : winner
                                      );
                                      if (totalStrokes[totalWinner.id] > 0) {
                                        pointsPayouts[totalWinner.id] += fbtValueNum;
                                        totalWinnings += fbtValueNum;
                                        winners.add(totalWinner.id);
                                      }
                                    }

                                    // CRITICAL FIX: Only non-winners pay the cost, not ALL players
                                    const nonWinners = selectedGroup.players.filter(p => !winners.has(p.id) && totalStrokes[p.id] > 0);
                                    if (nonWinners.length > 0 && totalWinnings > 0) {
                                      const costPerLoser = totalWinnings / nonWinners.length;
                                      nonWinners.forEach(player => {
                                        pointsPayouts[player.id] -= costPerLoser;
                                      });
                                    }
                                  }

                                  // Calculate who owes who transactions
                                  const creditors = selectedGroup.players.filter(p => (pointsPayouts[p.id] || 0) > 0);
                                  const debtors = selectedGroup.players.filter(p => (pointsPayouts[p.id] || 0) < 0);
                                  
                                  const transactions: Array<{
                                    from: string;
                                    fromName: string;
                                    to: string;
                                    toName: string;
                                    amount: number;
                                  }> = [];

                                  const creditorsCopy = creditors.map(p => ({
                                    ...p,
                                    remaining: pointsPayouts[p.id] || 0
                                  })).sort((a, b) => b.remaining - a.remaining);

                                  const debtorsCopy = debtors.map(p => ({
                                    ...p,
                                    remaining: Math.abs(pointsPayouts[p.id] || 0)
                                  })).sort((a, b) => b.remaining - a.remaining);

                                  let creditorIndex = 0;
                                  let debtorIndex = 0;

                                  while (creditorIndex < creditorsCopy.length && debtorIndex < debtorsCopy.length) {
                                    const creditor = creditorsCopy[creditorIndex];
                                    const debtor = debtorsCopy[debtorIndex];
                                    
                                    const paymentAmount = Math.min(creditor.remaining, debtor.remaining);
                                    
                                    if (paymentAmount > 0.01) {
                                      transactions.push({
                                        from: debtor.id,
                                        fromName: debtor.name,
                                        to: creditor.id,
                                        toName: creditor.name,
                                        amount: Math.round(paymentAmount * 100) / 100
                                      });
                                    }
                                    
                                    creditor.remaining -= paymentAmount;
                                    debtor.remaining -= paymentAmount;
                                    
                                    if (creditor.remaining < 0.01) creditorIndex++;
                                    if (debtor.remaining < 0.01) debtorIndex++;
                                  }

                                  if (transactions.length === 0) {
                                    return (
                                      <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-gray-600">All players are even - no payments needed!</p>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="space-y-2">
                                      {transactions.map((transaction, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                          <div className="flex items-center gap-3">
                                            <div className="text-sm">
                                              <span className="font-medium text-red-600">{transaction.fromName}</span>
                                              <span className="text-gray-600"> owes </span>
                                              <span className="font-medium text-green-600">{transaction.toName}</span>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-lg font-bold text-black">${transaction.amount.toFixed(2)}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })()}
                  </>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">2/9/16 Game</h2>
                  <p className="text-gray-600">Select a group to start playing the points game.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Rules Tab */}
        {currentTab === 'rules' && (
          <div className="p-4 space-y-4" ref={(el) => {
            if (el && currentTab === 'rules') {
              el.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}>
            {/* Tutorial Section */}
            <Tutorial />
            
            {/* Rules Reference */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Reference</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                      Setup
                    </h3>
                    <p className="text-gray-600 leading-relaxed">Create a group of 2-4 players. Set the monetary value for each card type before starting the game.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                      Drawing Cards
                    </h3>
                    <p className="text-gray-600 leading-relaxed">Players take turns drawing cards from the shared deck. Each card drawn must be assigned to one of the players in the group.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                      Card Types
                    </h3>
                    <div className="space-y-3 ml-8">
                      <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                        <span className="text-2xl">🐪</span>
                        <div>
                          <p className="font-medium text-gray-800">Camel</p>
                          <p className="text-sm text-gray-600">Land in a sand trap</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <span className="text-2xl">🐟</span>
                        <div>
                          <p className="font-medium text-gray-800">Fish</p>
                          <p className="text-sm text-gray-600">Ball in the water</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                        <span className="text-2xl">🐦</span>
                        <div>
                          <p className="font-medium text-gray-800">Roadrunner</p>
                          <p className="text-sm text-gray-600">Hit the cart path</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="text-2xl">👻</span>
                        <div>
                          <p className="font-medium text-gray-800">Ghost</p>
                          <p className="text-sm text-gray-600">Lost ball or out of bounds</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                        <span className="text-2xl">🦨</span>
                        <div>
                          <p className="font-medium text-gray-800">Skunk</p>
                          <p className="text-sm text-gray-600">Double bogey or worse</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <span className="text-2xl">🐍</span>
                        <div>
                          <p className="font-medium text-gray-800">Snake</p>
                          <p className="text-sm text-gray-600">Three or more putts</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-cyan-50 rounded-lg">
                        <span className="text-2xl">🌲</span>
                        <div>
                          <p className="font-medium text-gray-800">Yeti</p>
                          <p className="text-sm text-gray-600">Hit a tree</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                      Custom Cards
                    </h3>
                    <p className="text-gray-600 leading-relaxed ml-8">Create your own penalty cards with custom names, emojis, and values to match your group's specific rules. Examples: Whiff, Shank, Hit a House.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
                      Trading & Reassignment
                    </h3>
                    <p className="text-gray-600 leading-relaxed ml-8">Cards can be reassigned between players throughout the round. This allows for strategic trading and negotiation.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">6</span>
                      Winning
                    </h3>
                    <p className="text-gray-600 leading-relaxed">At the end of the round, players pay out based on the cards they hold. The game continues for multiple rounds as desired.</p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Tips for Success</h3>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        <span>Keep track of which cards have been drawn</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        <span>Agree on card values before starting</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        <span>Use the app to avoid disputes over card assignments</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Points Game Rules */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">2/9/16 Game Rules</h2>
                <div className="space-y-4 text-gray-600">
                  <p className="leading-relaxed">
                    The 2/9/16 Game is a stroke-based competition where players earn points based on their performance relative to other players on each hole.
                  </p>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">How Points Are Awarded</h3>
                    
                    <div className="ml-4 space-y-3">
                      <div>
                        <h4 className="font-medium text-gray-800">2 Players:</h4>
                        <ul className="ml-4 space-y-1 text-sm">
                          <li>• Fewer strokes: 2 points</li>
                          <li>• More strokes: 0 points</li>
                          <li>• Tie: 1 point each</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-800">3 Players:</h4>
                        <ul className="ml-4 space-y-1 text-sm">
                          <li>• Fewest strokes: 5 points</li>
                          <li>• Middle strokes: 3 points</li>
                          <li>• Most strokes: 1 point</li>
                          <li>• Two tied for low: 4 points each, high gets 1</li>
                          <li>• Two tied for high: Low gets 5, tied get 2 each</li>
                          <li>• All tied: 3 points each</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-800">4 Players:</h4>
                        <ul className="ml-4 space-y-1 text-sm">
                          <li>• Fewest strokes: 7 points</li>
                          <li>• Second fewest: 5 points</li>
                          <li>• Second most: 3 points</li>
                          <li>• Most strokes: 1 point</li>
                          <li>• Ties: Points are distributed proportionally</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Playing the Game</h3>
                    <ol className="space-y-2 ml-4">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">1.</span>
                        <span>Select the 2/9/16 tab and create a game for your group</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">2.</span>
                        <span>After each hole, enter everyone's stroke count</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">3.</span>
                        <span>Points are automatically calculated and added to the leaderboard</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">4.</span>
                        <span>Check the Payouts tab to see money calculations</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">5.</span>
                        <span>Play both games simultaneously for maximum fun!</span>
                      </li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Dual Payout Systems</h3>
                    <p className="text-gray-600 mb-3">
                      The 2/9/16 Game includes two payout systems that run simultaneously - choose your preferred method:
                    </p>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="font-medium text-blue-800 mb-2">Points System</h4>
                        <ul className="space-y-1 text-sm text-blue-700">
                          <li>• Each player pays/receives money based on point differences</li>
                          <li>• Higher-scoring players receive from lower-scoring players</li>
                          <li>• Set Point Value (e.g., $1.00 per point) to calculate amounts</li>
                          <li>• Net result shows total amount each player owes or receives</li>
                        </ul>
                      </div>
                      
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="font-medium text-green-800 mb-2">FBT System (Front/Back/Total)</h4>
                        <ul className="space-y-1 text-sm text-green-700">
                          <li>• Winners determined by lowest stroke count:</li>
                          <li className="ml-4">- Front 9 (holes 1-9)</li>
                          <li className="ml-4">- Back 9 (holes 10-18)</li>
                          <li className="ml-4">- Total 18 holes</li>
                          <li>• Winners receive FBT Value for each category won</li>
                          <li>• Non-winners split the total cost equally</li>
                        </ul>
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Pro Tip:</strong> Both systems calculate simultaneously! Toggle between "Points" and "FBT" modes in the game to see both payout options, or check the Payouts tab to view them side by side.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <BottomNavigation currentTab={currentTab} onTabChange={(tab) => {
        setCurrentTab(tab);
        // Scroll to top when switching to Payouts tab
        if (tab === 'scoreboard') {
          window.scrollTo(0, 0);
        }
      }} />
      <CreateGroupModal 
        open={showCreateGroupModal}
        onOpenChange={setShowCreateGroupModal}
        onSuccess={(group: Group) => {
          // Auto-select the new group for game creation
          setSelectedGroup(group);
          queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
          
          // If we have a pending game name, create the game automatically
          if (newGameName) {
            createGameMutation.mutate({
              groupId: group.id,
              name: newGameName
            });
          } else {
            // Otherwise, re-open the create game dialog with the group selected
            setShowCreateGameDialog(true);
          }
        }}
      />
      
      <CreateGroupModal 
        open={createGroupOpen} 
        onOpenChange={setCreateGroupOpen}
        onSuccess={(group) => {
          queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
        }}
      />

      {/* Card Assignment Modal */}
      <Dialog open={assignCardOpen} onOpenChange={setAssignCardOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800">
              Assign {selectedCardType && (
                <span className="inline-flex items-center gap-2">
                  {getCardEmoji(selectedCardType)} {selectedCardType.charAt(0).toUpperCase() + selectedCardType.slice(1)}
                </span>
              )} Card
            </DialogTitle>
            <DialogDescription>
              Choose which player should receive this penalty card.
            </DialogDescription>
          </DialogHeader>
          
          {selectedGroup && selectedCardType && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Select a player to assign this card to:</p>
              
              {selectedGroup.players.map((player) => (
                <Button
                  key={player.id}
                  onClick={() => {
                    handleAssignCardType(selectedCardType, player.id);
                    setAssignCardOpen(false);
                    setSelectedCardType(null);
                  }}
                  disabled={assignCard.isPending}
                  variant="outline"
                  className="w-full flex items-center gap-3 p-4 h-auto justify-start"
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                    style={{ backgroundColor: player.color }}
                  >
                    {player.initials}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-800">{player.name}</p>
                    <p className="text-sm text-gray-500">
                      {gameState?.playerCards[player.id]?.length || 0} cards assigned
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">
                      +${(() => {
                        // First check if it's a custom card
                        const customCard = selectedGroup.customCards?.find(c => c.name.toLowerCase() === selectedCardType?.toLowerCase());
                        if (customCard) {
                          return customCard.value;
                        }
                        // Then check game card values
                        if (selectedGame?.cardValues?.[selectedCardType]) {
                          return selectedGame.cardValues[selectedCardType];
                        }
                        // Fallback to group card values
                        return selectedGroup.cardValues?.[selectedCardType] || 2;
                      })()}
                    </p>
                  </div>
                </Button>
              ))}
              
              <Button 
                variant="ghost" 
                onClick={() => {
                  setAssignCardOpen(false);
                  setSelectedCardType(null);
                }}
                className="w-full mt-4"
              >
                Cancel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Game Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800">Share Game</DialogTitle>
            <DialogDescription>
              Share this code with others so they can join your game from their device.
            </DialogDescription>
          </DialogHeader>
          
          {selectedGroup?.shareCode && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="bg-gray-100 rounded-lg p-6 mb-4">
                  <div className="text-3xl font-mono font-bold text-gray-800 tracking-wider">
                    {selectedGroup.shareCode}
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Game: <span className="font-semibold">{selectedGroup.name}</span>
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-gray-500">
                    {isConnected ? 'Real-time sync active' : 'Connecting...'}
                  </span>
                </div>
              </div>
              
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(selectedGroup.shareCode!);
                }}
                className="w-full"
              >
                Copy Share Code
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => setShowShareDialog(false)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Join Game Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800">Join Game</DialogTitle>
            <DialogDescription>
              Enter the share code to join an existing game.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Enter share code (e.g., ABC123)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="text-center text-lg font-mono tracking-wider"
                maxLength={8}
              />
            </div>
            
            <Button 
              onClick={() => joinGroupMutation.mutate(joinCode)}
              disabled={!joinCode.trim() || joinGroupMutation.isPending}
              className="w-full"
            >
              {joinGroupMutation.isPending ? "Joining..." : "Join Game"}
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => {
                setShowJoinDialog(false);
                setJoinCode("");
              }}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Custom Card Dialog */}
      <Dialog open={showCreateCardDialog} onOpenChange={setShowCreateCardDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800">Create Custom Card</DialogTitle>
            <DialogDescription>
              Add a new penalty card type to your game with a custom name, emoji, and value.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Card Name</label>
              <Input
                placeholder="e.g., Whiff, Shank, Hit a House"
                value={customCardName}
                onChange={(e) => setCustomCardName(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Card Emoji</label>
              <Input
                placeholder="e.g., 🏌️, 💦, ⛳"
                value={customCardEmoji}
                onChange={(e) => setCustomCardEmoji(e.target.value)}
                className="w-full text-center text-lg"
                maxLength={2}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Card Value</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">$</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={customCardValue}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setCustomCardValue(value);
                  }}
                  className="w-20 text-center font-semibold"
                />
              </div>
            </div>
            
            <Button 
              onClick={() => {
                if (customCardName && customCardEmoji && customCardValue) {
                  createCustomCardMutation.mutate({
                    name: customCardName,
                    emoji: customCardEmoji,
                    value: parseInt(customCardValue) || 15
                  });
                }
              }}
              disabled={!customCardName || !customCardEmoji || !customCardValue || createCustomCardMutation.isPending}
              className="w-full"
            >
              {createCustomCardMutation.isPending ? "Creating..." : "Create Card"}
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => {
                setShowCreateCardDialog(false);
                setCustomCardName("");
                setCustomCardEmoji("");
                setCustomCardValue("15");
              }}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Game Dialog - New Game>Group architecture */}
      <Dialog open={showCreateGameDialog} onOpenChange={setShowCreateGameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800">Create New Game</DialogTitle>
            <DialogDescription>
              Create a new ForeScore game - add players manually or import from an existing group
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="gameName" className="block text-sm font-medium text-gray-700 mb-1">
                Game Name
              </label>
              <Input
                id="gameName"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                placeholder="Golf course name, event, or date"
                maxLength={50}
              />
            </div>
            
            {/* Create New Group - moved below Game Name */}
            <div>
              <Button
                onClick={() => {
                  setSelectedGroup(null);
                  setShowCreateGroupModal(true);
                  setShowCreateGameDialog(false);
                }}
                variant={selectedGroup ? "outline" : "default"}
                className="w-full justify-start"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Group
              </Button>
            </div>
            
            {/* Import Players from Group - moved down */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Import Players from Group (Optional)
              </label>
              <div className="space-y-2">
                {/* Existing groups */}
                {groups.map((group) => (
                  <Button
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    variant={selectedGroup?.id === group.id ? "default" : "outline"}
                    className="w-full justify-start"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {group.name} ({group.players.length} players)
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button 
                onClick={() => {
                  setShowCreateGameDialog(false);
                  setSelectedGroup(null);
                  setNewGameName("");
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (selectedGroup) {
                    // Create game with existing group
                    createGameMutation.mutate({
                      groupId: selectedGroup.id,
                      name: newGameName || `Game ${new Date().toLocaleDateString()}`
                    });
                  } else {
                    // Manual player addition requires group creation first - do nothing silently
                    return;
                  }
                }}
                disabled={createGameMutation.isPending || !selectedGroup}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {createGameMutation.isPending ? 'Creating...' : 'Create Game'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Point Value Tooltip Modal */}
      <Dialog open={showPointValueTooltip} onOpenChange={setShowPointValueTooltip}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800">Point Value</DialogTitle>
            <DialogDescription>
              How much money each point is worth in the 2/9/16 payout system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              <strong>Points System:</strong> Each player pays or receives money from every other player based on their point differences.
            </p>
            <p className="text-sm text-gray-700">
              For example, if the point value is $1.00 and Player A has 5 more points than Player B, then Player B pays Player A $5.00.
            </p>
            <p className="text-sm text-gray-700">
              The system calculates net amounts automatically, so players only see their final amount owed or received.
            </p>
            <Button 
              onClick={() => setShowPointValueTooltip(false)}
              className="w-full"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FBT Value Tooltip Modal */}
      <Dialog open={showFbtValueTooltip} onOpenChange={setShowFbtValueTooltip}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800">FBT Value</DialogTitle>
            <DialogDescription>
              How much money winners receive for Front 9, Back 9, and Total victories.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              <strong>FBT System:</strong> Winners are determined by the lowest stroke count for:
            </p>
            <ul className="text-sm text-gray-700 ml-4 space-y-1">
              <li>• <strong>Front 9:</strong> Holes 1-9</li>
              <li>• <strong>Back 9:</strong> Holes 10-18</li>  
              <li>• <strong>Total:</strong> All 18 holes</li>
            </ul>
            <p className="text-sm text-gray-700">
              For example, if FBT Value is $5.00 and Player A wins Front 9 and Total, they receive $10.00. The remaining players split the cost equally.
            </p>
            <Button 
              onClick={() => setShowFbtValueTooltip(false)}
              className="w-full"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payout Calculation Modal */}
      <Dialog open={showPayoutModal} onOpenChange={setShowPayoutModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800">Calculate Payouts</DialogTitle>
            <DialogDescription>
              Select which games to include in your combined payout calculation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Available Games */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Select Games:</label>
              
              {/* Card Game Option */}
              {selectedGame && gameState && gameState.cardHistory?.length > 0 && (
                <Button 
                  variant={tempSelectedGames.includes('cards') ? 'default' : 'outline'}
                  className={`w-full justify-start h-auto p-3 ${
                    tempSelectedGames.includes('cards') 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (tempSelectedGames.includes('cards')) {
                      setTempSelectedGames(tempSelectedGames.filter(g => g !== 'cards'));
                    } else {
                      setTempSelectedGames([...tempSelectedGames, 'cards']);
                    }
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-lg">🎴</span>
                    <div className="text-left">
                      <div className="font-medium">Card Game</div>
                      <div className={`text-sm ${tempSelectedGames.includes('cards') ? 'text-blue-100' : 'text-gray-600'}`}>
                        {gameState.cardHistory.length} cards played
                      </div>
                    </div>
                  </div>
                </Button>
              )}
              
              {/* Points Game Option */}
              {selectedPointsGame && parseFloat(pointValue) > 0 && (
                <Button 
                  variant={tempSelectedGames.includes('points') ? 'default' : 'outline'}
                  className={`w-full justify-start h-auto p-3 ${
                    tempSelectedGames.includes('points') 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (tempSelectedGames.includes('points')) {
                      setTempSelectedGames(tempSelectedGames.filter(g => g !== 'points'));
                    } else {
                      setTempSelectedGames([...tempSelectedGames, 'points']);
                    }
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-lg">🎯</span>
                    <div className="text-left">
                      <div className="font-medium">Points Game</div>
                      <div className={`text-sm ${tempSelectedGames.includes('points') ? 'text-green-100' : 'text-gray-600'}`}>
                        ${pointValue} per point
                      </div>
                    </div>
                  </div>
                </Button>
              )}
              
              {/* FBT Game Option */}
              {selectedPointsGame && parseFloat(fbtValue) > 0 && (
                <Button 
                  variant={tempSelectedGames.includes('fbt') ? 'default' : 'outline'}
                  className={`w-full justify-start h-auto p-3 ${
                    tempSelectedGames.includes('fbt') 
                      ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (tempSelectedGames.includes('fbt')) {
                      setTempSelectedGames(tempSelectedGames.filter(g => g !== 'fbt'));
                    } else {
                      setTempSelectedGames([...tempSelectedGames, 'fbt']);
                    }
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-lg">⛳</span>
                    <div className="text-left">
                      <div className="font-medium">FBT Game</div>
                      <div className={`text-sm ${tempSelectedGames.includes('fbt') ? 'text-orange-100' : 'text-gray-600'}`}>
                        ${fbtValue} per victory
                      </div>
                    </div>
                  </div>
                </Button>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={() => {
                  setMultiSelectGames(tempSelectedGames);
                  setShowPayoutModal(false);
                }}
                disabled={tempSelectedGames.length === 0}
                className="flex-1 btn-interactive btn-bouncy bg-purple-600 hover:bg-purple-700 text-white"
              >
                Calculate
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => {
                  setTempSelectedGames(multiSelectGames); // Reset to current selection
                  setShowPayoutModal(false);
                }}
                className="flex-1 btn-interactive hover-lift"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
