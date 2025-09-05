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

  // No longer redirect based on subscription status since users are logged out when expired

  // Handle API errors (401 responses now indicate session expired due to no subscription)
  useEffect(() => {
    if (error && 'status' in error && error.status === 401) {
      // User was logged out due to expired subscription - redirect to login
      if (!window.location.pathname.includes('/login')) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        
        setLocation('/login');
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