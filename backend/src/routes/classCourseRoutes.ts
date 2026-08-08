import { Router } from "express";
import {
  assignCoursesToClass,
  getClassCourses,
  deleteClassCourse,
  patchClassCourse,
} from "../controllers/classCourseController";

// Use mergeParams: true to merge params from parent route
const router = Router({ mergeParams: true });

// POST /classes/:classId/courses - Assign courses to a class
router.post("/", assignCoursesToClass);

// GET /classes/:classId/courses - Get all courses for a class
router.get("/", getClassCourses);

export default router;

// Direct route for deleting or patching a class-course assignment
export const classCourseDirectRouter = Router();
classCourseDirectRouter.patch("/:id", patchClassCourse);
classCourseDirectRouter.delete("/:id", deleteClassCourse);

