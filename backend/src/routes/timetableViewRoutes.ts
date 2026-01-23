import { Router } from "express";
import {
  getPublishedTerms,
  getTermTimetable,
  getClassTimetable,
  getCoreCourses,
  getElectiveCourses,
  getAllCoursesForOther,
  getAllElectiveSlots,
  generateTimetableSchedules,
  generateOtherSectionSchedules,
  getInstructorsForTerm,
  getInstructorsForCourses,
} from "../controllers/timetableViewController";
import { rateLimiters } from "../middleware/rateLimiter";
import { sanitizeQueryArray } from "../middleware/validation";

const router = Router();

// GET /timetable/terms - Get all published terms (public/student access)
router.get("/terms", getPublishedTerms);

// GET /timetable/terms/:termId - Get full timetable for a published term
router.get("/terms/:termId", getTermTimetable);

// GET /timetable/terms/:termId/core-courses - Get core courses for a term
router.get("/terms/:termId/core-courses", getCoreCourses);

// GET /timetable/terms/:termId/elective-courses - Get elective courses for a term
router.get("/terms/:termId/elective-courses", getElectiveCourses);

// GET /timetable/terms/:termId/instructors - Get instructors for courses in a term
router.get("/terms/:termId/instructors", sanitizeQueryArray("selectedCourseIds", 100), getInstructorsForTerm);

// GET /timetable/instructors/courses - Get instructors for specific course IDs (for "Other" section)
router.get("/instructors/courses", sanitizeQueryArray("courseIds", 100), getInstructorsForCourses);

// GET /timetable/other/courses - Get all courses from all terms for "Other" section
router.get("/other/courses", getAllCoursesForOther);

// GET /timetable/electives/slots - Get all elective slots across all terms for a system
router.get("/electives/slots", getAllElectiveSlots);

// POST /timetable/generate - Generate timetable schedules (heavy computation) - strict rate limiting
router.post("/generate", rateLimiters.scheduleGeneration, generateTimetableSchedules);

// POST /timetable/other/generate - Generate timetable schedules for "Other" section - strict rate limiting
router.post("/other/generate", rateLimiters.scheduleGeneration, generateOtherSectionSchedules);

// GET /timetable/classes/:classId - Get timetable for a specific class
router.get("/classes/:classId", getClassTimetable);

export default router;

