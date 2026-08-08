import { Router } from "express";
import { createProblem, getProblems, updateProblemStatus } from "../controllers/studentProblemController";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { validateCSRFToken, addCSRFToken } from "../middleware/csrf";

const router = Router();

// POST / - Submit problem (public, rate-limited in app.ts)
router.post("/", createProblem);

// GET / - List all problems (admin only)
router.get("/", requireAuth, validateCSRFToken, addCSRFToken, requireAdmin, getProblems);

// PATCH /:id - Update problem status (admin only)
router.patch("/:id", requireAuth, validateCSRFToken, addCSRFToken, requireAdmin, updateProblemStatus);

export default router;
