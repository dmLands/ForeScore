import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Smartphone, ArrowLeft } from "lucide-react";
import { LegalFooter } from "./LegalFooter";
import { useLocation } from "wouter";

interface IOSSubscriptionPromptProps {
  variant?: 'full-page' | 'card';
  title?: string;
  description?: string;
}

export function IOSSubscriptionPrompt({ 
  variant = 'full-page',
  title = "Account Status",
  description = "Your account does not currently have an active subscription."
}: IOSSubscriptionPromptProps) {
  const [, setLocation] = useLocation();

  const content = (
    <>
      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Smartphone className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-gray-900">No Active Subscription</h4>
              <p className="text-sm text-gray-600 mt-1">
                Your account doesn't have an active subscription at this time.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => setLocation('/')}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          data-testid="button-go-home"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to App
        </Button>

        <p className="text-xs text-center text-gray-500">
          If you believe this is an error, please check your account status.
        </p>
      </div>

      <LegalFooter className="mt-6 pt-4 border-t border-gray-200" />
    </>
  );

  if (variant === 'card') {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8 text-gray-600" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md md:max-w-lg w-full">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Smartphone className="w-8 h-8 text-gray-600" />
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{content}</CardContent>
        </Card>
      </div>
    </div>
  );
}

export function IOSActiveSubscription() {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-medium text-green-900">Subscription Active</h4>
          <p className="text-sm text-green-700 mt-1">
            Your subscription is active and you have full access to ForeScore.
          </p>
        </div>
      </div>
    </div>
  );
}
