import { Router } from "express";
import {
  createOtherDeptCourse,
  getOtherDeptCourses,
  upsertComponentSession,
  deleteComponentSession,
  deleteOtherDeptCourse,
} from "../controllers/otherDeptController";

const router = Router();

// POST /other-dept/courses - Create a course for other departments
router.post("/courses", createOtherDeptCourse);

// GET /other-dept/courses - Get all courses for other departments
router.get("/courses", getOtherDeptCourses);

// PUT /other-dept/components/:componentId/session - Create or update session for a component
router.put("/components/:componentId/session", upsertComponentSession);

// DELETE /other-dept/components/:componentId/session - Delete session for a component
router.delete("/components/:componentId/session", deleteComponentSession);

// DELETE /other-dept/courses/:courseId - Delete a course for other departments
router.delete("/courses/:courseId", deleteOtherDeptCourse);

export default router;
