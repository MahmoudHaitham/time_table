# Redis-Based Rate Limiting (For Production)

## Why Redis?

**Current Issue:** In-memory rate limiting doesn't work with:
- Multiple server instances (load balancer)
- Server restarts (counters reset)
- Horizontal scaling

**Solution:** Use Redis for distributed rate limiting

---

## Installation

```bash
cd backend
npm install ioredis
npm install --save-dev @types/ioredis
```

---

## Implementation

### Option 1: Redis with Fallback (Recommended)

**File:** `backend/src/middleware/rateLimiter.ts`

```typescript
import { Request, Response, NextFunction } from "express";
import Redis from "ioredis";

// Initialize Redis client (with fallback to memory)
let redis: Redis | null = null;

try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });
    
    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err);
      redis = null; // Fallback to memory
    });
    
    redis.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });
  }
} catch (error) {
  console.warn('[Redis] Failed to initialize, using in-memory rate limiting');
  redis = null;
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
    // Clean up expired entries every minute (only if using memory)
    if (!redis) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 60 * 1000);
    }
  }

  private getClientId(req: Request): string {
    const userId = (req as any).user?.userId;
    if (userId) {
      return `user:${userId}`;
    }
    
    const ip = req.ip || 
               req.headers['x-forwarded-for']?.toString().split(',')[0] || 
               req.socket.remoteAddress || 
               'unknown';
    return `ip:${ip}`;
  }

  private cleanup(): void {
    if (redis) return; // Redis handles expiration automatically
    
    const now = Date.now();
    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    }
  }

  createLimiter(maxRequests: number, windowMs: number) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const clientId = this.getClientId(req);
      const key = `ratelimit:${clientId}:${req.path}`;
      const now = Date.now();

      if (redis) {
        // Redis-based rate limiting
        try {
          const count = await redis.incr(key);
          
          // Set expiration on first request
          if (count === 1) {
            await redis.pexpire(key, windowMs);
          }

          const ttl = await redis.pttl(key);
          const retryAfter = Math.ceil(ttl / 1000);

          if (count > maxRequests) {
            // Log rate limit hit
            console.warn(`[RATE_LIMIT] ${clientId} exceeded limit on ${req.path}`, {
              ip: req.ip,
              userId: (req as any).user?.userId,
              path: req.path,
              method: req.method,
              limit: maxRequests,
              count,
            });

            let message = `Rate limit exceeded. Please try again in ${retryAfter} seconds.`;
            if (req.path.includes('/login')) {
              message = `Too many login attempts. Please wait ${retryAfter} seconds.`;
            } else if (req.path.includes('/refresh')) {
              message = `Too many token refresh requests. Please wait ${retryAfter} seconds.`;
            }

            res.setHeader('Retry-After', retryAfter.toString());
            res.setHeader('X-RateLimit-Limit', maxRequests.toString());
            res.setHeader('X-RateLimit-Remaining', '0');
            res.setHeader('X-RateLimit-Reset', new Date(now + ttl).toISOString());
            
            return res.status(429).json({
              success: false,
              message,
              retryAfter,
              limit: maxRequests,
              window: Math.ceil(windowMs / 1000),
            });
          }

          // Set headers
          res.setHeader('X-RateLimit-Limit', maxRequests.toString());
          res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count).toString());
          res.setHeader('X-RateLimit-Reset', new Date(now + ttl).toISOString());
          res.setHeader('X-RateLimit-Window', Math.ceil(windowMs / 1000).toString());

          next();
        } catch (error) {
          console.error('[Redis] Rate limit error, falling back to memory:', error);
          // Fallback to memory-based rate limiting
          redis = null;
          // Continue with memory-based logic below
        }
      }

      // Memory-based rate limiting (fallback or default)
      let entry = this.store[clientId];
      
      if (!entry || entry.resetTime < now) {
        entry = {
          count: 0,
          resetTime: now + windowMs,
        };
        this.store[clientId] = entry;
      }

      entry.count++;

      if (entry.count > maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        
        console.warn(`[RATE_LIMIT] ${clientId} exceeded limit on ${req.path}`, {
          ip: req.ip,
          userId: (req as any).user?.userId,
          path: req.path,
          method: req.method,
          limit: maxRequests,
        });

        let message = `Rate limit exceeded. Please try again in ${retryAfter} seconds.`;
        if (req.path.includes('/login')) {
          message = `Too many login attempts. Please wait ${retryAfter} seconds.`;
        } else if (req.path.includes('/refresh')) {
          message = `Too many token refresh requests. Please wait ${retryAfter} seconds.`;
        }

        return res.status(429).json({
          success: false,
          message,
          retryAfter,
          limit: maxRequests,
          window: Math.ceil(windowMs / 1000),
        });
      }

      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
      res.setHeader('X-RateLimit-Window', Math.ceil(windowMs / 1000).toString());

      next();
    };
  }
}

export const rateLimiter = new RateLimiter();

export const rateLimiters = {
  login: rateLimiter.createLimiter(10, 15 * 60 * 1000),
  general: rateLimiter.createLimiter(100, 60 * 1000),
  timetable: rateLimiter.createLimiter(50, 60 * 1000),
  scheduleGeneration: rateLimiter.createLimiter(10, 60 * 1000),
  public: rateLimiter.createLimiter(200, 60 * 1000),
  refreshToken: rateLimiter.createLimiter(20, 60 * 1000),
};
```

---

## Environment Variables

**Add to `.env`:**

```env
# Redis (optional - falls back to memory if not set)
REDIS_URL=redis://localhost:6379

# For production with password:
REDIS_URL=redis://:password@your-redis-host:6379

# For Redis Cloud or other providers:
REDIS_URL=rediss://username:password@host:port
```

---

## Testing Redis Rate Limiting

```bash
# Start Redis locally (if testing)
docker run -d -p 6379:6379 redis:alpine

# Or use Redis Cloud (free tier available)
# https://redis.com/try-free/
```

---

## Production Deployment

### Option 1: Redis Cloud (Easiest)
1. Sign up at https://redis.com/try-free/
2. Get connection URL
3. Add to environment variables
4. Deploy

### Option 2: Self-Hosted Redis
1. Install Redis on your server
2. Configure connection
3. Add REDIS_URL to environment

### Option 3: Docker Redis
```yaml
# docker-compose.yml
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

---

## Benefits

✅ **Distributed:** Works across multiple servers  
✅ **Persistent:** Survives server restarts  
✅ **Scalable:** Handles high traffic  
✅ **Fallback:** Works without Redis (single server)  
✅ **Monitoring:** Can query Redis for rate limit stats  

---

## Monitoring

```bash
# Check Redis keys
redis-cli KEYS "ratelimit:*"

# Get specific rate limit count
redis-cli GET "ratelimit:ip:127.0.0.1:/api/auth/login"

# Monitor in real-time
redis-cli MONITOR
```

---

**Priority:** Implement Redis before deploying multiple server instances!
