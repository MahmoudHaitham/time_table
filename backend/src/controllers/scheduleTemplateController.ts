/**
 * Admin endpoints for managing schedule templates
 */

import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { ScheduleTemplate } from "../entities/ScheduleTemplate";
import { Term } from "../entities/Term";
import { Class } from "../entities/Class";
import { ClassCourse } from "../entities/ClassCourse";
import { Course } from "../entities/Course";
import { CourseComponent } from "../entities/CourseComponent";
import { Session } from "../entities/Session";
import { In } from "typeorm";
import { invalidateTemplatesForTerm, cleanupOldTemplates } from "../services/scheduleTemplateService";
import * as crypto from "crypto";
import { generatePreferencesHash, SchedulePreferences } from "../utils/preferencesHash";

/**
 * Get all schedule templates (with statistics)
 */
export const getAllTemplates = async (req: Request, res: Response) => {
  try {
    const templateRepo = AppDataSource.getRepository(ScheduleTemplate);
    const templates = await templateRepo.find({
      relations: ["term"],
      order: {
        last_accessed_at: "DESC",
        createdAt: "DESC",
      },
    });
    
    const templatesWithStats = templates.map(template => ({
      id: template.id,
      term_id: template.term_id,
      term_number: template.term?.term_number,
      system_type: template.system_type,
      elective_course_ids: template.elective_course_ids ? JSON.parse(template.elective_course_ids) : null,
      schedule_count: template.schedule_count,
      access_count: template.access_count,
      last_accessed_at: template.last_accessed_at,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    }));
    
    return res.json({
      success: true,
      data: templatesWithStats,
      total: templatesWithStats.length,
    });
  } catch (error: any) {
    console.error("Error fetching templates:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

/**
 * Pre-generate a SINGLE template for a specific term/system/elective combination
 * Admin endpoint - generates only what the admin specifically requests
 * 
 * NEW: Now supports preferences (excludedDays, excludedCoreCourseIds, preferredInstructors)
 * Uses unified preferences_hash for instant lookup
 */
export const preGenerateTemplatesForTerm = async (req: Request, res: Response) => {
  try {
    const termIdParam = Array.isArray(req.params.termId) ? req.params.termId[0] : req.params.termId;
    const termId = termIdParam;
    const { 
      systemType, 
      electiveCourseIds,
      excludedDays = [],
      excludedCoreCourseIds = null,
      preferredInstructors = []
    } = req.body;
    
    const parsedTermId = parseInt(termId, 10);
    
    if (isNaN(parsedTermId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid term ID",
      });
    }
    
    if (!systemType || ![140, 160, 180].includes(systemType)) {
      return res.status(400).json({
        success: false,
        message: "Valid systemType (140, 160, or 180) is required",
      });
    }
    
    // Verify term exists
    const termRepo = AppDataSource.getRepository(Term);
    const term = await termRepo.findOne({
      where: { id: parsedTermId },
    });
    
    if (!term) {
      return res.status(404).json({
        success: false,
        message: "Term not found",
      });
    }
    
    // Parse elective IDs
    const electiveIds = Array.isArray(electiveCourseIds) && electiveCourseIds.length > 0
      ? electiveCourseIds.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id))
      : null;
    
    // Normalize preferences
    const sortedExcludedDays = Array.isArray(excludedDays) ? [...excludedDays].sort() : [];
    const sortedExcludedCoreIds = Array.isArray(excludedCoreCourseIds) && excludedCoreCourseIds.length > 0
      ? [...excludedCoreCourseIds].map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id)).sort((a, b) => a - b)
      : null;
    const sortedPreferredInstructors = Array.isArray(preferredInstructors) && preferredInstructors.length > 0
      ? [...preferredInstructors].map((inst: string) => inst.trim().toLowerCase()).filter((inst: string) => inst.length > 0).sort()
      : [];
    
    // Generate unified preferences hash
    const preferences: SchedulePreferences = {
      termId: parsedTermId,
      systemType: systemType,
      electiveCourseIds: electiveIds,
      excludedDays: sortedExcludedDays.length > 0 ? sortedExcludedDays : null,
      excludedCoreCourseIds: sortedExcludedCoreIds,
      preferredInstructors: sortedPreferredInstructors.length > 0 ? sortedPreferredInstructors : null,
    };
    
    const preferencesHash = generatePreferencesHash(preferences);
    
    console.log(`[preGenerateTemplatesForTerm] Request to generate template: term=${parsedTermId}, system=${systemType}, hash=${preferencesHash}`);
    console.log(`  Preferences: electives=${electiveIds?.join(",") || "none"}, excludedDays=${sortedExcludedDays.join(",") || "none"}, excludedCore=${sortedExcludedCoreIds?.join(",") || "none"}, instructors=${sortedPreferredInstructors.join(",") || "none"}`);
    
    // Check if template already exists by preferences_hash
    const templateRepo = AppDataSource.getRepository(ScheduleTemplate);
    const existingTemplate = await templateRepo.findOne({
      where: { preferences_hash: preferencesHash },
    });
    
    if (existingTemplate) {
      return res.status(200).json({
        success: true,
        message: `Template already exists for this preference combination`,
        template: {
          id: existingTemplate.id,
          preferences_hash: existingTemplate.preferences_hash,
          term_id: existingTemplate.term_id,
          system_type: existingTemplate.system_type,
          schedule_count: existingTemplate.schedule_count,
          access_count: existingTemplate.access_count,
          createdAt: existingTemplate.createdAt,
        },
        already_exists: true,
      });
    }
    
    // Return immediately and generate in background
    res.json({
      success: true,
      message: `Started generation of template for term ${parsedTermId}, system ${systemType}`,
      preferences_hash: preferencesHash,
      term_id: parsedTermId,
      system_type: systemType,
      elective_course_ids: electiveIds,
      excluded_days: sortedExcludedDays,
      excluded_core_course_ids: sortedExcludedCoreIds,
      preferred_instructors: sortedPreferredInstructors,
      status: "in_progress",
    });
    
    // Generate template in background
    setImmediate(async () => {
      try {
        const template = await generateAndSaveTemplate(
          parsedTermId, 
          systemType, 
          electiveIds,
          sortedExcludedDays,
          sortedExcludedCoreIds,
          sortedPreferredInstructors,
          preferencesHash
        );
        console.log(`[preGenerateTemplatesForTerm] ✅ Generated template ID ${template.id}: hash=${preferencesHash}, schedules=${template.schedule_count}`);
      } catch (error: any) {
        console.error(`[preGenerateTemplatesForTerm] ❌ Failed to generate template:`, error.message);
      }
    });
    
  } catch (error: any) {
    console.error("Error pre-generating templates:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

/**
 * Helper: Check if a template already exists for this combination
 */
async function checkTemplateExists(
  termId: number,
  systemType: number,
  electiveIds: number[] | null
): Promise<ScheduleTemplate | null> {
  const crypto = require("crypto");
  const templateRepo = AppDataSource.getRepository(ScheduleTemplate);
  
  // Generate hash for elective combination
  const electiveKey = electiveIds ? electiveIds.sort((a, b) => a - b).join(",") : "";
  const hash = crypto.createHash("md5").update(electiveKey).digest("hex");
  
  const existing = await templateRepo.findOne({
    where: {
      term_id: termId,
      system_type: systemType,
      elective_combination_hash: hash,
    },
  });
  
  return existing;
}

/**
 * Helper: Get all possible elective combinations for a term/system
 */
async function getElectiveCombinations(termId: number, systemType: number): Promise<(number[] | null)[]> {
  // For now, we'll generate templates for:
  // 1. Core-only (no electives)
  // 2. Each individual elective
  // 3. Common combinations (if we detect patterns)
  
  const classRepo = AppDataSource.getRepository(Class);
  const classCourseRepo = AppDataSource.getRepository(ClassCourse);
  
  const classes = await classRepo.find({
    where: { term_id: termId, system_type: systemType },
  });
  
  const classIds = classes.map(c => c.id);
  const classCourses = classIds.length > 0 ? await classCourseRepo.find({
    where: { class_id: In(classIds) },
    relations: ["course"],
  }) : [];
  
  // Get all elective courses
  const electiveCourses = classCourses
    .filter(cc => cc.course.is_elective)
    .map(cc => cc.course.id);
  
  const uniqueElectives = [...new Set(electiveCourses)].sort((a, b) => a - b);
  
  const combinations: (number[] | null)[] = [];
  
  // 1. Core-only (no electives)
  combinations.push(null);
  
  // 2. Single electives (most common case)
  uniqueElectives.forEach(electiveId => {
    combinations.push([electiveId]);
  });
  
  // For now, we won't pre-generate all possible combinations (too many)
  // Templates will be generated on-demand for specific elective combinations
  // and then reused for future requests
  
  return combinations;
}

/**
 * Helper: Generate and save a template with preferences already applied
 * NEW: Uses unified preferences_hash and generates schedules WITH preferences applied
 */
async function generateAndSaveTemplate(
  termId: number,
  systemType: number,
  electiveIds: number[] | null,
  excludedDays: string[] = [],
  excludedCoreCourseIds: number[] | null = null,
  preferredInstructors: string[] = [],
  preferencesHash: string
): Promise<ScheduleTemplate> {
  // Import the generation function (DO NOT MODIFY - same algorithm)
  const { generateScheduleCombinations } = await import("./timetableViewController");
  
  // Get course data
  const classRepo = AppDataSource.getRepository(Class);
  const classCourseRepo = AppDataSource.getRepository(ClassCourse);
  const componentRepo = AppDataSource.getRepository(CourseComponent);
  const sessionRepo = AppDataSource.getRepository(Session);
  
  const classes = await classRepo.find({
    where: { term_id: termId, system_type: systemType },
  });
  
  const classIds = classes.map(c => c.id);
  const classCourses = classIds.length > 0 ? await classCourseRepo.find({
    where: { class_id: In(classIds) },
    relations: ["course", "class"],
  }) : [];
  
  // Get components and sessions
  const classCourseIds = classCourses.map(cc => cc.id);
  const components = classCourseIds.length > 0 ? await componentRepo.find({
    where: { class_course_id: In(classCourseIds) },
  }) : [];
  
  const componentIds = components.map(c => c.id);
  const sessions = componentIds.length > 0 ? await sessionRepo.find({
    where: { component_id: In(componentIds) },
    order: { day: "ASC", slot: "ASC" },
  }) : [];
  
  // Group sessions by component
  const sessionsByComponent = new Map<number, any[]>();
  sessions.forEach(session => {
    if (!sessionsByComponent.has(session.component_id)) {
      sessionsByComponent.set(session.component_id, []);
    }
    sessionsByComponent.get(session.component_id)!.push(session);
  });
  
  // Group components by class course
  const componentsByClassCourse = new Map<number, any[]>();
  components.forEach(component => {
    if (!componentsByClassCourse.has(component.class_course_id)) {
      componentsByClassCourse.set(component.class_course_id, []);
    }
    const componentWithSessions = {
      ...component,
      sessions: sessionsByComponent.get(component.id) || [],
    };
    componentsByClassCourse.get(component.class_course_id)!.push(componentWithSessions);
  });
  
  // Build course data structure
  const coursesData = classCourses.map(cc => ({
    classCourse: cc,
    course: cc.course,
    class: cc.class,
    components: componentsByClassCourse.get(cc.id) || [],
  }));
  
  // Filter to only courses with sessions
  const coursesWithSessions = coursesData.filter(cd => 
    cd.components.some((comp: any) => comp.sessions && comp.sessions.length > 0)
  );
  
  // Separate core and elective
  let coreCoursesData = coursesWithSessions.filter(cd => !cd.course.is_elective);
  let electiveCoursesData: any[] = [];
  
  // Filter out excluded core courses
  if (excludedCoreCourseIds && excludedCoreCourseIds.length > 0) {
    coreCoursesData = coreCoursesData.filter(cd => 
      !excludedCoreCourseIds.includes(cd.course.id)
    );
  }
  
  // Filter elective courses by selected IDs
  if (electiveIds && electiveIds.length > 0) {
    electiveCoursesData = coursesWithSessions.filter(cd => 
      cd.course.is_elective && electiveIds.includes(cd.course.id)
    );
  }
  
  // Generate schedules WITH preferences already applied (using same algorithm)
  console.log(`[generateAndSaveTemplate] Generating schedules with preferences: ${coreCoursesData.length} core + ${electiveCoursesData.length} elective courses`);
  console.log(`  Preferences: excludedDays=${excludedDays.join(",") || "none"}, excludedCore=${excludedCoreCourseIds?.join(",") || "none"}, instructors=${preferredInstructors.join(",") || "none"}`);
  
  const schedules = generateScheduleCombinations(
    coreCoursesData,
    electiveCoursesData,
    excludedDays, // Apply excluded days
    preferredInstructors // Apply preferred instructors
  );
  
  // Sort and limit (top 300 for template storage - more schedules for better filtering)
  schedules.sort((a, b) => b.score - a.score);
  const topSchedules = schedules.slice(0, 300);
  
  console.log(`[generateAndSaveTemplate] Generated ${topSchedules.length} schedules (from ${schedules.length} total) - storing top 300 for filtering`);
  
  // Save template with preferences_hash
  const templateRepo = AppDataSource.getRepository(ScheduleTemplate);
  
  const sortedElectiveIds = electiveIds ? [...electiveIds].sort((a, b) => a - b) : null;
  const electiveIdsJson = sortedElectiveIds ? JSON.stringify(sortedElectiveIds) : null;
  
  // Keep elective_combination_hash for backward compatibility (nullable)
  const electiveHash = electiveIdsJson 
    ? crypto.createHash("md5").update(electiveIdsJson).digest("hex")
    : null;
  
  const template = templateRepo.create({
    preferences_hash: preferencesHash, // PRIMARY lookup key
    term_id: termId,
    system_type: systemType,
    elective_course_ids: electiveIdsJson,
    elective_combination_hash: electiveHash, // For backward compatibility
    excluded_days: excludedDays.length > 0 ? JSON.stringify(excludedDays) : null,
    excluded_core_course_ids: excludedCoreCourseIds && excludedCoreCourseIds.length > 0 ? JSON.stringify(excludedCoreCourseIds) : null,
    preferred_instructors: preferredInstructors.length > 0 ? JSON.stringify(preferredInstructors) : null,
    base_schedules: topSchedules, // Already filtered schedules (not base schedules)
    schedule_count: topSchedules.length,
    access_count: 0,
    last_accessed_at: null,
  });
  
  try {
    await templateRepo.save(template);
    return template;
  } catch (error: any) {
    // Handle duplicate key violation (race condition - another request saved first)
    const isDuplicateKey = error.code === "23505" || 
                          error.message?.includes("duplicate key") || 
                          error.message?.includes("unique constraint") ||
                          error.message?.includes("IDX_344d99c1c992143ad7fa21980e");
    
    if (isDuplicateKey) {
      // Template already exists, fetch and return it
      console.log(`[generateAndSaveTemplate] Template with hash ${preferencesHash} already exists (race condition), fetching existing...`);
      const existingTemplate = await templateRepo.findOne({
        where: { preferences_hash: preferencesHash },
      });
      
      if (existingTemplate) {
        return existingTemplate;
      }
    }
    
    // Re-throw if it's not a duplicate key error
    throw error;
  }
}

/**
 * Invalidate templates for a term (call after updating timetable)
 */
export const invalidateTermTemplates = async (req: Request, res: Response) => {
  try {
    const termIdParam = Array.isArray(req.params.termId) ? req.params.termId[0] : req.params.termId;
    const parsedTermId = parseInt(String(termIdParam), 10);
    
    if (isNaN(parsedTermId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid term ID",
      });
    }
    
    const deletedCount = await invalidateTemplatesForTerm(parsedTermId);
    
    return res.json({
      success: true,
      message: `Invalidated ${deletedCount} template(s) for term ${parsedTermId}`,
      deleted_count: deletedCount,
    });
  } catch (error: any) {
    console.error("Error invalidating templates:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

/**
 * Cleanup old templates
 */
export const cleanupTemplates = async (req: Request, res: Response) => {
  try {
    const daysOld = req.query.daysOld ? parseInt(req.query.daysOld as string) : 30;
    
    const deletedCount = await cleanupOldTemplates(daysOld);
    
    return res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old template(s)`,
      deleted_count: deletedCount,
    });
  } catch (error: any) {
    console.error("Error cleaning up templates:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

/**
 * Delete a specific template
 */
export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const templateIdParam = Array.isArray(req.params.templateId) ? req.params.templateId[0] : req.params.templateId;
    const templateId = templateIdParam;
    const parsedTemplateId = parseInt(String(templateId), 10);
    
    if (isNaN(parsedTemplateId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid template ID",
      });
    }
    
    const templateRepo = AppDataSource.getRepository(ScheduleTemplate);
    const result = await templateRepo.delete({ id: parsedTemplateId });
    
    if (result.affected === 0) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }
    
    return res.json({
      success: true,
      message: `Deleted template ${parsedTemplateId}`,
    });
  } catch (error: any) {
    console.error("Error deleting template:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};
