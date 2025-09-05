import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { 
  CheckCircle, 
  Clock, 
  CreditCard, 
  XCircle, 
  Calendar, 
  DollarSign,
  ArrowLeft,
  AlertTriangle 
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface SubscriptionAccess {
  hasAccess: boolean;
  reason?: string;
  trialEndsAt?: string;
}

interface SubscriptionPlans {
  monthly: {
    priceId: string;
    name: string;
    amount: number;
    interval: 'month' | 'year';
    trialDays: number;
  };
  annual: {
    priceId: string;
    name: string;
    amount: number;
    interval: 'month' | 'year';
    trialDays: number;
  };
}

export default function ManageSubscription() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch subscription status
  const { data: accessInfo, isLoading: statusLoading } = useQuery<SubscriptionAccess>({
    queryKey: ['/api/subscription/status'],
  });

  // Fetch subscription plans for pricing info
  const { data: plans } = useQuery<SubscriptionPlans>({
    queryKey: ['/api/subscription/plans'],
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/subscription/cancel');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription Canceled",
        description: "Your subscription has been canceled. You'll continue to have access until the end of your billing period.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscription status...</p>
        </div>
      </div>
    );
  }

  const getStatusInfo = () => {
    if (!accessInfo) return { status: 'unknown', color: 'gray', icon: XCircle };
    
    if (accessInfo.hasAccess) {
      if (accessInfo.trialEndsAt) {
        return { status: 'trial', color: 'blue', icon: Clock };
      }
      return { status: 'active', color: 'green', icon: CheckCircle };
    }
    
    if (accessInfo.reason === 'Trial expired') {
      return { status: 'expired', color: 'red', icon: XCircle };
    }
    
    return { status: 'inactive', color: 'gray', icon: XCircle };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusDisplay = () => {
    switch (statusInfo.status) {
      case 'trial':
        return {
          title: 'Free Trial Active',
          description: `Your 7-day free trial is active until ${formatDate(accessInfo.trialEndsAt)}`,
          badge: <Badge className="bg-blue-100 text-blue-800">Free Trial</Badge>
        };
      case 'active':
        return {
          title: 'Subscription Active',
          description: 'Your ForeScore subscription is active and ready to use',
          badge: <Badge className="bg-green-100 text-green-800">Active</Badge>
        };
      case 'expired':
        return {
          title: 'Subscription Required',
          description: 'Subscribe to continue using ForeScore',
          badge: <Badge className="bg-red-100 text-red-800">Inactive</Badge>
        };
      default:
        return {
          title: 'No Active Subscription',
          description: 'Subscribe to access ForeScore features',
          badge: <Badge variant="secondary">Inactive</Badge>
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setLocation('/')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to App</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
                <p className="text-sm text-gray-600">Manage your ForeScore subscription</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Current Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full bg-${statusInfo.color}-100`}>
                  <StatusIcon className={`w-6 h-6 text-${statusInfo.color}-600`} />
                </div>
                <div>
                  <CardTitle className="text-xl">{statusDisplay.title}</CardTitle>
                  <CardDescription>{statusDisplay.description}</CardDescription>
                </div>
              </div>
              {statusDisplay.badge}
            </div>
          </CardHeader>
          
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Actions</CardTitle>
            <CardDescription>
              Manage your subscription settings and billing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upgrade/Subscribe Actions */}
            {(!accessInfo?.hasAccess || statusInfo.status === 'trial') && (
              <div className="space-y-3">
                <Button
                  onClick={() => setLocation('/subscribe')}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  data-testid="button-upgrade-subscription"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {statusInfo.status === 'trial' ? 'Upgrade to Paid Plan' : 'Start Free Trial'}
                </Button>
                
                {plans && (
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900">Monthly Plan</h4>
                      <p className="text-2xl font-bold text-gray-900">${(plans.monthly.amount / 100).toFixed(2)}</p>
                      <p className="text-sm text-gray-600">per month</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <h4 className="font-medium text-green-900">Annual Plan</h4>
                      <p className="text-2xl font-bold text-green-900">${(plans.annual.amount / 100).toFixed(2)}</p>
                      <p className="text-sm text-green-600">per year</p>
                      <Badge className="mt-1 bg-green-100 text-green-800">Best Value</Badge>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cancel Subscription */}
            {accessInfo?.hasAccess && statusInfo.status === 'active' && (
              <div className="border-t pt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50">
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Subscription
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <span>Cancel Subscription?</span>
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel your ForeScore subscription? 
                        You'll continue to have access until the end of your current billing period, 
                        but won't be charged again.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => cancelSubscriptionMutation.mutate()}
                        disabled={cancelSubscriptionMutation.isPending}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {cancelSubscriptionMutation.isPending ? "Canceling..." : "Yes, Cancel"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features Reminder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span>ForeScore Features</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Unlimited golf groups</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Advanced payout calculations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Custom penalty cards</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Real-time score tracking</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Combined game settlements</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Priority customer support</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}