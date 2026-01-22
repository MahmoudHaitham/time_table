/**
 * Secure token utilities for term IDs
 * Encodes term IDs into secure tokens to prevent direct ID access
 */

import * as crypto from "crypto";

// Secret key for token generation (should be in environment variable in production)
const TERM_TOKEN_SECRET = process.env.TERM_TOKEN_SECRET || "your-secret-key-change-in-production-2024";

/**
 * Encode a term ID into a secure token
 * Uses HMAC-SHA256 to create a deterministic but secure token
 */
export function encodeTermId(termId: number): string {
  const hmac = crypto.createHmac("sha256", TERM_TOKEN_SECRET);
  hmac.update(`term_${termId}`);
  const hash = hmac.digest("hex");
  
  // Combine term ID with hash for easy decoding, but hash prevents tampering
  // Format: base64url(termId:hash)
  const payload = `${termId}:${hash}`;
  return Buffer.from(payload).toString("base64url");
}

/**
 * Decode a term token and validate it
 * Returns the term ID if token is valid, null otherwise
 */
export function decodeTermToken(token: string): number | null {
  try {
    // Decode base64url
    const payload = Buffer.from(token, "base64url").toString("utf-8");
    const [termIdStr, hash] = payload.split(":");
    
    if (!termIdStr || !hash) {
      return null;
    }
    
    const termId = parseInt(termIdStr, 10);
    if (isNaN(termId) || termId <= 0) {
      return null;
    }
    
    // Validate hash
    const hmac = crypto.createHmac("sha256", TERM_TOKEN_SECRET);
    hmac.update(`term_${termId}`);
    const expectedHash = hmac.digest("hex");
    
    // Use timing-safe comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash))) {
      return null; // Invalid token - hash doesn't match
    }
    
    return termId;
  } catch (error) {
    console.error("[decodeTermToken] Error decoding token:", error);
    return null;
  }
}

/**
 * Validate if a token is valid (without decoding)
 */
export function isValidTermToken(token: string): boolean {
  return decodeTermToken(token) !== null;
}
