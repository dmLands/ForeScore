import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Play, Users, Gamepad2, Trophy, Hash, Dice6 } from "lucide-react";

interface TutorialStep {
  id: number;
  title: string;
  content: string;
  visual?: React.ReactNode;
  tip?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: "Welcome to ForeScore!",
    content: "ForeScore adds fun competition to your golf rounds with three exciting game options! Play Bingo Bango Bongo for hole-by-hole excitement, try the 2/9/16 points system for stroke-based competition, or enjoy the Card penalty game for laughs when shots go wrong. All games make every hole more engaging!",
    visual: (
      <div className="text-center p-6 bg-gray-50 rounded-lg border">
        <div className="text-6xl mb-4">⛳</div>
        <h3 className="text-xl font-bold text-gray-800">ForeScore</h3>
        <p className="text-gray-600">Three Golf Competition Games</p>
      </div>
    ),
  },
  {
    id: 2,
    title: "Create Your Game and Group",
    content: "Begin by creating a new game, which will prompt you to either create a new group or import an existing one. Each player gets a unique color for easy identification throughout all games.",
    visual: (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">J</div>
          <span className="font-medium">John</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">S</div>
          <span className="font-medium">Sarah</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
          <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold">M</div>
          <span className="font-medium">Mike</span>
        </div>
      </div>
    ),
    tip: "You can create multiple games per group and run all three games simultaneously for maximum competition!"
  },
  {
    id: 3,
    title: "Points-Based Games: BBB and 2/9/16",
    content: "ForeScore includes two exciting points-based competitions! Bingo Bango Bongo awards points for achieving objectives on each hole (Bingo-first on green, Bango-closest to pin, Bongo-first in hole), while 2/9/16 is stroke-based competition. Both offer 'Points' and 'Nassau' payout systems that run simultaneously!",
    visual: (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-4 bg-gray-50 rounded-lg border">
            <Dice6 className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="font-medium text-gray-800">BBB Game</p>
            <p className="text-sm text-gray-600">Hole objectives</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg border">
            <Hash className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="font-medium text-gray-800">2/9/16 Game</p>
            <p className="text-sm text-gray-600">Stroke competition</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-100 p-2 rounded text-center border">
            <div className="font-bold text-gray-800">Points</div>
            <div className="text-gray-600">Point differences</div>
          </div>
          <div className="bg-gray-100 p-2 rounded text-center border">
            <div className="font-bold text-gray-800">Nassau</div>
            <div className="text-gray-600">Front/Back/Total winners</div>
          </div>
        </div>
      </div>
    ),
    tip: "Both games offer the same payout systems - check the Payouts tab to see all calculations side by side!"
  },
  {
    id: 4,
    title: "Understanding Penalty Cards",
    content: "There are 7 built-in penalty cards, each representing common golf mishaps. You can also create custom cards with your own names, emojis, and values - they'll appear as editable fields in the Card Values section.",
    visual: (
      <div className="grid grid-cols-2 gap-2">
        <Badge className="bg-gray-100 text-gray-800 border-gray-200 justify-center py-2">
          🐪 Camel - $2
        </Badge>
        <Badge className="bg-gray-100 text-gray-800 border-gray-200 justify-center py-2">
          🐟 Fish - $2
        </Badge>
        <Badge className="bg-gray-100 text-gray-800 border-gray-200 justify-center py-2">
          🐦 Roadrunner - $2
        </Badge>
        <Badge className="bg-gray-100 text-gray-800 border-gray-200 justify-center py-2">
          👻 Ghost - $2
        </Badge>
        <Badge className="bg-gray-100 text-gray-800 border-gray-200 justify-center py-2">
          🦨 Skunk - $2
        </Badge>
        <Badge className="bg-gray-100 text-gray-800 border-gray-200 justify-center py-2">
          🐍 Snake - $2
        </Badge>
      </div>
    ),
    tip: "Camel = sand trap, Fish = water, Roadrunner = cart path, Ghost = out of bounds, Skunk = double bogey, Snake = three putt"
  },
  {
    id: 5,
    title: "Playing the Card Game",
    content: "During your golf round, when someone gets a penalty, go to the Cards tab and assign them the appropriate card. Cards can be reassigned between players throughout the round - strategy is key!",
    visual: (
      <div className="space-y-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg border">
          <Trophy className="h-8 w-8 text-gray-600 mx-auto mb-2" />
          <p className="font-medium text-gray-800">Select a card type</p>
          <p className="text-sm text-gray-600">Choose which penalty occurred</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg border">
          <Users className="h-8 w-8 text-gray-600 mx-auto mb-2" />
          <p className="font-medium text-gray-800">Assign to player</p>
          <p className="text-sm text-gray-600">Tap the player who gets the card</p>
        </div>
      </div>
    ),
    tip: "Cards can be traded between players! Use strategy to minimize your final total."
  },
  {
    id: 6,
    title: "Tracking Scores",
    content: "The Payouts tab shows each player's totals and money paid/received for both games. Use 'Who Owes Who' to see direct payments between players, and check game history to see all assignments throughout the round.",
    visual: (
      <div className="space-y-3">
        <div className="p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">J</div>
              <span className="font-medium">John</span>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-800">$3.00</p>
              <p className="text-xs text-gray-600">Receives</p>
            </div>
          </div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border">
          <div className="text-sm">
            <span className="font-medium text-gray-800">Sarah</span>
            <span className="text-gray-600"> owes </span>
            <span className="font-medium text-gray-800">John</span>
            <span className="ml-2 font-bold text-gray-800">$3.00</span>
          </div>
        </div>
      </div>
    ),
    tip: "Check the Payouts tab to see all money calculations for both games!"
  },
  {
    id: 7,
    title: "Ready to Enhance Your Golf Round!",
    content: "You're all set! Create your first group and add excitement to your golf round with ForeScore's three game options. Whether you want hole-by-hole objectives with BBB, stroke-based competition with 2/9/16, or penalty-based laughs with Cards, these games will make every hole more engaging!",
    visual: (
      <div className="text-center p-6 bg-gray-50 rounded-lg border">
        <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-800 mb-2">Enjoy Your Round!</h3>
        <p className="text-gray-600">Make every hole more fun</p>
        <div className="flex justify-center gap-4 mt-4">
          <div className="text-2xl">🎲</div>
          <div className="text-2xl">#</div>
          <div className="text-2xl">🐪</div>
        </div>
      </div>
    ),
    tip: "Pro tip: All three games can run simultaneously to add multiple layers of competition to your round!"
  }
];

export function Tutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isStarted, setIsStarted] = useState(false);

  const currentTutorialStep = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isFirstStep = currentStep === 0;

  if (!isStarted) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="text-6xl mb-4">🎓</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Learn ForeScore</h2>
              <p className="text-gray-600">
                New to ForeScore? Learn how to add exciting competition to your golf rounds with two fun game options!
              </p>
            </div>
            
            <div className="space-y-4">
              <Button 
                onClick={() => setIsStarted(true)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 text-lg"
              >
                <Play className="mr-2 h-5 w-5" />
                Start Tutorial
              </Button>
              
              <div className="text-sm text-gray-500">
                Takes about 3 minutes • {tutorialSteps.length} steps
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card>
        <CardContent className="p-6">
          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                Step {currentStep + 1} of {tutorialSteps.length}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(((currentStep + 1) / tutorialSteps.length) * 100)}% complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Tutorial content */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-3">
                {currentTutorialStep.title}
              </h2>
              <p className="text-gray-600 leading-relaxed">
                {currentTutorialStep.content}
              </p>
            </div>

            {/* Visual component */}
            {currentTutorialStep.visual && (
              <div className="my-6">
                {currentTutorialStep.visual}
              </div>
            )}

            {/* Tip */}
            {currentTutorialStep.tip && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">💡</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800 mb-1">Pro Tip</h4>
                    <p className="text-sm text-blue-700">{currentTutorialStep.tip}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            {/* Navigation dots */}
            <div className="flex items-center justify-center gap-2 mb-4">
              {tutorialSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between">
              <Button
                onClick={() => setCurrentStep(currentStep - 1)}
                variant="outline"
                disabled={isFirstStep}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              {isLastStep ? (
                <Button
                  onClick={() => {
                    setIsStarted(false);
                    setCurrentStep(0);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  Finish Tutorial
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}