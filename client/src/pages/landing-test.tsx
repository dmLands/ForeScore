import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Star, Smartphone, Zap, Users, Calculator, Trophy, ArrowRight, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { z } from "zod";
import LegalDialogs from "@/components/LegalDialogs";
import logoPath from "@assets/ForeScore_Logo_invert_transparent_1764970687346.png";
import payoutScreenshot from "@assets/image_1764097878852.png";
import bbbScreenshot from "@assets/image_1764097900039.png";

const quickSignupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the Terms of Service and Privacy Policy"
  }),
  marketingConsent: z.boolean()
});

type QuickSignupForm = z.infer<typeof quickSignupSchema>;

export default function LandingTest() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState<QuickSignupForm>({
    email: "",
    termsAccepted: false,
    marketingConsent: false
  });

  // Ensure page always starts at top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [errors, setErrors] = useState<Partial<Record<keyof QuickSignupForm, string>>>({});
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);

  const quickSignupMutation = useMutation({
    mutationFn: async (data: { email: string; termsAccepted: boolean; marketingConsent: boolean }) => {
      const response = await fetch("/api/auth/quick-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.setQueryData(['/api/auth/user'], data.user);
      // Redirect to main domain to exit QR subdomain landing page
      const isQRSubdomain = window.location.hostname.startsWith('qr.');
      const baseUrl = isQRSubdomain ? 'https://forescore.xyz' : '';
      window.location.href = data.isReturningUser ? `${baseUrl}/` : `${baseUrl}/?showTutorial=true`;
    },
    onError: (error: any) => {
      toast({
        title: "Signup failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validatedData = quickSignupSchema.parse(formData);
      setErrors({});
      await quickSignupMutation.mutateAsync({
        email: validatedData.email,
        termsAccepted: validatedData.termsAccepted,
        marketingConsent: validatedData.marketingConsent
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof QuickSignupForm, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof QuickSignupForm] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, email: e.target.value }));
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handleCheckboxChange = (field: 'termsAccepted' | 'marketingConsent') => (checked: boolean) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleDialogChange = (type: 'terms' | 'privacy', open: boolean) => {
    if (type === 'terms') {
      setShowTermsDialog(open);
    } else {
      setShowPrivacyDialog(open);
    }
  };

  const scrollToSignup = () => {
    document.getElementById('signup-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
                <img src={logoPath} alt="ForeScore" className="w-14 h-14" />
                <span className="text-3xl font-bold">ForeScore</span>
              </div>
              
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-6">
                Stop arguing about who owes who after the round
              </h1>
              
              <p className="text-xl md:text-2xl text-emerald-100 mb-8 leading-relaxed">
                The Only Golf Betting Payouts Calculator
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Button 
                  onClick={scrollToSignup}
                  size="lg" 
                  className="h-14 px-8 text-lg font-semibold bg-white text-emerald-900 hover:bg-emerald-50 shadow-xl"
                  data-testid="button-hero-signup"
                >
                  Start Free 7-Day Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  onClick={() => setLocation('/login')}
                  variant="outline" 
                  size="default"
                  className="h-10 px-6 text-sm font-normal border border-white/30 text-white hover:bg-white/10 bg-transparent"
                  data-testid="button-hero-login"
                >
                  Already a Member? Log In
                </Button>
              </div>
              
              <div className="flex items-center justify-center md:justify-start gap-6 mt-8 text-emerald-200 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>Works offline</span>
                </div>
              </div>
            </div>
            
            {/* Right: App Screenshots */}
            <div className="relative flex justify-center">
              <div className="relative">
                {/* Main phone */}
                <div className="relative w-56 h-[420px] bg-gray-900 rounded-[3rem] p-2 shadow-2xl transform rotate-3">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-b-2xl z-10"></div>
                  <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
                    <img src={payoutScreenshot} alt="ForeScore Payouts" className="w-full h-full object-cover" />
                  </div>
                </div>
                {/* Secondary phone */}
                <div className="absolute -left-16 top-12 w-44 h-[330px] bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl transform -rotate-6 hidden md:block">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-b-xl z-10"></div>
                  <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden">
                    <img src={bbbScreenshot} alt="ForeScore Game Entry" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Point Section */}
      <section className="py-10 md:py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">
            Sound familiar?
          </h2>
          
          {/* Horizontal scroll on mobile, grid on desktop */}
          <div className="relative">
            <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto pb-2 md:pb-0 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {[
                { emoji: "💸", text: "\"Just Venmo everyone $20 and call it even.\"", name: "Tom", state: "Texas" },
                { emoji: "😤", text: "\"Wait, I thought I was up $15, not down $5!\"", name: "Mike", state: "California" },
                { emoji: "🤯", text: "\"Hold on, let me recalculate this for the 4th time...\"", name: "Dave", state: "Arizona" }
              ].map((item, idx) => (
                <Card key={idx} className="flex-shrink-0 w-[280px] md:w-auto snap-center bg-white border-2 border-gray-200 hover:border-emerald-300 transition-colors">
                  <CardContent className="pt-5 pb-4 text-center">
                    <div className="text-3xl mb-3">{item.emoji}</div>
                    <p className="text-gray-700 font-medium italic text-sm">{item.text}</p>
                    <p className="text-xs text-gray-500 mt-2">— {item.name}, {item.state}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Fade indicator on right edge - mobile only */}
            <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none md:hidden" />
          </div>
        </div>
      </section>

      {/* Games Section */}
      <section className="py-8 md:py-14">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-4">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              4 Games. 1 App. 0 Math.
            </h2>
            <p className="text-base md:text-lg text-gray-600">
              Play any combination and get instant, optimized payouts
            </p>
          </div>
          
          {/* Horizontal scroll on mobile, grid on desktop */}
          <div className="relative">
            <div className="flex md:grid md:grid-cols-4 gap-3 overflow-x-auto pb-2 md:pb-0 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {[
                {
                  icon: "🎲",
                  name: "Bingo Bango Bongo",
                  color: "from-purple-500 to-purple-600",
                  description: "First on green, closest to pin, first to hole out"
                },
                {
                  icon: "👑",
                  name: "Sacramento (916)",
                  color: "from-blue-500 to-blue-600", 
                  description: "9 or 16 points distributed per hole"
                },
                {
                  icon: "🎯",
                  name: "GIR Game",
                  color: "from-emerald-500 to-emerald-600",
                  description: "Greens in Regulation with penalty & bonus holes"
                },
                {
                  icon: "🃏",
                  name: "Animal",
                  color: "from-red-500 to-red-600",
                  description: "Penalty cards for golf mishaps"
                }
              ].map((game, idx) => (
                <Card key={idx} className="flex-shrink-0 w-[200px] md:w-auto snap-center group hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-gray-300 overflow-hidden">
                  <div className={`h-1.5 bg-gradient-to-r ${game.color}`}></div>
                  <CardContent className="p-3">
                    <div className="text-2xl mb-1">{game.icon}</div>
                    <h3 className="font-bold text-sm text-gray-900 mb-0.5">{game.name}</h3>
                    <p className="text-xs text-gray-600 leading-snug">{game.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Fade indicator on right edge - mobile only */}
            <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none md:hidden" />
          </div>
          
          <p className="text-center text-sm text-gray-500 mt-3">Points Mode, Nassau Mode, or Both</p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-emerald-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
            From the 1st Tee to 19th Hole in 3 Steps
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                icon: <Users className="h-6 w-6" />,
                title: "Create Your Group",
                description: "Add up to 4 players, customize colors, and select which games you're playing"
              },
              {
                step: "2", 
                icon: <Smartphone className="h-6 w-6" />,
                title: "Enter Scores As You Play",
                description: "Quick hole-by-hole entry that works even without cell service"
              },
              {
                step: "3",
                icon: <Calculator className="h-6 w-6" />,
                title: "Instant Settlement",
                description: "Our algorithm calculates optimal payouts - money only changes hands once"
              }
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <div className="bg-white rounded-2xl p-6 shadow-lg h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center text-lg font-bold">
                      {item.step}
                    </div>
                    <div className="text-emerald-600">{item.icon}</div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
                {idx < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-emerald-300">
                    <ArrowRight className="h-8 w-8" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Built by Golfers, for Golfers
            </h2>
            <p className="text-lg text-gray-600">
              Designed for your regular foursome and weekly money games
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {[
              { icon: <Zap className="h-5 w-5" />, title: "Real-Time Updates", desc: "Live leaderboards update as you enter scores" },
              { icon: <Smartphone className="h-5 w-5" />, title: "Works Offline", desc: "No signal on the course? No problem." },
              { icon: <Calculator className="h-5 w-5" />, title: "Smart Settlement", desc: "Optimized transactions - minimal money movement" },
              { icon: <Trophy className="h-5 w-5" />, title: "Multiple Payout Modes", desc: "Points, Nassau, or both" },
              { icon: <Users className="h-5 w-5" />, title: "Up to 4 Players", desc: "Perfect for your regular foursome" },
              { icon: <Star className="h-5 w-5" />, title: "Custom Cards", desc: "Create your own penalty cards" }
            ].map((feature, idx) => (
              <div key={idx} className="flex gap-3 p-3 md:p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="text-emerald-600 flex-shrink-0 mt-0.5">{feature.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm md:text-base">{feature.title}</h3>
                  <p className="text-xs md:text-sm text-gray-600">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Simple, Affordable Pricing
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Cheaper than the balls you'll lose next round
          </p>
          
          <Card className="border-2 border-emerald-500 shadow-2xl overflow-hidden">
            <div className="bg-emerald-600 text-white py-4 text-lg font-bold tracking-wide">
              7-DAY FREE TRIAL
            </div>
            <CardContent className="pt-8 pb-10">
              <p className="text-gray-600 mb-4">Perfect for your regular foursome—use it every round.</p>
              <div className="mb-6">
                <div className="flex justify-center gap-6 items-baseline">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">$1.99</span>
                    <span className="text-gray-500 text-sm">/month</span>
                  </div>
                  <span className="text-gray-400 text-sm">or</span>
                  <div>
                    <span className="text-2xl font-bold text-gray-900">$16.99</span>
                    <span className="text-gray-500 text-sm">/year</span>
                  </div>
                </div>
              </div>
              <ul className="space-y-3 mb-8 inline-block text-left">
                {[
                  "All 4 game types included",
                  "Unlimited groups & rounds",
                  "Real-time scoring",
                  "Offline mode",
                  "Custom penalty cards",
                  "Optimized settlements"
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                onClick={scrollToSignup}
                size="lg" 
                className="w-full h-14 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700"
                data-testid="button-pricing-signup"
              >
                Start Your Free Trial
              </Button>
              <p className="text-sm text-gray-500 mt-4">No credit card required to start</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Social Proof - Testimonial */}
      <section className="py-12 md:py-16 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex justify-center gap-1 mb-4">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <blockquote className="text-xl md:text-2xl font-medium mb-4 leading-relaxed">
            "Finally, an app that handles all our side games without the arguments and uncertainty. The optimized payouts feature alone is worth it."
          </blockquote>
          <p className="text-gray-400 text-sm">— Weekend Warriors Golf Group, Sacramento CA</p>
        </div>
      </section>

      {/* Sign Up Section - SIMPLIFIED EMAIL ONLY */}
      <section id="signup-section" className="py-16 md:py-24 bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900">
        <div className="max-w-md mx-auto px-4">
          <Card className="shadow-2xl border-0">
            <CardContent className="pt-8 pb-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Start Your Free Trial</h2>
                <p className="text-gray-600">Just your email - that's it!</p>
                <p className="text-sm text-gray-500 mt-1">No password needed now. Create one later if you want.</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`h-12 text-lg ${errors.email ? "border-red-500" : ""}`}
                    data-testid="input-email"
                    autoComplete="email"
                    autoFocus
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>
                
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="terms"
                      checked={formData.termsAccepted}
                      onCheckedChange={handleCheckboxChange('termsAccepted')}
                      className="mt-1"
                      data-testid="checkbox-terms"
                    />
                    <Label htmlFor="terms" className="text-sm text-gray-600 font-normal leading-tight">
                      I agree to the{" "}
                      <button type="button" onClick={() => setShowTermsDialog(true)} className="text-emerald-600 hover:underline" data-testid="link-terms">
                        Terms of Service
                      </button>{" "}
                      and{" "}
                      <button type="button" onClick={() => setShowPrivacyDialog(true)} className="text-emerald-600 hover:underline" data-testid="link-privacy">
                        Privacy Policy
                      </button>
                    </Label>
                  </div>
                  {errors.termsAccepted && <p className="text-xs text-red-500">{errors.termsAccepted}</p>}
                  
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="marketing"
                      checked={formData.marketingConsent}
                      onCheckedChange={handleCheckboxChange('marketingConsent')}
                      className="mt-1"
                      data-testid="checkbox-marketing"
                    />
                    <Label htmlFor="marketing" className="text-sm text-gray-600 font-normal">
                      Send me tips and updates (optional)
                    </Label>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  disabled={quickSignupMutation.isPending}
                  className="w-full h-14 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 mt-4"
                  data-testid="button-submit-signup"
                >
                  {quickSignupMutation.isPending ? "Starting Trial..." : "Start Free 7-Day Trial"}
                </Button>
                
                <p className="text-center text-xs text-gray-500 mt-2">
                  You'll be playing in 10 seconds!
                </p>
              </form>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>
              
              <p className="text-center text-sm text-gray-500">
                Already have an account?{" "}
                <button onClick={() => setLocation('/login')} className="text-emerald-600 hover:underline font-medium" data-testid="link-login">
                  Log in
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-900 text-gray-400 text-center text-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src={logoPath} alt="ForeScore" className="w-8 h-8" />
            <span className="text-white font-semibold">ForeScore</span>
          </div>
          <p>&copy; {new Date().getFullYear()} ForeScore. All rights reserved.</p>
          <div className="flex justify-center gap-6 mt-4">
            <button onClick={() => setShowTermsDialog(true)} className="hover:text-white" data-testid="link-footer-terms">Terms</button>
            <button onClick={() => setShowPrivacyDialog(true)} className="hover:text-white" data-testid="link-footer-privacy">Privacy</button>
          </div>
        </div>
      </footer>

      <LegalDialogs
        showTerms={showTermsDialog}
        showPrivacy={showPrivacyDialog}
        onOpenChange={handleDialogChange}
      />
    </div>
  );
}
