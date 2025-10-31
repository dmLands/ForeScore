import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { CheckCircle, Clock, CreditCard, Users, Calculator, Trophy } from "lucide-react";

// Load Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

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

const SubscribeForm = ({ selectedPlan, onSubscriptionComplete }: { 
  selectedPlan: string; 
  onSubscriptionComplete: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      // For trial subscriptions, we use SetupIntent for payment method collection
      const result = await stripe.confirmSetup({
        elements,
        redirect: 'if_required', // Avoids SecurityError in Replit iframe
      });

      if (result.error) {
        toast({
          title: "Payment Setup Failed",
          description: result.error.message || "Payment setup failed. Please try again.",
          variant: "destructive",
        });
      } else {
        // Payment method setup succeeded - create subscription immediately
        try {
          const setupIntentId = result.setupIntent?.id;
          if (setupIntentId) {
            await apiRequest('POST', '/api/subscription/create-after-setup', {
              setupIntentId
            });
          }
          
          toast({
            title: "Payment Complete!",
            description: "Your subscription is now active. Welcome to ForeScore!",
          });
          onSubscriptionComplete();
        } catch (error) {
          console.error('Subscription creation error after payment:', error);
          toast({
            title: "Payment Complete",
            description: "Your subscription is being activated.",
          });
          onSubscriptionComplete();
        }
      }
    } catch (error) {
      let errorMessage = "An unexpected error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: `Setup failed: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Payment Information</h3>
        <PaymentElement 
          options={{
            fields: {
              billingDetails: {
                address: {
                  country: 'auto',
                  postalCode: 'auto',
                },
              },
            },
          }}
        />
      </div>
      
      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
        disabled={!stripe || isLoading}
        data-testid="button-complete-payment"
      >
        {isLoading ? "Processing..." : "Complete Payment Now"}
      </Button>
    </form>
  );
};

const PlanCard = ({ 
  planKey, 
  plan, 
  isSelected, 
  onSelect, 
  isPopular = false 
}: { 
  planKey: string; 
  plan: SubscriptionPlan; 
  isSelected: boolean; 
  onSelect: (planKey: string) => void;
  isPopular?: boolean;
}) => {
  const monthlyPrice = plan.amount / 100;
  const savings = planKey === 'annual' ? Math.round(((1.99 * 12) - monthlyPrice) * 100) / 100 : 0;

  return (
    <Card 
      className={`relative cursor-pointer transition-all ${
        isSelected 
          ? 'ring-2 ring-green-500 border-green-500' 
          : 'hover:border-green-300'
      }`}
      onClick={() => onSelect(planKey)}
    >
      {isPopular && (
        <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-green-600 px-3 py-1 text-center whitespace-nowrap min-w-max">
          Most Popular
        </Badge>
      )}
      
      <CardHeader className="text-center pb-3">
        <CardTitle className="text-lg">
          {plan.interval === 'month' ? 'Monthly' : 'Annual'}
        </CardTitle>
        <CardDescription>
          <span className="text-2xl font-bold text-gray-900">
            ${monthlyPrice.toFixed(2)}
          </span>
          <span className="text-gray-600 text-sm block">
            /{plan.interval === 'month' ? 'month' : 'year'}
          </span>
        </CardDescription>
        {savings > 0 && (
          <div className="flex justify-center mt-1">
            <Badge variant="secondary" className="text-xs px-2 py-1 min-w-max">
              Save 30%
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="text-center">
          <div className="text-xs text-gray-500">
            All features included
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Subscribe() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Initialize plan and auto-flow from URL parameter BEFORE first render
  const [selectedPlan, setSelectedPlan] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    return (planParam === 'monthly' || planParam === 'annual') ? planParam : 'annual';
  });
  
  const [isAutoFlow] = useState<boolean>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    return planParam === 'monthly' || planParam === 'annual';
  });
  
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [subscriptionCreated, setSubscriptionCreated] = useState(false);

  // Fetch subscription plans
  const { data: plans } = useQuery<SubscriptionPlans>({
    queryKey: ['/api/subscription/plans'],
  });

  // Create subscription mutation
  const createSubscriptionMutation = useMutation({
    mutationFn: async (planKey: string) => {
      const response = await apiRequest('POST', '/api/subscription/create', { planKey });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setSubscriptionCreated(true);
      } else {
        toast({
          title: "Setup Error",
          description: "Payment setup failed. Please try again or contact support.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Subscription Error",
        description: error.message || "Failed to start subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-trigger payment flow for users coming from welcome-trial page
  useEffect(() => {
    if (isAutoFlow && !subscriptionCreated && !createSubscriptionMutation.isPending) {
      createSubscriptionMutation.mutate(selectedPlan);
    }
  }, [isAutoFlow]);

  const handlePlanSelect = async () => {
    if (!selectedPlan) return;
    createSubscriptionMutation.mutate(selectedPlan);
  };

  const handleSubscriptionComplete = () => {
    // Give webhook time to create subscription and update user status
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Add another delay before redirect to let queries complete
      setTimeout(() => {
        setLocation('/');
      }, 500);
    }, 3000); // Longer delay for webhook processing
  };

  // Show loading state when auto-flow is processing
  if (isAutoFlow && !subscriptionCreated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
              <CardTitle className="text-2xl">Setting Up Your Subscription</CardTitle>
              <CardDescription>
                Preparing your payment form...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // Show payment form when ready
  if (subscriptionCreated && clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CreditCard className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Complete Your Setup</CardTitle>
              <CardDescription>
                Add your payment to begin your recurring subscription.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Elements 
                stripe={stripePromise} 
                options={{ 
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#059669',
                    },
                  },
                }}
              >
                <SubscribeForm 
                  selectedPlan={selectedPlan} 
                  onSubscriptionComplete={handleSubscriptionComplete}
                />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Manual plan selection flow (when no plan parameter in URL)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">🏌️ Join Forescore</h1>
            <p className="mt-2 text-lg text-gray-600">
              You hit the shots, we do the math
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Pricing Plans - Side by side, smaller tiles */}
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-6">
          {plans && (
            <>
              <PlanCard
                planKey="monthly"
                plan={plans.monthly}
                isSelected={selectedPlan === 'monthly'}
                onSelect={setSelectedPlan}
              />
              <PlanCard
                planKey="annual"
                plan={plans.annual}
                isSelected={selectedPlan === 'annual'}
                onSelect={setSelectedPlan}
                isPopular={true}
              />
            </>
          )}
        </div>

        {/* CTA Button - Now below pricing */}
        <div className="text-center mb-8">
          <Button
            onClick={handlePlanSelect}
            disabled={createSubscriptionMutation.isPending}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 text-lg w-full max-w-sm"
            data-testid="button-select-plan"
          >
            {createSubscriptionMutation.isPending 
              ? "Processing..." 
              : "Proceed to Payment"
            }
          </Button>
          
          <p className="mt-3 text-sm text-gray-500">
            No commitment • Cancel anytime • Secure payment by Stripe
          </p>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <button
                onClick={() => setLocation('/login')}
                className="text-green-600 hover:text-green-700 font-medium underline"
                data-testid="link-existing-login"
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>

        {/* Features Section - Now last */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Group Activation</h3>
            <p className="text-sm text-gray-600">Create your regular golf groups and save them for later</p>
          </div>
          
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3">
              <Calculator className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Smart Calculations</h3>
            <p className="text-sm text-gray-600">Advanced payout algorithms with optimal transaction minimization</p>
          </div>
          
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3">
              <Trophy className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Live Tracking</h3>
            <p className="text-sm text-gray-600">Real-time score tracking and leaderboards for competitive play</p>
          </div>
        </div>
      </div>
    </div>
  );
}