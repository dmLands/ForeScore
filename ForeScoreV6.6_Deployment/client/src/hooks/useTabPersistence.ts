// V6.5: Complete Game State Persistence Hook
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import type { Group, GameState } from '@shared/schema';

type TabType = 'games' | 'deck' | 'scoreboard' | 'rules' | 'points';

interface UserPreferences {
  currentTab: TabType;
  selectedGroupId?: string;
  selectedGameId?: string;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export function useTabPersistence() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState<TabType>('games');
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
  const { data: groupData } = useQuery({
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
  const { data: gameData } = useQuery({
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

  // Restore full game context from preferences
  useEffect(() => {
    if (preferences && !isInitialized) {
      console.log('Restoring game state:', {
        tab: preferences.currentTab,
        groupId: preferences.selectedGroupId,
        gameId: preferences.selectedGameId
      });
      
      setCurrentTab(preferences.currentTab || 'games');
      
      // Check if we need to wait for data to load
      const needsGroupData = preferences.selectedGroupId && !groupData;
      const needsGameData = preferences.selectedGameId && !gameData;
      
      if (needsGroupData || needsGameData) {
        console.log('Waiting for data to load...', { needsGroupData, needsGameData });
        return; // Don't initialize yet, wait for data
      }
      
      // Restore group if we have data
      if (preferences.selectedGroupId && groupData) {
        console.log('Restoring group:', groupData.name);
        setSelectedGroup(groupData);
      }
      
      // Restore game if we have data  
      if (preferences.selectedGameId && gameData) {
        console.log('Restoring game:', gameData.name);
        setSelectedGame(gameData);
      }
      
      console.log('Game state restoration complete');
      setIsInitialized(true);
    }
  }, [preferences, groupData, gameData, isInitialized]);

  // Save complete state
  const saveState = useCallback(async (updates: Partial<{ currentTab: TabType, selectedGroupId?: string, selectedGameId?: string }>) => {
    if (!user) return;

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      }
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }, [user, queryClient]);

  // Change tab with auto-save
  const changeTab = useCallback((newTab: TabType) => {
    setCurrentTab(newTab);
    saveState({ currentTab: newTab });
  }, [saveState]);

  // Change group with auto-save
  const changeGroup = useCallback((newGroup: Group | null) => {
    setSelectedGroup(newGroup);
    saveState({ 
      selectedGroupId: newGroup?.id || undefined,
      selectedGameId: undefined // Clear game when changing groups
    });
    // Also clear selected game when changing groups
    setSelectedGame(null);
  }, [saveState]);

  // Change game with auto-save
  const changeGame = useCallback((newGame: GameState | null) => {
    setSelectedGame(newGame);
    saveState({ selectedGameId: newGame?.id || undefined });
  }, [saveState]);

  return {
    currentTab,
    changeTab,
    selectedGroup,
    changeGroup,
    selectedGame,
    changeGame,
    isLoading: isLoading && !isInitialized,
  };
}