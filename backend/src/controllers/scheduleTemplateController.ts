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
import { 
  generatePreferencesHash, 
  generateParentTemplateHash, 
  generateChildTemplateHash,
  deriveChildTemplateFromParent,
  SchedulePreferences,
  requiresCampusTrackSeparation,
  isNorthamptonClass
} from "../utils/preferencesHash";

/**
 * Get all schedule templates (with statistics)
 * Uses raw SQL to exclude base_schedules (large jsonb) and avoid DB response size limit (64MB).
 * Does NOT use ScheduleTemplate entity so no ORM query ever selects base_schedules for this endpoint.
 */
export const getAllTemplates = async (req: Request, res: Response) => {
  try {
    const rows = await AppDataSource.query(
      `SELECT t.id, t.term_id, t.system_type, t.elective_course_ids, t.elective_combination_hash,
              t.schedule_count, t.access_count, t.last_accessed_at, t."createdAt", t."updatedAt",
              t.preferences_hash, t.parent_hash, t.is_parent,
              term.term_number AS term_number
       FROM schedule_templates t
       LEFT JOIN terms term ON term.id = t.term_id
       ORDER BY t.last_accessed_at DESC NULLS LAST, t."createdAt" DESC`
    );
    
    const templatesWithStats = (rows as any[]).map((row: any) => ({
      id: row.id,
      term_id: row.term_id,
      term_number: row.term_number ?? null,
      system_type: row.system_type,
      elective_course_ids: row.elective_course_ids ? JSON.parse(row.elective_course_ids) : null,
      schedule_count: row.schedule_count,
      access_count: row.access_count,
      last_accessed_at: row.last_accessed_at,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
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
 * Pre-generate a PARENT template for a specific term/system/elective combination
 * Admin endpoint - ALWAYS generates PARENT template with ALL combinations
 * 
 * HIERARCHICAL SYSTEM:
 * - Admin generates PARENT templates (all combinations, no excluded core)
 * - Child templates are derived automatically when students exclude core courses
 * 
 * NOTE: excludedCoreCourseIds and other filters are IGNORED for parent template generation
 * The parent template contains ALL possible combinations
 */
export const preGenerateTemplatesForTerm = async (req: Request, res: Response) => {
  try {
    const termIdParam = Array.isArray(req.params.termId) ? req.params.termId[0] : req.params.termId;
    const termId = termIdParam;
    const { 
      systemType, 
      electiveCourseIds,
      campusTrack, // "northampton" or "normal" for Term 4 System 140
      // NOTE: These are IGNORED for parent template generation
      // excludedDays = [],
      // excludedCoreCourseIds = null,
      // preferredInstructors = []
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
    
    // Validate campusTrack for Term 4 System 140 (NORTHAMPTON separation)
    const validCampusTracks = ["northampton", "normal"];
    const parsedCampusTrack: "northampton" | "normal" | null = 
      campusTrack && typeof campusTrack === "string" && validCampusTracks.includes(campusTrack.toLowerCase())
        ? (campusTrack.toLowerCase() as "northampton" | "normal")
        : null;
    
    // Check if this term/system requires campus track separation
    const termNumber = parseInt(term.term_number);
    const needsCampusSeparation = requiresCampusTrackSeparation(termNumber, systemType);
    
    if (needsCampusSeparation && !parsedCampusTrack) {
      return res.status(400).json({
        success: false,
        message: "Term 4 System 140 requires campusTrack selection. Please choose 'northampton' or 'normal'.",
        requiresCampusTrack: true,
      });
    }
    
    // Parse elective IDs
    const electiveIds = Array.isArray(electiveCourseIds) && electiveCourseIds.length > 0
      ? electiveCourseIds.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id))
      : null;
    
    // Fetch classes for this term+system (with campus track) to get closedClassCourseIds for hash
    const classRepoForHash = AppDataSource.getRepository(Class);
    const classCourseRepoForHash = AppDataSource.getRepository(ClassCourse);
    let classesForHash = await classRepoForHash.find({
      where: { term_id: parsedTermId, system_type: systemType },
    });
    if (parsedCampusTrack) {
      if (parsedCampusTrack === "northampton") classesForHash = classesForHash.filter(c => isNorthamptonClass(c.class_code));
      else if (parsedCampusTrack === "normal") classesForHash = classesForHash.filter(c => !isNorthamptonClass(c.class_code));
    }
    const classIdsForHash = classesForHash.map(c => c.id);
    let closedClassCourseIds: number[] = [];
    if (classIdsForHash.length > 0) {
      const closedRows = await classCourseRepoForHash.find({
        where: { class_id: In(classIdsForHash), closed: true },
        select: ["id"],
      });
      closedClassCourseIds = closedRows.map(r => r.id).sort((a, b) => a - b);
    }
    
    // Generate PARENT hash (no excluded core courses - parent has ALL combinations)
    // Include campusTrack and closedClassCourseIds so template is unique per closure state
    const parentHash = generateParentTemplateHash({
      termId: parsedTermId,
      systemType: systemType,
      electiveCourseIds: electiveIds,
      campusTrack: parsedCampusTrack,
      closedClassCourseIds: closedClassCourseIds.length > 0 ? closedClassCourseIds : null,
    });
    
    console.log(`[preGenerateTemplatesForTerm] 📦 Request to generate PARENT template:`);
    console.log(`  Term: ${parsedTermId}, System: ${systemType}`);
    console.log(`  Electives: ${electiveIds?.join(",") || "none"}`);
    console.log(`  Campus track: ${parsedCampusTrack || "none"}`);
    console.log(`  Parent hash: ${parentHash}`);
    console.log(`  NOTE: This generates ALL combinations (no excluded core courses)`);
    
    // Check if PARENT template already exists
    const templateRepo = AppDataSource.getRepository(ScheduleTemplate);
    const existingParent = await templateRepo.findOne({
      where: [
        { preferences_hash: parentHash },
        { parent_hash: parentHash, is_parent: true }
      ],
    });
    
    if (existingParent) {
      return res.status(200).json({
        success: true,
        message: `PARENT template already exists with ALL combinations`,
        template: {
          id: existingParent.id,
          preferences_hash: existingParent.preferences_hash,
          parent_hash: existingParent.parent_hash,
          is_parent: existingParent.is_parent,
          term_id: existingParent.term_id,
          system_type: existingParent.system_type,
          schedule_count: existingParent.schedule_count,
          access_count: existingParent.access_count,
          createdAt: existingParent.createdAt,
        },
        already_exists: true,
        is_parent: true,
      });
    }
    
    // Return immediately and generate in background
    res.json({
      success: true,
      message: `Started generation of PARENT template for term ${parsedTermId}, system ${systemType} (ALL combinations)`,
      parent_hash: parentHash,
      term_id: parsedTermId,
      system_type: systemType,
      elective_course_ids: electiveIds,
      status: "in_progress",
      is_parent: true,
      note: "This parent template will contain ALL schedule combinations. Child templates will be derived when students exclude core courses.",
    });
    
    // Generate PARENT template in background
    setImmediate(async () => {
      try {
        const template = await generateAndSaveParentTemplate(
          parsedTermId, 
          systemType, 
          electiveIds,
          parentHash,
          parsedCampusTrack
        );
        console.log(`[preGenerateTemplatesForTerm] ✅ Generated PARENT template ID ${template.id}: hash=${parentHash}, schedules=${template.schedule_count}`);
      } catch (error: any) {
        console.error(`[preGenerateTemplatesForTerm] ❌ Failed to generate PARENT template:`, error.message);
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
 * Helper: Generate and save a PARENT template with ALL combinations
 * PARENT template = all courses, no excluded core, no filters
 * Child templates are derived from parent when students exclude core courses
 */
async function generateAndSaveParentTemplate(
  termId: number,
  systemType: number,
  electiveIds: number[] | null,
  parentHash: string,
  campusTrack: "northampton" | "normal" | null = null
): Promise<ScheduleTemplate> {
  // Import the generation function (DO NOT MODIFY - same algorithm)
  const { generateScheduleCombinations } = await import("./timetableViewController");
  
  // Get course data
  const classRepo = AppDataSource.getRepository(Class);
  const classCourseRepo = AppDataSource.getRepository(ClassCourse);
  const componentRepo = AppDataSource.getRepository(CourseComponent);
  const sessionRepo = AppDataSource.getRepository(Session);
  
  let classes = await classRepo.find({
    where: { term_id: termId, system_type: systemType },
  });
  
  // NORTHAMPTON class separation: Filter classes based on campusTrack for Term 4 System 140
  if (campusTrack) {
    const totalClassesBeforeFilter = classes.length;
    
    if (campusTrack === "northampton") {
      classes = classes.filter(c => isNorthamptonClass(c.class_code));
      console.log(`[generateAndSaveParentTemplate] 🏫 NORTHAMPTON track: Filtered to ${classes.length}/${totalClassesBeforeFilter} NORTHAMPTON classes`);
    } else if (campusTrack === "normal") {
      classes = classes.filter(c => !isNorthamptonClass(c.class_code));
      console.log(`[generateAndSaveParentTemplate] 🏠 Normal track: Filtered to ${classes.length}/${totalClassesBeforeFilter} normal classes`);
    }
  }
  
  const classIds = classes.map(c => c.id);
  let classCourses = classIds.length > 0 ? await classCourseRepo.find({
    where: { class_id: In(classIds) },
    relations: ["course", "class"],
  }) : [];
  // Exclude closed class-courses from generation
  classCourses = classCourses.filter(cc => !cc.closed);
  
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
  
  // PARENT TEMPLATE: Include ALL core courses (NO filtering)
  const coreCoursesData = coursesWithSessions.filter(cd => !cd.course.is_elective);
  let electiveCoursesData: any[] = [];
  
  // Filter elective courses by selected IDs (electives are still filtered)
  if (electiveIds && electiveIds.length > 0) {
    electiveCoursesData = coursesWithSessions.filter(cd => 
      cd.course.is_elective && electiveIds.includes(cd.course.id)
    );
  }
  
  // Generate PARENT schedules (ALL combinations, NO filters)
  console.log(`[generateAndSaveParentTemplate] 📦 Generating PARENT template schedules:`);
  console.log(`  - Core courses: ${coreCoursesData.length} (ALL included)`);
  console.log(`  - Elective courses: ${electiveCoursesData.length}`);
  console.log(`  - NO excluded days, NO excluded core, NO instructor preferences`);
  
  const schedules = generateScheduleCombinations(
    coreCoursesData,
    electiveCoursesData,
    [], // NO excluded days for parent
    []  // NO preferred instructors for parent
  );
  
  // Sort and limit (top 300 for template storage)
  schedules.sort((a, b) => b.score - a.score);
  const topSchedules = schedules.slice(0, 300);
  
  console.log(`[generateAndSaveParentTemplate] Generated ${topSchedules.length} PARENT schedules (from ${schedules.length} total)`);
  
  // Save PARENT template
  const templateRepo = AppDataSource.getRepository(ScheduleTemplate);
  
  const sortedElectiveIds = electiveIds ? [...electiveIds].sort((a, b) => a - b) : null;
  const electiveIdsJson = sortedElectiveIds ? JSON.stringify(sortedElectiveIds) : null;
  
  // Keep elective_combination_hash for backward compatibility
  const electiveHash = electiveIdsJson 
    ? crypto.createHash("md5").update(electiveIdsJson).digest("hex")
    : null;
  
  const template = templateRepo.create({
    preferences_hash: parentHash, // Primary lookup key
    parent_hash: parentHash, // Same as preferences_hash for parent
    parent_template_id: null, // NULL because this IS the parent
    is_parent: true, // This is a parent template
    term_id: termId,
    system_type: systemType,
    elective_course_ids: electiveIdsJson,
    elective_combination_hash: electiveHash,
    excluded_days: null, // No excluded days for parent
    excluded_core_course_ids: null, // No excluded core for parent (has ALL courses)
    preferred_instructors: null, // No instructors for parent
    campus_track: campusTrack, // "northampton" or "normal" for Term 4 System 140
    base_schedules: topSchedules, // ALL combinations
    schedule_count: topSchedules.length,
    access_count: 0,
    last_accessed_at: null,
  });
  
  try {
    await templateRepo.save(template);
    console.log(`[generateAndSaveParentTemplate] 💾 Saved PARENT template (ID: ${template.id})`);
    return template;
  } catch (error: any) {
    // Handle duplicate key violation (race condition - another request saved first)
    const isDuplicateKey = error.code === "23505" || 
                          error.message?.includes("duplicate key") || 
                          error.message?.includes("unique constraint") ||
                          error.message?.includes("IDX_344d99c1c992143ad7fa21980e");
    
    if (isDuplicateKey) {
      // Template already exists, fetch and return it
      console.log(`[generateAndSaveParentTemplate] Template with hash ${parentHash} already exists (race condition), fetching existing...`);
      const existingTemplate = await templateRepo.findOne({
        where: { preferences_hash: parentHash },
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
 * Helper: Generate and save a template with preferences already applied (LEGACY)
 * Kept for backward compatibility - generates with specific preferences
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
    parent_hash: null, // Legacy templates don't have parent_hash
    parent_template_id: null,
    is_parent: false,
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
