import { Button } from "@/components/ui/button";

interface Player {
  id: string;
  name: string;
  color?: string;
}

interface PlayerActionGridProps {
  players: Player[];
  selectedValues: Record<string, boolean | string>;
  onPlayerSelect: (playerId: string, value: boolean | string) => void;
  options: Array<{ label: string; value: boolean | string }>;
  testIdPrefix?: string;
}

export function PlayerActionGrid({ 
  players, 
  selectedValues, 
  onPlayerSelect, 
  options,
  testIdPrefix = 'player-action'
}: PlayerActionGridProps) {
  return (
    <div className="space-y-3">
      {players.map(player => (
        <div key={player.id} className="flex items-center justify-between">
          <span 
            className="font-medium text-gray-700"
            style={{ color: player.color }}
          >
            {player.name}
          </span>
          <div className="flex gap-2">
            {options.map(option => {
              const isSelected = selectedValues[player.id] === option.value;
              return (
                <Button
                  key={`${player.id}-${option.label}`}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => onPlayerSelect(player.id, option.value)}
                  className={`px-4 py-2 text-sm min-w-[60px] ${
                    isSelected ? 'bg-emerald-500 hover:bg-emerald-600' : ''
                  }`}
                  data-testid={`${testIdPrefix}-${player.name.toLowerCase()}-${option.label.toLowerCase()}`}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
