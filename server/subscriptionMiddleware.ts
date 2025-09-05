import { Request, Response, NextFunction } from 'express';
import { stripeService } from './stripeService.js';

interface AuthenticatedRequest extends Request {
  user?: {
    claims: {
      sub: string;
      email?: string;
      first_name?: string;
      last_name?: string;
    };
    expires_at: number;
  };
}

/**
 * Middleware to check subscription access for protected routes
 * Allows access during 7-day trial or with active subscription
 */
export async function requireSubscriptionAccess(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) {
  try {
    // Must be authenticated first
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ 
        message: 'Authentication required',
        redirectTo: '/login'
      });
    }

    const userId = req.user.claims.sub;
    
    // Check subscription access (trial or active subscription)
    const accessInfo = await stripeService.hasAccess(userId);
    
    if (accessInfo.hasAccess) {
      // User has access - continue to protected route
      return next();
    }

    // No access - return subscription required response
    return res.status(403).json({
      message: 'Subscription required',
      redirectTo: '/subscribe',
      reason: accessInfo.reason,
      trialEndsAt: accessInfo.trialEndsAt
    });

  } catch (error) {
    console.error('Subscription middleware error:', error);
    
    // On error, be permissive to avoid blocking legitimate users
    // but log for investigation
    return next();
  }
}

/**
 * Public routes that don't require subscription access
 */
export const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register', 
  '/api/auth/logout',
  '/api/auth/user',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/update-password',
  '/api/subscription/plans',
  '/api/subscription/create',
  '/api/subscription/status',
  '/api/subscription/cancel',
  '/api/webhooks/stripe',
  '/api/admin/cleanup-old-games', // Admin routes that don't require user subscription
  '/api/user/preferences', // User preferences needed for app initialization
];

/**
 * Check if a route path is public (doesn't require subscription)
 */
export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    // Exact match or starts with route path
    return path === route || path.startsWith(route + '/');
  });
}