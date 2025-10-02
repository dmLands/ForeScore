import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function TrialBanner() {
  const { subscriptionAccess, hasActiveSubscription, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (!isAuthenticated) {
    return null;
  }

  if (hasActiveSubscription) {
    return null;
  }

  const trialEndsAt = subscriptionAccess?.trialEndsAt;

  if (!trialEndsAt) {
    return null;
  }

  const now = new Date();
  const trialEnd = new Date(trialEndsAt);
  const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft > 3 || daysLeft < 0) {
    return null;
  }

  const getBannerColor = () => {
    if (daysLeft <= 1) return "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900";
    if (daysLeft === 2) return "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900";
    return "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900";
  };

  const getTextColor = () => {
    if (daysLeft <= 1) return "text-red-800 dark:text-red-200";
    if (daysLeft === 2) return "text-orange-800 dark:text-orange-200";
    return "text-blue-800 dark:text-blue-200";
  };

  const getIconColor = () => {
    if (daysLeft <= 1) return "text-red-600 dark:text-red-400";
    if (daysLeft === 2) return "text-orange-600 dark:text-orange-400";
    return "text-blue-600 dark:text-blue-400";
  };

  return (
    <div className={`border-b ${getBannerColor()}`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {daysLeft <= 1 ? (
              <AlertCircle className={`h-5 w-5 ${getIconColor()}`} />
            ) : (
              <Sparkles className={`h-5 w-5 ${getIconColor()}`} />
            )}
            <div>
              <p className={`text-sm font-medium ${getTextColor()}`}>
                {daysLeft === 1 ? (
                  <>Your trial ends tomorrow</>
                ) : daysLeft === 0 ? (
                  <>Your trial ends today</>
                ) : (
                  <>{daysLeft} days left in your trial</>
                )}
              </p>
              <p className={`text-xs ${getTextColor()} opacity-80`}>
                Subscribe now for just $1.99/month and keep your data
              </p>
            </div>
          </div>
          <Button
            onClick={() => setLocation("/subscribe")}
            size="sm"
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            data-testid="button-upgrade-trial"
          >
            Upgrade Now
          </Button>
        </div>
      </div>
    </div>
  );
}
