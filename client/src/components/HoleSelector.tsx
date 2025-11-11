import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface HoleSelectorProps {
  selectedHole: number;
  onHoleSelect: (hole: number) => void;
  penaltyHoles?: number[];
  bonusHoles?: number[];
  totalHoles?: number;
}

export function HoleSelector({ 
  selectedHole, 
  onHoleSelect, 
  penaltyHoles = [], 
  bonusHoles = [],
  totalHoles = 18 
}: HoleSelectorProps) {
  const isPenaltyHole = (hole: number) => penaltyHoles.includes(hole);
  const isBonusHole = (hole: number) => bonusHoles.includes(hole);
  
  const getHoleClassName = (hole: number) => {
    const baseClass = "p-2 text-sm";
    if (isPenaltyHole(hole)) {
      return `${baseClass} border-2 border-red-500`;
    }
    if (isBonusHole(hole)) {
      return `${baseClass} border-2 border-blue-500`;
    }
    return baseClass;
  };

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Select Hole</h3>
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: totalHoles }, (_, i) => i + 1).map(hole => (
            <Button 
              key={hole}
              variant={selectedHole === hole ? "default" : "outline"}
              onClick={() => onHoleSelect(hole)}
              className={getHoleClassName(hole)}
              data-testid={`button-hole-${hole}`}
            >
              {hole}
            </Button>
          ))}
        </div>
        
        {(penaltyHoles.length > 0 || bonusHoles.length > 0) && (
          <div className="mt-3 flex gap-4 text-xs text-gray-600">
            {penaltyHoles.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-red-500 rounded"></div>
                <span>Penalty Holes</span>
              </div>
            )}
            {bonusHoles.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-blue-500 rounded"></div>
                <span>Bonus Holes</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
