import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HoleSelector } from "@/components/HoleSelector";
import { PlayerActionGrid } from "./PlayerActionGrid";
import { useGirGame } from "./useGirGame";
import { useToast } from "@/hooks/use-toast";
import type { Group } from "@shared/schema";
import { useEffect } from "react";

interface GIRGameProps {
  selectedGroup: Group | null;
}

const PENALTY_HOLES = [1, 8, 13, 16];
const BONUS_HOLES = [6, 9, 17, 18];

export function GIRGame({ selectedGroup }: GIRGameProps) {
  const { toast } = useToast();
  const {
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
    isSaving,
  } = useGirGame(selectedGroup);

  // Load existing hole data when hole changes
  useEffect(() => {
    if (selectedGirGame && selectedHole) {
      const existingData = selectedGirGame.holes?.[selectedHole];
      if (existingData && typeof existingData === 'object') {
        // Filter to only include boolean values for GIR data
        const girData: Record<string, boolean> = {};
        Object.entries(existingData).forEach(([key, value]) => {
          if (typeof value === 'boolean') {
            girData[key] = value;
          }
        });
        setHoleData(girData);
      } else {
        setHoleData({});
      }
    }
  }, [selectedHole, selectedGirGame, setHoleData]);

  if (!selectedGroup) {
    return (
      <div className="p-4">
        <p className="text-gray-600">Please select a group to view GIR game.</p>
      </div>
    );
  }

  if (girGamesLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-3"></div>
        <p className="text-sm text-emerald-600">Loading GIR game...</p>
      </div>
    );
  }

  if (!selectedGirGame) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">No GIR games yet. GIR games are auto-created when you start a new game session.</p>
            <p className="text-sm text-gray-500 mt-2">Switch to Games → Create Group to start a new game session with GIR included.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper function to derive initials from name
  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const players = selectedGroup.players.map(p => ({
    id: p.id,
    name: p.name,
    color: p.color,
    initials: p.initials || getInitials(p.name)
  }));

  // Validation function to check if all players have a selection
  const validateHoleData = (): boolean => {
    const selectedPlayerIds = Object.keys(holeData);
    const allPlayerIds = players.map(p => p.id);
    
    // Check if every player has made a selection
    const allPlayersSelected = allPlayerIds.every(playerId => 
      selectedPlayerIds.includes(playerId) && typeof holeData[playerId] === 'boolean'
    );
    
    if (!allPlayersSelected) {
      toast({
        title: "Incomplete Selection",
        description: "Please select HIT or MISS for all players before saving.",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  // Handler for save button with validation
  const handleSaveGirScores = () => {
    if (validateHoleData()) {
      saveHoleData(selectedHole, holeData);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Game Header */}
      <div>
        <h2 className="text-2xl font-bold text-emerald-600" data-testid="header-gir-title">
          Greens in Regulation
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Track which players hit the green in regulation on each hole
        </p>
      </div>

      {/* Hole Selector */}
      <HoleSelector
        selectedHole={selectedHole}
        onHoleSelect={(hole) => setSelectedHole(hole)}
        penaltyHoles={PENALTY_HOLES}
        bonusHoles={BONUS_HOLES}
      />

      {/* GIR Scoring Card */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            🏌️ Hole {selectedHole} - GIR Status
          </h3>
          
          {/* Scoring Rules Info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-md text-sm">
            <div className="font-medium text-gray-700 mb-1">Scoring:</div>
            {PENALTY_HOLES.includes(selectedHole) ? (
              <div className="text-red-600">❗ Penalty Hole: HIT = +1, MISS = -1</div>
            ) : BONUS_HOLES.includes(selectedHole) ? (
              <div className="text-blue-600">⭐ Bonus Hole: HIT = +2, MISS = 0</div>
            ) : (
              <div className="text-gray-600">Standard Hole: HIT = +1, MISS = 0</div>
            )}
          </div>

          {/* Player HIT/MISS Grid */}
          <PlayerActionGrid
            players={players}
            selectedValues={holeData}
            onPlayerSelect={(playerId, value) => {
              setHoleData(prev => ({ ...prev, [playerId]: value as boolean }));
            }}
            options={[
              { label: 'HIT', value: true },
              { label: 'MISS', value: false }
            ]}
            testIdPrefix="gir"
            showAvatar={true}
          />

          {/* Save Button */}
          <Button
            onClick={handleSaveGirScores}
            disabled={isSaving}
            className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white"
            data-testid="button-save-gir-data"
          >
            {isSaving ? 'Saving...' : 'Save GIR Scores'}
          </Button>
        </CardContent>
      </Card>

      {/* Greens Hit Card */}
      {payoutData && payoutData.girPoints && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Greens Hit</h3>
            <div className="space-y-2">
              {Object.entries(payoutData.girPoints)
                .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
                .map(([playerId, points]: [string, any]) => {
                  const player = players.find(p => p.id === playerId);
                  if (!player) return null;
                  return (
                    <div key={playerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: player.color }}
                        >
                          {player.initials}
                        </div>
                        <span className="font-medium text-gray-800">{player.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-800">
                          {points < 0 ? '-' : ''}{Math.abs(points)}
                        </p>
                        <p className="text-xs text-gray-600">points</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payouts Card */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">GIR Payouts</h3>
          
          {/* Payout Mode Selection */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Payout Mode
            </label>
            <div className="flex gap-2">
              <Button
                variant={payoutMode === 'points' ? 'default' : 'outline'}
                onClick={() => setPayoutMode('points')}
                size="sm"
                className="flex-1"
                data-testid="button-gir-mode-points"
              >
                Points
              </Button>
              <Button
                variant={payoutMode === 'fbt' ? 'default' : 'outline'}
                onClick={() => setPayoutMode('fbt')}
                size="sm"
                className="flex-1"
                data-testid="button-gir-mode-fbt"
              >
                FBT
              </Button>
            </div>
          </div>

          {/* Value Inputs */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Point Value ($)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={pointValue}
                onChange={(e) => setPointValue(e.target.value)}
                placeholder="1.00"
                data-testid="input-gir-point-value"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                FBT Value ($)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={fbtValue}
                onChange={(e) => setFbtValue(e.target.value)}
                placeholder="10.00"
                data-testid="input-gir-fbt-value"
              />
            </div>
          </div>

          {/* Update Values Button */}
          <Button
            onClick={saveValues}
            disabled={isSaving}
            className="w-full mb-4 bg-emerald-500 hover:bg-emerald-600 text-white"
            data-testid="button-update-gir-values"
          >
            {isSaving ? 'Saving...' : 'Update Values'}
          </Button>

          {/* Payout Display */}
          {payoutsLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-2"></div>
              <span className="text-sm text-gray-600">Calculating payouts...</span>
            </div>
          ) : payoutData && payoutData.whoOwesWho ? (
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Who Owes Who</h4>
              {payoutData.whoOwesWho.length === 0 ? (
                <p className="text-sm text-gray-500">All players are even</p>
              ) : (
                <div className="space-y-2">
                  {payoutData.whoOwesWho.map((tx: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      data-testid={`transaction-${idx}`}
                    >
                      <div className="text-sm">
                        <span className="font-medium text-red-600">{tx.fromPlayerName}</span>
                        <span className="text-gray-600"> owes </span>
                        <span className="font-medium text-green-600">{tx.toPlayerName}</span>
                      </div>
                      <span className="font-bold text-black">${tx.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Enter values and select a mode to see payouts</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
