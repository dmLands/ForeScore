import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { z } from "zod";
import LegalDialogs from "@/components/LegalDialogs";
import AppDownloadPrompt from "@/components/AppDownloadPrompt";
import logoPath from "@assets/ForeScore_Logo_transparent_1763148840628.png";
import payoutScreenshot from "@assets/image_1764097878852.png";
import bbbScreenshot from "@assets/image_1764097900039.png";

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  confirmPassword: z.string(),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the Terms of Service and Privacy Policy to register"
  }),
  marketingConsent: z.boolean()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function QRLanding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState<RegisterForm>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    confirmPassword: "",
    termsAccepted: false,
    marketingConsent: false
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterForm, string>>>({});
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const registerMutation = useMutation({
    mutationFn: async (data: Omit<RegisterForm, 'confirmPassword'>) => {
      const response = await fetch("/api/auth/register", {
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
      toast({
        title: "Welcome to ForeScore!",
        description: data.message || "Account created and you're now logged in.",
      });
      queryClient.setQueryData(['/api/auth/user'], data.user);
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validatedData = registerSchema.parse(formData);
      setErrors({});
      const { confirmPassword, ...registerData } = validatedData;
      await registerMutation.mutateAsync(registerData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof RegisterForm, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof RegisterForm] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  const handleInputChange = (field: keyof RegisterForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
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

  const openTermsDialog = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowTermsDialog(true);
  };

  const openPrivacyDialog = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowPrivacyDialog(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-green-300"></div>
        <div className="absolute top-40 right-20 w-20 h-20 rounded-full bg-green-400"></div>
        <div className="absolute bottom-32 left-20 w-24 h-24 rounded-full bg-green-200"></div>
        <div className="absolute bottom-20 right-10 w-16 h-16 rounded-full bg-green-500"></div>
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <img 
              src={logoPath}
              alt="ForeScore Logo" 
              className="w-20 h-20 object-contain"
            />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Make Every Hole More Fun
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Turn your golf round into a competitive experience with automatic payout calculations
          </p>
          <Button
            onClick={() => document.getElementById('register-section')?.scrollIntoView({ behavior: 'smooth' })}
            size="lg"
            className="h-14 text-lg font-semibold bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg"
          >
            Start Your Free Trial
          </Button>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Create Your Group", desc: "Add your 2-4 golf buddies" },
              { step: "2", title: "Pick Your Games", desc: "BBB, Sacramento (916), GIR, Cards, or any combination" },
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

        {/* Game Types - 4 GAMES */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Four Competitive Game Types
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* BBB */}
            <Card className="border-2 border-gray-200 hover:shadow-lg transition">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center text-white text-lg font-bold">
                    🎲
                  </div>
                  <CardTitle className="text-base">Bingo Bango Bongo</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-600">
                  Earn up to 3 points per hole: first on green, closest to pin, first to hole out
                </p>
              </CardContent>
            </Card>

            {/* Sacramento */}
            <Card className="border-2 border-gray-200 hover:shadow-lg transition">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white text-lg font-bold">
                    👑
                  </div>
                  <CardTitle className="text-base">Sacramento (916)</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-600">
                  Classic points game where players earn 9 or 16 points per hole
                </p>
              </CardContent>
            </Card>

            {/* GIR */}
            <Card className="border-2 border-gray-200 hover:shadow-lg transition">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center text-white text-lg font-bold">
                    🚩
                  </div>
                  <CardTitle className="text-base">GIR (Greens in Regulation)</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-600">
                  Hit the green in regulation and earn points. Configure bonus/penalty holes
                </p>
              </CardContent>
            </Card>

            {/* Cards */}
            <Card className="border-2 border-gray-200 hover:shadow-lg transition">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-white text-lg font-bold">
                    🃏
                  </div>
                  <CardTitle className="text-base">Penalty Cards</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-600">
                  Collect penalty cards for golf mishaps. Payouts reward those who stay clean
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Gameplay Showcase */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            See ForeScore in Action
          </h2>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left: Features */}
            <div className="space-y-4">
              {[
                { icon: "🎯", title: "Real-Time Scoring", desc: "Enter hole results as you play and watch standings update instantly" },
                { icon: "💰", title: "Live Payouts", desc: "See who's winning money before you finish the round" },
                { icon: "📊", title: "Multiple Views", desc: "Switch between Points, Nassau (Front/Back/Total), or both payout modes" },
                { icon: "🔄", title: "Smart Settlement", desc: "Our algorithm optimizes transactions—money changes hands only once" },
                { icon: "📱", title: "Works Offline", desc: "No signal on the course? No problem. Sync automatically later" },
                { icon: "🎨", title: "Beautiful Design", desc: "Clean, mobile-first interface that's a joy to use on the fairway" }
              ].map((feature, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="text-3xl flex-shrink-0">{feature.icon}</div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Phone mockup showing actual app screenshots - Both displayed */}
            <div className="flex justify-center gap-4">
              {/* First screenshot */}
              <div className="relative w-56 h-80 bg-gradient-to-br from-emerald-600 to-green-600 rounded-3xl shadow-2xl p-3 border-8 border-gray-900">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-3xl z-20"></div>
                {/* Screen content */}
                <div className="w-full h-full bg-white rounded-2xl overflow-hidden">
                  <img 
                    src={payoutScreenshot}
                    alt="ForeScore - Who Owes Who Payouts Screen" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              
              {/* Second screenshot */}
              <div className="relative w-56 h-80 bg-gradient-to-br from-emerald-600 to-green-600 rounded-3xl shadow-2xl p-3 border-8 border-gray-900">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-3xl z-20"></div>
                {/* Screen content */}
                <div className="w-full h-full bg-white rounded-2xl overflow-hidden">
                  <img 
                    src={bbbScreenshot}
                    alt="ForeScore - BBB Game Score Entry Screen" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Registration Section */}
        <div id="register-section" className="mb-16">
          <Card className="max-w-2xl mx-auto shadow-2xl border-2 border-emerald-200 bg-white/98">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold text-gray-900">Ready to Upgrade Your Golf Game?</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={handleInputChange('firstName')}
                      className={errors.firstName ? "border-red-500" : ""}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-red-500">{errors.firstName}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={handleInputChange('lastName')}
                      className={errors.lastName ? "border-red-500" : ""}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-500">{errors.lastName}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={formData.password}
                      onChange={handleInputChange('password')}
                      className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange('confirmPassword')}
                      className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                  )}
                </div>
                
                <div className="space-y-4 pt-2">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms-checkbox"
                      checked={formData.termsAccepted}
                      onCheckedChange={handleCheckboxChange('termsAccepted')}
                      className="mt-1"
                    />
                    <div className="space-y-1 leading-none">
                      <label
                        htmlFor="terms-checkbox"
                        className="text-sm cursor-pointer text-gray-900"
                      >
                        I accept the{" "}
                        <button
                          type="button"
                          onClick={openTermsDialog}
                          className="text-emerald-600 hover:text-emerald-700 underline"
                        >
                          Terms of Service
                        </button>
                        {" "}and{" "}
                        <button
                          type="button"
                          onClick={openPrivacyDialog}
                          className="text-emerald-600 hover:text-emerald-700 underline"
                        >
                          Privacy Policy
                        </button>
                      </label>
                      {errors.termsAccepted && (
                        <p className="text-sm text-red-500">{errors.termsAccepted}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="marketing-checkbox"
                      checked={formData.marketingConsent}
                      onCheckedChange={handleCheckboxChange('marketingConsent')}
                      className="mt-1"
                    />
                    <label
                      htmlFor="marketing-checkbox"
                      className="text-sm cursor-pointer text-gray-900"
                    >
                      I agree to receive marketing communications
                    </label>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold py-3 text-lg"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Creating Account..." : "Start Free Trial"}
                </Button>

                <p className="text-xs text-center text-gray-500">
                  7 days free • No credit card required • Cancel anytime
                </p>
              </form>

              <AppDownloadPrompt />
              
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <a href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                    Sign in
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pb-8">
          <p>© 2025 ForeScore. All rights reserved.</p>
        </div>
      </div>

      <LegalDialogs
        showTerms={showTermsDialog}
        showPrivacy={showPrivacyDialog}
        onOpenChange={handleDialogChange}
      />
    </div>
  );
}
