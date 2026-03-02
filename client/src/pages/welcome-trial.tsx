import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLocation } from "wouter";
import { CheckCircle, Trophy, Users, Calculator, Crown, Loader2, RefreshCw } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePlatform } from "@/lib/platform";
import { useAppleIAP } from "@/hooks/useAppleIAP";
import { useAuth } from "@/hooks/useAuth";

interface SubscriptionPlan {
  priceId: string;
  name: string;
  amount: number;
  interval: 'month' | 'year';
  trialDays: number;
}

interface SubscriptionPlans {
  monthly: SubscriptionPlan;
  annual: SubscriptionPlan;
}

function IOSWelcomePlanPicker() {
  const [, setLocation] = useLocation();
  const { hasActiveSubscription } = useAuth();
  const {
    available,
    products,
    isLoading,
    isPurchasing,
    isRestoring,
    error,
    loadProducts,
    purchase,
    restore,
  } = useAppleIAP();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    if (available) {
      loadProducts();
    }
  }, [available, loadProducts]);

  useEffect(() => {
    if (hasActiveSubscription) {
      setLocation('/');
    }
  }, [hasActiveSubscription, setLocation]);

  if (!available) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800 text-center">
            In-app purchases are loading. Please wait a moment...
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm text-gray-500">Loading subscription plans...</p>
      </div>
    );
  }

  const monthlyProduct = products.find(p => p.productId === 'forescore_monthly');
  const annualProduct = products.find(p => p.productId === 'forescore_annual');

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <button
          onClick={() => setSelectedPlan('forescore_monthly')}
          disabled={isPurchasing}
          className={`w-full text-left p-4 rounded-lg border-2 transition-all relative ${
            selectedPlan === 'forescore_monthly'
              ? 'border-emerald-500 bg-emerald-50 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300'
          } ${isPurchasing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-gray-900">Monthly</h4>
              <p className="text-sm font-semibold text-gray-900">
                {monthlyProduct?.price ? `${monthlyProduct.price}/month` : '$1.99/month'}
              </p>
              <p className="text-xs text-gray-400 mt-1">7-day free trial, then {monthlyProduct?.price ? `${monthlyProduct.price}/month` : '$1.99/month'}</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              selectedPlan === 'forescore_monthly' ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
            }`}>
              {selectedPlan === 'forescore_monthly' && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
          </div>
        </button>

        <button
          onClick={() => setSelectedPlan('forescore_annual')}
          disabled={isPurchasing}
          className={`w-full text-left p-4 rounded-lg border-2 transition-all relative ${
            selectedPlan === 'forescore_annual'
              ? 'border-emerald-500 bg-emerald-50 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300'
          } ${isPurchasing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span className="absolute -top-2.5 right-3 bg-emerald-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
            Best Value
          </span>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-gray-900">Annual</h4>
              <p className="text-sm font-semibold text-gray-900">
                {annualProduct?.price ? `${annualProduct.price}/year` : '$17.99/year'}
              </p>
              <p className="text-xs text-gray-400 mt-1">7-day free trial, then {annualProduct?.price ? `${annualProduct.price}/year` : '$17.99/year'}</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              selectedPlan === 'forescore_annual' ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
            }`}>
              {selectedPlan === 'forescore_annual' && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
          </div>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}


      <Button
        onClick={async () => {
          if (!selectedPlan) return;
          const success = await purchase(selectedPlan);
          if (success) {
            setLocation('/');
          }
        }}
        disabled={!selectedPlan || isPurchasing}
        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-12 text-base"
      >
        {isPurchasing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Crown className="w-4 h-4 mr-2" />
            Start Free Trial
          </>
        )}
      </Button>

      <Button
        onClick={restore}
        disabled={isRestoring || isPurchasing}
        variant="outline"
        className="w-full"
      >
        {isRestoring ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Restoring...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Restore Previous Purchase
          </>
        )}
      </Button>

      <p className="text-xs text-center text-gray-500">
        Payment will be charged to your Apple ID account after the free trial ends.
        Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
      </p>
    </div>
  );
}

export default function WelcomeTrial() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isIOS, isNative } = usePlatform();

  const { data: plans } = useQuery<SubscriptionPlans>({
    queryKey: ['/api/subscription/plans'],
    enabled: !(isIOS || isNative),
  });

  const startTrialMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/trial/start');
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Trial Started!",
        description: `Your 7-day free trial is now active. Enjoy full access to ForeScore!`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      setTimeout(() => {
        setLocation('/');
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start trial",
        description: error.message || "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const handleStartTrial = () => {
    startTrialMutation.mutate();
  };

  const handleSubscribe = (planKey: 'monthly' | 'annual') => {
    setLocation(`/subscribe?plan=${planKey}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <img 
              src="/forescore-logo.png" 
              alt="ForeScore Logo" 
              className="h-16 w-16"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            Welcome to ForeScore!
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 mt-2">
            {(isIOS || isNative) 
              ? "Choose your plan to unlock ForeScore and all of its features"
              : "Your 7-day free trial has started"
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {(isIOS || isNative) ? (
            <>
              <IOSWelcomePlanPicker />

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="grid gap-3">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Track unlimited golf games and betting side games for your groups</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Automatically calculate payouts for all players with minimal transactions</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Features are available only with a subscription</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-gray-800">What do I get with my subscription?</h3>
                <Accordion type="multiple" className="space-y-2">

                  <AccordionItem value="gir" className="border rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
                      <span className="text-sm font-semibold text-gray-800">🚩 Greens in Regulation Rules</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-4 pb-4 pt-0 space-y-4 text-gray-600">
                        <p className="leading-relaxed text-sm">
                          Greens in Regulation (GIR) is a scoring game where players earn points by hitting the green in the regulation number of strokes, creating competitive pressure on approach shots.
                        </p>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800 mb-2">How GIR Is Scored</h4>
                          <div className="ml-2 space-y-2">
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xs font-medium text-gray-800 mb-1">✅ Green in Regulation (Hit)</p>
                              <p className="text-xs text-gray-600">Your ball is on the green in regulation strokes: Par 3 = 1 stroke, Par 4 = 2 strokes, Par 5 = 3 strokes. Each hit earns 1 point.</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xs font-medium text-gray-800 mb-1">❌ Missed GIR</p>
                              <p className="text-xs text-gray-600">Your ball is not on the green within regulation strokes. Each miss earns 0 points.</p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800 mb-2">2 Payout Systems — Nassau and Points</h4>
                          <div className="space-y-2">
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xs font-medium text-gray-800 mb-1">Points System</p>
                              <ul className="space-y-1 text-xs text-gray-700">
                                <li>• Each player pays/receives money based on point differences</li>
                                <li>• Players with more GIRs receive from players with fewer GIRs</li>
                              </ul>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xs font-medium text-gray-800 mb-1">Nassau System (Front/Back/Total)</p>
                              <ul className="space-y-1 text-xs text-gray-700">
                                <li>• Winners determined by most GIRs across Front 9, Back 9, and Total 18</li>
                                <li>• Winners receive Nassau Value for each category won</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="bbb" className="border rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
                      <span className="text-sm font-semibold text-gray-800">🎲 Bingo Bango Bongo Rules</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-4 pb-4 pt-0 space-y-4 text-gray-600">
                        <p className="leading-relaxed text-sm">
                          Bingo Bango Bongo is a fun points-based game where players earn points by achieving three different objectives on each hole.
                        </p>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800 mb-2">How Points Are Awarded</h4>
                          <div className="ml-2 space-y-2">
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xs font-medium text-gray-800 mb-1">🎯 Bingo — First on Green</p>
                              <p className="text-xs text-gray-600">The first player to hit their ball on the green, regardless of green-in-regulation.</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xs font-medium text-gray-800 mb-1">🎯 Bango — Closest to Pin</p>
                              <p className="text-xs text-gray-600">The player whose ball comes to rest closest to the hole before any other player holes out.</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xs font-medium text-gray-800 mb-1">🎯 Bongo — First in Hole</p>
                              <p className="text-xs text-gray-600">The first person to hole out from anywhere on the course.</p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800 mb-2">2 Payout Systems — Points and Nassau</h4>
                          <div className="space-y-2">
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xs font-medium text-gray-800 mb-1">Points System</p>
                              <ul className="space-y-1 text-xs text-gray-700">
                                <li>• Each player pays/receives money based on point differences</li>
                                <li>• Higher-scoring players receive from lower-scoring players</li>
                              </ul>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xs font-medium text-gray-800 mb-1">Nassau System (Front/Back/Total)</p>
                              <ul className="space-y-1 text-xs text-gray-700">
                                <li>• Winners determined by highest point count across Front 9, Back 9, and Total 18</li>
                                <li>• Winners receive Nassau Value for each category won</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="2916" className="border rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
                      <span className="text-sm font-semibold text-gray-800">👑 Sacramento Game Rules</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-4 pb-4 pt-0 space-y-4 text-gray-600">
                        <p className="leading-relaxed text-sm">
                          The Sacramento (916) Game is a stroke-based competition where players earn points based on their performance relative to other players on each hole.
                        </p>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800 mb-2">How Points Are Awarded</h4>
                          <div className="ml-2 space-y-2 text-xs">
                            <div>
                              <p className="font-medium text-gray-800">2 Players:</p>
                              <ul className="ml-3 space-y-0.5 text-gray-600">
                                <li>• Fewer strokes: 2 points</li>
                                <li>• More strokes: 0 points &nbsp;• Tie: 1 point each</li>
                              </ul>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">3 Players:</p>
                              <ul className="ml-3 space-y-0.5 text-gray-600">
                                <li>• Fewest strokes: 5 pts &nbsp;• Middle: 3 pts &nbsp;• Most: 1 pt</li>
                              </ul>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">4 Players:</p>
                              <ul className="ml-3 space-y-0.5 text-gray-600">
                                <li>• 1st: 7 pts &nbsp;• 2nd: 5 pts &nbsp;• 3rd: 3 pts &nbsp;• 4th: 1 pt</li>
                                <li>• Ties: Points distributed proportionally</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800 mb-2">3 Payout Systems — Points, Nassau, Both</h4>
                          <div className="space-y-2">
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xs font-medium text-gray-800 mb-1">Points System</p>
                              <p className="text-xs text-gray-600">Players pay/receive money based on point differences. Set Point Value to calculate amounts.</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xs font-medium text-gray-800 mb-1">Nassau System (Front/Back/Total)</p>
                              <p className="text-xs text-gray-600">Winners determined by lowest stroke count across Front 9, Back 9, and Total 18. Winners receive Nassau Value for each category won.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="cards" className="border rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
                      <span className="text-sm font-semibold text-gray-800">🃏 Card Game Rules</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-4 pb-4 pt-0 space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800 mb-1">1. Setup</h4>
                          <p className="text-xs text-gray-600 ml-4">Set the monetary value for each card type before starting the game.</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800 mb-1">2. Drawing Cards</h4>
                          <p className="text-xs text-gray-600 ml-4">Players are assigned cards when they hit a shot corresponding to one of the card types below. Cards are re-assigned as additional players perform the same mishap. Each card can only be held by one player at a time.</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800 mb-2">3. Card Types</h4>
                          <div className="space-y-2 ml-4">
                            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border">
                              <span className="text-xl">🐪</span>
                              <div>
                                <p className="text-xs font-medium text-gray-800">Camel</p>
                                <p className="text-xs text-gray-600">Land in a sand trap</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border">
                              <span className="text-xl">🐟</span>
                              <div>
                                <p className="text-xs font-medium text-gray-800">Fish</p>
                                <p className="text-xs text-gray-600">Ball in the water</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border">
                              <span className="text-xl">🐦</span>
                              <div>
                                <p className="text-xs font-medium text-gray-800">Roadrunner</p>
                                <p className="text-xs text-gray-600">Hit the cart path</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border">
                              <span className="text-xl">👻</span>
                              <div>
                                <p className="text-xs font-medium text-gray-800">Ghost</p>
                                <p className="text-xs text-gray-600">Lost ball or out of bounds</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border">
                              <span className="text-xl">🦨</span>
                              <div>
                                <p className="text-xs font-medium text-gray-800">Skunk</p>
                                <p className="text-xs text-gray-600">Double bogey or worse</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border">
                              <span className="text-xl">🐍</span>
                              <div>
                                <p className="text-xs font-medium text-gray-800">Snake</p>
                                <p className="text-xs text-gray-600">Three or more putts</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border">
                              <span className="text-xl">🌲</span>
                              <div>
                                <p className="text-xs font-medium text-gray-800">Yeti</p>
                                <p className="text-xs text-gray-600">Hit a tree</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800 mb-1">4. Custom Cards</h4>
                          <p className="text-xs text-gray-600 ml-4">Create your own penalty cards with custom names, emojis, and values to match your group's specific rules. Examples: Whiff, Shank, Hit a House.</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800 mb-1">5. Winning</h4>
                          <p className="text-xs text-gray-600 ml-4">At the end of the round, players pay out based on the cards they hold.</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                </Accordion>
              </div>
            </>
          ) : (
            <>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="grid gap-3">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Full access to all premium features</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Create unlimited groups and games</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Smart payout calculations with minimal transactions</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">No credit card required for 7 days</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleStartTrial}
                disabled={startTrialMutation.isPending}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-6 text-lg font-semibold"
                data-testid="button-start-trial"
              >
                {startTrialMutation.isPending ? "Starting Trial..." : "Start Using ForeScore Now"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">
                    Or subscribe now and save
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {plans && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleSubscribe('monthly')}
                      className="flex flex-col h-auto py-4 space-y-2 border-2 hover:border-green-500 hover:bg-green-50"
                      data-testid="button-monthly"
                    >
                      <span className="text-sm font-medium text-gray-700">Monthly</span>
                      <span className="text-2xl font-bold text-gray-900">
                        ${(plans.monthly.amount / 100).toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">/month</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleSubscribe('annual')}
                      className="flex flex-col h-auto py-4 space-y-2 border-2 hover:border-green-500 hover:bg-green-50 relative"
                      data-testid="button-annual"
                    >
                      <div className="absolute -top-2 -right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                        Save 30%
                      </div>
                      <span className="text-sm font-medium text-gray-700">Annual</span>
                      <span className="text-2xl font-bold text-gray-900">
                        ${(plans.annual.amount / 100).toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">/year</span>
                    </Button>
                  </>
                )}
              </div>
            </>
          )}

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="mx-auto w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-xs text-gray-600">Group Management</p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <Calculator className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-xs text-gray-600">Smart Calculations</p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <Trophy className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-xs text-gray-600">Live Tracking</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
