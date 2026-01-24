import { Router } from "express";
import {
  createCourse,
  getAllCourses,
  getAllCoursesWithAssignments,
  getCourseById,
  updateCourse,
  deleteCourse,
} from "../controllers/courseController";
import { validateCourseInput, validateIdParam } from "../middleware/validation";

const router = Router();

// POST /courses - Create a new course
router.post("/", validateCourseInput, createCourse);

// GET /courses - Get all courses
router.get("/", getAllCourses);

// GET /courses/with-assignments - Get all courses with complete assignment data (optimized)
router.get("/with-assignments", getAllCoursesWithAssignments);

// GET /courses/:id - Get course by ID
router.get("/:id", validateIdParam("id"), getCourseById);

// PUT /courses/:id - Update course
router.put("/:id", validateIdParam("id"), validateCourseInput, updateCourse);

// DELETE /courses/:id - Delete course
router.delete("/:id", validateIdParam("id"), deleteCourse);

export default router;

