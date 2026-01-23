import { Router } from "express";
import {
  createClass,
  getClassesByTerm,
  deleteClass,
} from "../controllers/classController";
import { validateClassCode, validateIdParam } from "../middleware/validation";

// Use mergeParams: true to merge params from parent route
const router = Router({ mergeParams: true });

// POST /terms/:termId/classes - Create a new class for a term
router.post("/", validateClassCode, createClass);

// GET /terms/:termId/classes - Get all classes for a term
router.get("/", getClassesByTerm);

// DELETE /terms/:termId/classes/:id - Delete a class
router.delete("/:id", validateIdParam("id"), deleteClass);

export default router;

