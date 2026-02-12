import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Smartphone, ArrowLeft, Crown, Loader2, RefreshCw } from "lucide-react";
import { LegalFooter } from "./LegalFooter";
import { useLocation } from "wouter";
import { useAppleIAP } from "@/hooks/useAppleIAP";
import { isIAPAvailable, checkStoreKitAvailable } from "@/lib/appleIap";

interface IOSSubscriptionPromptProps {
  variant?: 'full-page' | 'card';
  title?: string;
  description?: string;
}

function IOSPlanPicker() {
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

  if (!available) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Smartphone className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-gray-900">No Active Subscription</h4>
              <p className="text-sm text-gray-600 mt-1">
                Your account doesn't have an active subscription at this time.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm text-gray-500">Loading subscription options...</p>
      </div>
    );
  }

  const monthlyProduct = products.find(p => p.productId === 'forescore_monthly');
  const annualProduct = products.find(p => p.productId === 'forescore_annual');

  const hasFallback = !monthlyProduct && !annualProduct;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {hasFallback ? (
          <>
            <PlanCard
              planId="forescore_monthly"
              title="Monthly"
              price="$1.99/month"
              trial="7-day free trial"
              selected={selectedPlan === 'forescore_monthly'}
              onSelect={() => setSelectedPlan('forescore_monthly')}
              disabled={isPurchasing}
            />
            <PlanCard
              planId="forescore_annual"
              title="Annual"
              price="$17.99/year"
              trial="7-day free trial"
              badge="Best Value"
              selected={selectedPlan === 'forescore_annual'}
              onSelect={() => setSelectedPlan('forescore_annual')}
              disabled={isPurchasing}
            />
          </>
        ) : (
          <>
            {monthlyProduct && (
              <PlanCard
                planId={monthlyProduct.productId}
                title="Monthly"
                price={monthlyProduct.price ? `${monthlyProduct.price}/month` : '$1.99/month'}
                trial={monthlyProduct.introductoryPrice ? `${monthlyProduct.introductoryPricePeriod} free trial` : '7-day free trial'}
                selected={selectedPlan === monthlyProduct.productId}
                onSelect={() => setSelectedPlan(monthlyProduct.productId)}
                disabled={isPurchasing}
              />
            )}
            {annualProduct && (
              <PlanCard
                planId={annualProduct.productId}
                title="Annual"
                price={annualProduct.price ? `${annualProduct.price}/year` : '$17.99/year'}
                trial={annualProduct.introductoryPrice ? `${annualProduct.introductoryPricePeriod} free trial` : '7-day free trial'}
                badge="Best Value"
                selected={selectedPlan === annualProduct.productId}
                onSelect={() => setSelectedPlan(annualProduct.productId)}
                disabled={isPurchasing}
              />
            )}
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <Button
        onClick={() => selectedPlan && purchase(selectedPlan)}
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
        Manage subscriptions in your Apple ID Settings.
      </p>
    </div>
  );
}

function PlanCard({
  planId,
  title,
  price,
  trial,
  badge,
  selected,
  onSelect,
  disabled,
}: {
  planId: string;
  title: string;
  price: string;
  trial: string;
  badge?: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all relative ${
        selected
          ? 'border-emerald-500 bg-emerald-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {badge && (
        <span className="absolute -top-2.5 right-3 bg-emerald-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-gray-900">{title}</h4>
          <p className="text-sm text-gray-600">{price}</p>
          <p className="text-xs text-emerald-600 font-medium mt-1">{trial}</p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          selected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
        }`}>
          {selected && (
            <div className="w-2 h-2 rounded-full bg-white" />
          )}
        </div>
      </div>
    </button>
  );
}

export function IOSSubscriptionPrompt({ 
  variant = 'full-page',
  title = "ForeScore Subscription",
  description = "Start your free trial to unlock all features"
}: IOSSubscriptionPromptProps) {
  const [, setLocation] = useLocation();
  const iapAvailable = isIAPAvailable();

  const content = (
    <>
      {iapAvailable ? (
        <IOSPlanPicker />
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Smartphone className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-gray-900">No Active Subscription</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Your account doesn't have an active subscription at this time.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => setLocation('/')}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            data-testid="button-go-home"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to App
          </Button>

          <p className="text-xs text-center text-gray-500">
            If you believe this is an error, please check your account status.
          </p>
        </div>
      )}

      <LegalFooter className="mt-6 pt-4 border-t border-gray-200" />
    </>
  );

  if (variant === 'card') {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <Crown className="w-8 h-8 text-emerald-600" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md md:max-w-lg w-full">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Crown className="w-8 h-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{content}</CardContent>
        </Card>
      </div>
    </div>
  );
}

export function IOSActiveSubscription() {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-medium text-green-900">Subscription Active</h4>
          <p className="text-sm text-green-700 mt-1">
            Your subscription is active and you have full access to ForeScore.
          </p>
        </div>
      </div>
    </div>
  );
}
