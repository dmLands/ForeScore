import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import QRLanding from "@/pages/qr-landing";
import LandingTest from "@/pages/landing-test";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Subscribe from "@/pages/subscribe";
import WelcomeTrial from "@/pages/welcome-trial";
import ManageSubscription from "@/pages/manage-subscription";
import EmailPreferences from "@/pages/email-preferences";
import NotFound from "@/pages/not-found";
import AdminPage from "@/pages/admin";
import QRCodePage from "@/pages/qr-code";
import CompleteAccount from "@/pages/complete-account";

// Guard component that wraps Home to check subscription access
function ProtectedHome() {
  const { isAuthenticated, hasActiveSubscription, isLoading, user } = useAuth();
  const autoTrialStatus = (user as any)?.autoTrialStatus;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }
  
  // If user has active subscription (paid or trial), go straight to app
  if (hasActiveSubscription) {
    return <Home />;
  }
  
  // If user is new (eligible for trial), show welcome page
  if (user && autoTrialStatus === 'eligible') {
    return <WelcomeTrial />;
  }

  // No subscription - show subscribe page
  return <Subscribe />;
}

function Router() {
  // Track page views when routes change
  useAnalytics();
  
  // Check if we're on the QR subdomain
  const isQRSubdomain = window.location.hostname.startsWith('qr.');
  
  // If on QR subdomain, always show marketing landing page
  if (isQRSubdomain) {
    return <LandingTest />;
  }
  
  return (
    <Switch>
      <Route path="/" component={ProtectedHome} />
      <Route path="/qr-landing" component={QRLanding} />
      <Route path="/landing-test" component={LandingTest} />
      <Route path="/qr" component={QRCodePage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/welcome-trial" component={WelcomeTrial} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/manage-subscription" component={ManageSubscription} />
      <Route path="/email-preferences" component={EmailPreferences} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/complete-account" component={CompleteAccount} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    initGA();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
