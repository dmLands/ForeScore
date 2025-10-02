import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { CheckCircle, Trophy, Users, Calculator } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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

export default function WelcomeTrial() {
  const [, setLocation] = useLocation();

  // Fetch subscription plans for pricing display
  const { data: plans } = useQuery<SubscriptionPlans>({
    queryKey: ['/api/subscription/plans'],
  });

  const handleStartTrial = () => {
    setLocation('/');
  };

  const handleSubscribe = (planKey: 'monthly' | 'annual') => {
    // Navigate to subscribe page with selected plan
    setLocation(`/subscribe?plan=${planKey}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center text-3xl text-white shadow-lg">
              ⛳
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            Welcome to ForeScore!
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 mt-2">
            Your 7-day free trial has started
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Features List */}
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

          {/* Primary CTA */}
          <Button
            onClick={handleStartTrial}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-6 text-lg font-semibold"
            data-testid="button-start-trial"
          >
            Start Using ForeScore Now
          </Button>

          {/* Divider */}
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

          {/* Subscription Options */}
          <div className="grid grid-cols-2 gap-4">
            {plans && (
              <>
                {/* Monthly Plan */}
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

                {/* Annual Plan */}
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

          {/* Feature Icons */}
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
