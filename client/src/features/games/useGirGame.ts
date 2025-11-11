import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PointsGame, Group } from "@shared/schema";

export function useGirGame(selectedGroup: Group | null) {
  const { toast } = useToast();
  const [selectedHole, setSelectedHole] = useState<number>(1);
  const [holeData, setHoleData] = useState<Record<string, boolean>>({});
  const [pointValue, setPointValue] = useState<string>("1.00");
  const [fbtValue, setFbtValue] = useState<string>("10.00");
  const [payoutMode, setPayoutMode] = useState<'points' | 'fbt'>('points');

  // Fetch all points games for the selected group (matching BBB/2916 pattern)
  const { data: pointsGames = [], isLoading: girGamesLoading } = useQuery<PointsGame[]>({
    queryKey: ['/api/points-games', selectedGroup?.id],
    enabled: !!selectedGroup?.id
  });

  // Filter to find GIR game from the points games array
  const selectedGirGame = pointsGames.find(game => game.gameType === 'gir') || null;

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

  // Save GIR point/FBT values mutation
  const saveValuesMutation = useMutation({
    mutationFn: async (values: { pointValue: number; fbtValue: number }) => {
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
      toast({ title: "Success", description: "Values saved successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save values", 
        variant: "destructive" 
      });
    }
  });

  // Fetch payouts
  const { data: payoutData, isLoading: payoutsLoading } = useQuery({
    queryKey: ['/api/gir-games', selectedGirGame?.id, 'who-owes-who', payoutMode, pointValue, fbtValue],
    enabled: !!selectedGirGame && ((payoutMode === 'points' && parseFloat(pointValue) > 0) || (payoutMode === 'fbt' && parseFloat(fbtValue) > 0)),
    queryFn: async () => {
      const params = new URLSearchParams({
        payoutMode,
        pointValue: pointValue || '0',
        fbtValue: fbtValue || '0'
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
      fbtValue: parseFloat(fbtValue)
    });
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
    fbtValue,
    setFbtValue,
    payoutMode,
    setPayoutMode,
    saveHoleData,
    saveValues,
    payoutData,
    payoutsLoading,
    isSaving: updateHoleMutation.isPending || saveValuesMutation.isPending,
  };
}
