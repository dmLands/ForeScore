import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { CheckCircle, Sparkles, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function TrialWelcome() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const firstName = (user as any)?.firstName;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-3xl mb-2">
            Welcome to ForeScore{firstName ? `, ${firstName}` : ''}!
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Your account has been created successfully
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Trial Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 rounded-full p-2">
                <Sparkles className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  🎉 Start Your 7-Day Free Trial
                </h3>
                <p className="text-gray-700 mb-3">
                  Get full access to all ForeScore features for 7 days—no credit card required!
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Unlimited golf groups and games
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Live payout calculations
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    2/9/16 and card game support
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Cancel anytime, no commitment
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={() => setLocation('/')}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-6 text-lg"
              data-testid="button-start-free-trial"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Start Free Trial
            </Button>
            
            <Button 
              onClick={() => setLocation('/subscribe')}
              variant="outline"
              className="w-full py-6 text-lg border-2 border-gray-300 hover:border-green-600 hover:bg-green-50"
              data-testid="button-subscribe-now"
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Subscribe Now ($1.99/month)
            </Button>
          </div>

          <p className="text-center text-sm text-gray-500">
            After your trial ends, subscribe for just $1.99/month to keep your data and continue playing
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
