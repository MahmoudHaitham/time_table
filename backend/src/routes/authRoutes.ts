import { Router } from "express";
import { register, login, getCurrentUser } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// POST /auth/register - Register a new admin user
router.post("/register", register);

// POST /auth/login - Login
router.post("/login", login);

// GET /auth/me - Get current user (protected)
router.get("/me", requireAuth, getCurrentUser);

export default router;

