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
} from "../controllers/timetableViewController";

const router = Router();

// GET /timetable/terms - Get all published terms (public/student access)
router.get("/terms", getPublishedTerms);

// GET /timetable/terms/:termId - Get full timetable for a published term
router.get("/terms/:termId", getTermTimetable);

// GET /timetable/terms/:termId/core-courses - Get core courses for a term
router.get("/terms/:termId/core-courses", getCoreCourses);

// GET /timetable/terms/:termId/elective-courses - Get elective courses for a term
router.get("/terms/:termId/elective-courses", getElectiveCourses);

// GET /timetable/other/courses - Get all courses from all terms for "Other" section
router.get("/other/courses", getAllCoursesForOther);

// GET /timetable/electives/slots - Get all elective slots across all terms for a system
router.get("/electives/slots", getAllElectiveSlots);

// POST /timetable/generate - Generate timetable schedules (heavy computation)
router.post("/generate", generateTimetableSchedules);

// POST /timetable/other/generate - Generate timetable schedules for "Other" section
router.post("/other/generate", generateOtherSectionSchedules);

// GET /timetable/classes/:classId - Get timetable for a specific class
router.get("/classes/:classId", getClassTimetable);

export default router;

