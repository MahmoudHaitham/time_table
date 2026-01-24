import { Router } from "express";
import { register, login, getCurrentUser, refreshToken, logout } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import { rateLimiters, rateLimiter } from "../middleware/rateLimiter";
import { addCSRFToken } from "../middleware/csrf";

const router = Router();

// POST /auth/register - Register a new admin user (rate limited)
router.post("/register", rateLimiters.general, register);

// POST /auth/login - Login (strict rate limiting to prevent brute force)
// Increased to 10 attempts per 15 minutes for better UX while still preventing brute force
router.post("/login", rateLimiters.login, login);

// POST /auth/refresh - Refresh access token (rate limited to prevent abuse)
router.post("/refresh", rateLimiters.refreshToken, refreshToken);

// POST /auth/logout - Logout
router.post("/logout", requireAuth, logout);

// GET /auth/me - Get current user (protected) - Add CSRF token to response
router.get("/me", requireAuth, addCSRFToken, getCurrentUser);

export default router;

