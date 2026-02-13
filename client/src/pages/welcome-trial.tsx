import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
              <h4 className="font-semibold text-gray-900">Monthly</h4>
              <p className="text-sm text-gray-600">
                {monthlyProduct?.price ? `${monthlyProduct.price}/month` : '$1.99/month'}
              </p>
              <p className="text-xs text-emerald-600 font-medium mt-1">7-day free trial</p>
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
              <h4 className="font-semibold text-gray-900">Annual</h4>
              <p className="text-sm text-gray-600">
                {annualProduct?.price ? `${annualProduct.price}/year` : '$17.99/year'}
              </p>
              <p className="text-xs text-emerald-600 font-medium mt-1">7-day free trial</p>
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
              ? "Choose your plan to start your 7-day free trial"
              : "Your 7-day free trial has started"
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
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
                <span className="text-sm text-gray-700">
                  {(isIOS || isNative) ? "Free for 7 days" : "No credit card required for 7 days"}
                </span>
              </div>
            </div>
          </div>

          {(isIOS || isNative) ? (
            <IOSWelcomePlanPicker />
          ) : (
            <>
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
