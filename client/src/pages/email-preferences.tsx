import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { apiUrl } from "@/lib/platform";

interface EmailPreferences {
  marketingPreferenceStatus: string;
  marketingConsentAt: string | null;
  marketingUnsubscribeAt: string | null;
}

export default function EmailPreferences() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [unsubscribeIntent, setUnsubscribeIntent] = useState(false);

  // Fetch current email preferences
  const { data: preferences, isLoading } = useQuery<EmailPreferences>({
    queryKey: ['/api/user/email-preferences'],
    enabled: true
  });

  // Update email preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: { unsubscribe: boolean }) => {
      const response = await fetch(apiUrl('/api/user/email-preferences'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/email-preferences'] });
      
      if (data.marketingPreferenceStatus === 'unsubscribed') {
        setShowSuccessDialog(true);
      } else {
        toast({
          title: "Preferences Updated",
          description: "You have subscribed to marketing communications.",
        });
      }
      setUnsubscribeIntent(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUnsubscribeChange = (checked: boolean) => {
    setUnsubscribeIntent(checked);
  };

  const handleSavePreferences = () => {
    updatePreferencesMutation.mutate({ 
      unsubscribe: unsubscribeIntent 
    });
  };

  const isCurrentlySubscribed = preferences?.marketingPreferenceStatus === 'subscribed' || 
                                preferences?.marketingPreferenceStatus === 'pending';
  const isCurrentlyUnsubscribed = preferences?.marketingPreferenceStatus === 'unsubscribed';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="text-center">Loading your preferences...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/" className="text-green-600 hover:text-green-700">
              <ArrowLeft className="h-5 w-5" data-testid="button-back" />
            </Link>
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center text-white shadow-lg">
              <Mail className="h-5 w-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Email Preferences</CardTitle>
          <CardDescription className="text-gray-600">
            Manage your email communication preferences
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Current Status Display */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Current Status</h3>
            <div className="flex items-center gap-2">
              {isCurrentlySubscribed ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-700 font-medium" data-testid="status-subscribed">
                    You are subscribed to marketing communications
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <span className="text-orange-700 font-medium" data-testid="status-unsubscribed">
                    You are unsubscribed from marketing communications
                  </span>
                </>
              )}
            </div>
            
            {preferences?.marketingConsentAt && (
              <p className="text-sm text-gray-600 mt-2" data-testid="consent-date">
                Marketing consent given: {new Date(preferences.marketingConsentAt).toLocaleDateString()}
              </p>
            )}
            
            {preferences?.marketingUnsubscribeAt && (
              <p className="text-sm text-gray-600 mt-2" data-testid="unsubscribe-date">
                Unsubscribed: {new Date(preferences.marketingUnsubscribeAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Email Type Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Email Types</h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 border rounded-lg bg-blue-50">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Essential Communications</h4>
                  <p className="text-sm text-blue-700">
                    Account notifications, security alerts, billing information, and service updates. 
                    These cannot be unsubscribed from.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <Mail className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Marketing Communications</h4>
                  <p className="text-sm text-gray-600">
                    Product updates, new features, tips, and promotional content. 
                    You can control this subscription below.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Unsubscribe Section */}
          {isCurrentlySubscribed && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Marketing Communications</h3>
              
              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <Checkbox
                  id="unsubscribe-checkbox"
                  data-testid="checkbox-unsubscribe"
                  checked={unsubscribeIntent}
                  onCheckedChange={handleUnsubscribeChange}
                  className="mt-1"
                />
                <div className="space-y-1 leading-none">
                  <label
                    htmlFor="unsubscribe-checkbox"
                    className="text-sm cursor-pointer text-gray-900 font-medium"
                    data-testid="label-unsubscribe"
                  >
                    Unsubscribe from marketing communications
                  </label>
                  <p className="text-xs text-gray-600">
                    You will continue to receive essential account and service-related emails.
                  </p>
                </div>
              </div>

              {unsubscribeIntent && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You are about to unsubscribe from marketing communications. 
                    You can re-subscribe at any time by returning to this page.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSavePreferences}
                disabled={updatePreferencesMutation.isPending || !unsubscribeIntent}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                data-testid="button-save-preferences"
              >
                {updatePreferencesMutation.isPending ? "Updating Preferences..." : "Update Email Preferences"}
              </Button>
            </div>
          )}

          {/* Re-subscribe Section */}
          {isCurrentlyUnsubscribed && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Marketing Communications</h3>
              
              <div className="p-4 border rounded-lg bg-green-50">
                <p className="text-sm text-green-800 mb-3">
                  Would you like to re-subscribe to marketing communications? 
                  You'll receive product updates, new features, and helpful tips.
                </p>
                
                <Button
                  onClick={() => updatePreferencesMutation.mutate({ unsubscribe: false })}
                  disabled={updatePreferencesMutation.isPending}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  data-testid="button-resubscribe"
                >
                  {updatePreferencesMutation.isPending ? "Subscribing..." : "Subscribe to Marketing Communications"}
                </Button>
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className="text-center text-sm text-gray-600 pt-4 border-t">
            <p>
              Questions about your email preferences? Contact us at{" "}
              <a 
                href="mailto:support@forescore.xyz" 
                className="text-green-600 hover:text-green-700 underline"
                data-testid="link-support"
              >
                support@forescore.xyz
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md" data-testid="dialog-success">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Unsubscribed Successfully
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              You have been unsubscribed from marketing communications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                You will no longer receive marketing emails from ForeScore. 
                You may still receive essential account or service-related communications.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowSuccessDialog(false)}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                data-testid="button-dialog-close"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}