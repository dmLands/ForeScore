import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    
    if (isStandalone || isInWebAppiOS) {
      setIsInstalled(true);
      return;
    }

    // Check if user has dismissed the install prompt in this session
    const dismissedInSession = sessionStorage.getItem('pwa-install-dismissed');
    if (dismissedInSession) {
      setDismissed(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show install button after a short delay for better UX
    const timer = setTimeout(() => {
      if (!isInstalled && !dismissed) {
        setShowInstallButton(true);
      }
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowInstallButton(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallButton(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (isInstalled || dismissed || !showInstallButton) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Download className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-emerald-900">Install ForeScore App</h3>
          </div>
          <p className="text-sm text-emerald-700 mb-3">
            Install ForeScore on your device for faster access and offline score tracking.
          </p>
          <div className="flex space-x-2">
            <Button
              onClick={handleInstallClick}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="button-install-app"
            >
              <Download className="h-4 w-4 mr-2" />
              Install App
            </Button>
            <Button
              onClick={handleDismiss}
              size="sm"
              variant="outline"
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              data-testid="button-dismiss-install"
            >
              Later
            </Button>
          </div>
        </div>
        <Button
          onClick={handleDismiss}
          size="sm"
          variant="ghost"
          className="ml-2 h-6 w-6 p-0 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100"
          data-testid="button-close-install"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}