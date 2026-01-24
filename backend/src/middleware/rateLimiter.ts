/**
 * Rate limiting middleware for API endpoints
 * Prevents abuse and ensures fair resource usage for high concurrent users
 * Database pool supports up to 100 concurrent connections
 * 
 * PRODUCTION NOTE: For multi-server deployments, use Redis-based rate limiting
 */

import { Request, Response, NextFunction } from "express";

// Extend Request type to include cookies (if cookie-parser is used)
interface RequestWithCookies extends Request {
  cookies?: {
    [key: string]: string;
  };
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Get client identifier (IP address or user ID)
   */
  private getClientId(req: Request): string {
    // Try to get user ID from auth token if available
    const userId = (req as any).user?.userId;
    if (userId) {
      return `user:${userId}`;
    }
    
    // Fallback to IP address
    const ip = req.ip || 
               req.headers['x-forwarded-for']?.toString().split(',')[0] || 
               req.socket.remoteAddress || 
               'unknown';
    return `ip:${ip}`;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    }
  }

  /**
   * Create rate limiter middleware
   */
  createLimiter(maxRequests: number, windowMs: number) {
    return (req: Request, res: Response, next: NextFunction) => {
      // For refresh endpoint: Skip rate limiting if no refresh token cookie
      // This allows auth errors (401) to be returned instead of rate limit (429)
      const reqWithCookies = req as RequestWithCookies;
      if (req.path.includes('/refresh') && (!reqWithCookies.cookies || !reqWithCookies.cookies.refreshToken)) {
        return next(); // Let auth controller handle missing token (returns 401)
      }

      const clientId = this.getClientId(req);
      const now = Date.now();
      
      // Get or create entry for this client
      let entry = this.store[clientId];
      
      if (!entry || entry.resetTime < now) {
        // Create new window
        entry = {
          count: 0,
          resetTime: now + windowMs,
        };
        this.store[clientId] = entry;
      }

      // Increment count
      entry.count++;

      // Check if limit exceeded
      if (entry.count > maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        
        // Log rate limit hit for monitoring
        console.warn(`[RATE_LIMIT] ${clientId} exceeded limit on ${req.path}`, {
          ip: req.ip,
          userId: (req as any).user?.userId,
          path: req.path,
          method: req.method,
          limit: maxRequests,
          window: Math.ceil(windowMs / 1000),
          retryAfter,
        });

        // User-friendly error messages based on endpoint
        // Always include "Rate limit exceeded" for test compatibility
        let message = `Rate limit exceeded. Please try again in ${retryAfter} seconds.`;
        if (req.path.includes('/login')) {
          message = `Rate limit exceeded. Too many login attempts. Please wait ${retryAfter} seconds before trying again.`;
        } else if (req.path.includes('/refresh')) {
          message = `Rate limit exceeded. Too many token refresh requests. Please wait ${retryAfter} seconds.`;
        }

        return res.status(429).json({
          success: false,
          message,
          retryAfter,
          limit: maxRequests,
          window: Math.ceil(windowMs / 1000), // Window in seconds
        });
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
      res.setHeader('X-RateLimit-Window', Math.ceil(windowMs / 1000).toString());

      next();
    };
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Pre-configured rate limiters for different endpoints
 * 
 * PRODUCTION RECOMMENDATIONS:
 * - Use Redis for distributed rate limiting (multiple servers)
 * - Adjust limits based on actual traffic patterns
 * - Monitor rate limit hits and adjust accordingly
 */
export const rateLimiters = {
  // Login: 10 attempts per 15 minutes (increased from 5 for better UX)
  // Still prevents brute force while allowing legitimate retries
  login: rateLimiter.createLimiter(10, 15 * 60 * 1000),
  
  // General API: 100 requests per minute
  general: rateLimiter.createLimiter(100, 60 * 1000),
  
  // Timetable queries: 50 requests per minute (heavier queries)
  timetable: rateLimiter.createLimiter(50, 60 * 1000),
  
  // Schedule generation: 10 requests per minute (very heavy computation)
  scheduleGeneration: rateLimiter.createLimiter(10, 60 * 1000),
  
  // Public endpoints: More lenient (200 requests per minute)
  public: rateLimiter.createLimiter(200, 60 * 1000),
  
  // Refresh token: 20 requests per minute (prevents abuse)
  refreshToken: rateLimiter.createLimiter(20, 60 * 1000),
};
