import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface SubscriptionAccess {
  hasAccess: boolean;
  reason?: string;
  trialEndsAt?: string;
  nextRenewalDate?: string;
  subscriptionStatus?: string;
  currentPlan?: {
    name: string;
    amount: number;
    interval: string;
    planKey: string;
  };
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
    refetchOnMount: false, // Don't refetch on mount - use cached data
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

  // No redirect logic here - let route guards handle it to prevent loops

  return {
    user,
    isLoading,
    isAuthenticated,
    hasActiveSubscription,
    subscriptionAccess,
    isAdmin: userIsAdmin,
  };
}