import { Router } from "express";
import {
  createSession,
  getSessionsByComponent,
  updateSession,
  deleteSession,
} from "../controllers/sessionController";

// Use mergeParams: true to merge params from parent route
const router = Router({ mergeParams: true });

// POST /components/:componentId/sessions - Create a session for a component
router.post("/", createSession);

// GET /components/:componentId/sessions - Get all sessions for a component
router.get("/", getSessionsByComponent);

// PUT /sessions/:id - Update a session
router.put("/:id", updateSession);

// DELETE /sessions/:id - Delete a session
router.delete("/:id", deleteSession);

export default router;

