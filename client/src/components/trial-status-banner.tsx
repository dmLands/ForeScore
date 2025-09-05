import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Clock, AlertTriangle, Crown, CreditCard } from "lucide-react";

interface TrialStatusBannerProps {
  hasAccess: boolean;
  trialEndsAt?: string;
  reason?: string;
  compact?: boolean;
}

export function TrialStatusBanner({ 
  hasAccess, 
  trialEndsAt, 
  reason, 
  compact = false 
}: TrialStatusBannerProps) {
  // Don't show banner if user has full access without trial
  if (hasAccess && !trialEndsAt) {
    return null;
  }

  // Trial expired - urgent upgrade needed
  if (!hasAccess && reason === 'Trial expired') {
    return (
      <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white">
        <div className={`px-4 ${compact ? 'py-2' : 'py-3'} text-center`}>
          <div className="flex items-center justify-center space-x-2 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">
              Your free trial has ended
            </span>
          </div>
          {!compact && (
            <p className="text-sm opacity-90 mb-3">
              Upgrade to continue using ForeScore's advanced golf penalty tracking features
            </p>
          )}
          <Link href="/subscribe">
            <Button 
              variant="secondary" 
              size={compact ? "sm" : "default"}
              className="bg-white text-red-600 hover:bg-gray-100 font-semibold"
              data-testid="banner-upgrade-button"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Upgrade Now - $1.99/month
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // No subscription - encourage trial signup
  if (!hasAccess) {
    return (
      <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white">
        <div className={`px-4 ${compact ? 'py-2' : 'py-3'} text-center`}>
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Crown className="h-5 w-5" />
            <span className="font-semibold">
              Unlock ForeScore Pro features
            </span>
          </div>
          {!compact && (
            <p className="text-sm opacity-90 mb-3">
              Start your 7-day free trial • No commitment • Cancel anytime
            </p>
          )}
          <Link href="/subscribe">
            <Button 
              variant="secondary" 
              size={compact ? "sm" : "default"}
              className="bg-white text-emerald-600 hover:bg-gray-100 font-semibold"
              data-testid="banner-trial-button"
            >
              Start Free Trial
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Active trial - show countdown
  if (hasAccess && trialEndsAt) {
    const daysLeft = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const isLastDays = daysLeft <= 2;
    
    return (
      <div className={`${isLastDays ? 'bg-orange-500' : 'bg-blue-500'} text-white`}>
        <div className={`px-4 ${compact ? 'py-2' : 'py-3'} text-center`}>
          <div className="flex items-center justify-center space-x-2">
            <Clock className="h-4 w-4" />
            <span className={`${compact ? 'text-sm' : 'text-base'} font-medium`}>
              Free trial: {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
            </span>
            {isLastDays && (
              <Badge className="bg-white text-orange-600 text-xs font-bold">
                {daysLeft === 0 ? 'LAST DAY' : 'HURRY!'}
              </Badge>
            )}
          </div>
          {!compact && isLastDays && (
            <Link href="/manage-subscription" className="inline-block mt-2">
              <Button 
                variant="secondary" 
                size="sm"
                className="bg-white text-orange-600 hover:bg-gray-100 font-semibold"
                data-testid="banner-manage-button"
              >
                Upgrade to Continue
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return null;
}