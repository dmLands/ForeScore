import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Globe, CheckCircle, Smartphone } from "lucide-react";
import { LegalFooter } from "./LegalFooter";

interface IOSSubscriptionPromptProps {
  variant?: 'full-page' | 'card';
  title?: string;
  description?: string;
}

export function IOSSubscriptionPrompt({ 
  variant = 'full-page',
  title = "Subscribe on the Web",
  description = "Subscriptions are managed through our website for the best experience."
}: IOSSubscriptionPromptProps) {
  const handleOpenWeb = () => {
    window.open('https://forescore.xyz/subscribe', '_blank');
  };

  const content = (
    <>
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Globe className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900">How to Subscribe</h4>
              <p className="text-sm text-blue-700 mt-1">
                Visit forescore.xyz in your web browser to set up your subscription. 
                Once subscribed, you'll have full access in this app.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleOpenWeb}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          data-testid="button-open-web-subscribe"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open forescore.xyz
        </Button>

        <p className="text-xs text-center text-gray-500">
          Already subscribed? Your access will sync automatically.
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3">What You Get</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-700">Unlimited golf groups</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-700">Advanced payout calculations</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-700">Custom penalty cards</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-700">Real-time score tracking</span>
          </div>
        </div>
      </div>
      
      {/* Legal Footer - Apple compliance */}
      <LegalFooter className="mt-6 pt-4 border-t border-gray-200" />
    </>
  );

  if (variant === 'card') {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8 text-emerald-600" />
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
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Smartphone className="w-8 h-8 text-emerald-600" />
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
            Your subscription is active. To manage billing, visit forescore.xyz in your web browser.
          </p>
        </div>
      </div>
    </div>
  );
}
