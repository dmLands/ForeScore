import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface SubscriptionAccess {
  hasAccess: boolean;
  reason?: string;
  trialEndsAt?: string;
  nextRenewalDate?: string;
  subscriptionStatus?: string;
}

export function useSubscriptionAccess() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const {
    data: accessInfo,
    isLoading,
    error
  } = useQuery<SubscriptionAccess>({
    queryKey: ['/api/subscription/status'],
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // No longer redirect based on subscription status since users are logged out when expired

  // Handle API errors gracefully
  useEffect(() => {
    if (error && 'status' in error) {
      if (error.status === 401) {
        // True authentication error - redirect to login
        if (!window.location.pathname.includes('/login')) {
          toast({
            title: "Session Expired",
            description: "Please log in again to continue.",
            variant: "destructive",
          });
          
          setLocation('/login');
        }
      } else if (error.status === 402) {
        // Subscription required - redirect to subscription page (graceful)
        if (!window.location.pathname.includes('/subscribe')) {
          toast({
            title: "Subscription Required",
            description: "Your trial has ended. Please subscribe to continue.",
            variant: "default",
          });
          
          setLocation('/subscribe');
        }
      }
    }
  }, [error, setLocation, toast]);

  return {
    hasAccess: accessInfo?.hasAccess ?? false,
    trialEndsAt: accessInfo?.trialEndsAt,
    reason: accessInfo?.reason,
    isLoading,
    error
  };
}