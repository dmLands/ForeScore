import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface SubscriptionAccess {
  hasAccess: boolean;
  reason?: string;
  trialEndsAt?: string;
}

// Admin authorization - check if user email is in admin list
const ADMIN_EMAILS = new Set(['daniel@danonano.com']);

export function isAdmin(user: any): boolean {
  // Check both possible email locations (local auth vs Replit auth)
  const email = user?.email || user?.claims?.email;
  if (!email) {
    return false;
  }
  return ADMIN_EMAILS.has(email.toLowerCase());
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
  const userIsAdmin = isAdmin(user);
  
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
    isAdmin: userIsAdmin,
  };
}