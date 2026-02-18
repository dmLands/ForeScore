import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function AccountDeleted() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center space-y-6 p-8 max-w-sm">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="h-8 w-8 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Account Deleted</h1>
        <p className="text-gray-500">
          Your ForeScore account and all associated data have been permanently removed.
        </p>
        <Button
          variant="outline"
          onClick={() => { window.location.href = '/'; }}
          className="mt-4"
        >
          Return to Home
        </Button>
      </div>
    </div>
  );
}
