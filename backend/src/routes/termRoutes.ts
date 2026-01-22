import { Router } from "express";
import {
  createTerm,
  getAllTerms,
  getTermById,
  updateTerm,
  publishTerm,
  unpublishTerm,
  validateTermEndpoint,
  deleteTerm,
} from "../controllers/termController";

const router = Router();

// IMPORTANT: More specific routes must be registered BEFORE less specific ones
// POST /terms/:id/publish - Publish term (more specific, must come before /:id)
router.post("/:id/publish", publishTerm);

// POST /terms/:id/unpublish - Unpublish term (more specific, must come before /:id)
router.post("/:id/unpublish", unpublishTerm);

// POST /terms/:id/validate - Validate term (more specific, must come before /:id)
router.post("/:id/validate", validateTermEndpoint);

// POST /terms - Create a new term
router.post("/", createTerm);

// GET /terms - Get all terms
router.get("/", getAllTerms);

// GET /terms/:id - Get term by ID (less specific, comes after specific routes)
router.get("/:id", getTermById);

// PUT /terms/:id - Update term
router.put("/:id", updateTerm);

// DELETE /terms/:id - Delete term
router.delete("/:id", deleteTerm);

export default router;

