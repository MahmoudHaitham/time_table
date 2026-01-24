import { Router } from "express";
import {
  updateSession,
  deleteSession,
  getAllInstructors,
  getInstructorSessions,
  getAllInstructorsSchedule,
  getAllInstructorsWithSessions,
} from "../controllers/sessionController";

const router = Router();

// GET /api/sessions/instructors - Get all unique instructor names
router.get("/instructors", getAllInstructors);

// GET /api/sessions/instructors/schedule - Get all instructors with their schedules (for admin)
router.get("/instructors/schedule", getAllInstructorsSchedule);

// GET /api/sessions/instructors/with-sessions - Get all instructors with complete session data (optimized, cached)
router.get("/instructors/with-sessions", getAllInstructorsWithSessions);

// GET /api/sessions/instructor/:instructorName - Get all sessions for an instructor
router.get("/instructor/:instructorName", getInstructorSessions);

// PUT /api/sessions/:id - Update a session by ID
router.put("/:id", updateSession);

// DELETE /api/sessions/:id - Delete a session by ID
router.delete("/:id", deleteSession);

export default router;

