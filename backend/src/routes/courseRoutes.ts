import { Router } from "express";
import {
  createCourse,
  getAllCourses,
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

// GET /courses/:id - Get course by ID
router.get("/:id", validateIdParam("id"), getCourseById);

// PUT /courses/:id - Update course
router.put("/:id", validateIdParam("id"), validateCourseInput, updateCourse);

// DELETE /courses/:id - Delete course
router.delete("/:id", validateIdParam("id"), deleteCourse);

export default router;

