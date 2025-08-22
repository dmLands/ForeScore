import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 relative overflow-hidden">
      {/* Golf course background graphics */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-green-300"></div>
        <div className="absolute top-40 right-20 w-20 h-20 rounded-full bg-green-400"></div>
        <div className="absolute bottom-32 left-20 w-24 h-24 rounded-full bg-green-200"></div>
        <div className="absolute bottom-20 right-10 w-16 h-16 rounded-full bg-green-500"></div>
      </div>

      <div className="relative flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-2xl shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-8">
            {/* Golf-themed icon */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center text-3xl text-white shadow-lg">
                  ⛳
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center text-sm shadow-md">
                  🏌️
                </div>
              </div>
            </div>
            
            <CardTitle className="text-4xl font-bold text-gray-900 mb-2">
              ForeScore
            </CardTitle>
            <CardDescription className="text-xl font-medium text-gray-700 mb-4">
              You hit the shots, we do the math
            </CardDescription>
            <Badge variant="secondary" className="mx-auto text-sm font-medium">
              Golf Game Companion
            </Badge>
          </CardHeader>
          
          <CardContent className="space-y-8 px-8 pb-8">
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.href = '/login'}
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg transition-all duration-200"
                size="lg"
              >
                Log In
              </Button>
              
              <p className="text-center text-sm text-gray-600">
                <button 
                  onClick={() => window.location.href = '/register'}
                  className="text-green-600 hover:text-green-700 font-medium underline"
                >
                  New Users Register Here
                </button>
              </p>
            </div>

            {/* Game descriptions with graphics */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Card Game */}
              <Card className="border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                      🃏
                    </div>
                    <CardTitle className="text-lg text-gray-900">Card Game</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Classic Animal penalty cards enhanced by our <strong>Proportional Share Algorithm</strong>. 
                    Players collect cards for golf mishaps, and payouts are automatically calculated to 
                    fairly reward those who stay out of trouble.
                  </p>
                </CardContent>
              </Card>

              {/* 2/9/16 Game */}
              <Card className="border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                      #
                    </div>
                    <CardTitle className="text-lg text-gray-900">2/9/16 Game</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    A dynamic points-based format where players earn 2, 9, or 16 points per hole 
                    depending on performance. Includes <strong>dual payout modes</strong> (Points or FBT), 
                    real-time leaderboards, and seamless hole-by-hole score tracking.
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}