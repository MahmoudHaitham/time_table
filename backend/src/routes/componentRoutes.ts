import { Router } from "express";
import {
  createComponents,
  getComponents,
} from "../controllers/componentController";

// Use mergeParams: true to merge params from parent route
const router = Router({ mergeParams: true });

// POST /class-courses/:id/components - Create components for a class-course
router.post("/", createComponents);

// GET /class-courses/:id/components - Get all components for a class-course
router.get("/", getComponents);

export default router;

