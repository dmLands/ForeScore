import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { APP_VERSION } from '@shared/version';

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000;

export function VersionChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const initialLoadRef = useRef(true);
  const hasShownUpdateRef = useRef(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch('/api/version', {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        const data = await response.json();
        
        if (data.version !== APP_VERSION && !hasShownUpdateRef.current) {
          console.log(`Update available: ${APP_VERSION} → ${data.version}`);
          hasShownUpdateRef.current = true;
          setUpdateAvailable(true);
        }
      } catch (error) {
        console.error('Failed to check version:', error);
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, VERSION_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'SW_UPDATED' && !hasShownUpdateRef.current) {
          console.log(`Service Worker updated to version ${event.data.version}`);
          hasShownUpdateRef.current = true;
          setUpdateAvailable(true);
        }
      };

      const handleControllerChange = async () => {
        // Ignore the first controllerchange event on initial page load
        if (initialLoadRef.current) {
          initialLoadRef.current = false;
          return;
        }

        // Only show update if there's actually a waiting service worker
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration?.waiting && !hasShownUpdateRef.current) {
          console.log('Service Worker controller changed with waiting worker, update available');
          hasShownUpdateRef.current = true;
          setUpdateAvailable(true);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      // Mark initial load complete after a short delay
      setTimeout(() => {
        initialLoadRef.current = false;
      }, 2000);

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }
  }, []);

  const handleUpdate = async () => {
    setIsReloading(true);
    
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    window.location.reload();
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
      <Card className="border-emerald-500 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-emerald-500" />
            Update Available
          </CardTitle>
          <CardDescription className="text-xs">
            A new version of ForeScore is available
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <Button
            onClick={handleUpdate}
            disabled={isReloading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            data-testid="button-update-app"
          >
            {isReloading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Now'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
