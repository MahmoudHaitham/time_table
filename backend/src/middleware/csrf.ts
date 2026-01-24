import { Request, Response, NextFunction } from "express";
import * as crypto from "crypto";

/**
 * CSRF Protection Middleware
 * Generates and validates CSRF tokens for state-changing operations
 */

// Store CSRF tokens (in production, use Redis or similar)
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expiresAt < now) {
      csrfTokens.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate CSRF token
 */
export const generateCSRFToken = (req: Request, res: Response): string => {
  const sessionId = (req as any).user?.userId?.toString() || req.ip || "anonymous";
  
  // Check if user already has a valid token
  for (const [key, value] of csrfTokens.entries()) {
    if (key.startsWith(`${sessionId}:`) && value.expiresAt > Date.now()) {
      // Reuse existing token
      res.setHeader("X-CSRF-Token", value.token);
      return value.token;
    }
  }
  
  // Generate new token only if none exists
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

  const tokenKey = `${sessionId}:${token}`;
  csrfTokens.set(tokenKey, { token, expiresAt });

  // Set token in response header
  res.setHeader("X-CSRF-Token", token);

  return token;
};

/**
 * Validate CSRF token (reusable - doesn't delete token after validation)
 */
export const validateCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Skip CSRF for public endpoints (auth routes)
  if (req.path.startsWith("/api/auth/login") || req.path.startsWith("/api/auth/register")) {
    return next();
  }

  const sessionId = (req as any).user?.userId?.toString() || req.ip || "anonymous";
  const token = req.headers["x-csrf-token"] as string;

  if (!token) {
    // Generate a new token for client
    generateCSRFToken(req, res);
    return res.status(403).json({
      success: false,
      message: "CSRF token required",
    });
  }

  // Check if token exists and is valid (reusable - don't delete)
  const tokenKey = `${sessionId}:${token}`;
  const stored = csrfTokens.get(tokenKey);

  if (!stored || stored.expiresAt < Date.now()) {
    // Generate a new token for client
    generateCSRFToken(req, res);
    return res.status(403).json({
      success: false,
      message: "Invalid or expired CSRF token",
    });
  }

  // Token is valid - keep it for reuse, just update expiry
  stored.expiresAt = Date.now() + 60 * 60 * 1000; // Refresh expiry

  next();
};

/**
 * Middleware to add CSRF token to response (for GET requests)
 */
export const addCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user && !res.getHeader("X-CSRF-Token")) {
    generateCSRFToken(req, res);
  }
  next();
};
