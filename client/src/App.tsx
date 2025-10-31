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

// Guard component that wraps Home to check subscription access
function ProtectedHome() {
  const { isAuthenticated, hasActiveSubscription, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const justCompletedPayment = localStorage.getItem('justCompletedPayment') === 'true';
  const autoTrialStatus = (user as any)?.autoTrialStatus;
  const [processingTimeout, setProcessingTimeout] = useState(false);

  // Clear the payment flag when subscription is activated - use useEffect to avoid render-time side effects
  // Only clear after auth data has loaded AND we have definitive confirmation
  useEffect(() => {
    if (!isLoading && justCompletedPayment) {
      // Clear only when we have definitive proof: active subscription OR explicit non-eligible status
      if (hasActiveSubscription || (autoTrialStatus && autoTrialStatus !== 'eligible')) {
        localStorage.removeItem('justCompletedPayment');
      }
    }
  }, [isLoading, justCompletedPayment, hasActiveSubscription, autoTrialStatus]);

  // Add a timeout for processing screen (30 seconds) to allow recovery if webhook fails
  useEffect(() => {
    if (justCompletedPayment && !hasActiveSubscription) {
      const timeoutId = setTimeout(() => {
        setProcessingTimeout(true);
      }, 30000); // 30 second timeout
      
      return () => clearTimeout(timeoutId);
    }
  }, [justCompletedPayment, hasActiveSubscription]);

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
  
  // If user just completed payment but webhook hasn't processed yet, show loading/waiting state
  if (justCompletedPayment && !hasActiveSubscription) {
    // Show timeout recovery if processing takes too long
    if (processingTimeout) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-yellow-50 to-amber-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">⏱️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Still Processing...</h2>
            <p className="text-gray-600 mb-4">
              Your payment is taking longer than expected. This sometimes happens with payment processing delays.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              You can wait a bit longer, or contact support if this persists. Your payment was received and will be activated shortly.
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('justCompletedPayment');
                setProcessingTimeout(false);
                queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
                queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                setLocation('/subscribe');
              }}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-2 px-4 rounded-lg"
              data-testid="button-continue-anyway"
            >
              Continue to Subscription Page
            </button>
          </div>
        </div>
      );
    }
    
    // Show normal loading screen
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Your Subscription</h2>
          <p className="text-gray-600">This will only take a moment...</p>
        </div>
      </div>
    );
  }
  
  // If user is new (eligible for trial) and hasn't just completed payment, show welcome page
  if (user && autoTrialStatus === 'eligible' && !justCompletedPayment) {
    return <WelcomeTrial />;
  }

  if (!hasActiveSubscription) {
    return <Subscribe />;
  }

  return <Home />;
}

function Router() {
  // Track page views when routes change
  useAnalytics();
  
  // Check if we're on the QR subdomain
  const isQRSubdomain = window.location.hostname.startsWith('qr.');
  
  // If on QR subdomain, always show QR code page
  if (isQRSubdomain) {
    return <QRCodePage />;
  }
  
  return (
    <Switch>
      <Route path="/" component={ProtectedHome} />
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
