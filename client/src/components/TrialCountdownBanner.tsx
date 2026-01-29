import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Clock, X } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { usePlatform } from "@/lib/platform";

export default function TrialCountdownBanner() {
  const { subscriptionAccess } = useAuth();
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const { isIOS, isNative } = usePlatform();

  // Don't show upgrade banner on iOS/native - payments handled on web
  if (isIOS || isNative) {
    return null;
  }

  // Calculate time remaining
  useEffect(() => {
    if (!subscriptionAccess?.trialEndsAt) {
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const trialEnd = new Date(subscriptionAccess.trialEndsAt!);
      const diff = trialEnd.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Trial expired");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`);
      } else {
        setTimeRemaining(`${minutes} minute${minutes > 1 ? 's' : ''}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [subscriptionAccess?.trialEndsAt]);

  // Don't show banner if:
  // 1. No trial end date
  // 2. Not in trial status (manual or auto)
  // 3. Banner was dismissed
  // 4. More than 3 days remaining
  const isTrialUser = subscriptionAccess?.subscriptionStatus === 'manual_trial' || 
                      subscriptionAccess?.subscriptionStatus === 'auto_trial';
  
  if (!subscriptionAccess?.trialEndsAt || 
      !isTrialUser ||
      dismissed) {
    return null;
  }

  const trialEnd = new Date(subscriptionAccess.trialEndsAt);
  const now = new Date();
  const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Only show if 3 days or less remaining
  if (daysRemaining > 3) {
    return null;
  }

  const handleUpgrade = () => {
    setLocation('/subscribe');
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Store dismissal in sessionStorage so it persists during this session
    sessionStorage.setItem('trialBannerDismissed', 'true');
  };

  // Check if banner was dismissed this session
  useEffect(() => {
    const wasDismissed = sessionStorage.getItem('trialBannerDismissed');
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">
                Your trial ends in {timeRemaining}
              </p>
              <p className="text-sm text-white/90">
                Subscribe now to keep using ForeScore without interruption
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleUpgrade}
              variant="secondary"
              className="bg-white text-orange-600 hover:bg-gray-100 font-semibold"
              data-testid="button-upgrade-from-banner"
            >
              Upgrade Now
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
