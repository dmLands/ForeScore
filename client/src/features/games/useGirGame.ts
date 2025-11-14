import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PointsGame, Group, GIRHoleConfig } from "@shared/schema";

export function useGirGame(selectedGroup: Group | null) {
  const { toast } = useToast();
  const [selectedHole, setSelectedHole] = useState<number>(1);
  const [holeData, setHoleData] = useState<Record<string, boolean>>({});
  const [pointValue, setPointValue] = useState<string>("1.00");
  const [nassauValue, setNassauValue] = useState<string>("10.00");
  const [payoutMode, setPayoutMode] = useState<'points' | 'nassau'>('points');
  const [holeConfig, setHoleConfig] = useState<GIRHoleConfig>({ penalty: [], bonus: [] });

  // Fetch all points games for the selected group (matching BBB/2916 pattern)
  const { data: pointsGames = [], isLoading: girGamesLoading } = useQuery<PointsGame[]>({
    queryKey: ['/api/points-games', selectedGroup?.id],
    enabled: !!selectedGroup?.id
  });

  // Filter to find GIR game from the points games array
  const selectedGirGame = pointsGames.find(game => game.gameType === 'gir') || null;

  // Initialize hole configuration from saved game data
  useEffect(() => {
    if (selectedGirGame?.girHoleConfig) {
      setHoleConfig(selectedGirGame.girHoleConfig);
    } else {
      setHoleConfig({ penalty: [], bonus: [] });
    }
  }, [selectedGirGame]);

  // Update hole data mutation
  const updateHoleMutation = useMutation({
    mutationFn: async (data: { hole: number; playerGirData: Record<string, boolean> }) => {
      if (!selectedGirGame) throw new Error('No GIR game selected');
      
      const response = await apiRequest(
        'PUT',
        `/api/gir-games/${selectedGirGame.id}/hole/${data.hole}`,
        { playerGirData: data.playerGirData }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/points-games'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gir-games', selectedGirGame?.id], exact: false });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save GIR data", 
        variant: "destructive" 
      });
    }
  });

  // Save GIR point/Nassau values mutation
  const saveValuesMutation = useMutation({
    mutationFn: async (values: { pointValue: number; nassauValue: number }) => {
      if (!selectedGirGame) throw new Error('No GIR game selected');
      
      const response = await apiRequest(
        'PUT',
        `/api/points-games/${selectedGirGame.id}/settings`,
        values
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/points-games'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save values", 
        variant: "destructive" 
      });
    }
  });

  // Save hole configuration mutation
  const saveHoleConfigMutation = useMutation({
    mutationFn: async (config: GIRHoleConfig) => {
      if (!selectedGirGame) throw new Error('No GIR game selected');
      
      const response = await apiRequest(
        'PUT',
        `/api/gir-games/${selectedGirGame.id}/hole-config`,
        config
      );
      return response.json();
    },
    onSuccess: (updatedGame) => {
      queryClient.invalidateQueries({ queryKey: ['/api/points-games'] });
      toast({
        title: "Configuration Saved",
        description: "Penalty and bonus holes have been updated.",
      });
      // Update local state with the saved config
      if (updatedGame.girHoleConfig) {
        setHoleConfig(updatedGame.girHoleConfig);
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save hole configuration", 
        variant: "destructive" 
      });
    }
  });

  // Fetch payouts
  const { data: payoutData, isLoading: payoutsLoading } = useQuery({
    queryKey: ['/api/gir-games', selectedGirGame?.id, 'who-owes-who', payoutMode, pointValue, nassauValue],
    enabled: !!selectedGirGame && ((payoutMode === 'points' && parseFloat(pointValue) > 0) || (payoutMode === 'nassau' && parseFloat(nassauValue) > 0)),
    queryFn: async () => {
      const params = new URLSearchParams({
        payoutMode,
        pointValue: pointValue || '0',
        nassauValue: nassauValue || '0'
      });
      
      const response = await fetch(`/api/gir-games/${selectedGirGame!.id}/who-owes-who?${params}`);
      if (!response.ok) throw new Error('Failed to fetch payouts');
      return response.json();
    }
  });

  const saveHoleData = (hole: number, playerGirData: Record<string, boolean>) => {
    updateHoleMutation.mutate({ hole, playerGirData });
  };

  const saveValues = () => {
    saveValuesMutation.mutate({
      pointValue: parseFloat(pointValue),
      nassauValue: parseFloat(nassauValue)
    });
  };

  const saveHoleConfig = (config: GIRHoleConfig) => {
    saveHoleConfigMutation.mutate(config);
  };

  return {
    selectedGirGame,
    girGamesLoading,
    selectedHole,
    setSelectedHole,
    holeData,
    setHoleData,
    pointValue,
    setPointValue,
    nassauValue,
    setNassauValue,
    payoutMode,
    setPayoutMode,
    holeConfig,
    setHoleConfig,
    saveHoleData,
    saveValues,
    saveHoleConfig,
    payoutData,
    payoutsLoading,
    isSaving: updateHoleMutation.isPending || saveValuesMutation.isPending,
    isConfigSaving: saveHoleConfigMutation.isPending,
  };
}
