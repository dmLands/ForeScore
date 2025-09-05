import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface SubscriptionAccess {
  hasAccess: boolean;
  reason?: string;
  trialEndsAt?: string;
}

export function useAuth() {
  const [location, setLocation] = useLocation();
  
  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    staleTime: Infinity, // Cache forever until manually invalidated
  });

  const { data: subscriptionAccess, isLoading: subscriptionLoading, error: subscriptionError } = useQuery<SubscriptionAccess>({
    queryKey: ['/api/subscription/status'],
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: !!user && !userError, // Only check subscription if user is authenticated
  });

  const isAuthenticated = !!user && !userError;
  const isLoading = userLoading || (isAuthenticated && subscriptionLoading);
  
  // Only check subscription status if we have data and no error
  const hasActiveSubscription = subscriptionAccess?.hasAccess ?? false;
  const hasSubscriptionData = !!subscriptionAccess && !subscriptionError;

  // Redirect logic for authenticated users without active subscriptions
  useEffect(() => {
    // Only redirect if we have subscription data (no error) and user doesn't have access
    if (!isLoading && isAuthenticated && hasSubscriptionData) {
      // Skip redirect logic for subscription-related pages
      const allowedPaths = ['/subscribe', '/manage-subscription'];
      const isOnAllowedPath = allowedPaths.some(path => location.startsWith(path));
      
      // Only redirect if we're not already on the target location to prevent loops
      if (!hasActiveSubscription && !isOnAllowedPath && location !== '/subscribe') {
        setLocation('/subscribe');
      }
    }
  }, [isLoading, isAuthenticated, hasActiveSubscription, hasSubscriptionData, location, setLocation]);

  return {
    user,
    isLoading,
    isAuthenticated,
    hasActiveSubscription,
    subscriptionAccess,
  };
}