import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export default function QRLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-green-300"></div>
        <div className="absolute top-40 right-20 w-20 h-20 rounded-full bg-green-400"></div>
        <div className="absolute bottom-32 left-20 w-24 h-24 rounded-full bg-green-200"></div>
        <div className="absolute bottom-20 right-10 w-16 h-16 rounded-full bg-green-500"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <img 
              src="/forescore-logo.png" 
              alt="ForeScore Logo" 
              className="w-20 h-20"
            />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Make Every Hole More Fun
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Turn your golf round into a competitive experience with automatic payout calculations
          </p>
          <Badge variant="secondary" className="text-sm font-medium mb-8">
            Free 7-Day Trial • No Credit Card Required
          </Badge>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Create Your Group", desc: "Add your 2-4 golf buddies" },
              { step: "2", title: "Pick Your Games", desc: "BBB, Sacramento (916), Cards, or all 3" },
              { step: "3", title: "Enter Scores", desc: "Log results hole-by-hole as you play" },
              { step: "4", title: "Instant Payouts", desc: "Get settlement calculations instantly" }
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Game Types */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Three Competitive Game Types
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* BBB */}
            <Card className="border-2 border-gray-200 hover:shadow-lg transition">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-white text-xl font-bold">
                    🎲
                  </div>
                  <CardTitle>Bingo Bango Bongo</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Earn up to 3 points per hole: first on the green, closest to the pin, first to hole out
                </p>
              </CardContent>
            </Card>

            {/* Sacramento */}
            <Card className="border-2 border-gray-200 hover:shadow-lg transition">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl font-bold">
                    👑
                  </div>
                  <CardTitle>Sacramento (916)</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Classic points game where players earn 9 or 16 points based on performance per hole
                </p>
              </CardContent>
            </Card>

            {/* Cards */}
            <Card className="border-2 border-gray-200 hover:shadow-lg transition">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center text-white text-xl font-bold">
                    🃏
                  </div>
                  <CardTitle>Penalty Cards</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Collect penalty cards for golf mishaps. Payouts reward those who stay out of trouble
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Key Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Smart Features
          </h2>
          <div className="bg-white rounded-xl shadow-lg p-8 space-y-4">
            {[
              "Run multiple games simultaneously for layered competition",
              "Flexible payout modes: Points, Nassau (Front/Back/Total), or both",
              "Optimized settlement calculations—money changes hands once",
              "Real-time leaderboards and live score tracking",
              "Works offline—sync when you get cell service",
              "Beautiful, intuitive mobile-first design"
            ].map((feature, idx) => (
              <div key={idx} className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mb-16">
          <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ready to Upgrade Your Golf Game?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Get 7 days free. No credit card required. Cancel anytime.
            </p>
            <Button
              onClick={() => window.location.href = '/register'}
              size="lg"
              className="w-full md:w-64 h-14 text-lg font-semibold bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg"
            >
              Start Your Free Trial
            </Button>
            <p className="text-sm text-gray-500 mt-6">
              Already have an account? <a href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">Log in here</a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>© 2025 ForeScore. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
