import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface SubscriptionAccess {
  hasAccess: boolean;
  reason?: string;
  trialEndsAt?: string;
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

  // Handle subscription access redirects
  useEffect(() => {
    if (!isLoading && accessInfo && !accessInfo.hasAccess) {
      // Check if we're already on the subscribe page to avoid redirect loop
      if (!window.location.pathname.includes('/subscribe')) {
        toast({
          title: "Subscription Required",
          description: accessInfo.reason === 'Trial expired' 
            ? "Your free trial has ended. Please upgrade to continue using ForeScore."
            : "You need an active subscription to access ForeScore features.",
          variant: "destructive",
        });
        
        setLocation('/subscribe');
      }
    }
  }, [accessInfo, isLoading, setLocation, toast]);

  // Handle API errors (403 responses from subscription middleware)
  useEffect(() => {
    if (error && 'status' in error && error.status === 403) {
      if (!window.location.pathname.includes('/subscribe')) {
        toast({
          title: "Subscription Required",
          description: "Please upgrade your account to access this feature.",
          variant: "destructive",
        });
        
        setLocation('/subscribe');
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