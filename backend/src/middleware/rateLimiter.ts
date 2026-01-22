/**
 * Rate limiting middleware for API endpoints
 * Prevents abuse and ensures fair resource usage for 100-300 concurrent users
 */

import { Request, Response, NextFunction } from "express";

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
    const userId = (req as any).user?.id;
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
        return res.status(429).json({
          success: false,
          message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        });
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

      next();
    };
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Pre-configured rate limiters for different endpoints
 */
export const rateLimiters = {
  // General API: 100 requests per minute
  general: rateLimiter.createLimiter(100, 60 * 1000),
  
  // Timetable queries: 50 requests per minute (heavier queries)
  timetable: rateLimiter.createLimiter(50, 60 * 1000),
  
  // Schedule generation: 10 requests per minute (very heavy computation)
  scheduleGeneration: rateLimiter.createLimiter(10, 60 * 1000),
  
  // Public endpoints: More lenient (200 requests per minute)
  public: rateLimiter.createLimiter(200, 60 * 1000),
};
