import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        // Get token from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (!token) {
          setStatus('error');
          setMessage('Invalid reset link. Please request a new password reset.');
          return;
        }

        // Send password reset request
        const response = await apiRequest('POST', '/api/auth/reset-password', { token });
        const result = await response.json();

        setStatus('success');
        setMessage(result.message);
        
        // Redirect to home after 2 seconds
        setTimeout(() => {
          setLocation('/');
        }, 2000);
      } catch (error) {
        setStatus('error');
        setMessage('Password reset failed. This link may have expired or already been used.');
      }
    };

    handlePasswordReset();
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">🏌️</span>
              </div>
              <span className="font-bold text-lg">ForeScore</span>
            </div>
            <CardTitle className="text-2xl">Password Reset</CardTitle>
            <CardDescription>
              {status === 'loading' && 'Processing your password reset...'}
              {status === 'success' && 'Password reset successful! Redirecting...'}
              {status === 'error' && 'Password reset failed'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'loading' && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            )}

            {status === 'success' && (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {status === 'error' && (
              <Alert className="border-red-200 bg-red-50 text-red-800">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {status === 'error' && (
              <div className="mt-4 text-center">
                <a 
                  href="/forgot-password" 
                  className="text-sm text-muted-foreground hover:text-emerald-600 transition-colors"
                  data-testid="link-request-new-reset-link"
                >
                  Request a new reset link
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}