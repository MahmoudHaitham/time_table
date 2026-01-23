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
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

  csrfTokens.set(`${sessionId}:${token}`, { token, expiresAt });

  // Set token in response header
  res.setHeader("X-CSRF-Token", token);

  return token;
};

/**
 * Validate CSRF token
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
    return res.status(403).json({
      success: false,
      message: "CSRF token required",
    });
  }

  const stored = csrfTokens.get(`${sessionId}:${token}`);

  if (!stored || stored.expiresAt < Date.now()) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired CSRF token",
    });
  }

  // Token is valid, remove it to prevent reuse
  csrfTokens.delete(`${sessionId}:${token}`);

  next();
};

/**
 * Middleware to add CSRF token to response
 */
export const addCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  // Generate and add CSRF token for authenticated users
  if ((req as any).user) {
    generateCSRFToken(req, res);
  }
  next();
};
