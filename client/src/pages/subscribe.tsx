import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { CheckCircle, Clock, CreditCard, Users, Calculator, Trophy, Eye, EyeOff, Lock } from "lucide-react";
import { usePlatform, canShowPayments } from "@/lib/platform";
import { IOSSubscriptionPrompt } from "@/components/IOSSubscriptionPrompt";

// Only initialize Stripe on web platform (not iOS/native)
let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => {
  if (!stripePromise && canShowPayments()) {
    const key = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    if (key) {
      stripePromise = loadStripe(key);
    }
  }
  return stripePromise;
};

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

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isQuickSignup: boolean | null;
}

const PasswordSetupForm = ({ 
  user, 
  onComplete 
}: { 
  user: User; 
  onComplete: () => void;
}) => {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const convertAccountMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; password: string }) => {
      const response = await apiRequest('POST', '/api/auth/convert-account', data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/user'], data.user);
      toast({
        title: "Account secured!",
        description: "Your password has been set. Proceeding to payment...",
      });
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (!password || password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    convertAccountMutation.mutate({ firstName: firstName.trim(), lastName: lastName.trim(), password });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="firstName" className="text-sm">First Name</Label>
          <Input
            id="firstName"
            placeholder="John"
            value={firstName}
            onChange={(e) => { setFirstName(e.target.value); setErrors(prev => ({ ...prev, firstName: "" })); }}
            className={errors.firstName ? "border-red-500" : ""}
            data-testid="input-firstname"
          />
          {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="lastName" className="text-sm">Last Name</Label>
          <Input
            id="lastName"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => { setLastName(e.target.value); setErrors(prev => ({ ...prev, lastName: "" })); }}
            className={errors.lastName ? "border-red-500" : ""}
            data-testid="input-lastname"
          />
          {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="password" className="text-sm">Create Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Min 6 characters"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: "" })); }}
            className={errors.password ? "border-red-500 pr-10" : "pr-10"}
            data-testid="input-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            data-testid="button-toggle-password"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setErrors(prev => ({ ...prev, confirmPassword: "" })); }}
            className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
            data-testid="input-confirm-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            data-testid="button-toggle-confirm-password"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
      </div>

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
        disabled={convertAccountMutation.isPending}
        data-testid="button-set-password"
      >
        {convertAccountMutation.isPending ? "Saving..." : "Continue to Payment"}
      </Button>
    </form>
  );
};

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
      const result = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });

      if (result.error) {
        toast({
          title: "Payment Setup Failed",
          description: result.error.message || "Payment setup failed. Please try again.",
          variant: "destructive",
        });
      } else {
        try {
          const setupIntentId = result.setupIntent?.id;
          if (setupIntentId) {
            const response = await apiRequest('POST', '/api/subscription/create-after-setup', {
              setupIntentId
            });
            const data = await response.json();
            
            await queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
            await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            
            toast({
              title: "Payment Complete!",
              description: "Your subscription is now active. Welcome to ForeScore!",
            });
            
            onSubscriptionComplete();
          }
        } catch (error) {
          console.error('Subscription creation error after payment:', error);
          toast({
            title: "Error",
            description: "Failed to activate subscription. Please contact support.",
            variant: "destructive",
          });
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
  const { isIOS, isNative } = usePlatform();

  // On iOS/native, show the web redirect prompt instead of Stripe
  if (isIOS || isNative) {
    return (
      <IOSSubscriptionPrompt 
        title="Subscribe to ForeScore"
        description="Set up your subscription through our website for the best experience."
      />
    );
  }
  
  const [selectedPlan, setSelectedPlan] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    return (planParam === 'monthly' || planParam === 'annual') ? planParam : 'annual';
  });
  
  const [isAutoFlow, setIsAutoFlow] = useState<boolean>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    return planParam === 'monthly' || planParam === 'annual';
  });
  
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [subscriptionCreated, setSubscriptionCreated] = useState(false);
  const [autoFlowError, setAutoFlowError] = useState<string | null>(null);
  const [passwordSetupComplete, setPasswordSetupComplete] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  const { data: plans } = useQuery<SubscriptionPlans>({
    queryKey: ['/api/subscription/plans'],
  });

  const isQuickSignupUser = user?.isQuickSignup && !user?.firstName;

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
      const errorMessage = error.message || "Failed to start subscription. Please try again.";
      setAutoFlowError(errorMessage);
      toast({
        title: "Subscription Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (isAutoFlow && !subscriptionCreated && !createSubscriptionMutation.isPending) {
      if (isQuickSignupUser && !passwordSetupComplete) {
        return;
      }
      createSubscriptionMutation.mutate(selectedPlan);
    }
  }, [isAutoFlow, passwordSetupComplete, isQuickSignupUser]);

  const handlePlanSelect = async () => {
    if (!selectedPlan) return;
    createSubscriptionMutation.mutate(selectedPlan);
  };

  const handleSubscriptionComplete = () => {
    setLocation('/');
  };

  const handlePasswordComplete = () => {
    setPasswordSetupComplete(true);
    createSubscriptionMutation.mutate(selectedPlan);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
              <CardTitle className="text-2xl">Loading...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (isQuickSignupUser && !passwordSetupComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-emerald-600" />
              </div>
              <CardTitle className="text-2xl">Secure Your Account</CardTitle>
              <CardDescription>
                Before subscribing, let's set up your password so you can always access your account.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <PasswordSetupForm user={user} onComplete={handlePasswordComplete} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isAutoFlow && !subscriptionCreated) {
    if (autoFlowError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl">⚠️</span>
                </div>
                <CardTitle className="text-2xl">Setup Failed</CardTitle>
                <CardDescription className="text-red-600">
                  {autoFlowError}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => {
                    setAutoFlowError(null);
                    createSubscriptionMutation.mutate(selectedPlan);
                  }}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  disabled={createSubscriptionMutation.isPending}
                  data-testid="button-retry-subscription"
                >
                  {createSubscriptionMutation.isPending ? "Retrying..." : "Try Again"}
                </Button>
                <Button
                  onClick={() => setIsAutoFlow(false)}
                  variant="outline"
                  className="w-full"
                  data-testid="button-back-to-plans"
                >
                  Back to Plan Selection
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
    
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
                stripe={getStripe()} 
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

  return (
    <div className="min-h-screen bg-gray-50">
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
