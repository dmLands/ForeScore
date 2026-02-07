import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import type { Group, GameState } from '@shared/schema';

type TabType = 'groups' | 'games' | 'scoreboard' | 'rules';

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
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export function useTabPersistence(payoutDataReady?: boolean) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState<TabType>('groups');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isInitialized) return;
    const timeout = setTimeout(() => {
      if (!isInitialized) {
        console.warn('[useTabPersistence] Initialization timed out after 8s, forcing defaults');
        setCurrentTab('groups');
        setSelectedGroup(null);
        setSelectedGame(null);
        setIsInitialized(true);
      }
    }, 8000);
    return () => clearTimeout(timeout);
  }, [isInitialized]);

  const { data: preferences, isLoading: prefIsLoading, isError: prefIsError } = useQuery<UserPreferences>({
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
    retry: 1,
  });

  const { data: groupData, isLoading: groupLoading, isError: groupError } = useQuery({
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
    retry: 1,
  });

  const { data: gameData, isLoading: gameLoading, isError: gameError } = useQuery({
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
    retry: 1,
  });

  useEffect(() => {
    if (isInitialized) return;

    if (!user) return;

    if (prefIsLoading) return;

    if (prefIsError || !preferences || (!preferences.selectedGroupId && !preferences.selectedGameId && !preferences.currentTab)) {
      setCurrentTab('groups');
      setIsInitialized(true);
      return;
    }

    const wantGroup = !!preferences.selectedGroupId;
    const wantGame  = !!preferences.selectedGameId;
    const targetTab = preferences.currentTab ?? 'groups';

    const groupDone = !wantGroup || (!groupLoading);
    const gameDone  = !wantGame  || (!gameLoading);

    if (!groupDone || !gameDone) return;

    if (groupError || (wantGroup && !groupData)) {
      writeLS({ selectedGroupId: undefined, selectedGameId: undefined, currentTab: 'groups' });
      fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ selectedGroupId: null, selectedGameId: null, currentTab: 'groups' }),
      }).catch(() => {});
      setCurrentTab('groups');
      setSelectedGroup(null);
      setSelectedGame(null);
      setIsInitialized(true);
      return;
    }

    if (gameError || (wantGame && !gameData)) {
      writeLS({ selectedGameId: undefined });
      fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ selectedGameId: null }),
      }).catch(() => {});
      setCurrentTab(wantGroup ? targetTab : 'groups');
      setSelectedGroup(groupData ?? null);
      setSelectedGame(null);
      setIsInitialized(true);
      return;
    }

    if (wantGroup && groupData && !groupData.players) {
      setCurrentTab('groups');
      setSelectedGroup(null);
      setSelectedGame(null);
      setIsInitialized(true);
      return;
    }

    const needPayoutData = targetTab === 'scoreboard' && wantGroup && wantGame;
    const payoutReady = !needPayoutData || (payoutDataReady === true);

    if (!payoutReady) return;

    setCurrentTab(targetTab);
    setSelectedGroup(groupData ?? null);
    setSelectedGame(gameData ?? null);
    setIsInitialized(true);
  }, [user, preferences, prefIsLoading, prefIsError, groupData, gameData, groupLoading, gameLoading, groupError, gameError, isInitialized, payoutDataReady]);

  const saveState = useCallback(async (updates: Partial<{
    currentTab: TabType;
    selectedGroupId?: string;
    selectedGameId?: string;
  }>) => {
    if (!user) return;

    writeLS(updates);

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (!response.ok) console.warn('Failed to save preferences');
    } catch (e) {
      console.warn('Failed to save preferences:', e);
    }
  }, [user]);

  const changeTab = useCallback((newTab: TabType) => {
    setCurrentTab(newTab);
    writeLS({ currentTab: newTab });
    saveState({ currentTab: newTab });
  }, [saveState]);

  const changeGroup = useCallback((newGroup: Group | null) => {
    setSelectedGroup(newGroup);
    writeLS({ selectedGroupId: newGroup?.id });
    saveState({ selectedGroupId: newGroup?.id || undefined, selectedGameId: undefined });
    setSelectedGame(null);
  }, [saveState]);

  const changeGame = useCallback((newGame: GameState | null) => {
    setSelectedGame(newGame);
    writeLS({ selectedGameId: newGame?.id });
    saveState({ selectedGameId: newGame?.id || undefined });
  }, [saveState]);

  return {
    currentTab,
    changeTab,
    selectedGroup,
    changeGroup,
    selectedGame,
    changeGame,
    isRestoring: !isInitialized,
  };
}
