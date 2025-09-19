import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Gamepad2, BookOpen, ChevronRight, Edit, Layers, Trophy, ArrowLeft, Info, HelpCircle, LogOut, Menu, Loader2, User, FileText, Mail, Crown, Clock, CreditCard, AlertTriangle, Hash, Flag, Zap, MoreHorizontal } from "lucide-react";
import { CreateGroupModal } from "@/components/create-group-modal";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Tutorial } from "@/components/tutorial";

import { useAuth } from "@/hooks/useAuth";
import { useGameState } from "@/hooks/use-game-state";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { useAutosaveObject } from "@/hooks/useAutosave";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Group, GameState, Card as GameCard, PointsGame } from "@shared/schema";

// Hook for server-side payouts calculation
function useGamePayouts(gameStateId: string | undefined, cardValuesKey?: string) {
  // Create a unique key that changes whenever card values change
  const timestamp = Date.now();
  
  return useQuery<{
    cardGame: {
      totalPot: number;
      payouts: Array<{
        playerId: string;
        playerName: string;
        debt: number;
        netPayout: number;
      }>;
    };
    whoOwesWho: Array<{
      fromPlayerId: string;
      toPlayerId: string;
      amount: number;
      fromPlayerName: string;
      toPlayerName: string;
    }>;
  }>({
    queryKey: ['/api/game-state', gameStateId, 'payouts', cardValuesKey, 'always-fresh'], // Force unique key
    queryFn: async () => {
      if (!gameStateId) throw new Error('No game state ID');
      const response = await fetch(`/api/game-state/${gameStateId}/payouts?nocache=${timestamp}`, {
        credentials: 'include',
        cache: 'no-cache', // Disable browser cache
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch payouts: ${response.status}`);
      }
      const result = await response.json();
      console.log('Fresh payouts data fetched with card values:', cardValuesKey, result);
      return result;
    },
    enabled: !!gameStateId,
    retry: false,
    refetchOnWindowFocus: false, // No auto-refresh
    refetchInterval: false, // No polling
    staleTime: 0, // Consider stale immediately so invalidation works
    gcTime: 0, // Don't cache at all
    networkMode: 'always', // Always make network request
  });
}



// Utility functions for card styling and emojis
const getCardColor = (type: string) => {
  // Standardized grey styling for ALL card types (including custom cards)
  return 'bg-gray-100 text-gray-800 border-gray-200';
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
          <h3 className="text-lg font-semibold text-gray-800 mb-4">🎴 Card Game Payouts</h3>
          <div className="space-y-3">
            {selectedGroup.players.map((player) => {
              const playerCards = gameState?.playerCards[player.id] || [];
              
              // Get server-calculated payout for this player
              const playerPayout = payoutData?.cardGame?.payouts?.find((p: any) => p.playerId === player.id);
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
                          <p className={`text-lg font-bold ${Math.abs(netAmount) < 0.01 ? 'text-gray-600' : isReceiving ? 'text-green-600' : 'text-red-600'}`}>
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
                        variant="outline"
                        className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 border-gray-200"
                      >
                        <span className="mr-1">{card.type === 'custom' ? card.emoji : getCardEmoji(card.type)}</span>
                        {(() => {
                          // Always use current game state values first
                          if (card.type === 'custom' && card.name) {
                            const customCard = selectedGroup?.customCards?.find(c => c.name.toLowerCase() === card.name?.toLowerCase());
                            if (customCard) {
                              const customCardKey = customCard.name.toLowerCase();
                              const value = gameState?.cardValues[customCardKey] ?? customCard.value;
                              return `$${value}`;
                            }
                          } else {
                            const value = gameState?.cardValues[card.type as keyof typeof gameState.cardValues];
                            if (value !== undefined) {
                              return `$${value}`;
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


    </>
  );
}

export default function Home() {
  const { user, isAdmin } = useAuth();
  
  // Track payout data readiness for the restoration logic
  const [payoutDataReady, setPayoutDataReady] = useState(true);
  
  // V6.5: Use complete game state persistence with payout data readiness
  const { 
    currentTab, 
    changeTab, 
    selectedGroup, 
    changeGroup, 
    selectedGame, 
    changeGame,
    isRestoring 
  } = useTabPersistence(payoutDataReady);
  
  // Payouts query will be defined after the groupGames query
  

  const [selectedPointsGame, setSelectedPointsGame] = useState<PointsGame | null>(null);
  const [selectedHole, setSelectedHole] = useState<number>(1);
  const [holeStrokes, setHoleStrokes] = useState<Record<string, string>>({});
  const [pointValue, setPointValue] = useState<string>("1.00");
  const [fbtValue, setFbtValue] = useState<string>("10.00");
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [bbbSaveStatus, setBBBSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // BBB game state variables
  const [selectedBBBGame, setSelectedBBBGame] = useState<PointsGame | null>(null);
  const [selectedBBBHole, setSelectedBBBHole] = useState<number>(1);
  const [bbbHoleData, setBBBHoleData] = useState<{
    firstOn?: string;
    closestTo?: string;
    firstIn?: string;
  }>({});
  const [bbbPointValue, setBBBPointValue] = useState<string>("1.00");
  const [bbbFbtValue, setBBBFbtValue] = useState<string>("10.00");
  const [bbbPayoutMode, setBBBPayoutMode] = useState<'points' | 'fbt' | 'both'>('points');
  const [payoutMode, setPayoutMode] = useState<'points' | 'fbt'>('points');
  const [combinedPayoutMode, setCombinedPayoutMode] = useState<'points' | 'fbt' | 'both'>('points');
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const [showAboutForescore, setShowAboutForescore] = useState(false);
  
  // Games tab submenu state
  const [selectedSubGame, setSelectedSubGame] = useState<'cards' | 'points' | 'bbb'>('cards');
  const [showGamesOverlay, setShowGamesOverlay] = useState(false);

  // V6.5: Save point/FBT values to server
  const savePointFbtValues = async () => {
    if (!selectedPointsGame) {
      toast({ title: "Error", description: "No points game selected", variant: "destructive" });
      return;
    }

    setSaveStatus('saving');
    try {
      const response = await apiRequest('PUT', `/api/points-games/${selectedPointsGame.id}/settings`, {
        pointValue: parseFloat(pointValue),
        fbtValue: parseFloat(fbtValue)
      });
      
      const result = await response.json();
      console.log('Point/FBT values saved:', result);
      
      // Update local state with saved values
      const updatedPointsGame = { ...selectedPointsGame, settings: result.settings };
      setSelectedPointsGame(updatedPointsGame);
      
      // Invalidate queries to refresh calculations
      queryClient.invalidateQueries({ queryKey: ['/api/points-games'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calculate-combined-games'] });
      
      setSaveStatus('saved');
      
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving point/FBT values:', error);
      setSaveStatus('error');
      toast({ title: "Error", description: "Failed to save point and FBT values", variant: "destructive" });
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Save BBB point/FBT values to database (similar to 2/9/16 pattern)
  const saveBBBPointsFbtValues = async () => {
    if (!selectedBBBGame) {
      console.warn('No BBB game selected');
      return;
    }

    setBBBSaveStatus('saving');
    try {
      const response = await apiRequest('PUT', `/api/points-games/${selectedBBBGame.id}/settings`, {
        pointValue: parseFloat(bbbPointValue),
        fbtValue: parseFloat(bbbFbtValue)
      });
      
      const result = await response.json();
      console.log('BBB Point/FBT values saved:', result);
      
      // Update local BBB game state with saved values
      const updatedBBBGame = { ...selectedBBBGame, settings: result.settings };
      setSelectedBBBGame(updatedBBBGame);
      
      // Invalidate queries to refresh BBB calculations
      queryClient.invalidateQueries({ queryKey: ['/api/points-games'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calculate-combined-games'] });
      
      setBBBSaveStatus('saved');
      
      setTimeout(() => {
        setBBBSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error saving BBB point/FBT values:', error);
      setBBBSaveStatus('error');
      toast({ title: "Error", description: "Failed to save BBB point and FBT values", variant: "destructive" });
      setTimeout(() => setBBBSaveStatus('idle'), 3000);
    }
  };
  
  // Local state for card values (for responsive editing)
  // Individual autosave hooks for each card type
  const createCardAutosaveFn = useCallback((cardType: string, currentValue: number) => {
    return async (data: { value: number }) => {
      if (!selectedGame) return;
      const newCardValues = { ...selectedGame.cardValues, [cardType]: data.value };
      
      console.log(`Updating ${cardType} card value from ${currentValue} to ${data.value}`);
      
      const response = await apiRequest('PUT', `/api/game-states/${selectedGame.id}/card-values`, {
        cardValues: newCardValues
      });
      const result = response.json();
      
      console.log(`Card value update response for ${cardType}:`, result);
      
      // Invalidate queries to trigger payout recalculation with aggressive cache clearing
      console.log('Invalidating queries for payout recalculation...');
      await queryClient.invalidateQueries({ queryKey: ['/api/groups', selectedGroup?.id, 'games'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/game-state', selectedGame.id, 'payouts'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/game-state', selectedGame.id] });
      await queryClient.invalidateQueries({ queryKey: ['/api/calculate-combined-games'] });
      
      // Force immediate refetch of all related data to get updated card values
      console.log('Forcing immediate refetch of payouts and game state...');
      await queryClient.refetchQueries({ 
        queryKey: ['/api/groups', selectedGroup?.id, 'games'],
        type: 'active'
      });
      
      // Also invalidate all payouts queries with any card values key to force fresh data
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          return query.queryKey[0] === '/api/game-state' && 
                 query.queryKey[1] === selectedGame.id && 
                 query.queryKey[2] === 'payouts';
        }
      });
      
      await queryClient.refetchQueries({ 
        queryKey: ['/api/game-state', selectedGame.id, 'payouts'],
        type: 'active'
      });
      
      // Update selectedGame with fresh data to trigger UI updates
      const updatedGames = await queryClient.fetchQuery({ 
        queryKey: ['/api/groups', selectedGroup?.id, 'games']
      });
      const updatedGame = Array.isArray(updatedGames) ? updatedGames.find((g: any) => g.id === selectedGame.id) : null;
      if (updatedGame) {
        console.log('Updating selectedGame with fresh card values:', updatedGame.cardValues);
        changeGame(updatedGame);
        
        // Force query invalidation with the new card values
        const newCardValuesKey = JSON.stringify(updatedGame.cardValues);
        await queryClient.invalidateQueries({ 
          queryKey: ['/api/game-state', selectedGame.id, 'payouts', newCardValuesKey]
        });
        
        // Also invalidate the combined games result to update "💰 Who Owes Who" tile
        await queryClient.invalidateQueries({ 
          queryKey: ['/api/calculate-combined-games']
        });
      }
      
      console.log('Payout invalidation and refetch completed');
      
      return result;
    };
  }, [selectedGame, selectedGroup?.id, queryClient]);

  const camelAutosave = useAutosaveObject(
    { value: selectedGame?.cardValues?.['camel'] || 2 },
    createCardAutosaveFn('camel', selectedGame?.cardValues?.['camel'] || 2)
  );
  const fishAutosave = useAutosaveObject(
    { value: selectedGame?.cardValues?.['fish'] || 2 },
    createCardAutosaveFn('fish', selectedGame?.cardValues?.['fish'] || 2)
  );
  const roadrunnerAutosave = useAutosaveObject(
    { value: selectedGame?.cardValues?.['roadrunner'] || 2 },
    createCardAutosaveFn('roadrunner', selectedGame?.cardValues?.['roadrunner'] || 2)
  );
  const ghostAutosave = useAutosaveObject(
    { value: selectedGame?.cardValues?.['ghost'] || 2 },
    createCardAutosaveFn('ghost', selectedGame?.cardValues?.['ghost'] || 2)
  );
  const skunkAutosave = useAutosaveObject(
    { value: selectedGame?.cardValues?.['skunk'] || 2 },
    createCardAutosaveFn('skunk', selectedGame?.cardValues?.['skunk'] || 2)
  );
  const snakeAutosave = useAutosaveObject(
    { value: selectedGame?.cardValues?.['snake'] || 2 },
    createCardAutosaveFn('snake', selectedGame?.cardValues?.['snake'] || 2)
  );
  const yetiAutosave = useAutosaveObject(
    { value: selectedGame?.cardValues?.['yeti'] || 2 },
    createCardAutosaveFn('yeti', selectedGame?.cardValues?.['yeti'] || 2)
  );
  
  // Pre-allocated custom card autosave hooks (fixed number to avoid React hook order violations)
  const customCard1Autosave = useAutosaveObject(
    { value: selectedGroup?.customCards?.[0] ? 
        (selectedGame?.cardValues?.[selectedGroup.customCards[0].name.toLowerCase()] ?? selectedGroup.customCards[0].value) : 0 },
    selectedGroup?.customCards?.[0] ? 
      createCardAutosaveFn(selectedGroup.customCards[0].name.toLowerCase(), 
        selectedGame?.cardValues?.[selectedGroup.customCards[0].name.toLowerCase()] ?? selectedGroup.customCards[0].value) :
      () => Promise.resolve()
  );
  
  const customCard2Autosave = useAutosaveObject(
    { value: selectedGroup?.customCards?.[1] ? 
        (selectedGame?.cardValues?.[selectedGroup.customCards[1].name.toLowerCase()] ?? selectedGroup.customCards[1].value) : 0 },
    selectedGroup?.customCards?.[1] ? 
      createCardAutosaveFn(selectedGroup.customCards[1].name.toLowerCase(), 
        selectedGame?.cardValues?.[selectedGroup.customCards[1].name.toLowerCase()] ?? selectedGroup.customCards[1].value) :
      () => Promise.resolve()
  );
  
  const customCard3Autosave = useAutosaveObject(
    { value: selectedGroup?.customCards?.[2] ? 
        (selectedGame?.cardValues?.[selectedGroup.customCards[2].name.toLowerCase()] ?? selectedGroup.customCards[2].value) : 0 },
    selectedGroup?.customCards?.[2] ? 
      createCardAutosaveFn(selectedGroup.customCards[2].name.toLowerCase(), 
        selectedGame?.cardValues?.[selectedGroup.customCards[2].name.toLowerCase()] ?? selectedGroup.customCards[2].value) :
      () => Promise.resolve()
  );
  
  // Create a mapping of custom cards to their autosave hooks
  const getCustomCardAutosave = (index: number) => {
    switch (index) {
      case 0: return customCard1Autosave;
      case 1: return customCard2Autosave;  
      case 2: return customCard3Autosave;
      default: return null;
    }
  };
  
  const [multiSelectGames, setMultiSelectGames] = useState<string[]>([]);
  const [tempSelectedGames, setTempSelectedGames] = useState<string[]>([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  
  // Card value editing state (REMOVED - using localCardValues instead)

  // CANONICAL POINTS-ONLY PAYOUTS - using single pathway
  const { data: selectedPointsPayouts } = useQuery<{
    payouts: Record<string, number>;
    transactions: Array<any>;
  }>({
    queryKey: ['/api/calculate-combined-games', selectedGroup?.id, 'points-only', selectedPointsGame?.id, pointValue],
    queryFn: async () => {
      if (!selectedGroup?.id || !selectedPointsGame?.id) throw new Error('Missing group or points game');
      const response = await fetch('/api/calculate-combined-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          groupId: selectedGroup.id,
          gameStateId: null,
          pointsGameId: selectedPointsGame.id,
          selectedGames: ['points'],
          pointValue: pointValue,
          fbtValue: '0'
        })
      });
      if (!response.ok) throw new Error('Failed to fetch points payouts');
      const data = await response.json();
      console.log(`Points payouts data for ${selectedPointsGame.id}:`, data);
      return data;
    },
    enabled: !!selectedGroup?.id && !!selectedPointsGame?.id && parseFloat(pointValue) > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // CANONICAL FBT-ONLY PAYOUTS - using single pathway
  const { data: selectedFbtPayouts } = useQuery<{
    payouts: Record<string, number>;
    transactions: Array<any>;
  }>({
    queryKey: ['/api/calculate-combined-games', selectedGroup?.id, 'fbt-only', selectedPointsGame?.id, fbtValue],
    queryFn: async () => {
      if (!selectedGroup?.id || !selectedPointsGame?.id) throw new Error('Missing group or points game');
      const response = await fetch('/api/calculate-combined-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          groupId: selectedGroup.id,
          gameStateId: null,
          pointsGameId: selectedPointsGame.id,
          selectedGames: ['fbt'],
          pointValue: '0',
          fbtValue: fbtValue
        })
      });
      if (!response.ok) throw new Error('Failed to fetch FBT payouts');
      const data = await response.json();
      console.log(`FBT payouts data for ${selectedPointsGame.id}:`, data);
      return data;
    },
    enabled: !!selectedGroup?.id && !!selectedPointsGame?.id && (payoutMode === 'fbt' || parseFloat(fbtValue) > 0),
    retry: false,
    refetchOnWindowFocus: false,
  });

  // BBB POINTS-ONLY PAYOUTS - Uses saved database values, not live input values
  const { data: selectedBBBPointsPayouts } = useQuery<{
    payouts: Record<string, number>;
    transactions: Array<any>;
  }>({
    queryKey: ['/api/calculate-combined-games', selectedGroup?.id, 'bbb-points-only', selectedBBBGame?.id, selectedBBBGame?.settings?.pointValue],
    queryFn: async () => {
      if (!selectedGroup?.id || !selectedBBBGame?.id) throw new Error('Missing group or BBB game');
      const savedPointValue = selectedBBBGame.settings?.pointValue || 1;
      const response = await fetch('/api/calculate-combined-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          groupId: selectedGroup.id,
          gameStateId: null,
          pointsGameId: selectedBBBGame.id,
          selectedGames: ['bbb-points'],
          pointValue: savedPointValue.toString(),
          fbtValue: '0'
        })
      });
      if (!response.ok) throw new Error('Failed to fetch BBB points payouts');
      const data = await response.json();
      console.log(`BBB Points payouts data for ${selectedBBBGame.id} using saved pointValue ${savedPointValue}:`, data);
      return data;
    },
    enabled: !!selectedGroup?.id && !!selectedBBBGame?.id && (selectedBBBGame?.settings?.pointValue || 0) > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // BBB FBT-ONLY PAYOUTS - Uses saved database values, not live input values
  const { data: selectedBBBFbtPayouts } = useQuery<{
    payouts: Record<string, number>;
    transactions: Array<any>;
  }>({
    queryKey: ['/api/calculate-combined-games', selectedGroup?.id, 'bbb-fbt-only', selectedBBBGame?.id, selectedBBBGame?.settings?.fbtValue],
    queryFn: async () => {
      if (!selectedGroup?.id || !selectedBBBGame?.id) throw new Error('Missing group or BBB game');
      const savedFbtValue = selectedBBBGame.settings?.fbtValue || 10;
      const response = await fetch('/api/calculate-combined-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          groupId: selectedGroup.id,
          gameStateId: null,
          pointsGameId: selectedBBBGame.id,
          selectedGames: ['bbb-fbt'],
          pointValue: '0',
          fbtValue: savedFbtValue.toString()
        })
      });
      if (!response.ok) throw new Error('Failed to fetch BBB FBT payouts');
      const data = await response.json();
      console.log(`BBB FBT payouts data for ${selectedBBBGame.id} using saved fbtValue ${savedFbtValue}:`, data);
      return data;
    },
    enabled: !!selectedGroup?.id && !!selectedBBBGame?.id && (selectedBBBGame?.settings?.fbtValue || 0) > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Advanced Combined Games API using Python reference implementation
  // Query for 🎯 tile Points+FBT combined scenarios (2/9/16 games only, no cards)
  const { data: pointsFbtCombinedResult } = useQuery<{
    payouts: Record<string, number>;
    transactions: Array<{ from: string, fromName: string, to: string, toName: string, amount: number }>;
    selectedGames: string[];
    success: boolean;
  }>({
    queryKey: [
      '/api/calculate-combined-games',
      'points-fbt-only',
      selectedGroup?.id,
      selectedPointsGame?.id,
      combinedPayoutMode,
      pointValue,
      fbtValue
    ],
    queryFn: async () => {
      if (!selectedGroup?.id || !selectedPointsGame?.id) {
        throw new Error('Group and points game required');
      }

      const pointValueNum = parseFloat(pointValue);
      const fbtValueNum = parseFloat(fbtValue);
      const selectedGamesForMode = []; // Only 2/9/16 games
      
      if (combinedPayoutMode === 'points' && pointValueNum > 0) {
        selectedGamesForMode.push('points');
      } else if (combinedPayoutMode === 'fbt' && fbtValueNum > 0) {
        selectedGamesForMode.push('fbt');
      } else if (combinedPayoutMode === 'both') {
        if (pointValueNum > 0) selectedGamesForMode.push('points');
        if (fbtValueNum > 0) selectedGamesForMode.push('fbt');
      }

      const response = await fetch('/api/calculate-combined-games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          groupId: selectedGroup.id,
          gameStateId: null, // No card game for 🎯 tile
          pointsGameId: selectedPointsGame.id,
          selectedGames: selectedGamesForMode,
          pointValue,
          fbtValue
        })
      });

      if (!response.ok) throw new Error('Failed to calculate points+fbt combined payouts');
      const result = await response.json();
      console.log('Points+FBT combined payouts:', result);
      return result;
    },
    enabled: !!selectedGroup?.id && !!selectedPointsGame?.id && combinedPayoutMode === 'both' && 
             (parseFloat(pointValue) > 0 && parseFloat(fbtValue) > 0),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: combinedGamesResult } = useQuery<{
    payouts: Record<string, number>;
    transactions: Array<{ from: string, fromName: string, to: string, toName: string, amount: number }>;
    selectedGames: string[];
    success: boolean;
    cardGameDetails?: {
      totalPot: number;
      payouts: Array<{
        playerId: string;
        playerName: string;
        debt: number;
        netPayout: number;
      }>;
    };
  }>({
    queryKey: [
      '/api/calculate-combined-games',
      selectedGroup?.id,
      selectedGame?.id, 
      selectedPointsGame?.id,
      multiSelectGames,
      pointValue,
      fbtValue,
      bbbPointValue,
      bbbFbtValue
    ],
    queryFn: async () => {
      if (!selectedGroup?.id || !multiSelectGames.length) {
        throw new Error('Group and selected games required');
      }

      // Use appropriate values based on game types in selection
      const hasBBBGames = multiSelectGames.some(game => game.startsWith('bbb-'));
      const hasRegular2916Games = multiSelectGames.some(game => ['points', 'fbt'].includes(game));
      
      // Determine which values to use (parse to numbers for API consistency)
      const apiPointValue = parseFloat(hasBBBGames ? bbbPointValue : pointValue);
      const apiFbtValue = parseFloat(hasBBBGames ? bbbFbtValue : fbtValue);

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
          pointValue: apiPointValue,
          fbtValue: apiFbtValue
        })
      });

      if (!response.ok) throw new Error('Failed to calculate combined games');
      return response.json();
    },
    enabled: !!selectedGroup?.id && multiSelectGames.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [assignCardOpen, setAssignCardOpen] = useState(false);
  const [selectedCardType, setSelectedCardType] = useState<string | null>(null);
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

  // Get server-side payouts data (defined after groupGames query)
  // Always use the freshest game state for card values to ensure cache invalidation
  const freshGame = groupGames?.find(g => g.id === selectedGame?.id);
  const currentCardValues = freshGame?.cardValues || selectedGame?.cardValues || {};
  const cardValuesKey = JSON.stringify(currentCardValues);
  
  // Force payouts query to use fresh card values by including timestamp when values change
  const payoutQuery = useGamePayouts(selectedGame?.id, cardValuesKey);
  const payoutData = payoutQuery.data;

  const { data: pointsGames = [], isLoading: pointsGamesLoading } = useQuery<PointsGame[]>({
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

  // BBB-specific queries - filter for BBB games only
  const { data: bbbGames = [], isLoading: bbbGamesLoading } = useQuery<PointsGame[]>({
    queryKey: ['/api/points-games/bbb', selectedGroup?.id, selectedGame?.id],
    queryFn: async () => {
      if (!selectedGroup?.id) throw new Error('No group selected');
      const url = selectedGame?.id 
        ? `/api/points-games/${selectedGroup.id}?gameStateId=${selectedGame.id}`
        : `/api/points-games/${selectedGroup.id}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch BBB games');
      const allGames: PointsGame[] = await response.json();
      // Filter for BBB games only
      return allGames.filter(game => game.gameType === 'bbb');
    },
    enabled: !!selectedGroup?.id,
  });

  // Clear selectedPointsGame and selectedBBBGame and invalidate all caches when selectedGame changes
  useEffect(() => {
    setSelectedPointsGame(null);
    setSelectedBBBGame(null); // FIX: Also clear BBB game selection for session isolation
    // Clear hole strokes when switching games to prevent stale data
    setHoleStrokes({});
    
    // Invalidate all relevant caches when switching game instances
    if (selectedGame?.id) {
      queryClient.invalidateQueries({ queryKey: ['/api/points-games'] });
      queryClient.invalidateQueries({ queryKey: ['/api/points-games/bbb'] }); // FIX: Also invalidate BBB caches
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', selectedGroup?.id, 'games'] });
      // Force fresh data fetch for the new game
      queryClient.refetchQueries({ queryKey: ['/api/points-games', selectedGroup?.id, selectedGame.id] });
      queryClient.refetchQueries({ queryKey: ['/api/points-games/bbb', selectedGroup?.id, selectedGame.id] }); // FIX: Also refetch BBB
      queryClient.refetchQueries({ queryKey: ['/api/game-state', selectedGame.id, 'payouts'] });
    }
  }, [selectedGame?.id, selectedGroup?.id, queryClient]);

  // Auto-select 2/9/16 game for current game session - GAME SESSION ISOLATION FIX
  useEffect(() => {
    if (selectedGroup && selectedGame && pointsGames.length > 0) {
      // FIX: Filter for only 2/9/16 games (not BBB)
      const pointsOnly2916Games = pointsGames.filter(game => game.gameType === 'points');
      
      // If we have a selectedPointsGame but it's not in the current game session's 2/9/16 games, clear it
      if (selectedPointsGame && !pointsOnly2916Games.find(game => game.id === selectedPointsGame.id)) {
        setSelectedPointsGame(null);
      }
      // Auto-select the 2/9/16 game for this game session (not BBB)
      if (!selectedPointsGame && pointsOnly2916Games.length > 0) {
        const existingGame = pointsOnly2916Games[0]; // Get the 2/9/16 game specifically
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

  // Auto-select BBB game for current game session - GAME SESSION ISOLATION FIX
  useEffect(() => {
    if (selectedGroup && selectedGame && pointsGames.length > 0) {
      // FIX: Filter for only BBB games (not 2/9/16)
      const bbbOnlyGames = pointsGames.filter(game => game.gameType === 'bbb');
      
      // If we have a selectedBBBGame but it's not in the current game session's BBB games, clear it
      if (selectedBBBGame && !bbbOnlyGames.find(game => game.id === selectedBBBGame.id)) {
        setSelectedBBBGame(null);
      }
      // Auto-select the BBB game for this game session (not 2/9/16)
      if (!selectedBBBGame && bbbOnlyGames.length > 0) {
        const existingGame = bbbOnlyGames[0]; // Get the BBB game specifically
        if (existingGame) {
          setSelectedBBBGame(existingGame);
          console.log(`Auto-selected BBB game: ${existingGame.name} for game session: ${selectedGame.id}`);
        }
      }
    }
    // Also ensure the selected game persists even when pointsGames array is updated
    if (selectedBBBGame && pointsGames.length > 0) {
      const updatedGame = pointsGames.find(game => game.id === selectedBBBGame.id);
      if (updatedGame) {
        setSelectedBBBGame(updatedGame); // Update with latest data
      }
    }
  }, [selectedGroup, selectedGame, pointsGames, selectedBBBGame]);

  // V6.6: Refetch points games data when switching to Games->2/9/16 to ensure saved scores are visible
  useEffect(() => {
    if (currentTab === 'games' && selectedSubGame === 'points' && selectedGroup?.id) {
      console.log('Switching to Games->2/9/16 - refetching points games data to ensure saved scores are visible');
      queryClient.invalidateQueries({ queryKey: ['/api/points-games', selectedGroup.id] });
      // Force refetch to get latest hole strokes and point data
      queryClient.refetchQueries({ queryKey: ['/api/points-games', selectedGroup.id, selectedGame?.id] });
    }
  }, [currentTab, selectedSubGame, selectedGroup?.id, selectedGame?.id, queryClient]);

  // Handle tab switching for BBB game invalidation
  useEffect(() => {
    if (currentTab === 'games' && selectedSubGame === 'bbb' && selectedGroup?.id) {
      console.log('Switching to Games->BBB - refetching BBB games data to ensure saved scores are visible');
      queryClient.invalidateQueries({ queryKey: ['/api/points-games/bbb', selectedGroup.id] });
      // Force refetch to get latest BBB hole data
      queryClient.refetchQueries({ queryKey: ['/api/points-games/bbb', selectedGroup.id, selectedGame?.id] });
    }
  }, [currentTab, selectedSubGame, selectedGroup?.id, selectedGame?.id, queryClient]);

  // V6.6: Load hole strokes from server data when points game data changes or hole selection changes
  useEffect(() => {
    if (selectedPointsGame && selectedGroup && selectedHole) {
      console.log('Loading hole strokes for hole', selectedHole, 'from server data');
      const existingStrokes = selectedPointsGame.holes?.[selectedHole] || {};
      const strokesAsStrings: Record<string, string> = {};
      selectedGroup.players.forEach(player => {
        strokesAsStrings[player.id] = existingStrokes[player.id]?.toString() || '';
      });
      setHoleStrokes(strokesAsStrings);
      console.log('Populated hole strokes from server:', strokesAsStrings);
    }
  }, [selectedPointsGame, selectedGroup, selectedHole]);

  // V6.5: Load saved combined payout results
  const { data: savedCombinedResults } = useQuery<{
    id: string;
    selectedGames: string[];
    pointValue: number;
    fbtValue: number;
    calculationResult: any;
    createdAt: string;
  } | null>({
    queryKey: ['/api/combined-payout-results', selectedGroup?.id, selectedGame?.id, selectedPointsGame?.id],
    queryFn: async () => {
      if (!selectedGroup?.id) return null;
      
      // Fixed API URL structure - groupId as URL parameter, others as query params
      const queryParams = new URLSearchParams();
      if (selectedGame?.id) queryParams.append('gameStateId', selectedGame.id);
      if (selectedPointsGame?.id) queryParams.append('pointsGameId', selectedPointsGame.id);
      
      const url = `/api/combined-payout-results/${selectedGroup.id}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      // Handle 404 as no saved results (normal case)
      if (response.status === 404) {
        console.log('No saved combined results found');
        return null;
      }
      
      if (!response.ok) {
        console.error('Error loading saved combined results:', response.statusText);
        return null;
      }
      
      const result = await response.json();
      console.log('Loaded saved combined result:', result);
      return result;
    },
    enabled: !!selectedGroup?.id,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // V6.5: Load saved point/FBT values when points game is selected
  useEffect(() => {
    if (selectedPointsGame?.settings) {
      const savedPointValue = selectedPointsGame.settings.pointValue;
      const savedFbtValue = selectedPointsGame.settings.fbtValue;
      
      if (savedPointValue !== undefined) {
        setPointValue(savedPointValue.toFixed(2));
      }
      if (savedFbtValue !== undefined) {
        setFbtValue(savedFbtValue.toFixed(2));
      }
      
      console.log('Loaded saved point/FBT values:', { savedPointValue, savedFbtValue });
    }
  }, [selectedPointsGame]);

  // Load saved BBB point/FBT values when BBB game is selected
  useEffect(() => {
    if (selectedBBBGame?.settings) {
      const savedBBBPointValue = selectedBBBGame.settings.pointValue;
      const savedBBBFbtValue = selectedBBBGame.settings.fbtValue;
      
      if (savedBBBPointValue !== undefined) {
        setBBBPointValue(savedBBBPointValue.toFixed(2));
      }
      if (savedBBBFbtValue !== undefined) {
        setBBBFbtValue(savedBBBFbtValue.toFixed(2));
      }
      
      console.log('Loaded saved BBB point/FBT values:', { savedBBBPointValue, savedBBBFbtValue });
    }
  }, [selectedBBBGame]);

  // V6.5: Load saved combined results and restore selection
  useEffect(() => {
    if (savedCombinedResults) {
      console.log('Loaded saved combined results:', savedCombinedResults);
      
      // Restore the selected games that were saved - this triggers the UI to show results
      if (savedCombinedResults.selectedGames && savedCombinedResults.selectedGames.length > 0) {
        setMultiSelectGames(savedCombinedResults.selectedGames);
        console.log('Restored selected games - UI should now show combined results:', savedCombinedResults.selectedGames);
      }
      
      // Update point/FBT values if they were saved with the combined results
      if (savedCombinedResults.pointValue !== undefined) {
        setPointValue(savedCombinedResults.pointValue.toFixed(2));
      }
      if (savedCombinedResults.fbtValue !== undefined) {
        setFbtValue(savedCombinedResults.fbtValue.toFixed(2));
      }
    } else {
      // FIX: Only clear selection state if there are no current manual selections
      // This prevents clearing BBB selections that user just made
      if (multiSelectGames.length === 0) {
        console.log('No saved combined results and no current selections - maintaining clear state');
      } else {
        console.log('No saved combined results but user has current selections - preserving them:', multiSelectGames);
      }
    }
  }, [savedCombinedResults]);

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

  // Calculate if payout data is ready for Payouts tab (MOVED AFTER gameState initialization)
  const calculatePayoutDataReady = () => {
    if (!selectedGroup || !selectedGame) return true; // No game selected, don't wait
    
    const isCardsActive = selectedGame && safeGameState && safeGameState.cardHistory?.length > 0;
    const is2916Active = selectedPointsGame && 
      Object.values(selectedPointsGame.holes || {}).some(hole => 
        Object.values(hole as Record<string, any>).some((strokes: any) => strokes > 0)
      );
    const hasPayoutValues = (parseFloat(pointValue) > 0) || (parseFloat(fbtValue) > 0);
    const is2916WithValues = is2916Active && hasPayoutValues;
    
    // If no games are active, payout data is ready (empty state)
    if (!isCardsActive && !is2916WithValues) return true;
    
    // If only cards active, need payoutData
    if (isCardsActive && !is2916WithValues) {
      return !!payoutData;
    }
    
    // If only 2/9/16 active, need points/fbt payouts
    if (!isCardsActive && is2916WithValues) {
      const pointValueNum = parseFloat(pointValue) || 0;
      const fbtValueNum = parseFloat(fbtValue) || 0;
      
      const needPoints = pointValueNum > 0;
      const needFbt = fbtValueNum > 0;
      
      if (needPoints && !selectedPointsPayouts) return false;
      if (needFbt && !selectedFbtPayouts) return false;
      if (needPoints && needFbt && !pointsFbtCombinedResult) return false;
      
      return true;
    }
    
    // If both games active, need all payout data
    if (isCardsActive && is2916WithValues) {
      const pointValueNum = parseFloat(pointValue) || 0;
      const fbtValueNum = parseFloat(fbtValue) || 0;
      
      // Need basic payouts
      if (!payoutData) return false;
      
      // Need points/fbt data
      const needPoints = pointValueNum > 0;
      const needFbt = fbtValueNum > 0;
      
      if (needPoints && !selectedPointsPayouts) return false;
      if (needFbt && !selectedFbtPayouts) return false;
      if (needPoints && needFbt && !pointsFbtCombinedResult) return false;
      
      // Need combined results if multiSelectGames are set
      if (multiSelectGames.length > 0 && !combinedGamesResult) return false;
      
      return true;
    }
    
    return true;
  };
  
  // AUTO-POPULATE multiSelectGames when games have valid values
  useEffect(() => {
    if (!selectedGroup || !selectedGame || !selectedPointsGame) return;
    
    const isCardsActive = safeGameState && safeGameState.cardHistory?.length > 0;
    const pointValueNum = parseFloat(pointValue) || 0;
    const fbtValueNum = parseFloat(fbtValue) || 0;
    const has2916Values = pointValueNum > 0 || fbtValueNum > 0;
    
    // BBB game detection - check if BBB game exists, not if it's currently selected
    const isBBBGameSelected = selectedPointsGame.gameType === 'bbb';
    const hasBBBGameAvailable = !!selectedBBBGame;
    const bbbPointValueNum = parseFloat(bbbPointValue) || 0;
    const bbbFbtValueNum = parseFloat(bbbFbtValue) || 0;
    const hasBBBValues = bbbPointValueNum > 0 || bbbFbtValueNum > 0;
    
    // Auto-populate multiSelectGames when games have valid values AND user hasn't made manual selections
    if ((isCardsActive || has2916Values || hasBBBValues) && multiSelectGames.length === 0) {
      const autoGames: string[] = [];
      
      if (isCardsActive) {
        autoGames.push('cards');
      }
      
      // Prioritize BBB games if BBB game is currently selected
      if (isBBBGameSelected && hasBBBValues) {
        if (bbbPointValueNum > 0) autoGames.push('bbb-points');
        if (bbbFbtValueNum > 0) autoGames.push('bbb-fbt');
      } 
      // Otherwise add regular 2/9/16 games if they have values
      else if (has2916Values) {
        if (pointValueNum > 0) autoGames.push('points');
        if (fbtValueNum > 0) autoGames.push('fbt');
      }
      
      if (autoGames.length > 0) {
        setMultiSelectGames(autoGames);
        console.log('Auto-populated multiSelectGames:', autoGames);
      }
    }
  }, [selectedGroup, selectedGame, selectedPointsGame, safeGameState, pointValue, fbtValue, bbbPointValue, bbbFbtValue, multiSelectGames.length]);

  // Now update the payoutDataReady state reactively
  const newPayoutDataReady = calculatePayoutDataReady();
  useEffect(() => {
    setPayoutDataReady(newPayoutDataReady);
  }, [newPayoutDataReady]);

  // Mutations
  const updateCardValuesMutation = useMutation({
    mutationFn: async (data: { gameId: string; cardValues: any; method?: string; endpoint?: string }) => {
      // Use PUT endpoint for proper autosave behavior
      const method = data.method || 'PUT';
      const endpoint = data.endpoint || `/api/game-states/${data.gameId}/card-values`;
      
      console.log('Custom card mutation: updating card values...', { method, endpoint, cardValues: data.cardValues });
      
      const response = await apiRequest(method as any, endpoint, { cardValues: data.cardValues });
      const result = response.json();
      
      console.log('Custom card mutation response:', result);
      
      return result;
    },
    onSuccess: async (updatedGame, variables) => {
      console.log('Custom card values updated successfully, invalidating queries...');
      
      // Invalidate specific queries to trigger proper recalculation
      await queryClient.invalidateQueries({ queryKey: ['/api/groups', selectedGroup?.id, 'games'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/game-state', variables.gameId, 'payouts'] });
      
      // Force immediate refetch
      await queryClient.refetchQueries({ 
        queryKey: ['/api/game-state', variables.gameId, 'payouts'],
        type: 'active'
      });
      
      console.log('Custom card query invalidation and refetch completed');
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
      changeGroup(group);
      changeTab('games');
      setSelectedSubGame('points');
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
      // Temporarily store the selected game to restore it after changeGroup
      const currentSelectedGame = selectedGame;
      
      // Update the group data (this will clear selectedGame)
      changeGroup(updatedGroup);
      
      // Restore the selected game
      if (currentSelectedGame) {
        changeGame(currentSelectedGame);
      }
      
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
      changeGroup(updatedGroup);
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
      changeGame(newGame);
      setShowCreateGameDialog(false);
      setNewGameName("");
      changeTab('games');
      setSelectedSubGame('points');
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
      changeGroup(group);
      changeGame(game);
      setShowCreateGameDialog(false);
      setNewGameName("");
      changeTab('games');
      setSelectedSubGame('points');
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
      changeGame(null);
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
      
      // CRITICAL: Invalidate payout calculation queries to update FBT and Points payouts immediately
      queryClient.invalidateQueries({ 
        queryKey: ['/api/calculate-combined-games', selectedGroup?.id, 'fbt-only', updatedGame.id, fbtValue]
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/calculate-combined-games', selectedGroup?.id, 'points-only', updatedGame.id, pointValue]
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/calculate-combined-games']
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Could not update hole scores. Try again.",
        variant: "destructive",
      });
    }
  });

  // BBB-specific mutations
  const updateBBBHoleDataMutation = useMutation({
    mutationFn: async (data: { 
      gameId: string; 
      hole: number; 
      firstOn?: string; 
      closestTo?: string; 
      firstIn?: string; 
    }) => {
      const response = await apiRequest('PUT', `/api/bbb-games/${data.gameId}/hole/${data.hole}`, {
        firstOn: data.firstOn,
        closestTo: data.closestTo,
        firstIn: data.firstIn
      });
      return response.json();
    },
    onSuccess: (updatedGame: PointsGame) => {
      setSelectedBBBGame(updatedGame);
      // FIX: Standardize cache invalidation for both BBB-specific and general keys
      queryClient.invalidateQueries({ queryKey: ['/api/points-games/bbb', selectedGroup?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/points-games', selectedGroup?.id] }); // Also invalidate general points games
      queryClient.refetchQueries({ queryKey: ['/api/points-games/bbb', selectedGroup?.id, selectedGame?.id] });
      
      // CRITICAL: Invalidate BBB payout calculation queries to update payouts immediately
      queryClient.invalidateQueries({ queryKey: ['/api/calculate-combined-games'] });
      
      console.log('BBB hole data updated successfully');
    },
    onError: (error) => {
      console.error('Error updating BBB hole data:', error);
      toast({ title: "Error", description: "Failed to update BBB hole data", variant: "destructive" });
    }
  });

  const handleGroupSelect = (group: Group) => {
    changeGroup(group);
    changeGame(null); // Reset game selection when switching groups
    // DON'T reset selectedPointsGame - preserve it for reaccess
    // Stay on groups tab to show game selection
  };

  // REMOVED LEGACY FUNCTIONS - now using localCardValues with onChange/onBlur pattern

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

  if (isRestoring) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="flex items-center gap-3 text-gray-600">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor"/></svg>
          <span>Restoring your game…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg">
      {/* Header */}
      <header className="bg-emerald-600 text-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">
              ForeScore
              {selectedGame && (
                <span className="text-lg font-normal"> - {selectedGame.name}</span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:bg-emerald-700">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user && typeof user === 'object' ? (
                  <>
                    {/* Header with username only */}
                    <div className="px-3 py-2 text-sm">
                      <div className="font-medium text-gray-900">
                        {(user as any).firstName || (user as any).email || 'User'}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    
                    {/* Profile Section */}
                    <div className="px-3 py-2">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Profile</div>
                      <div className="space-y-1">
                        <DropdownMenuItem>
                          <Mail className="h-4 w-4 mr-2" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">Email</span>
                            <span className="text-xs text-gray-500">{(user as any).email || 'Not set'}</span>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/manage-subscription" className="cursor-pointer text-gray-900 hover:text-gray-700">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Manage Subscription
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/forgot-password" className="cursor-pointer text-gray-900 hover:text-gray-700">
                            <HelpCircle className="h-4 w-4 mr-2" />
                            Reset Password
                          </Link>
                        </DropdownMenuItem>
                        {isAdmin && (
                          <DropdownMenuItem asChild>
                            <Link href="/admin" className="cursor-pointer text-gray-900 hover:text-gray-700">
                              <User className="h-4 w-4 mr-2" />
                              Admin Panel
                            </Link>
                          </DropdownMenuItem>
                        )}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    
                    {/* About Section */}
                    <div className="px-3 py-2">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">About</div>
                      <div className="space-y-1">
                        <DropdownMenuItem 
                          className="cursor-pointer" 
                          onClick={() => setShowAboutForescore(true)}
                        >
                          <Info className="h-4 w-4 mr-2" />
                          About ForeScore
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer" 
                          onClick={() => setShowTermsOfService(true)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Terms of Service
                        </DropdownMenuItem>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                ) : null}
                
                {/* Sign Out */}
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
        {/* Groups Tab - Primary workflow entry point */}
        {currentTab === 'groups' && (
          <div className="p-4">
            <div className="mb-6 space-y-3">
              <Button 
                onClick={() => setShowCreateGameDialog(true)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white p-4 h-auto text-lg font-semibold shadow-lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create New Game
              </Button>
              
            </div>

            {/* Selected Group Games */}
            {selectedGroup && (
              <div className="mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-3">
                        <Button
                          onClick={() => changeGroup(null)}
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
                        groupGames.slice(0, 5).map((game) => (
                          <div key={game.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 hover-lift color-transition">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-800">{game.name}</h4>
                              </div>
                              <p className="text-sm text-gray-500">
                                Created {new Date(game.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => {
                                  changeGame(game);
                                  changeTab('games');
                                  setSelectedSubGame('points');
                                }}
                                size="sm"
                                variant="outline"
                                className="btn-interactive btn-bouncy border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                              >
                                Play
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
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800">Recent Groups</h2>
                <Button 
                  onClick={() => setCreateGroupOpen(true)}
                  variant="outline"
                  size="sm"
                  className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Group
                </Button>
              </div>
              
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
                    <p className="text-gray-500">No groups yet. Create your first game to get started!</p>
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

        {/* Games Tab - Submenu Structure */}
        {currentTab === 'games' && (
          <div className="p-4 space-y-4">
            {/* Game Content - Direct rendering based on selectedSubGame */}
            {!selectedGroup ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Layers className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Select a group from the Groups tab to start playing</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Cards Game Content */}
                {selectedSubGame === 'cards' && (
                  <>
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
                                  onClick={() => changeGame(game)}
                                  variant="outline"
                                  className="w-full mb-2 justify-start"
                                >
                                  <span>{game.name}</span>
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
                            // Get current game value first, then fallback to custom card default value
                            let value = selectedGame.cardValues[cardType as keyof typeof selectedGame.cardValues];
                            if (value === undefined) {
                              const customCard = selectedGroup.customCards?.find(c => c.name.toLowerCase() === cardType);
                              value = customCard ? selectedGame.cardValues[customCard.name.toLowerCase()] ?? customCard.value : 2;
                            }
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
                                <p className="text-xs text-gray-500">${(() => {
                                  // Use fresh game state from groupGames query, not selectedGame state
                                  const freshGame = groupGames?.find(g => g.id === selectedGame?.id);
                                  return freshGame?.cardValues?.[cardType] || selectedGame?.cardValues?.[cardType] || value || 2;
                                })()}</p>
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
                          {camelAutosave.status === "saving" && (
                            <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                          )}
                          {camelAutosave.status === "saved" && (
                            <span className="text-green-600 text-xs">✓</span>
                          )}
                          {camelAutosave.status === "error" && (
                            <span className="text-red-600 text-xs">✗</span>
                          )}
                          {camelAutosave.status === "idle" && <div className="w-3"></div>}
                          <span className="text-gray-500">$</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={camelAutosave.value.value?.toString() ?? "2"}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              camelAutosave.update({ value: parseInt(value) || 0 });
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
                          {fishAutosave.status === "saving" && (
                            <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                          )}
                          {fishAutosave.status === "saved" && (
                            <span className="text-green-600 text-xs">✓</span>
                          )}
                          {fishAutosave.status === "error" && (
                            <span className="text-red-600 text-xs">✗</span>
                          )}
                          {fishAutosave.status === "idle" && <div className="w-3"></div>}
                          <span className="text-gray-500">$</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={fishAutosave.value.value?.toString() ?? "2"}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              fishAutosave.update({ value: parseInt(value) || 0 });
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
                          {roadrunnerAutosave.status === "saving" && (
                            <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                          )}
                          {roadrunnerAutosave.status === "saved" && (
                            <span className="text-green-600 text-xs">✓</span>
                          )}
                          {roadrunnerAutosave.status === "error" && (
                            <span className="text-red-600 text-xs">✗</span>
                          )}
                          {roadrunnerAutosave.status === "idle" && <div className="w-3"></div>}
                          <span className="text-gray-500">$</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={roadrunnerAutosave.value.value?.toString() ?? "2"}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              roadrunnerAutosave.update({ value: parseInt(value) || 0 });
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
                          {ghostAutosave.status === "saving" && (
                            <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                          )}
                          {ghostAutosave.status === "saved" && (
                            <span className="text-green-600 text-xs">✓</span>
                          )}
                          {ghostAutosave.status === "error" && (
                            <span className="text-red-600 text-xs">✗</span>
                          )}
                          {ghostAutosave.status === "idle" && <div className="w-3"></div>}
                          <span className="text-gray-500">$</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={ghostAutosave.value.value?.toString() ?? "2"}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              ghostAutosave.update({ value: parseInt(value) || 0 });
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
                          {skunkAutosave.status === "saving" && (
                            <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                          )}
                          {skunkAutosave.status === "saved" && (
                            <span className="text-green-600 text-xs">✓</span>
                          )}
                          {skunkAutosave.status === "error" && (
                            <span className="text-red-600 text-xs">✗</span>
                          )}
                          {skunkAutosave.status === "idle" && <div className="w-3"></div>}
                          <span className="text-gray-500">$</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={skunkAutosave.value.value?.toString() ?? "2"}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              skunkAutosave.update({ value: parseInt(value) || 0 });
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
                          {snakeAutosave.status === "saving" && (
                            <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                          )}
                          {snakeAutosave.status === "saved" && (
                            <span className="text-green-600 text-xs">✓</span>
                          )}
                          {snakeAutosave.status === "error" && (
                            <span className="text-red-600 text-xs">✗</span>
                          )}
                          {snakeAutosave.status === "idle" && <div className="w-3"></div>}
                          <span className="text-gray-500">$</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={snakeAutosave.value.value?.toString() ?? "2"}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              snakeAutosave.update({ value: parseInt(value) || 0 });
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
                          {yetiAutosave.status === "saving" && (
                            <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                          )}
                          {yetiAutosave.status === "saved" && (
                            <span className="text-green-600 text-xs">✓</span>
                          )}
                          {yetiAutosave.status === "error" && (
                            <span className="text-red-600 text-xs">✗</span>
                          )}
                          {yetiAutosave.status === "idle" && <div className="w-3"></div>}
                          <span className="text-gray-500">$</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={yetiAutosave.value.value?.toString() ?? "2"}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              yetiAutosave.update({ value: parseInt(value) || 0 });
                            }}
                            className="w-16 text-center font-semibold"
                          />
                        </div>
                      </div>
                      
                      {/* Custom Cards with Individual Autosave */}
                      {selectedGroup?.customCards && selectedGroup.customCards.length > 0 && selectedGroup.customCards.map((customCard, index) => {
                        const customAutosave = getCustomCardAutosave(index);
                        
                        if (!customAutosave || index >= 3) return null; // Support up to 3 custom cards
                        
                        return (
                          <div key={customCard.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{customCard.emoji}</span>
                              <span className="font-medium text-gray-800">{customCard.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {customAutosave.status === "saving" && (
                                <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                              )}
                              {customAutosave.status === "saved" && (
                                <span className="text-green-600 text-xs">✓</span>
                              )}
                              {customAutosave.status === "error" && (
                                <span className="text-red-600 text-xs">✗</span>
                              )}
                              {customAutosave.status === "idle" && <div className="w-3"></div>}
                              <span className="text-gray-500">$</span>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={customAutosave.value.value?.toString() ?? customCard.value.toString()}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9]/g, '');
                                  customAutosave.update({ value: parseInt(value) || 0 });
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
                        );
                      })}
                    </div>
                    
                    </CardContent>
                  </Card>
                )}

                {/* 9. 🎴 CARD GAME PAYOUTS */}
                {selectedGame && gameState && (
                  <Card className="mb-4 card-interactive hover-lift fade-in">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">🎴 Card Game Payouts</h3>
                      <div className="space-y-3">
                        {selectedGroup.players.map((player) => {
                          const playerCards = gameState?.playerCards[player.id] || [];
                          
                          // Get server-calculated payout for this player
                          const playerPayout = payoutData?.cardGame?.payouts?.find((p: any) => p.playerId === player.id);
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
                                  {payoutQuery.isLoading ? (
                                    <p className="text-sm text-gray-500">Loading...</p>
                                  ) : !payoutData ? (
                                    <p className="text-sm text-gray-500">No data</p>
                                  ) : (
                                    <>
                                      <p className={`text-lg font-bold ${Math.abs(netAmount) < 0.01 ? 'text-gray-600' : isReceiving ? 'text-green-600' : 'text-red-600'}`}>
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
                                    variant="outline" 
                                    className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 border-gray-200"
                                  >
                                    <span className="mr-1">{card.type === 'custom' ? card.emoji : getCardEmoji(card.type)}</span>
                                    {(() => {
                                      // Always use current game state values first
                                      if (card.type === 'custom' && card.name) {
                                        const customCard = selectedGroup?.customCards?.find(c => c.name.toLowerCase() === card.name?.toLowerCase());
                                        if (customCard) {
                                          const customCardKey = customCard.name.toLowerCase();
                                          const value = gameState?.cardValues[customCardKey] ?? customCard.value;
                                          return `$${value}`;
                                        }
                                      } else {
                                        const value = gameState?.cardValues[card.type as keyof typeof gameState.cardValues];
                                        if (value !== undefined) {
                                          return `$${value}`;
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

                    {/* 1. 💰 WHO OWES WHO - COMBINED */}
                    {(() => {
                      const isCardsActive = selectedGame && safeGameState && safeGameState.cardHistory?.length > 0;
                      const hasPayoutValues = (parseFloat(pointValue) > 0) || (parseFloat(fbtValue) > 0);
                      
                      // FIX: Show when cards are active OR when 2/9/16 values are set (regardless of scores)
                      return isCardsActive || (selectedPointsGame && hasPayoutValues);
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
                              className="w-full btn-interactive btn-bouncy bg-emerald-500 hover:bg-emerald-600 text-white"
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
                                  className="btn-interactive hover-lift border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                                >
                                  Edit Payouts
                                </Button>
                              </div>
                              
                              {/* Selected Games Display */}
                              <div className="flex flex-wrap gap-2 mb-4">
                                {(() => {
                                  // Check if games are actually active, not just selected
                                  const isCardsActive = selectedGame && safeGameState && safeGameState.cardHistory?.length > 0;
                                  const hasPointsValues = parseFloat(pointValue) > 0;
                                  const hasFbtValues = parseFloat(fbtValue) > 0;
                                  const hasBBBPointsValues = parseFloat(bbbPointValue) > 0;
                                  const hasBBBFbtValues = parseFloat(bbbFbtValue) > 0;

                                  return (
                                    <>
                                      {multiSelectGames.includes('cards') && isCardsActive && (
                                        <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium fade-in">
                                          🎴 Card Game
                                        </div>
                                      )}
                                      {multiSelectGames.includes('points') && selectedPointsGame && hasPointsValues && (
                                        <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium fade-in stagger-1">
                                          🎯 2/9/16 Points
                                        </div>
                                      )}
                                      {multiSelectGames.includes('fbt') && selectedPointsGame && hasFbtValues && (
                                        <div className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium fade-in stagger-2">
                                          ⛳ 2/9/16 FBT
                                        </div>
                                      )}
                                      {multiSelectGames.includes('bbb-points') && selectedBBBGame && hasBBBPointsValues && (
                                        <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium fade-in stagger-3">
                                          🎲 BBB Points
                                        </div>
                                      )}
                                      {multiSelectGames.includes('bbb-fbt') && selectedBBBGame && hasBBBFbtValues && (
                                        <div className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium fade-in stagger-4">
                                          🏌️ BBB FBT
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                              
                              {(() => {
                                // Use server-side combined games calculation
                                if (!combinedGamesResult || !(combinedGamesResult as any).success) {
                                  return (
                                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                                      <p className="text-gray-800">Calculating combined payouts...</p>
                                    </div>
                                  );
                                }

                                // For Cards Game only, use cardGameDetails to generate transactions
                                let transactions = (combinedGamesResult as any).transactions || [];
                                
                                // Debug logs removed
                                
                                if (multiSelectGames.length === 1 && multiSelectGames.includes('cards') && 
                                    (combinedGamesResult as any).cardGameDetails?.payouts) {
                                  // Generate card game transactions from the card game payouts
                                  const cardPayouts = (combinedGamesResult as any).cardGameDetails.payouts;
                                  const debtors = cardPayouts.filter((p: any) => p.netPayout < 0);
                                  const creditors = cardPayouts.filter((p: any) => p.netPayout > 0).sort((a: any, b: any) => b.netPayout - a.netPayout);
                                  
                                  transactions = [];
                                  
                                  for (const debtor of debtors) {
                                    let remainingDebt = Math.abs(debtor.netPayout);
                                    
                                    for (const creditor of creditors) {
                                      if (remainingDebt <= 0.01) break;
                                      
                                      let availableCredit = creditor.netPayout;
                                      // Check if this creditor has already been paid by other debtors
                                      const alreadyReceived = transactions
                                        .filter((t: any) => t.to === creditor.playerId)
                                        .reduce((sum: number, t: any) => sum + t.amount, 0);
                                      availableCredit -= alreadyReceived;
                                      
                                      if (availableCredit > 0.01) {
                                        const paymentAmount = Math.min(remainingDebt, availableCredit);
                                        transactions.push({
                                          from: debtor.playerId,
                                          fromName: debtor.playerName,
                                          to: creditor.playerId,
                                          toName: creditor.playerName,
                                          amount: paymentAmount
                                        });
                                        remainingDebt -= paymentAmount;
                                      }
                                    }
                                  }
                                }

                                if (transactions.length === 0) {
                                  return (
                                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                                      <p className="text-gray-800">All players are even across selected games - no payments needed!</p>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="space-y-2">
                                    {transactions.map((transaction: any, index: number) => (
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
                    )}

                    {/* 2. 🎯 WHO OWES WHO - BBB GAMES */}
                    {(() => {
                      const bbbPointValueNum = parseFloat(bbbPointValue) || 0;
                      const bbbFbtValueNum = parseFloat(bbbFbtValue) || 0;
                      const hasBBBPayoutValues = (bbbPointValueNum > 0) || (bbbFbtValueNum > 0);
                      const showBBBWhoOwesWho = selectedBBBGame && hasBBBPayoutValues;
                      
                      return showBBBWhoOwesWho;
                    })() && (
                      <Card className="mb-4">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">🎯 BBB - Who Owes Who</h3>
                            <Select value={bbbPayoutMode} onValueChange={(value: 'points' | 'fbt' | 'both') => setBBBPayoutMode(value)}>
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
                            {bbbPayoutMode === 'points' ? 'Points-based settlement from BBB games only.' :
                             bbbPayoutMode === 'fbt' ? 'FBT settlement from BBB games only.' :
                             'Combined settlement for Points + FBT from BBB games only.'}
                          </p>
                          
                          {(() => {
                            const getTransactionsForBBBMode = () => {
                              const bbbPointValueNum = parseFloat(bbbPointValue);
                              const bbbFbtValueNum = parseFloat(bbbFbtValue);
                              
                              if (bbbPayoutMode === 'points' && selectedBBBPointsPayouts?.transactions) {
                                return selectedBBBPointsPayouts.transactions;
                              }
                              
                              if (bbbPayoutMode === 'fbt' && selectedBBBFbtPayouts?.transactions) {
                                return selectedBBBFbtPayouts.transactions;
                              }
                              
                              if (bbbPayoutMode === 'both') {
                                const combinedPayouts: Record<string, number> = {};
                                
                                selectedGroup.players.forEach(player => {
                                  combinedPayouts[player.id] = 0;
                                });
                                
                                if (bbbPointValueNum > 0 && selectedBBBPointsPayouts?.payouts) {
                                  selectedGroup.players.forEach(player => {
                                    combinedPayouts[player.id] += selectedBBBPointsPayouts.payouts[player.id] || 0;
                                  });
                                }
                                
                                if (bbbFbtValueNum > 0 && selectedBBBFbtPayouts?.payouts) {
                                  selectedGroup.players.forEach(player => {
                                    combinedPayouts[player.id] += selectedBBBFbtPayouts.payouts[player.id] || 0;
                                  });
                                }
                                
                                const players = selectedGroup.players.map(p => ({
                                  playerId: p.id,
                                  playerName: p.name,
                                  netPayout: combinedPayouts[p.id] || 0
                                }));
                                
                                const debtors = players.filter(p => p.netPayout < -0.01);
                                const creditors = players.filter(p => p.netPayout > 0.01);
                                const transactions = [];
                                
                                for (const debtor of debtors) {
                                  let remainingDebt = Math.abs(debtor.netPayout);
                                  
                                  for (const creditor of creditors) {
                                    if (remainingDebt <= 0.01) break;
                                    
                                    let availableCredit = creditor.netPayout;
                                    const alreadyReceived = transactions
                                      .filter((t) => t.to === creditor.playerId)
                                      .reduce((sum, t) => sum + t.amount, 0);
                                    availableCredit -= alreadyReceived;
                                    
                                    if (availableCredit > 0.01) {
                                      const paymentAmount = Math.min(remainingDebt, availableCredit);
                                      transactions.push({
                                        from: debtor.playerId,
                                        fromName: debtor.playerName,
                                        to: creditor.playerId,
                                        toName: creditor.playerName,
                                        amount: paymentAmount
                                      });
                                      remainingDebt -= paymentAmount;
                                    }
                                  }
                                }
                                
                                return transactions;
                              }
                              
                              return [];
                            };
                            
                            const transactions = getTransactionsForBBBMode();

                            if (transactions.length === 0) {
                              return (
                                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                                  <p className="text-gray-800">All players are even - no payments needed!</p>
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
                        </CardContent>
                      </Card>
                    )}

                    {/* 3. & 4. 🎯 BBB POINTS ONLY PAYOUTS & ⛳ BBB FBT ONLY PAYOUTS */}
                    {(() => {
                      const bbbPointValueNum = parseFloat(bbbPointValue) || 0;
                      const bbbFbtValueNum = parseFloat(bbbFbtValue) || 0;
                      
                      if (!selectedBBBGame || (bbbPointValueNum <= 0 && bbbFbtValueNum <= 0)) return null;

                      const bbbPointsPayouts: Record<string, number> = {};
                      const bbbFbtPayouts: Record<string, number> = {};
                      
                      selectedGroup.players.forEach(player => {
                        bbbPointsPayouts[player.id] = 0;
                        bbbFbtPayouts[player.id] = 0;
                      });

                      if (bbbPointValueNum > 0 && selectedBBBPointsPayouts?.payouts) {
                        selectedGroup.players.forEach(player => {
                          bbbPointsPayouts[player.id] = selectedBBBPointsPayouts.payouts[player.id] || 0;
                        });
                      }

                      if (bbbFbtValueNum > 0 && selectedBBBFbtPayouts?.payouts) {
                        selectedGroup.players.forEach(player => {
                          bbbFbtPayouts[player.id] = selectedBBBFbtPayouts.payouts[player.id] || 0;
                        });
                      }

                      return (
                        <>
                          {bbbPointValueNum > 0 && (
                            <Card className="mb-4">
                              <CardContent className="p-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">🎯 BBB Points Only Payouts</h3>
                                <div className="space-y-2">
                                  {[...selectedGroup.players]
                                    .sort((a, b) => {
                                      const payoutA = bbbPointsPayouts[a.id] || 0;
                                      const payoutB = bbbPointsPayouts[b.id] || 0;
                                      return payoutB - payoutA;
                                    })
                                    .map((player) => {
                                      const netAmount = bbbPointsPayouts[player.id] || 0;
                                      const isEven = Math.abs(netAmount) < 0.01;
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
                                            <p className={`text-lg font-bold ${isEven ? 'text-gray-600' : payout.type === 'receives' ? 'text-green-600' : 'text-red-600'}`}>
                                              ${payout.amount.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                              {isEven ? 'Even' : payout.type === 'receives' ? 'Receives' : 'Pays'}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {bbbFbtValueNum > 0 && (
                            <Card className="mb-4">
                              <CardContent className="p-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">⛳ BBB FBT Only Payouts</h3>
                                <div className="space-y-2">
                                  {[...selectedGroup.players]
                                    .sort((a, b) => {
                                      const payoutA = bbbFbtPayouts[a.id] || 0;
                                      const payoutB = bbbFbtPayouts[b.id] || 0;
                                      return payoutB - payoutA;
                                    })
                                    .map((player) => {
                                      const netAmount = bbbFbtPayouts[player.id] || 0;
                                      const isEven = Math.abs(netAmount) < 0.01;
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
                                            <p className={`text-lg font-bold ${isEven ? 'text-gray-600' : payout.type === 'receives' ? 'text-green-600' : 'text-red-600'}`}>
                                              ${payout.amount.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                              {isEven ? 'Even' : payout.type === 'receives' ? 'Receives' : 'Pays'}
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

                    {/* 5. 🎯 WHO OWES WHO - 2/9/16 GAMES */}
                    {(() => {
                      const hasPayoutValues = (parseFloat(pointValue) > 0) || (parseFloat(fbtValue) > 0);
                      const show2916WhoOwesWho = selectedPointsGame && hasPayoutValues;
                      
                      return show2916WhoOwesWho;
                    })() && (
                      <Card className="mb-4">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">🎯 2/9/16 - Who Owes Who</h3>
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
                             'Combined settlement for Points + FBT from 2/9/16 games only.'}
                          </p>
                          
                          {(() => {
                            // Use individual payout results for 2/9/16 games only (no cards)
                            const getTransactionsForMode = () => {
                              const pointValueNum = parseFloat(pointValue);
                              const fbtValueNum = parseFloat(fbtValue);
                              
                              // For Points Only mode, use selectedPointsPayouts
                              if (combinedPayoutMode === 'points' && selectedPointsPayouts?.transactions) {
                                return selectedPointsPayouts.transactions;
                              }
                              
                              // For FBT Only mode, use selectedFbtPayouts
                              if (combinedPayoutMode === 'fbt' && selectedFbtPayouts?.transactions) {
                                return selectedFbtPayouts.transactions;
                              }
                              
                              // For Both mode, use the pointsFbtCombinedResult for points+fbt only
                              if (combinedPayoutMode === 'both' && pointsFbtCombinedResult?.success) {
                                return pointsFbtCombinedResult.transactions;
                              }
                              
                              return [];
                            };
                            
                            const transactions = getTransactionsForMode();

                            if (transactions.length === 0) {
                              return (
                                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                                  <p className="text-gray-800">All players are even - no payments needed!</p>
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-2">
                                {transactions.map((transaction: any, index: number) => (
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
                        </CardContent>
                      </Card>
                    )}


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

                    {/* 6. & 7. 🎯 POINTS ONLY PAYOUTS - 2/9/16 GAMES & ⛳ FBT ONLY PAYOUTS - 2/9/16 GAMES */}
                    {(() => {
                      const pointValueNum = parseFloat(pointValue) || 0;
                      const fbtValueNum = parseFloat(fbtValue) || 0;
                      
                      // FIX: Always show when selectedPointsGame exists and ANY value > 0, regardless of scores
                      if (!selectedPointsGame || (pointValueNum <= 0 && fbtValueNum <= 0)) return null;

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
                          {/* 6. Points Only Tile - ALWAYS SHOW */}
                          <Card className="mb-4">
                            <CardContent className="p-4">
                              <h3 className="text-lg font-semibold text-gray-800 mb-3">🎯 2/9/16 – Points Only</h3>
                              <div className="space-y-2">
                                {[...selectedGroup.players]
                                  .sort((a, b) => {
                                    const payoutA = pointsPayouts[a.id] || 0;
                                    const payoutB = pointsPayouts[b.id] || 0;
                                    return payoutB - payoutA; // Most profitable first
                                  })
                                  .map((player) => {
                                    const netAmount = pointsPayouts[player.id] || 0;
                                    const isEven = Math.abs(netAmount) < 0.01;
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
                                          <p className={`text-lg font-bold ${isEven ? 'text-gray-600' : payout.type === 'receives' ? 'text-green-600' : 'text-red-600'}`}>
                                            ${payout.amount.toFixed(2)}
                                          </p>
                                          <p className="text-xs text-gray-600">
                                            {isEven ? 'Even' : payout.type === 'receives' ? 'Receives' : 'Pays'}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </CardContent>
                          </Card>

                          {/* 7. FBT Only Tile - ALWAYS SHOW */}
                          <Card className="mb-4">
                            <CardContent className="p-4">
                              <h3 className="text-lg font-semibold text-gray-800 mb-3">⛳ 2/9/16 – FBT Only</h3>
                              <div className="space-y-2">
                                {[...selectedGroup.players]
                                  .sort((a, b) => {
                                    const payoutA = fbtPayouts[a.id] || 0;
                                    const payoutB = fbtPayouts[b.id] || 0;
                                    return payoutB - payoutA; // Most profitable first
                                  })
                                  .map((player) => {
                                    const netAmount = fbtPayouts[player.id] || 0;
                                    const isEven = Math.abs(netAmount) < 0.01;
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
                                          <p className={`text-lg font-bold ${isEven ? 'text-gray-600' : payout.type === 'receives' ? 'text-green-600' : 'text-red-600'}`}>
                                            ${payout.amount.toFixed(2)}
                                          </p>
                                          <p className="text-xs text-gray-600">
                                            {isEven ? 'Even' : payout.type === 'receives' ? 'Receives' : 'Pays'}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </CardContent>
                          </Card>
                        </>
                      );
                    })()}

                    {/* 3. & 4. 🎯 BBB POINTS ONLY PAYOUTS & ⛳ BBB FBT ONLY PAYOUTS */}
                    {(() => {
                      const bbbPointValueNum = parseFloat(bbbPointValue) || 0;
                      const bbbFbtValueNum = parseFloat(bbbFbtValue) || 0;
                      
                      // Show BBB tiles when BBB game exists and ANY value > 0
                      if (!selectedBBBGame || (bbbPointValueNum <= 0 && bbbFbtValueNum <= 0)) return null;

                      // Get BBB payouts from server-side APIs
                      const bbbPointsPayouts: Record<string, number> = {};
                      const bbbFbtPayouts: Record<string, number> = {};
                      
                      // Initialize with zeros
                      selectedGroup.players.forEach(player => {
                        bbbPointsPayouts[player.id] = 0;
                        bbbFbtPayouts[player.id] = 0;
                      });

                      // Get BBB Points payouts from API
                      if (bbbPointValueNum > 0 && selectedBBBPointsPayouts?.payouts) {
                        selectedGroup.players.forEach(player => {
                          bbbPointsPayouts[player.id] = selectedBBBPointsPayouts.payouts[player.id] || 0;
                        });
                      }

                      // Get BBB FBT payouts from API
                      if (bbbFbtValueNum > 0 && selectedBBBFbtPayouts?.payouts) {
                        selectedGroup.players.forEach(player => {
                          bbbFbtPayouts[player.id] = selectedBBBFbtPayouts.payouts[player.id] || 0;
                        });
                      }

                      return (
                        <>
                          {/* BBB Points Only Tile */}
                          {bbbPointValueNum > 0 && (
                            <Card className="mb-4">
                              <CardContent className="p-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">🎯 BBB Points Only Payouts</h3>
                                <div className="space-y-2">
                                  {[...selectedGroup.players]
                                    .sort((a, b) => {
                                      const payoutA = bbbPointsPayouts[a.id] || 0;
                                      const payoutB = bbbPointsPayouts[b.id] || 0;
                                      return payoutB - payoutA; // Most profitable first
                                    })
                                    .map((player) => {
                                      const netAmount = bbbPointsPayouts[player.id] || 0;
                                      const isEven = Math.abs(netAmount) < 0.01;
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
                                            <p className={`text-lg font-bold ${isEven ? 'text-gray-600' : payout.type === 'receives' ? 'text-green-600' : 'text-red-600'}`}>
                                              ${payout.amount.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                              {isEven ? 'Even' : payout.type === 'receives' ? 'Receives' : 'Pays'}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* BBB FBT Only Tile */}
                          {bbbFbtValueNum > 0 && (
                            <Card className="mb-4">
                              <CardContent className="p-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">⛳ BBB FBT Only Payouts</h3>
                                <div className="space-y-2">
                                  {[...selectedGroup.players]
                                    .sort((a, b) => {
                                      const payoutA = bbbFbtPayouts[a.id] || 0;
                                      const payoutB = bbbFbtPayouts[b.id] || 0;
                                      return payoutB - payoutA; // Most profitable first
                                    })
                                    .map((player) => {
                                      const netAmount = bbbFbtPayouts[player.id] || 0;
                                      const isEven = Math.abs(netAmount) < 0.01;
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
                                            <p className={`text-lg font-bold ${isEven ? 'text-gray-600' : payout.type === 'receives' ? 'text-green-600' : 'text-red-600'}`}>
                                              ${payout.amount.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                              {isEven ? 'Even' : payout.type === 'receives' ? 'Receives' : 'Pays'}
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

                    {/* REMOVED - BBB duplicate section cleaned up */}

                    {/* 8. 🎴 WHO OWES WHO - CARD GAME */}
                    {(() => {
                      const isCardsActive = selectedGame && gameState && gameState.cardHistory?.length > 0;
                      return isCardsActive;
                    })() && (
                      <Card className="mb-4 card-interactive hover-lift fade-in">
                        <CardContent className="p-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-3">🎴 Who Owes Who - Card Game</h3>
                          <div className="space-y-2">
                            {(() => {
                              // Use server-side whoOwesWho data for card game transactions
                              const transactions = payoutData?.whoOwesWho || [];
                              


                              return transactions.length > 0 ? (
                                <>
                                  {transactions.map((transaction: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                      <div className="flex items-center gap-3">
                                        <div className="text-sm">
                                          <span className="font-medium text-red-600">{transaction.fromPlayerName || transaction.fromName || transaction.from}</span>
                                          <span className="text-gray-600"> owes </span>
                                          <span className="font-medium text-green-600">{transaction.toPlayerName || transaction.toName || transaction.to}</span>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-lg font-bold text-black">${transaction.amount.toFixed(2)}</p>
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

                    {/* Card Game Payouts - MOVED TO BOTTOM */}
                    <CardGamePayouts 
                      selectedGroup={selectedGroup}
                      gameState={gameState}
                      payoutData={payoutData}
                    />

              </>
            )}
              </>
            )}
          </div>
        )}

        {/* Games Tab Content (Conditional based on submenu) */}
        {currentTab === 'games' && selectedSubGame === 'points' && (
          <div className="p-4 space-y-4">
            {selectedGroup ? (
              <>
                {/* Points Game Selection or Creation */}
                {!selectedPointsGame ? (
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="text-lg font-bold text-gray-800 mb-4">2/9/16 Game</h2>
                      
                      {pointsGamesLoading || (pointsGames.length > 0 && !selectedPointsGame) ? (
                        <div className="text-center space-y-4">
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-emerald-800 mb-2">
                              {pointsGames.length > 0 ? pointsGames[0].name : "2/9/16 Game"}
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
                              let allPlayersHaveScores = true;
                              
                              selectedGroup.players.forEach(player => {
                                const strokeValue = holeStrokes[player.id];
                                // Check if the player has entered a score (empty string or undefined means no score)
                                if (strokeValue === '' || strokeValue === undefined) {
                                  allPlayersHaveScores = false;
                                } else {
                                  // Parse the score - 0 is NOT a valid golf score
                                  const parsedValue = parseInt(strokeValue);
                                  if (parsedValue > 0) {
                                    strokes[player.id] = parsedValue;
                                  } else {
                                    allPlayersHaveScores = false;
                                  }
                                }
                              });
                              
                              if (allPlayersHaveScores) {
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
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">2/9/16 Scores</h3>
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
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">2/9/16 Payouts</h3>
                            
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

                            {/* V6.5: Save Button for Point/FBT Values */}
                            <div className="mb-4">
                              <Button
                                onClick={savePointFbtValues}
                                disabled={saveStatus === 'saving' || !selectedPointsGame}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                data-testid="button-save-point-fbt-values"
                              >
                                {saveStatus === 'saving' && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                                {saveStatus === 'saved' && <span className="mr-2">✓</span>}
                                {saveStatus === 'error' && <span className="mr-2">✗</span>}
                                {saveStatus === 'saving' ? 'Saving...' : 
                                 saveStatus === 'saved' ? 'Saved!' :
                                 saveStatus === 'error' ? 'Error - Retry' : 'Update Values'}
                              </Button>
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
                                    // Use canonical FBT endpoint data
                                    if (selectedFbtPayouts?.payouts) {
                                      selectedGroup.players.forEach(player => {
                                        pointsPayouts[player.id] = selectedFbtPayouts.payouts[player.id] || 0;
                                      });
                                    } else {
                                      selectedGroup.players.forEach(player => {
                                        pointsPayouts[player.id] = 0;
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

        {/* BBB Game Tab */}
        {currentTab === 'games' && selectedSubGame === 'bbb' && (
          <div className="p-4 space-y-4">
            {selectedGroup ? (
              <>
                {/* BBB Game Selection or Creation */}
                {!selectedBBBGame ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      {bbbGamesLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                          <p className="text-sm text-emerald-600">
                            Loading your BBB game...
                          </p>
                        </div>
                      ) : (
                        <div className="text-center space-y-4">
                          <p className="text-gray-600">No BBB games yet. BBB games are auto-created when you start a new game session.</p>
                          <p className="text-sm text-gray-500">Switch to Games → Create Group to start a new game session with BBB included.</p>
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
                              variant={selectedBBBHole === hole ? "default" : "outline"}
                              onClick={() => {
                                setSelectedBBBHole(hole);
                                const existingData = selectedBBBGame.holes?.[hole] || {};
                                setBBBHoleData({
                                  firstOn: existingData.firstOn?.toString() || '',
                                  closestTo: existingData.closestTo?.toString() || '',
                                  firstIn: existingData.firstIn?.toString() || ''
                                });
                              }}
                              className="p-2 text-sm"
                              data-testid={`button-hole-${hole}`}
                            >
                              {hole}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Bingo Bango Bongo Scoring */}
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">
                          🎯 Bingo Bango Bongo - Hole {selectedBBBHole}
                        </h3>
                        <div className="space-y-4">
                          {/* First On (Bingo) - Player Buttons */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              🥇 First On
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {selectedGroup.players.map(player => (
                                <Button
                                  key={player.id}
                                  variant={bbbHoleData.firstOn === player.id ? "default" : "outline"}
                                  onClick={() => setBBBHoleData(prev => ({ ...prev, firstOn: player.id }))}
                                  className="p-2 text-sm truncate min-w-[4rem]"
                                  data-testid={`button-first-on-${player.id}`}
                                  title={player.name}
                                >
                                  {player.name}
                                </Button>
                              ))}
                              <Button
                                variant={bbbHoleData.firstOn === 'none' ? "default" : "outline"}
                                onClick={() => setBBBHoleData(prev => ({ ...prev, firstOn: 'none' }))}
                                className={`p-2 text-sm ${bbbHoleData.firstOn === 'none' ? '' : 'text-gray-500'}`}
                                data-testid="button-first-on-none"
                              >
                                None
                              </Button>
                            </div>
                          </div>

                          {/* Closest To (Bango) - Player Buttons */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              🎯 Closest To
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {selectedGroup.players.map(player => (
                                <Button
                                  key={player.id}
                                  variant={bbbHoleData.closestTo === player.id ? "default" : "outline"}
                                  onClick={() => setBBBHoleData(prev => ({ ...prev, closestTo: player.id }))}
                                  className="p-2 text-sm truncate min-w-[4rem]"
                                  data-testid={`button-closest-to-${player.id}`}
                                  title={player.name}
                                >
                                  {player.name}
                                </Button>
                              ))}
                              <Button
                                variant={bbbHoleData.closestTo === 'none' ? "default" : "outline"}
                                onClick={() => setBBBHoleData(prev => ({ ...prev, closestTo: 'none' }))}
                                className={`p-2 text-sm ${bbbHoleData.closestTo === 'none' ? '' : 'text-gray-500'}`}
                                data-testid="button-closest-to-none"
                              >
                                None
                              </Button>
                            </div>
                          </div>

                          {/* First In (Bongo) - Player Buttons */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              ⛳ First In
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {selectedGroup.players.map(player => (
                                <Button
                                  key={player.id}
                                  variant={bbbHoleData.firstIn === player.id ? "default" : "outline"}
                                  onClick={() => setBBBHoleData(prev => ({ ...prev, firstIn: player.id }))}
                                  className="p-2 text-sm truncate min-w-[4rem]"
                                  data-testid={`button-first-in-${player.id}`}
                                  title={player.name}
                                >
                                  {player.name}
                                </Button>
                              ))}
                              <Button
                                variant={bbbHoleData.firstIn === 'none' ? "default" : "outline"}
                                onClick={() => setBBBHoleData(prev => ({ ...prev, firstIn: 'none' }))}
                                className={`p-2 text-sm ${bbbHoleData.firstIn === 'none' ? '' : 'text-gray-500'}`}
                                data-testid="button-first-in-none"
                              >
                                None
                              </Button>
                            </div>
                          </div>
                          
                          <Button 
                            onClick={() => {
                              updateBBBHoleDataMutation.mutate({
                                gameId: selectedBBBGame.id,
                                hole: selectedBBBHole,
                                firstOn: bbbHoleData.firstOn || undefined,
                                closestTo: bbbHoleData.closestTo || undefined,
                                firstIn: bbbHoleData.firstIn || undefined
                              });
                            }}
                            disabled={updateBBBHoleDataMutation.isPending}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                            data-testid="button-save-bbb-data"
                          >
                            {updateBBBHoleDataMutation.isPending ? "Saving..." : "Save BBB Scores"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* BBB Payouts */}
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">💰 BBB Payouts</h3>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <Button
                            variant={bbbPayoutMode === 'points' ? 'default' : 'outline'}
                            onClick={() => setBBBPayoutMode('points')}
                            className="h-auto p-3"
                            data-testid="button-bbb-payout-points"
                          >
                            <div className="text-center">
                              <div className="font-medium">Points</div>
                            </div>
                          </Button>
                          <Button
                            variant={bbbPayoutMode === 'fbt' ? 'default' : 'outline'}
                            onClick={() => setBBBPayoutMode('fbt')}
                            className="h-auto p-3"
                            data-testid="button-bbb-payout-fbt"
                          >
                            <div className="text-center">
                              <div className="font-medium">FBT</div>
                            </div>
                          </Button>
                        </div>

                        {/* BBB Value Inputs */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <label className="text-sm font-medium text-gray-700">
                                BBB Point Value ($)
                              </label>
                            </div>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={bbbPointValue}
                              onChange={(e) => setBBBPointValue(e.target.value)}
                              className="w-full"
                              placeholder="1.00"
                              data-testid="input-bbb-point-value"
                            />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <label className="text-sm font-medium text-gray-700">
                                BBB FBT Value ($)
                              </label>
                            </div>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={bbbFbtValue}
                              onChange={(e) => setBBBFbtValue(e.target.value)}
                              className="w-full"
                              placeholder="5.00"
                              data-testid="input-bbb-fbt-value"
                            />
                          </div>
                        </div>

                        {/* Update Values Button */}
                        <Button
                          onClick={() => saveBBBPointsFbtValues()}
                          disabled={bbbSaveStatus === 'saving'}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
                          data-testid="button-update-bbb-values"
                        >
                          {bbbSaveStatus === 'saving' ? 'Saving...' : 
                           bbbSaveStatus === 'saved' ? 'Values Saved!' : 
                           'Update Values'}
                        </Button>

                        {/* Dynamic BBB Scores and Payout Display */}
                        {(() => {
                          const bbbPointValueNum = parseFloat(bbbPointValue);
                          const bbbFbtValueNum = parseFloat(bbbFbtValue);
                          
                          // Calculate total points from BBB game
                          const totalPoints: Record<string, number> = {};
                          selectedGroup.players.forEach(player => {
                            totalPoints[player.id] = 0;
                            Object.values(selectedBBBGame.points || {}).forEach(holePoints => {
                              totalPoints[player.id] += holePoints[player.id] || 0;
                            });
                          });

                          // Get payout data
                          const bbbPointsPayouts: Record<string, number> = {};
                          const bbbFbtPayouts: Record<string, number> = {};
                          
                          selectedGroup.players.forEach(player => {
                            bbbPointsPayouts[player.id] = 0;
                            bbbFbtPayouts[player.id] = 0;
                          });

                          if (bbbPointValueNum > 0 && selectedBBBPointsPayouts?.payouts) {
                            selectedGroup.players.forEach(player => {
                              bbbPointsPayouts[player.id] = selectedBBBPointsPayouts.payouts[player.id] || 0;
                            });
                          }

                          if (bbbFbtValueNum > 0 && selectedBBBFbtPayouts?.payouts) {
                            selectedGroup.players.forEach(player => {
                              bbbFbtPayouts[player.id] = selectedBBBFbtPayouts.payouts[player.id] || 0;
                            });
                          }

                          const hasValidPayouts = (bbbPayoutMode === 'points' && bbbPointValueNum > 0) || 
                                                 (bbbPayoutMode === 'fbt' && bbbFbtValueNum > 0);

                          return hasValidPayouts && (
                            <>
                              {/* BBB Scores Section */}
                              <div className="mt-6">
                                <h4 className="text-md font-semibold text-gray-800 mb-3">BBB Scores</h4>
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
                              </div>

                              {/* Contextual Explanatory Text */}
                              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                  {bbbPayoutMode === 'points' ? (
                                    <>
                                      <strong>BBB Points System:</strong> Players earn points for Bingo (first on green), Bango (closest to pin), and Bongo (first in hole). Points are totaled and payouts calculated based on point differences.
                                    </>
                                  ) : (
                                    <>
                                      <strong>BBB FBT System:</strong> Players earn points for Bingo, Bango, Bongo across Front 9, Back 9, and Total 18 holes. FBT payouts reward consistent performance across course segments.
                                    </>
                                  )}
                                </p>
                              </div>

                              {/* Payout Results */}
                              <div className="mt-4">
                                <h4 className="text-md font-semibold text-gray-800 mb-3">
                                  {bbbPayoutMode === 'points' ? 'Points Payouts' : 'FBT Payouts'}
                                </h4>
                                <div className="space-y-2">
                                  {[...selectedGroup.players]
                                    .sort((a, b) => {
                                      const payoutA = bbbPayoutMode === 'points' ? (bbbPointsPayouts[a.id] || 0) : (bbbFbtPayouts[a.id] || 0);
                                      const payoutB = bbbPayoutMode === 'points' ? (bbbPointsPayouts[b.id] || 0) : (bbbFbtPayouts[b.id] || 0);
                                      return payoutB - payoutA;
                                    })
                                    .map((player) => {
                                      const netAmount = bbbPayoutMode === 'points' ? (bbbPointsPayouts[player.id] || 0) : (bbbFbtPayouts[player.id] || 0);
                                      const isEven = Math.abs(netAmount) < 0.01;
                                      
                                      return (
                                        <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`bbb-${bbbPayoutMode}-payout-${player.id}`}>
                                          <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold`}
                                                 style={{ backgroundColor: player.color }}>
                                              {player.initials}
                                            </div>
                                            <span className="font-medium text-gray-800">{player.name}</span>
                                          </div>
                                          <div className="text-right">
                                            <div className={`text-lg font-bold ${
                                              isEven ? 'text-gray-800' : 
                                              netAmount > 0 ? 'text-emerald-600' : 'text-red-600'
                                            }`}>
                                              {isEven ? '$0.00' : 
                                               netAmount > 0 ? `+$${netAmount.toFixed(2)}` : 
                                               `-$${Math.abs(netAmount).toFixed(2)}`}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>

                    {/* BBB Scores - REMOVED - now integrated into BBB Payouts tile */}

                    {/* BBB Points Only and FBT Only Tiles - REMOVED - now integrated into main BBB Payouts tile */}
                  </>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">BBB Game</h2>
                  <p className="text-gray-600">Select a group to start playing Bingo Bango Bongo.</p>
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
            
            {/* 2/9/16 Game Rules */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">2/9/16 Game Rules</h2>
                <div className="space-y-4 text-gray-600">
                  <p className="leading-relaxed">
                    The 2/9/16 Game is a stroke-based competition where players earn points based on their performance relative to other players on each hole.
                  </p>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                      How Points Are Awarded
                    </h3>
                    
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
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                      Playing the Game
                    </h3>
                    <ol className="space-y-2 ml-8">
                      <li className="flex items-start gap-2">
                        <span className="text-gray-800 font-bold">1.</span>
                        <span>After each hole, enter everyone's stroke count</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-gray-800 font-bold">2.</span>
                        <span>Points are automatically calculated and added to the leaderboard</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-gray-800 font-bold">3.</span>
                        <span>Check the Payouts tab to see money calculations</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-gray-800 font-bold">4.</span>
                        <span>Play both games simultaneously for maximum fun!</span>
                      </li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                      3 Payout Systems - Points, FBT, Both
                    </h3>
                    <p className="text-gray-600 mb-3">
                      The 2/9/16 Game includes three payout systems that run simultaneously - choose your preferred method:
                    </p>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="font-medium text-gray-800 mb-2">Points System</h4>
                        <ul className="space-y-1 text-sm text-gray-700">
                          <li>• Each player pays/receives money based on point differences</li>
                          <li>• Higher-scoring players receive from lower-scoring players</li>
                          <li>• Set Point Value (e.g., $1.00 per point) to calculate amounts</li>
                          <li>• Net result shows total amount each player owes or receives</li>
                        </ul>
                      </div>
                      
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="font-medium text-gray-800 mb-2">FBT System (Front/Back/Total)</h4>
                        <ul className="space-y-1 text-sm text-gray-700">
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

            {/* Card Game Rules Reference */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Card Game Rules</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                      Setup
                    </h3>
                    <p className="text-gray-600 leading-relaxed ml-8">Set the monetary value for each card type before starting the game.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                      Drawing Cards
                    </h3>
                    <p className="text-gray-600 leading-relaxed ml-8">Players are assigned cards when they hit a shot corresponding to one of the card types below. Cards are re-assigned as additional players perform the same mishap. Each card can only be held by one player at a time.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                      Card Types
                    </h3>
                    <div className="space-y-3 ml-8">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                        <span className="text-2xl">🐪</span>
                        <div>
                          <p className="font-medium text-gray-800">Camel</p>
                          <p className="text-sm text-gray-600">Land in a sand trap</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                        <span className="text-2xl">🐟</span>
                        <div>
                          <p className="font-medium text-gray-800">Fish</p>
                          <p className="text-sm text-gray-600">Ball in the water</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                        <span className="text-2xl">🐦</span>
                        <div>
                          <p className="font-medium text-gray-800">Roadrunner</p>
                          <p className="text-sm text-gray-600">Hit the cart path</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                        <span className="text-2xl">👻</span>
                        <div>
                          <p className="font-medium text-gray-800">Ghost</p>
                          <p className="text-sm text-gray-600">Lost ball or out of bounds</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                        <span className="text-2xl">🦨</span>
                        <div>
                          <p className="font-medium text-gray-800">Skunk</p>
                          <p className="text-sm text-gray-600">Double bogey or worse</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                        <span className="text-2xl">🐍</span>
                        <div>
                          <p className="font-medium text-gray-800">Snake</p>
                          <p className="text-sm text-gray-600">Three or more putts</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
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
                      Winning
                    </h3>
                    <p className="text-gray-600 leading-relaxed ml-8">At the end of the round, players pay out based on the cards they hold.</p>
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

          </div>
        )}
      </main>

      <BottomNavigation currentTab={currentTab} onTabChange={(tab) => {
        // FIX: Always change tab first, then show overlay for games
        changeTab(tab);
        
        // Show overlay for Games tab to allow submenu selection
        if (tab === 'games') {
          setShowGamesOverlay(true);
        }
        
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
          changeGroup(group);
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
                        if (!selectedCardType) return 2;
                        
                        // Always prioritize fresh game state values first
                        const freshGame = groupGames?.find(g => g.id === selectedGame?.id);
                        let value = freshGame?.cardValues?.[selectedCardType] || selectedGame?.cardValues?.[selectedCardType];
                        if (value !== undefined) {
                          return value;
                        }
                        
                        // For custom cards, check if value exists in game state under the card name
                        const customCard = selectedGroup.customCards?.find(c => c.name.toLowerCase() === selectedCardType.toLowerCase());
                        if (customCard) {
                          const customCardKey = customCard.name.toLowerCase();
                          value = freshGame?.cardValues?.[customCardKey] || selectedGame?.cardValues?.[customCardKey] || customCard.value;
                          return value;
                        }
                        
                        // Final fallback
                        return 2;
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
                  changeGroup(null);
                  setShowCreateGroupModal(true);
                  setShowCreateGameDialog(false);
                }}
                variant="outline"
                className="w-full justify-start border-emerald-500 text-emerald-600 hover:bg-emerald-50"
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
                    onClick={() => changeGroup(group)}
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
                  changeGroup(null);
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
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300' 
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
                      <div className={`text-sm ${tempSelectedGames.includes('cards') ? 'text-amber-600' : 'text-gray-600'}`}>
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
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300' 
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
                      <div className="font-medium">2/9/16 Points Game</div>
                      <div className={`text-sm ${tempSelectedGames.includes('points') ? 'text-amber-600' : 'text-gray-600'}`}>
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
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300' 
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
                      <div className="font-medium">2/9/16 FBT Game</div>
                      <div className={`text-sm ${tempSelectedGames.includes('fbt') ? 'text-amber-600' : 'text-gray-600'}`}>
                        ${fbtValue} per victory
                      </div>
                    </div>
                  </div>
                </Button>
              )}

              {/* BBB Points Game Option */}
              {selectedBBBGame && parseFloat(bbbPointValue) > 0 && selectedBBBGame.holes && Object.keys(selectedBBBGame.holes).length > 0 && (
                <Button 
                  variant={tempSelectedGames.includes('bbb-points') ? 'default' : 'outline'}
                  className={`w-full justify-start h-auto p-3 ${
                    tempSelectedGames.includes('bbb-points') 
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (tempSelectedGames.includes('bbb-points')) {
                      setTempSelectedGames(tempSelectedGames.filter(g => g !== 'bbb-points'));
                    } else {
                      setTempSelectedGames([...tempSelectedGames, 'bbb-points']);
                    }
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-lg">🎲</span>
                    <div className="text-left">
                      <div className="font-medium">BBB Points Game</div>
                      <div className={`text-sm ${tempSelectedGames.includes('bbb-points') ? 'text-amber-600' : 'text-gray-600'}`}>
                        ${bbbPointValue} per point
                      </div>
                    </div>
                  </div>
                </Button>
              )}

              {/* BBB FBT Game Option */}
              {selectedBBBGame && parseFloat(bbbFbtValue) > 0 && selectedBBBGame.holes && Object.keys(selectedBBBGame.holes).length > 0 && (
                <Button 
                  variant={tempSelectedGames.includes('bbb-fbt') ? 'default' : 'outline'}
                  className={`w-full justify-start h-auto p-3 ${
                    tempSelectedGames.includes('bbb-fbt') 
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (tempSelectedGames.includes('bbb-fbt')) {
                      setTempSelectedGames(tempSelectedGames.filter(g => g !== 'bbb-fbt'));
                    } else {
                      setTempSelectedGames([...tempSelectedGames, 'bbb-fbt']);
                    }
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-lg">🎯</span>
                    <div className="text-left">
                      <div className="font-medium">BBB FBT Game</div>
                      <div className={`text-sm ${tempSelectedGames.includes('bbb-fbt') ? 'text-amber-600' : 'text-gray-600'}`}>
                        ${bbbFbtValue} per victory
                      </div>
                    </div>
                  </div>
                </Button>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
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
              
              <Button 
                onClick={async () => {
                  setMultiSelectGames(tempSelectedGames);
                  setShowPayoutModal(false);
                  
                  // V6.5: Trigger calculation with saveResults=true
                  if (tempSelectedGames.length > 0 && selectedGroup?.id) {
                    try {
                      // FIX: Determine correct game IDs and values based on selected games
                      const hasBBBGames = tempSelectedGames.some(game => game.startsWith('bbb-'));
                      const has2916Games = tempSelectedGames.some(game => ['points', 'fbt'].includes(game));
                      
                      // Use appropriate values based on game types in temp selection
                      const savePointValue = hasBBBGames ? parseFloat(bbbPointValue) : parseFloat(pointValue);
                      const saveFbtValue = hasBBBGames ? parseFloat(bbbFbtValue) : parseFloat(fbtValue);
                      
                      // Use BBB game ID if BBB games are selected, otherwise use 2/9/16 game ID
                      let correctPointsGameId = null;
                      if (hasBBBGames && has2916Games) {
                        // If both types are selected, we need to handle combination differently
                        // For now, prioritize the BBB game for the main calculation
                        correctPointsGameId = selectedBBBGame?.id || selectedPointsGame?.id;
                      } else if (hasBBBGames) {
                        correctPointsGameId = selectedBBBGame?.id;
                      } else if (has2916Games) {
                        correctPointsGameId = selectedPointsGame?.id;
                      }
                      
                      const response = await fetch('/api/calculate-combined-games', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                          groupId: selectedGroup.id,
                          gameStateId: selectedGame?.id,
                          pointsGameId: correctPointsGameId,
                          selectedGames: tempSelectedGames,
                          pointValue: savePointValue,
                          fbtValue: saveFbtValue,
                          saveResults: true
                        })
                      });
                      
                      if (response.ok) {
                        const result = await response.json();
                        console.log('Combined payout calculation saved:', result);
                        
                        // Invalidate queries to refresh UI and load saved results
                        queryClient.invalidateQueries({ queryKey: ['/api/calculate-combined-games'] });
                        queryClient.invalidateQueries({ queryKey: ['/api/combined-payout-results'] });
                        
                        // Force immediate refetch to ensure UI updates with latest data
                        await queryClient.refetchQueries({ 
                          queryKey: ['/api/calculate-combined-games'],
                          type: 'active'
                        });
                      } else {
                        const errorData = await response.json();
                        console.error('Save failed:', errorData);
                        toast({ title: "Error", description: "Failed to save payout results", variant: "destructive" });
                      }
                    } catch (error) {
                      console.error('Error saving combined results:', error);
                      toast({ title: "Error", description: "Failed to save payout results", variant: "destructive" });
                    }
                  }
                }}
                disabled={tempSelectedGames.length === 0}
                className="flex-1 btn-interactive btn-bouncy bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* About ForeScore Dialog */}
      <Dialog open={showAboutForescore} onOpenChange={setShowAboutForescore}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>About ForeScore</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm max-w-none">
            <p>ForeScore is owned and operated by danoNano, LLC, a limited liability company registered in the State of Arizona, doing business as ForeScore. All rights to the application and its associated technology are reserved.</p>
            
            <p>For questions, feedback, or support, please contact us at:</p>
            
            <p><strong>Email:</strong> support@danonano.com</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms of Service Dialog */}
      <Dialog open={showTermsOfService} onOpenChange={setShowTermsOfService}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
            <DialogDescription>
              Last updated: September 1, 2025
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm max-w-none">
            <p>Welcome to ForeScore. ForeScore is a service of danoNano, LLC (dba ForeScore), ("ForeScore," "we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of the ForeScore mobile and web applications, websites, and related services (collectively, the "Service").</p>
            
            <p>By accessing or using the Service, you agree to these Terms. If you do not agree, do not use the Service.</p>

            <h3>1) Who we are & how these Terms relate to Apple</h3>
            <p>For iOS distribution, your license to use the app is governed by Apple's Standard Licensed Application End User License Agreement (EULA), which applies unless we provide a custom EULA. These Terms supplement the Apple EULA. If there is any conflict, the Apple EULA controls with respect to license scope and usage rules on Apple platforms.</p>

            <h3>2) Eligibility & accounts</h3>
            <p>You must be at least 13 years old (or the age required by your local law if higher) to use the Service. You are responsible for the accuracy of your account information and for all activity under your account. If you use "Sign in with Apple" or another SSO, you must comply with the provider's rules and Apple's design and review requirements.</p>

            <h3>3) What ForeScore does (and doesn't do)</h3>
            <p>ForeScore provides tools to organize golf groups, track side-game (e.g., "2/9/16"), and calculate suggested payouts based on your group's rules. ForeScore does not facilitate real-money gambling, wagering, or contests. Any real-world settlements are outside the app and at users' discretion and risk. You are responsible for following all applicable laws where you play. (Apple's guidelines impose strict requirements for any real-money gaming; ForeScore is a scoring utility only.)</p>

            <h3>4) User-generated content & conduct</h3>
            <p>You may submit content such as profile names, group names, game configurations, messages, scores, and other material ("UGC"). You retain your rights to your UGC; you grant ForeScore a non-exclusive, worldwide, royalty-free license to host, display, adapt, and otherwise use UGC solely to operate and improve the Service.</p>
            
            <p>To comply with App Store rules for UGC:</p>
            <ul>
              <li>We filter for objectionable content and reserve the right to remove it.</li>
              <li>You can report UGC or users in-app and/or by emailing support@danonano.com; we respond promptly and remove/disable violating content, typically within 24 hours.</li>
              <li>You can block or leave groups to avoid unwanted interactions.</li>
              <li>Our contact info is published here and in-app so users can reach us.</li>
            </ul>

            <p>You agree not to post or do anything unlawful, infringing, harassing, hateful, misleading, pornographic, spammy, or that violates others' rights; to reverse engineer, scrape, or overload the Service; or to attempt to circumvent technical protections.</p>

            <h3>5) Privacy</h3>
            <p>Your use is also governed by our Privacy Policy (linked in-app and on our website), which explains what we collect, how we use it, and your choices, including data deletion. Apple requires apps to include a privacy policy link in App Store Connect and inside the app in an easily accessible manner; we provide both.</p>

            <h3>6) License & intellectual property</h3>
            <p>Subject to these Terms, we grant you a limited, non-exclusive, non-transferable license to use the Service for its intended purpose. The Service (excluding your UGC) is owned by ForeScore and its licensors and is protected by IP laws. We reserve all rights not expressly granted.</p>

            <h3>7) Gameplay outputs & fairness</h3>
            <p>ForeScore's calculations (e.g., points or payout suggestions) are based on the rules and inputs you select. These outputs are informational only. We do not guarantee accuracy, and we are not responsible for any disputes or losses arising from use of suggested payouts or scoring logic.</p>

            <h3>8) Purchases, subscriptions & trials (if offered)</h3>
            <p>If we offer in-app purchases or auto-renewing subscriptions:</p>
            <ul>
              <li><strong>Billing & Auto-renewal.</strong> Payment is processed through Apple using your Apple ID. Subscriptions auto-renew until canceled in your device Settings &gt; Apple ID &gt; Subscriptions. Cancel at least 24 hours before the current period ends to avoid renewal.</li>
              <li><strong>Trials.</strong> If a trial is offered, you will be informed of the duration, price after the trial, and renewal terms before you subscribe.</li>
              <li><strong>Pricing & Features.</strong> We will clearly describe what you get for the price prior to purchase. Features may vary by plan.</li>
            </ul>
            <p>Refunds, if any, are handled by Apple under its media services terms; please see Apple's policies and your App Store receipt for details.</p>

            <h3>9) Third-party services</h3>
            <p>The Service may link to third-party sites or services (e.g., group chat or payment tools you use outside the app). We are not responsible for third-party services; you use them at your own risk and must follow their terms.</p>

            <h3>10) Prohibited uses & no gambling</h3>
            <p>You must not use the Service to facilitate or advertise illegal gambling, sweepstakes, or lotteries. ForeScore may geo-restrict or disable features to comply with local laws and platform rules.</p>

            <h3>11) Support & Apple as a third-party beneficiary</h3>
            <p>ForeScore is solely responsible for support for the iOS app (not Apple). You acknowledge that Apple and Apple's subsidiaries are third-party beneficiaries of these Terms for the limited purpose of enforcing the Apple EULA obligations applicable to iOS apps.</p>

            <h3>12) Disclaimers</h3>
            <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE." TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ACCURACY.</p>

            <h3>13) Limitation of liability</h3>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, FORESCORE AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND SUPPLIERS ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF (OR INABILITY TO USE) THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIMS RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) AMOUNTS YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM OR (B) USD $50.</p>

            <h3>14) Indemnification</h3>
            <p>You agree to defend, indemnify, and hold harmless ForeScore from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising from or related to your UGC, your use of the Service, or your violation of these Terms.</p>

            <h3>15) Suspension & termination</h3>
            <p>We may suspend or terminate your access (with or without notice) for violations of these Terms, risk of harm to others, or platform/legal requirements. You may stop using the Service at any time. Some sections (e.g., IP, Disclaimers, Liability) survive termination.</p>

            <h3>16) Changes to the Service & Terms</h3>
            <p>We may modify the Service and these Terms. If changes are material, we'll notify you in-app or by posting to our site. Continued use after changes become effective means you accept the revised Terms.</p>

            <h3>17) Governing law; venue</h3>
            <p>These Terms are governed by the laws of the State of Arizona, without regard to conflict-of-laws rules. Courts located in Maricopa County, Arizona will have exclusive jurisdiction, unless applicable law provides otherwise.</p>

            <h3>18) Contact</h3>
            <p>Questions, reports, or takedown requests: support@danonano.com</p>
            <p>Postal: danoNano, LLC. [2447 E Fremont Rd. Phoenix, AZ 85042]</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Games Dropdown - Sweeps up from Games tab */}
      {showGamesOverlay && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowGamesOverlay(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 w-72 bg-white rounded-lg shadow-lg border border-gray-200" style={{ animation: 'slideUpFromBottom 0.2s ease-out' }}>
            <div className="p-3">
              <div className="space-y-1">
                <button
                  data-testid="button-game-bbb"
                  className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors text-left"
                  onClick={() => {
                    changeTab('games');
                    setSelectedSubGame('bbb');
                    setShowGamesOverlay(false);
                  }}
                >
                  <MoreHorizontal className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">BBB</div>
                    <div className="text-sm text-gray-500">Bingo Bango Bongo</div>
                  </div>
                </button>
                
                <button
                  data-testid="button-game-2916"
                  className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors text-left"
                  onClick={() => {
                    changeTab('games');
                    setSelectedSubGame('points');
                    setShowGamesOverlay(false);
                  }}
                >
                  <Hash className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">2/9/16</div>
                    <div className="text-sm text-gray-500">Points-based scoring</div>
                  </div>
                </button>
                
                <button
                  data-testid="button-game-cards"
                  className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors text-left"
                  onClick={() => {
                    changeTab('games');
                    setSelectedSubGame('cards');
                    setShowGamesOverlay(false);
                  }}
                >
                  <Layers className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">Cards</div>
                    <div className="text-sm text-gray-500">Don't be an animal!</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
