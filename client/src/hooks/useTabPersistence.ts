// V6.5: Complete Game State Persistence Hook
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import type { Group, GameState } from '@shared/schema';

type TabType = 'groups' | 'games' | 'scoreboard' | 'rules';

// top-level localStorage cache
const LS_KEY = "fs.prefs.v1";

function readLS() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
  catch { return {}; }
}
function writeLS(update: any) {
  const prev = readLS();
  localStorage.setItem(LS_KEY, JSON.stringify({ ...prev, ...update }));
}

interface UserPreferences {
  currentTab: TabType;
  selectedGroupId?: string;
  selectedGameId?: string;
  selectedSubGame?: 'cards' | 'points' | 'bbb';
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export function useTabPersistence(payoutDataReady?: boolean) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState<TabType>('groups'); // hidden until initialized
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch user preferences
  const { data: preferences, isLoading } = useQuery<UserPreferences>({
    queryKey: ['/api/user/preferences'],
    queryFn: async () => {
      const response = await fetch('/api/user/preferences', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user preferences');
      }
      return response.json();
    },
    enabled: !!user,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Fetch group data when preferences contain a selectedGroupId
  const { data: groupData, isLoading: groupLoading } = useQuery({
    queryKey: ['/api/groups', preferences?.selectedGroupId],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${preferences!.selectedGroupId}`, {
        credentials: 'include'
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!preferences?.selectedGroupId,
    staleTime: 30000,
  });

  // Fetch game data when preferences contain a selectedGameId
  const { data: gameData, isLoading: gameLoading } = useQuery({
    queryKey: ['/api/game-state', preferences?.selectedGameId],
    queryFn: async () => {
      const response = await fetch(`/api/game-state/${preferences!.selectedGameId}`, {
        credentials: 'include'
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!preferences?.selectedGameId,
    staleTime: 30000,
  });

  // Restore full game context from preferences in ONE pass, then mark initialized
  useEffect(() => {
    if (!preferences || isInitialized) return;

    const wantGroup = !!preferences.selectedGroupId;
    const wantGame  = !!preferences.selectedGameId;
    const targetTab = preferences.currentTab ?? 'groups';

    // We only finish init once required data queries are complete (even if data is null due to 404)
    const groupReady = !wantGroup || !groupLoading;
    const gameReady  = !wantGame  || !gameLoading;
    
    // For Payouts tab, also wait for payout-critical data to prevent tile re-ordering flicker
    const needPayoutData = targetTab === 'scoreboard' && wantGroup && wantGame;
    const payoutReady = !needPayoutData || (payoutDataReady === true);
    
    if (!groupReady || !gameReady || !payoutReady) return; // wait until all required data appear

    // Apply all state in a single commit (React batches setState in effects)
    setCurrentTab(targetTab);
    setSelectedGroup(groupData ?? null);
    setSelectedGame(gameData ?? null);
    setIsInitialized(true);
  }, [preferences, groupData, gameData, groupLoading, gameLoading, isInitialized, payoutDataReady]);

  // when saving to server, also mirror to LS
  const saveState = useCallback(async (updates: Partial<{
    currentTab: TabType;
    selectedGroupId?: string;
    selectedGameId?: string;
    selectedSubGame?: 'cards' | 'points' | 'bbb';
  }>) => {
    if (!user) return;

    // fire-and-forget local cache for instant next boot
    writeLS(updates);

    const response = await fetch('/api/user/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to save preferences');
  }, [user]);

  // and also mirror in the change* helpers:
  const changeTab = useCallback((newTab: TabType) => {
    setCurrentTab(newTab);
    writeLS({ currentTab: newTab });
    saveState({ currentTab: newTab });
  }, [saveState]);

  const changeGroup = useCallback((newGroup: Group | null) => {
    setSelectedGroup(newGroup);
    writeLS({ selectedGroupId: newGroup?.id });
    saveState({ selectedGroupId: newGroup?.id || undefined, selectedGameId: undefined });
    // Also clear selected game when changing groups
    setSelectedGame(null);
  }, [saveState]);

  const changeGame = useCallback((newGame: GameState | null) => {
    setSelectedGame(newGame);
    writeLS({ selectedGameId: newGame?.id });
    saveState({ selectedGameId: newGame?.id || undefined });
  }, [saveState]);

  const changeSubGame = useCallback((newSubGame: 'cards' | 'points' | 'bbb') => {
    writeLS({ selectedSubGame: newSubGame });
    saveState({ selectedSubGame: newSubGame });
  }, [saveState]);

  return {
    currentTab,
    changeTab,
    selectedGroup,
    changeGroup,
    selectedGame,
    changeGame,
    changeSubGame,
    selectedSubGame: preferences?.selectedSubGame || 'bbb',
    // Gate the UI purely on whether the initial restore finished.
    isRestoring: !isInitialized,
  };
}