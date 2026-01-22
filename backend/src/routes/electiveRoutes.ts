import { Router } from "express";
import {
  setElectives,
  getElectives,
} from "../controllers/electiveController";

// Use mergeParams: true to merge params from parent route
const router = Router({ mergeParams: true });

// POST /terms/:termId/electives - Set allowed electives for a term
router.post("/", setElectives);

// GET /terms/:termId/electives - Get allowed electives for a term
router.get("/", getElectives);

export default router;

