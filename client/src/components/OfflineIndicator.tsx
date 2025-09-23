import { Wifi, WifiOff, Upload, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export default function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, syncOfflineData } = useOfflineSync();

  if (isOnline && pendingCount === 0) {
    return null; // Don't show anything when online with no pending data
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-xs">
      <div className={`p-3 rounded-lg shadow-lg border ${
        isOnline 
          ? 'bg-emerald-50 border-emerald-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-emerald-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-yellow-600" />
          )}
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium ${
                isOnline ? 'text-emerald-900' : 'text-yellow-900'
              }`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
              
              {pendingCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {pendingCount} pending
                </Badge>
              )}
            </div>
            
            {!isOnline && (
              <p className="text-xs text-yellow-700 mt-1">
                Scores will sync when connection returns
              </p>
            )}
            
            {isOnline && pendingCount > 0 && (
              <div className="flex items-center mt-2">
                {isSyncing ? (
                  <div className="flex items-center text-xs text-emerald-700">
                    <Upload className="h-3 w-3 mr-1 animate-pulse" />
                    Syncing...
                  </div>
                ) : (
                  <Button
                    onClick={syncOfflineData}
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs px-2 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                    data-testid="button-manual-sync"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Sync Now
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}