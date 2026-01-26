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
  getAdminTermCourses,
} from "../controllers/timetableViewController";
import {
  getAllTemplates,
  preGenerateTemplatesForTerm,
  invalidateTermTemplates,
  cleanupTemplates,
  deleteTemplate,
} from "../controllers/scheduleTemplateController";
import { rateLimiters } from "../middleware/rateLimiter";
import { sanitizeQueryArray } from "../middleware/validation";
import { requireAuth, requireAdmin } from "../middleware/auth";

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

// **ADMIN ENDPOINTS - Schedule Template Management**
// GET /timetable/admin/templates - Get all schedule templates (admin only)
router.get("/admin/templates", requireAuth, requireAdmin, getAllTemplates);

// GET /timetable/admin/terms/:termId/courses - Get all courses for a term (admin only, uses raw term ID)
router.get("/admin/terms/:termId/courses", requireAuth, requireAdmin, getAdminTermCourses);

// POST /timetable/admin/templates/generate/:termId - Pre-generate templates for a term (admin only)
router.post("/admin/templates/generate/:termId", requireAuth, requireAdmin, preGenerateTemplatesForTerm);

// DELETE /timetable/admin/templates/:termId/invalidate - Invalidate all templates for a term (admin only)
router.delete("/admin/templates/:termId/invalidate", requireAuth, requireAdmin, invalidateTermTemplates);

// DELETE /timetable/admin/templates/:templateId - Delete a specific template (admin only)
router.delete("/admin/templates/:templateId", requireAuth, requireAdmin, deleteTemplate);

// POST /timetable/admin/templates/cleanup - Cleanup old templates (admin only)
router.post("/admin/templates/cleanup", requireAuth, requireAdmin, cleanupTemplates);

export default router;

