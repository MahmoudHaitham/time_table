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
import { validateTermInput, validateIdParam } from "../middleware/validation";

const router = Router();

// IMPORTANT: More specific routes must be registered BEFORE less specific ones
// POST /terms/:id/publish - Publish term (more specific, must come before /:id)
router.post("/:id/publish", validateIdParam("id"), publishTerm);

// POST /terms/:id/unpublish - Unpublish term (more specific, must come before /:id)
router.post("/:id/unpublish", validateIdParam("id"), unpublishTerm);

// POST /terms/:id/validate - Validate term (more specific, must come before /:id)
router.post("/:id/validate", validateIdParam("id"), validateTermEndpoint);

// POST /terms - Create a new term
router.post("/", validateTermInput, createTerm);

// GET /terms - Get all terms
router.get("/", getAllTerms);

// GET /terms/:id - Get term by ID (less specific, comes after specific routes)
router.get("/:id", validateIdParam("id"), getTermById);

// PUT /terms/:id - Update term
router.put("/:id", validateIdParam("id"), validateTermInput, updateTerm);

// DELETE /terms/:id - Delete term
router.delete("/:id", validateIdParam("id"), deleteTerm);

export default router;

