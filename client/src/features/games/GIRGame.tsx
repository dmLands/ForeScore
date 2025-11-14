import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HoleSelector } from "@/components/HoleSelector";
import { PlayerActionGrid } from "./PlayerActionGrid";
import { useGirGame } from "./useGirGame";
import { useToast } from "@/hooks/use-toast";
import type { Group } from "@shared/schema";
import { useEffect, useState } from "react";

interface GIRGameProps {
  selectedGroup: Group | null;
}

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
    isSaving,
    isConfigSaving,
  } = useGirGame(selectedGroup);

  // Configuration mode state (UI-only)
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [tempConfig, setTempConfig] = useState(holeConfig);

  // Sync temp config when hole config changes
  useEffect(() => {
    setTempConfig(holeConfig);
  }, [holeConfig]);

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

  // Configuration mode handlers
  const handleEnterConfigMode = () => {
    setIsConfigMode(true);
    setTempConfig(holeConfig); // Reset temp config to current saved config
  };

  const handleExitConfigMode = () => {
    setIsConfigMode(false);
    setTempConfig(holeConfig); // Reset to saved config
  };

  const handleToggleHoleConfig = (hole: number) => {
    if (!isConfigMode) return;

    const isPenalty = tempConfig.penalty.includes(hole);
    const isBonus = tempConfig.bonus.includes(hole);

    // Cycle: neutral → penalty → bonus → neutral
    if (!isPenalty && !isBonus) {
      // neutral → penalty
      setTempConfig({
        ...tempConfig,
        penalty: [...tempConfig.penalty, hole]
      });
    } else if (isPenalty) {
      // penalty → bonus
      setTempConfig({
        penalty: tempConfig.penalty.filter(h => h !== hole),
        bonus: [...tempConfig.bonus, hole]
      });
    } else if (isBonus) {
      // bonus → neutral
      setTempConfig({
        ...tempConfig,
        bonus: tempConfig.bonus.filter(h => h !== hole)
      });
    }
  };

  const handleSaveHoleConfig = () => {
    saveHoleConfig(tempConfig);
    setIsConfigMode(false);
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

      {/* Configuration Button / Hole Selector Container */}
      <div className="space-y-2">
        {/* Penalty/Bonus Configuration Button */}
        {!isConfigMode && (
          <Button
            onClick={handleEnterConfigMode}
            variant="outline"
            className="w-full border-emerald-500 text-emerald-600 hover:bg-emerald-50"
            data-testid="button-enter-config-mode"
          >
            ⚙️ Penalty / Bonus
          </Button>
        )}

        {/* Hole Selector */}
        <HoleSelector
          selectedHole={selectedHole}
          onHoleSelect={isConfigMode ? handleToggleHoleConfig : (hole) => setSelectedHole(hole)}
          penaltyHoles={isConfigMode ? tempConfig.penalty : holeConfig.penalty}
          bonusHoles={isConfigMode ? tempConfig.bonus : holeConfig.bonus}
        />

        {/* Save Configuration Button (shown in config mode) */}
        {isConfigMode && (
          <div className="flex gap-2">
            <Button
              onClick={handleSaveHoleConfig}
              disabled={isConfigSaving}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              data-testid="button-save-hole-config"
            >
              {isConfigSaving ? 'Saving...' : 'Save Hole Configuration'}
            </Button>
            <Button
              onClick={handleExitConfigMode}
              variant="outline"
              disabled={isConfigSaving}
              data-testid="button-cancel-config-mode"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Config Mode Instructions */}
        {isConfigMode && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
            <div className="font-medium mb-1">⚙️ Configuration Mode</div>
            <div>Click holes to cycle: <span className="font-semibold">Neutral</span> → <span className="font-semibold text-red-600">Penalty</span> → <span className="font-semibold text-blue-600">Bonus</span> → Neutral</div>
          </div>
        )}
      </div>

      {/* GIR Scoring Card - hidden in config mode */}
      {!isConfigMode && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              🏌️ Hole {selectedHole} - GIR Status
            </h3>
            
            {/* Scoring Rules Info */}
            <div className="mb-4 p-3 bg-gray-50 rounded-md text-sm">
              <div className="font-medium text-gray-700 mb-1">Scoring:</div>
              {holeConfig.penalty.includes(selectedHole) ? (
                <div className="text-red-600">❗ Penalty Hole: HIT = +1, MISS = -1</div>
              ) : holeConfig.bonus.includes(selectedHole) ? (
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
      )}

      {/* Payouts Card */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            {payoutMode === 'points' ? 'GIR Points Payouts' : 'GIR Nassau Payouts'}
          </h3>
          
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
                variant={payoutMode === 'nassau' ? 'default' : 'outline'}
                onClick={() => setPayoutMode('nassau')}
                size="sm"
                className="flex-1"
                data-testid="button-gir-mode-nassau"
              >
                Nassau
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
                Nassau Value ($)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={nassauValue}
                onChange={(e) => setNassauValue(e.target.value)}
                placeholder="10.00"
                data-testid="input-gir-nassau-value"
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
          ) : payoutData && payoutData.payouts ? (
            <>
              {/* GIR Payout Amounts per Player */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-800 mb-3">
                  {payoutMode === 'points' ? 'GIR Points Payouts' : 'GIR Nassau Payouts'}
                </h4>
                <div className="space-y-2">
                  {Object.entries(payoutData.payouts)
                    .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
                    .map(([playerId, netAmount]: [string, any]) => {
                      const player = players.find(p => p.id === playerId);
                      if (!player) return null;
                      const isEven = Math.abs(netAmount) < 0.01;
                      
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

              {/* GIR Scores Section - integrated within payouts card */}
              {payoutData.girPoints && (
                <>
                  {/* Points Mode: Show total points */}
                  {payoutMode === 'points' && (
                    <div className="mt-4">
                      <h4 className="text-md font-semibold text-gray-800 mb-3">GIR Points Scores</h4>
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
                    </div>
                  )}

                  {/* Nassau Mode: Show Front/Back/Total breakdown */}
                  {payoutMode === 'nassau' && selectedGirGame.holes && Object.keys(selectedGirGame.holes).length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-md font-semibold text-gray-800 mb-3">GIR Nassau Scores</h4>
                      <div className="space-y-2">
                        {Object.entries(payoutData.girPoints)
                          .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
                          .map(([playerId, totalPoints]: [string, any]) => {
                            const player = players.find(p => p.id === playerId);
                            if (!player) return null;

                            // Calculate Front 9, Back 9 from holes data (mirroring BBB Nassau logic)
                            let front9Points = 0;
                            let back9Points = 0;

                            Object.entries(selectedGirGame.holes || {}).forEach(([hole, holeData]) => {
                              const holeNum = parseInt(hole);
                              if (holeData && typeof holeData === 'object') {
                                const hitGreen = holeData[player.id];
                                if (typeof hitGreen === 'boolean') {
                                  const isPenalty = holeConfig.penalty.includes(holeNum);
                                  const isBonus = holeConfig.bonus.includes(holeNum);
                                  
                                  // Match server-side GIR point calculation logic
                                  let points = 0;
                                  if (isPenalty) {
                                    points = hitGreen ? 1 : -1;
                                  } else if (isBonus) {
                                    points = hitGreen ? 2 : 0;
                                  } else {
                                    points = hitGreen ? 1 : 0;
                                  }

                                  if (holeNum <= 9) {
                                    front9Points += points;
                                  } else {
                                    back9Points += points;
                                  }
                                }
                              }
                            });

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
                                    F{front9Points} | B{back9Points} | T{totalPoints}
                                  </p>
                                  <p className="text-xs text-gray-600">Front | Back | Total</p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* GIR Who Owes Who Section */}
              {payoutData && Array.isArray(payoutData.whoOwesWho) && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-800 mb-3">Who Owes Who</h4>
                  {payoutData.whoOwesWho.length === 0 ? (
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-600">All players are even - no payments needed!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {payoutData.whoOwesWho.map((tx: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                        data-testid={`transaction-${idx}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-sm">
                            <span className="font-medium text-red-600">{tx.fromPlayerName}</span>
                            <span className="text-gray-600"> owes </span>
                            <span className="font-medium text-green-600">{tx.toPlayerName}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-black">${tx.amount.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">Enter values and select a mode to see payouts</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
