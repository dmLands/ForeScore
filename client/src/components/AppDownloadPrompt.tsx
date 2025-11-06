import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, X } from "lucide-react";

export default function AppDownloadPrompt() {
  const [isPWA, setIsPWA] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Detect if app is running in PWA mode
    const checkPWAMode = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isWebkitStandalone = (window.navigator as any).standalone === true;
      const isInWebAppiOS = window.navigator.userAgent.includes('Mobile') && !window.navigator.userAgent.includes('Safari');
      
      return isStandalone || isWebkitStandalone || isInWebAppiOS;
    };

    setIsPWA(checkPWAMode());
    
    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('downloadPromptDismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDownloadClick = () => {
    // Show manual installation instructions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      alert('To install ForeScore:\n\n1. Tap the Share button (□↗)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to install the app');
    } else if (isAndroid) {
      alert('To install ForeScore:\n\n1. Tap the menu (⋮) in your browser\n2. Tap "Install app" or "Add to Home screen"\n3. Follow the prompts to install');
    } else {
      alert('To install ForeScore:\n\n1. Look for the install icon (⊕) in your browser address bar\n2. Or go to browser menu → "Install ForeScore"\n3. Follow the prompts to install the app');
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('downloadPromptDismissed', 'true');
  };

  // Don't show prompt if already in PWA mode or dismissed
  if (isPWA || isDismissed) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg relative">
      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-emerald-600 hover:text-emerald-800 transition-colors"
        data-testid="button-close-download-prompt"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-center space-x-2 mb-2">
        <Smartphone className="h-5 w-5 text-emerald-600" />
        <h3 className="font-semibold text-emerald-900">Get the ForeScore WebApp</h3>
      </div>
      <p className="text-sm text-emerald-700 mb-3">
        Bookmark ForeScore for faster access, offline scoring, and a native app experience.
      </p>
      <Button
        onClick={handleDownloadClick}
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
        data-testid="button-download-app"
      >
        <Download className="h-4 w-4 mr-2" />
        Download App
      </Button>
    </div>
  );
}