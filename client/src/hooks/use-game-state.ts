import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { GameState } from "@shared/schema";

export function useGameState(groupId?: string) {
  const { toast } = useToast();

  // Query for existing game state - need to get the current game by group first
  const { data: groupGames = [] } = useQuery<GameState[]>({
    queryKey: ['/api/groups', groupId, 'games'],
    enabled: !!groupId,
    retry: false,
  });

  // Get the most recent active game
  const gameState = groupGames?.find(game => game.isActive) || groupGames?.[0];
  const isLoading = false; // Since we're getting it from groupGames query

  // Start new game mutation
  const startGame = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await apiRequest('POST', '/api/game-state', { groupId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game-state', groupId] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'games'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to start game", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Draw card mutation
  const drawCard = useMutation({
    mutationFn: async (data: { gameStateId: string; groupId: string }) => {
      const response = await apiRequest('POST', `/api/game-state/${data.gameStateId}/draw-card`, {
        groupId: data.groupId
      });
      return response.json();
    },
    onSuccess: () => {
      // Force immediate refresh of all related data
      queryClient.invalidateQueries({ queryKey: ['/api/game-state', groupId] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'games'] });
      queryClient.refetchQueries({ queryKey: ['/api/game-state', groupId] });
      queryClient.refetchQueries({ queryKey: ['/api/groups', groupId, 'games'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to draw card", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Assign card mutation
  const assignCard = useMutation({
    mutationFn: async (data: { gameStateId: string; playerId: string; groupId: string; cardType: string }) => {
      const response = await apiRequest('POST', `/api/game-state/${data.gameStateId}/assign-card`, {
        playerId: data.playerId,
        groupId: data.groupId,
        cardType: data.cardType
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Force immediate refresh of all related data including payouts for instant UI updates
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.setQueryData(['/api/groups', groupId, 'games'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((game: any) => 
          game.id === variables.gameStateId ? { ...game, ...data } : game
        );
      });
      // Immediately refetch to get latest state for UI
      queryClient.refetchQueries({ queryKey: ['/api/groups', groupId, 'games'] });
      queryClient.refetchQueries({ queryKey: ['/api/game-state', variables.gameStateId, 'payouts'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to assign card", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  return {
    gameState,
    isLoading,
    startGame,
    drawCard,
    assignCard,
  };
}
