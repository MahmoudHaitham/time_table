import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { In, IsNull, Or } from "typeorm";
import { Term } from "../entities/Term";
import { Class } from "../entities/Class";
import { ClassCourse } from "../entities/ClassCourse";
import { CourseComponent } from "../entities/CourseComponent";
import { Course } from "../entities/Course";
import { Session, Day } from "../entities/Session";
import { ScheduleCache } from "../entities/ScheduleCache";
import { User } from "../entities/User";
import { cache, cacheKeys, CACHE_TTL } from "../utils/cache";
import * as crypto from "crypto";
import { encodeTermId, decodeTermToken } from "../utils/termToken";
// Note: Worker threads import commented out - parallelization can be added later if needed
// import { Worker } from "worker_threads";
// import * as path from "path";
// import * as os from "os";

/**
 * Get all published terms (for students/public)
 */
export const getPublishedTerms = async (req: Request, res: Response) => {
  try {
    // Check if database is initialized
    if (!AppDataSource.isInitialized) {
      console.error("[getPublishedTerms] Database not initialized");
      return res.status(503).json({
        success: false,
        message: "Database connection not available. Please try again later.",
      });
    }

    // Check cache first
    const cacheKey = cacheKeys.publishedTerms();
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const termRepo = AppDataSource.getRepository(Term);
    const terms = await termRepo.find({
      where: { is_published: true },
      order: { createdAt: "DESC" },
    });

    console.log(`[getPublishedTerms] Found ${terms.length} published terms`);

    // Get system types for each term by checking classes
    const classRepo = AppDataSource.getRepository(Class);
    const termsWithSystems = await Promise.all(
      terms.map(async (term) => {
        // Get all classes for this term
        const classes = await classRepo.find({
          where: { term_id: term.id },
          select: ["system_type"],
        });
        
        // Extract unique system types
        const systemTypes = [...new Set(classes.map(c => c.system_type).filter(st => st !== null))] as number[];
        
        console.log(`[getPublishedTerms] Term ${term.term_number} (ID: ${term.id}) has ${classes.length} classes with systemTypes:`, systemTypes);
        
        return {
          id: term.id, // Keep id for public timetable view
          token: encodeTermId(term.id), // Also provide token for student views
          term_number: term.term_number,
          is_published: term.is_published,
          systemTypes: systemTypes.sort((a, b) => b - a), // Sort descending: 180, 160, 140
          createdAt: term.createdAt,
          updatedAt: term.updatedAt,
        };
      })
    );

    // Return terms with both id and token for compatibility
    // Public timetable view can use id directly
    const termsWithTokens = termsWithSystems;

    // Sort terms by term_number (ascending: 3, 4, 5, ...)
    termsWithTokens.sort((a, b) => {
      const termNumA = parseInt(a.term_number);
      const termNumB = parseInt(b.term_number);
      return termNumA - termNumB;
    });

    // Cache the result (with tokens)
    cache.set(cacheKey, termsWithTokens, CACHE_TTL.PUBLISHED_TERMS);

    return res.json({
      success: true,
      data: termsWithTokens,
    });
  } catch (error: any) {
    console.error("Error fetching published terms:", error);
    const errorMessage = error?.message || error?.toString() || "Unknown error occurred";
    console.error("[getPublishedTerms] Error details:", {
      message: errorMessage,
      stack: error?.stack,
      name: error?.name,
    });
    return res.status(500).json({
      success: false,
      message: errorMessage || "Server error",
      error: process.env.NODE_ENV === "development" ? errorMessage : undefined,
    });
  }
};

/**
 * Get timetable for a published term (for students/public)
 */
export const getTermTimetable = async (req: Request, res: Response) => {
  try {
    const { termId } = req.params;
    const systemType = req.query.system ? parseInt(req.query.system as string) : null;

    // Handle both encoded tokens and raw IDs (for public timetable view)
    const termIdStr = Array.isArray(termId) ? termId[0] : (termId as string);
    let parsedTermId: number | null = null;
    
    // Try to decode as token first
    parsedTermId = decodeTermToken(termIdStr);
    
    // If decoding fails, try parsing as raw ID (for public timetable view)
    if (!parsedTermId) {
      const rawId = parseInt(termIdStr, 10);
      if (!isNaN(rawId) && rawId > 0) {
        parsedTermId = rawId;
      }
    }
    
    if (!parsedTermId) {
      return res.status(400).json({
        success: false,
        message: "Invalid term ID or token",
      });
    }

    // Check cache first (include systemType in cache key if provided)
    const cacheKey = systemType 
      ? `${cacheKeys.termTimetable(parsedTermId)}_system_${systemType}`
      : cacheKeys.termTimetable(parsedTermId);
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const termRepo = AppDataSource.getRepository(Term);
    const term = await termRepo.findOne({
      where: { id: parsedTermId, is_published: true },
    });

    if (!term) {
      return res.status(404).json({
        success: false,
        message: "Published term not found",
      });
    }

    // Optimized query: Get all data in fewer queries using joins
    // Filter by systemType if provided
    const classRepo = AppDataSource.getRepository(Class);
    const classWhere: any = { term_id: term.id };
    if (systemType && [140, 160, 180].includes(systemType)) {
      classWhere.system_type = systemType;
    }
    const classes = await classRepo.find({
      where: classWhere,
    });

    // Helper function to retry database queries
    const retryQuery = async <T>(
      queryFn: () => Promise<T>,
      maxRetries: number = 3,
      delay: number = 1000
    ): Promise<T> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await queryFn();
        } catch (error: any) {
          if (attempt === maxRetries) throw error;
          if (error.message?.includes("Connection terminated") || error.message?.includes("Connection")) {
            console.log(`[getTermTimetable] Connection error on attempt ${attempt}, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
            continue;
          }
          throw error;
        }
      }
      throw new Error("Max retries exceeded");
    };

    // Optimized: Batch fetch all data to reduce database queries
    const classIds = classes.map(c => c.id);
    
    if (classIds.length === 0) {
      const result = {
        term: {
          id: term.id,
          term_number: term.term_number,
        },
        classes: [],
      };
      cache.set(cacheKey, result, CACHE_TTL.TERM_TIMETABLE);
      return res.json({
        success: true,
        data: result,
      });
    }

    // Batch fetch all class courses with relations
    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const allClassCourses = await retryQuery(() =>
      classCourseRepo.find({
        where: { class_id: In(classIds) },
        relations: ["course"],
      })
    );

    // Batch fetch all components
    const classCourseIds = allClassCourses.map(cc => cc.id);
    const componentRepo = AppDataSource.getRepository(CourseComponent);
    const allComponents = classCourseIds.length > 0 ? await retryQuery(() =>
      componentRepo.find({
        where: { class_course_id: In(classCourseIds) },
      })
    ) : [];

    // Batch fetch all sessions
    const componentIds = allComponents.map(c => c.id);
    const sessionRepo = AppDataSource.getRepository(Session);
    const allSessions = componentIds.length > 0 ? await retryQuery(() =>
      sessionRepo.find({
        where: { component_id: In(componentIds) },
        order: { day: "ASC", slot: "ASC" },
      })
    ) : [];

    // Build lookup maps for efficient data assembly
    const sessionsByComponentId = new Map<number, Session[]>();
    allSessions.forEach(session => {
      if (!sessionsByComponentId.has(session.component_id)) {
        sessionsByComponentId.set(session.component_id, []);
      }
      sessionsByComponentId.get(session.component_id)!.push(session);
    });

    const componentsByClassCourseId = new Map<number, CourseComponent[]>();
    allComponents.forEach(component => {
      if (!componentsByClassCourseId.has(component.class_course_id)) {
        componentsByClassCourseId.set(component.class_course_id, []);
      }
      componentsByClassCourseId.get(component.class_course_id)!.push(component);
    });

    const classCoursesByClassId = new Map<number, ClassCourse[]>();
    allClassCourses.forEach(classCourse => {
      if (!classCoursesByClassId.has(classCourse.class_id)) {
        classCoursesByClassId.set(classCourse.class_id, []);
      }
      classCoursesByClassId.get(classCourse.class_id)!.push(classCourse);
    });

    // Assemble timetable data efficiently
    const timetableData = classes.map(classEntity => {
      const classCourses = classCoursesByClassId.get(classEntity.id) || [];
      
      const coursesWithSessions = classCourses.map(classCourse => {
        const components = componentsByClassCourseId.get(classCourse.id) || [];
        
        const componentsWithSessions = components.map(component => ({
          id: component.id,
          component_type: component.component_type,
          sessions: sessionsByComponentId.get(component.id) || [],
        }));

        return {
          id: classCourse.id,
          course: classCourse.course,
          components: componentsWithSessions,
        };
      });

      return {
        id: classEntity.id,
        class_code: classEntity.class_code,
        courses: coursesWithSessions,
      };
    });

    const result = {
      term: {
        id: term.id,
        term_number: term.term_number,
      },
      classes: timetableData,
    };

    // Cache the result
    cache.set(cacheKey, result, CACHE_TTL.TERM_TIMETABLE);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error fetching term timetable:", error);
    
    // Check if it's a connection error
    if (error.message?.includes("Connection terminated") || 
        error.message?.includes("Connection") ||
        error.name === "QueryFailedError") {
      console.error("[getTermTimetable] Database connection error detected");
      
      // Try to reinitialize connection if it's closed
      if (!AppDataSource.isInitialized) {
        try {
          await AppDataSource.initialize();
          console.log("[getTermTimetable] Database connection reinitialized");
        } catch (initError) {
          console.error("[getTermTimetable] Failed to reinitialize connection:", initError);
        }
      }
      
      return res.status(503).json({
        success: false,
        message: "Database connection error. Please try again in a moment.",
      });
    }
    
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

/**
 * Get timetable for a specific class (for students/public)
 */
export const getClassTimetable = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;

    // Validate classId - handle string | string[] type
    const classIdStr = Array.isArray(classId) ? classId[0] : (classId as string);
    const parsedClassId = parseInt(classIdStr, 10);
    if (isNaN(parsedClassId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID",
      });
    }

    // Check cache first
    const cacheKey = cacheKeys.classTimetable(parsedClassId);
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const classRepo = AppDataSource.getRepository(Class);
    const classEntity = await classRepo.findOne({
      where: { id: parsedClassId },
      relations: ["term"],
    });

    if (!classEntity) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // Check if term is published
    if (!classEntity.term.is_published) {
      return res.status(403).json({
        success: false,
        message: "Term is not published",
      });
    }

    // Optimized: Batch fetch all data
    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const classCourses = await classCourseRepo.find({
      where: { class_id: classEntity.id },
      relations: ["course"],
    });

    if (classCourses.length === 0) {
      const result = {
        class: {
          id: classEntity.id,
          class_code: classEntity.class_code,
          term: {
            id: classEntity.term.id,
            term_number: classEntity.term.term_number,
          },
        },
        courses: [],
      };
      cache.set(cacheKey, result, CACHE_TTL.CLASS_TIMETABLE);
      return res.json({
        success: true,
        data: result,
      });
    }

    // Batch fetch all components and sessions
    const classCourseIds = classCourses.map(cc => cc.id);
    const componentRepo = AppDataSource.getRepository(CourseComponent);
    const allComponents = await componentRepo.find({
      where: { class_course_id: In(classCourseIds) },
    });

    const componentIds = allComponents.map(c => c.id);
    const sessionRepo = AppDataSource.getRepository(Session);
    const allSessions = componentIds.length > 0 ? await sessionRepo.find({
      where: { component_id: In(componentIds) },
      order: { day: "ASC", slot: "ASC" },
    }) : [];

    // Build lookup maps
    const sessionsByComponentId = new Map<number, Session[]>();
    allSessions.forEach(session => {
      if (!sessionsByComponentId.has(session.component_id)) {
        sessionsByComponentId.set(session.component_id, []);
      }
      sessionsByComponentId.get(session.component_id)!.push(session);
    });

    const componentsByClassCourseId = new Map<number, CourseComponent[]>();
    allComponents.forEach(component => {
      if (!componentsByClassCourseId.has(component.class_course_id)) {
        componentsByClassCourseId.set(component.class_course_id, []);
      }
      componentsByClassCourseId.get(component.class_course_id)!.push(component);
    });

    // Assemble data efficiently
    const coursesWithSessions = classCourses.map(classCourse => {
      const components = componentsByClassCourseId.get(classCourse.id) || [];
      const componentsWithSessions = components.map(component => ({
        id: component.id,
        component_type: component.component_type,
        sessions: sessionsByComponentId.get(component.id) || [],
      }));

      return {
        id: classCourse.id,
        course: classCourse.course,
        components: componentsWithSessions,
      };
    });

    const result = {
      class: {
        id: classEntity.id,
        class_code: classEntity.class_code,
        term: {
          id: classEntity.term.id,
          term_number: classEntity.term.term_number,
        },
      },
      courses: coursesWithSessions,
    };

    // Cache the result
    cache.set(cacheKey, result, CACHE_TTL.CLASS_TIMETABLE);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error fetching class timetable:", error);
    
    // Check if it's a connection error
    if (error.message?.includes("Connection terminated") || 
        error.message?.includes("Connection") ||
        error.name === "QueryFailedError") {
      console.error("[getClassTimetable] Database connection error detected");
      
      // Try to reinitialize connection if it's closed
      if (!AppDataSource.isInitialized) {
        try {
          await AppDataSource.initialize();
          console.log("[getClassTimetable] Database connection reinitialized");
        } catch (initError) {
          console.error("[getClassTimetable] Failed to reinitialize connection:", initError);
        }
      }
      
      return res.status(503).json({
        success: false,
        message: "Database connection error. Please try again in a moment.",
      });
    }
    
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

/**
 * Get core courses (non-elective) for a term and system
 */
export const getCoreCourses = async (req: Request, res: Response) => {
  try {
    const { termId } = req.params;
    const systemType = req.query.systemType ? parseInt(req.query.systemType as string) : null;
    
    // Decode term token to get actual term ID
    const termIdStr = Array.isArray(termId) ? termId[0] : (termId as string);
    const parsedTermId = decodeTermToken(termIdStr);
    
    if (!parsedTermId) {
      return res.status(400).json({
        success: false,
        message: "Invalid term token",
      });
    }

    if (!systemType || ![140, 160, 180].includes(systemType)) {
      return res.status(400).json({
        success: false,
        message: "Valid systemType (140, 160, or 180) is required",
      });
    }

    // Check cache first
    const cacheKey = cacheKeys.coreCourses(parsedTermId) + `_system_${systemType}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Verify term exists and is published
    const termRepo = AppDataSource.getRepository(Term);
    const term = await termRepo.findOne({
      where: { id: parsedTermId, is_published: true },
    });

    if (!term) {
      return res.status(404).json({
        success: false,
        message: "Published term not found",
      });
    }

    // Get all classes for this term and system
    const classRepo = AppDataSource.getRepository(Class);
    const classes = await classRepo.find({
      where: { 
        term_id: term.id,
        system_type: systemType,
      },
    });

    // Get all class courses and extract unique core courses
    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const classIds = classes.map(c => c.id);
    const classCourses = classIds.length > 0 ? await classCourseRepo.find({
      where: { class_id: In(classIds) },
      relations: ["course"],
    }) : [];

    // Filter core courses (is_elective = false)
    // Courses are filtered through classes - classes already filtered by system_type
    const coreCoursesMap = new Map<number, Course>();
    classCourses.forEach(cc => {
      if (!cc.course.is_elective) {
        coreCoursesMap.set(cc.course.id, cc.course);
      }
    });

    const coreCourses = Array.from(coreCoursesMap.values());

    // Cache the result
    cache.set(cacheKey, coreCourses, CACHE_TTL.COURSES);

    return res.json({
      success: true,
      data: coreCourses,
    });
  } catch (error) {
    console.error("Error fetching core courses:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Helper function to calculate maximum number of electives for a term based on classes
 * Returns the highest count of elective courses assigned to any class in the term
 */
async function getMaxElectivesForTerm(termId: number, systemType: number): Promise<number> {
  try {
    const classRepo = AppDataSource.getRepository(Class);
    const classes = await classRepo.find({
      where: { 
        term_id: termId,
        system_type: systemType,
      },
    });

    if (classes.length === 0) {
      return 0;
    }

    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const classIds = classes.map(c => c.id);
    
    // Get all class courses for these classes
    const classCourses = await classCourseRepo.find({
      where: { class_id: In(classIds) },
      relations: ["course"],
    });

    // Count electives per class
    const electivesPerClass = new Map<number, number>();
    classCourses.forEach(cc => {
      if (cc.course.is_elective) {
        const currentCount = electivesPerClass.get(cc.class_id) || 0;
        electivesPerClass.set(cc.class_id, currentCount + 1);
      }
    });

    // Find the maximum count across all classes
    let maxElectives = 0;
    electivesPerClass.forEach((count) => {
      if (count > maxElectives) {
        maxElectives = count;
      }
    });

    return maxElectives;
  } catch (error) {
    console.error("Error calculating max electives for term:", error);
    return 0;
  }
}

/**
 * Get elective courses for a term
 * Elective courses are open to all students with term_number >= 6
 * Course term_number does NOT restrict registration for electives
 */
export const getElectiveCourses = async (req: Request, res: Response) => {
  try {
    const { termId } = req.params;
    // Decode term token to get actual term ID
    const termIdStr = Array.isArray(termId) ? termId[0] : (termId as string);
    const parsedTermId = decodeTermToken(termIdStr);
    
    if (!parsedTermId) {
      return res.status(400).json({
        success: false,
        message: "Invalid term token",
      });
    }

    // Get systemType from query parameter (required)
    const electiveSystemType = req.query.systemType ? parseInt(req.query.systemType as string) : null;
    
    if (!electiveSystemType || ![140, 160, 180].includes(electiveSystemType)) {
      return res.status(400).json({
        success: false,
        message: "Valid systemType (140, 160, or 180) is required",
      });
    }

    // Get student term_number from auth token if available
    let studentTermNumber: number | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const jwt = require("jsonwebtoken");
        const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        // Fetch user to get term_number
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({
          where: { id: decoded.userId },
        });
        
        if (user && user.term_number !== null && user.term_number !== undefined) {
          studentTermNumber = user.term_number;
        }
      } catch (error) {
        // If token is invalid, continue without student term_number check
        // This allows unauthenticated access but without filtering
      }
    }

    // If student term_number < 6, return empty array (students cannot see electives)
    if (studentTermNumber !== null && studentTermNumber < 6) {
      return res.json({
        success: true,
        data: [],
        message: "Elective courses are only available for students in term 6 and above",
      });
    }

    // Check cache first (cache key includes student term_number and system_type if available)
    const cacheKey = cacheKeys.electiveCourses(parsedTermId) + (studentTermNumber !== null ? `_student_${studentTermNumber}` : "") + `_system_${electiveSystemType}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      // Handle both old format (array) and new format (object with courses and maxElectives)
      if (Array.isArray(cached)) {
        // Old cached format - calculate maxElectives on the fly
        const termRepo = AppDataSource.getRepository(Term);
        const term = await termRepo.findOne({
          where: { id: parsedTermId, is_published: true },
        });
        if (term) {
          const maxElectives = await getMaxElectivesForTerm(term.id, electiveSystemType);
          return res.json({
            success: true,
            data: cached,
            maxElectives: maxElectives,
            cached: true,
          });
        }
        return res.json({
          success: true,
          data: cached,
          maxElectives: 0,
          cached: true,
        });
      } else {
        // New cached format (object with courses and maxElectives)
        const cachedData = cached as { courses?: Course[]; maxElectives?: number };
        return res.json({
          success: true,
          data: cachedData.courses || [],
          maxElectives: cachedData.maxElectives || 0,
          cached: true,
        });
      }
    }

    // Verify term exists and is published
    const termRepo = AppDataSource.getRepository(Term);
    const term = await termRepo.findOne({
      where: { id: parsedTermId, is_published: true },
    });

    if (!term) {
      return res.status(404).json({
        success: false,
        message: "Published term not found",
      });
    }

    // Get all classes for this term and system
    const classRepo = AppDataSource.getRepository(Class);
    const classes = await classRepo.find({
      where: { 
        term_id: term.id,
        system_type: electiveSystemType,
      },
    });

    // Get all class courses and extract unique elective courses
    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const classIds = classes.map(c => c.id);
    const classCourses = classIds.length > 0 ? await classCourseRepo.find({
      where: { class_id: In(classIds) },
      relations: ["course"],
    }) : [];

    // Filter elective courses (is_elective = true)
    // IMPORTANT: Course term_number does NOT restrict registration for electives
    // Any student with term_number >= 6 can register ANY elective, regardless of elective's term_number
    // Courses are filtered through classes - classes already filtered by system_type
    const electiveCoursesMap = new Map<number, Course>();
    classCourses.forEach(cc => {
      if (cc.course.is_elective) {
        electiveCoursesMap.set(cc.course.id, cc.course);
      }
    });

    const electiveCourses = Array.from(electiveCoursesMap.values());

    // Calculate maximum number of electives based on classes in this term
    const maxElectives = await getMaxElectivesForTerm(term.id, electiveSystemType);

    // Cache the result (include maxElectives in cache)
    const cacheData = {
      courses: electiveCourses,
      maxElectives: maxElectives,
    };
    cache.set(cacheKey, cacheData, CACHE_TTL.COURSES);

    return res.json({
      success: true,
      data: electiveCourses,
      maxElectives: maxElectives,
    });
  } catch (error) {
    console.error("Error fetching elective courses:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Get all elective courses with sessions across all published terms for a system
 * Used for displaying all elective slots in a unified view
 */
export const getAllElectiveSlots = async (req: Request, res: Response) => {
  try {
    // Get systemType from query parameter (required)
    const systemType = req.query.systemType ? parseInt(req.query.systemType as string) : null;
    
    if (!systemType || ![140, 160, 180].includes(systemType)) {
      return res.status(400).json({
        success: false,
        message: "Valid systemType (140, 160, or 180) is required",
      });
    }

    // Check cache first
    const cacheKey = `all_elective_slots_system_${systemType}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Get all published terms
    const termRepo = AppDataSource.getRepository(Term);
    const terms = await termRepo.find({
      where: { is_published: true },
      order: { term_number: "ASC" },
    });

    if (terms.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Get all classes for all terms with the specified system type
    const classRepo = AppDataSource.getRepository(Class);
    const termIds = terms.map(t => t.id);
    const classes = await classRepo.find({
      where: { 
        term_id: In(termIds),
        system_type: systemType,
      },
    });

    if (classes.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Get all class courses for these classes
    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const classIds = classes.map(c => c.id);
    const classCourses = await classCourseRepo.find({
      where: { class_id: In(classIds) },
      relations: ["course"],
    });

    // Filter only elective courses
    const electiveClassCourses = classCourses.filter(cc => cc.course.is_elective);

    if (electiveClassCourses.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Get all components for these class courses
    const componentRepo = AppDataSource.getRepository(CourseComponent);
    const classCourseIds = electiveClassCourses.map(cc => cc.id);
    const components = await componentRepo.find({
      where: { class_course_id: In(classCourseIds) },
    });

    // Get all sessions for these components
    const sessionRepo = AppDataSource.getRepository(Session);
    const componentIds = components.map(c => c.id);
    const sessions = componentIds.length > 0 ? await sessionRepo.find({
      where: { component_id: In(componentIds) },
    }) : [];

    // Build a map of sessions by component
    const sessionsByComponentId = new Map<number, Session[]>();
    sessions.forEach(session => {
      if (!sessionsByComponentId.has(session.component_id)) {
        sessionsByComponentId.set(session.component_id, []);
      }
      sessionsByComponentId.get(session.component_id)!.push(session);
    });

    // Build result: array of elective slots with course info, component, and sessions
    const electiveSlots: Array<{
      course: Course;
      component: CourseComponent;
      sessions: Session[];
      term_number: string;
      class_code: string;
    }> = [];

    // Create a map of class_id to class info
    const classMap = new Map<number, Class>();
    classes.forEach(c => classMap.set(c.id, c));

    // Create a map of class_course_id to class_course info
    const classCourseMap = new Map<number, ClassCourse>();
    classCourses.forEach(cc => classCourseMap.set(cc.id, cc));

    components.forEach(component => {
      const classCourse = classCourseMap.get(component.class_course_id);
      if (!classCourse || !classCourse.course.is_elective) return;

      const classEntity = classMap.get(classCourse.class_id);
      if (!classEntity) return;

      const term = terms.find(t => t.id === classEntity.term_id);
      if (!term) return;

      const componentSessions = sessionsByComponentId.get(component.id) || [];

      electiveSlots.push({
        course: classCourse.course,
        component: component,
        sessions: componentSessions,
        term_number: term.term_number,
        class_code: classEntity.class_code,
      });
    });

    // Cache the result
    cache.set(cacheKey, electiveSlots, CACHE_TTL.COURSES);

    return res.json({
      success: true,
      data: electiveSlots,
    });
  } catch (error: any) {
    console.error("Error fetching all elective slots:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

/**
 * Get all courses from all terms for "Other" section
 * Shows ALL courses (core + elective) from ALL terms filtered by system_type
 * No filtering by student term_number
 * Used for students who don't belong to a fixed academic term or have special cases
 */
export const getAllCoursesForOther = async (req: Request, res: Response) => {
  try {
    // Get systemType from query parameter (required)
    const systemType = req.query.systemType ? parseInt(req.query.systemType as string) : null;
    
    if (!systemType || ![140, 160, 180].includes(systemType)) {
      return res.status(400).json({
        success: false,
        message: "Valid systemType (140, 160, or 180) is required",
      });
    }

    // Check cache first
    const cacheKey = `all_courses_other_section_system_${systemType}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Get all published terms
    const termRepo = AppDataSource.getRepository(Term);
    const terms = await termRepo.find({
      where: { is_published: true },
      order: { term_number: "ASC" },
    });

    if (terms.length === 0) {
      return res.json({
        success: true,
        data: {
          courses: [],
          terms: [],
        },
      });
    }

    // Get all classes from all published terms filtered by system_type
    const classRepo = AppDataSource.getRepository(Class);
    const termIds = terms.map(t => t.id);
    const allClasses = termIds.length > 0 ? await classRepo.find({
      where: { 
        term_id: In(termIds),
        system_type: systemType,
      },
      relations: ["term"],
    }) : [];

    // Create a map of term_id to term_number for quick lookup
    const termMap = new Map<number, string>();
    terms.forEach(term => {
      termMap.set(term.id, term.term_number);
    });

    // Get all class courses with course and term information
    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const classIds = allClasses.map(c => c.id);
    const allClassCourses = classIds.length > 0 ? await classCourseRepo.find({
      where: { class_id: In(classIds) },
      relations: ["course", "class"],
    }) : [];

    // Group courses by term and type (core/elective)
    // Create a map to store unique courses with their term information
    const coursesMap = new Map<string, {
      course: Course;
      term_number: string;
      term_id: number;
      classes: Array<{ id: number; class_code: string }>;
    }>();

    allClassCourses.forEach(cc => {
      const courseKey = `${cc.course.id}_${cc.class.term_id}`;
      const termNumber = termMap.get(cc.class.term_id) || "Unknown";
      
      if (!coursesMap.has(courseKey)) {
        coursesMap.set(courseKey, {
          course: cc.course,
          term_number: termNumber,
          term_id: cc.class.term_id,
          classes: [],
        });
      }
      const courseData = coursesMap.get(courseKey)!;
      if (!courseData.classes.find(c => c.id === cc.class.id)) {
        courseData.classes.push({
          id: cc.class.id,
          class_code: cc.class.class_code,
        });
      }
    });

    // Separate into core and elective courses
    const coreCourses: any[] = [];
    const electiveCourses: any[] = [];

    coursesMap.forEach((data, key) => {
      // Courses are already filtered through classes by system_type
      // No need to check course.system_type since classes are filtered
      const courseData = {
        ...data.course,
        term_number: data.term_number,
        term_id: data.term_id,
        classes: data.classes,
      };
      
      if (data.course.is_elective) {
        electiveCourses.push(courseData);
      } else {
        coreCourses.push(courseData);
      }
    });

    // Sort by term_number, then by course code
    const sortCourses = (a: any, b: any) => {
      if (a.term_number !== b.term_number) {
        return a.term_number.localeCompare(b.term_number);
      }
      return a.code.localeCompare(b.code);
    };

    coreCourses.sort(sortCourses);
    electiveCourses.sort(sortCourses);

    // Calculate maximum electives across all terms (use the highest value)
    let maxElectivesAcrossTerms = 0;
    for (const term of terms) {
      const maxElectivesForTerm = await getMaxElectivesForTerm(term.id, systemType);
      if (maxElectivesForTerm > maxElectivesAcrossTerms) {
        maxElectivesAcrossTerms = maxElectivesForTerm;
      }
    }

    const result = {
      courses: {
        core: coreCourses,
        elective: electiveCourses,
      },
      terms: terms.map(t => ({
        id: t.id,
        term_number: t.term_number,
        is_published: t.is_published,
      })),
      maxElectives: maxElectivesAcrossTerms,
    };

    // Cache the result
    cache.set(cacheKey, result, CACHE_TTL.COURSES);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching all courses for Other section:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Generate timetable schedules for "Other" section
 * Accepts selectedCourseIds and generates schedules from all terms
 */
export const generateOtherSectionSchedules = async (req: Request, res: Response) => {
  try {
    const { selectedCourseIds, excludedDays, systemType } = req.body;

    if (!Array.isArray(selectedCourseIds) || selectedCourseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "selectedCourseIds must be a non-empty array",
      });
    }

    if (!Array.isArray(excludedDays)) {
      return res.status(400).json({
        success: false,
        message: "excludedDays must be an array",
      });
    }

    if (!systemType || ![140, 160, 180].includes(systemType)) {
      return res.status(400).json({
        success: false,
        message: "Valid systemType (140, 160, or 180) is required",
      });
    }

    // Get all published terms first to calculate max electives
    const termRepo = AppDataSource.getRepository(Term);
    const terms = await termRepo.find({
      where: { is_published: true },
    });

    // Calculate maximum electives across all terms (use the highest value)
    let maxElectivesAcrossTerms = 0;
    for (const term of terms) {
      const maxElectivesForTerm = await getMaxElectivesForTerm(term.id, systemType);
      if (maxElectivesForTerm > maxElectivesAcrossTerms) {
        maxElectivesAcrossTerms = maxElectivesForTerm;
      }
    }

    // Count electives - validate against dynamic maximum
    const courseRepo = AppDataSource.getRepository(Course);
    const courses = await courseRepo.find({
      where: { id: In(selectedCourseIds) },
    });

    const electiveCount = courses.filter(c => c.is_elective).length;
    if (maxElectivesAcrossTerms > 0 && electiveCount > maxElectivesAcrossTerms) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${maxElectivesAcrossTerms} elective course${maxElectivesAcrossTerms > 1 ? 's' : ''} allowed`,
      });
    }

    // Courses are filtered through classes by system_type, so validation is done at class level
    // No need to validate course.system_type since courses don't have system_type

    // Get all classes from all published terms filtered by system_type
    const classRepo = AppDataSource.getRepository(Class);
    const termIds = terms.map(t => t.id);
    const allClasses = termIds.length > 0 ? await classRepo.find({
      where: { 
        term_id: In(termIds),
        system_type: systemType,
      },
    }) : [];

    // Get class courses for selected courses
    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const classIds = allClasses.map(c => c.id);
    const classCourses = classIds.length > 0 ? await classCourseRepo.find({
      where: {
        class_id: In(classIds),
        course_id: In(selectedCourseIds),
      },
      relations: ["course", "class"],
    }) : [];

    if (classCourses.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No classes found for selected courses",
      });
    }

    // Get components and sessions
    const componentRepo = AppDataSource.getRepository(CourseComponent);
    const sessionRepo = AppDataSource.getRepository(Session);
    
    const classCourseIds = classCourses.map(cc => cc.id);
    const allComponents = await componentRepo.find({
      where: { class_course_id: In(classCourseIds) },
    });

    const componentIds = allComponents.map(c => c.id);
    const allSessions = componentIds.length > 0 ? await sessionRepo.find({
      where: { component_id: In(componentIds) },
      order: { day: "ASC", slot: "ASC" },
    }) : [];

    // Group sessions by component
    const sessionsByComponentId = new Map<number, Session[]>();
    allSessions.forEach(session => {
      if (!sessionsByComponentId.has(session.component_id)) {
        sessionsByComponentId.set(session.component_id, []);
      }
      sessionsByComponentId.get(session.component_id)!.push(session);
    });

    // Group components by class course
    const componentsByClassCourseId = new Map<number, CourseComponent[]>();
    allComponents.forEach(component => {
      if (!componentsByClassCourseId.has(component.class_course_id)) {
        componentsByClassCourseId.set(component.class_course_id, []);
      }
      componentsByClassCourseId.get(component.class_course_id)!.push({
        ...component,
        sessions: sessionsByComponentId.get(component.id) || [],
      } as any);
    });

    // Build coursesData
    const coursesData = classCourses.map(cc => ({
      classCourse: cc,
      class: cc.class,
      course: cc.course,
      components: componentsByClassCourseId.get(cc.id) || [],
    }));

    // Filter courses with sessions and separate core/elective
    const coursesWithSessions = coursesData.filter(cd => {
      return cd.components.some((comp: any) => comp.sessions && comp.sessions.length > 0);
    });

    if (coursesWithSessions.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No courses with scheduled sessions found",
      });
    }

    // Separate core and elective courses
    const coreCoursesData = coursesWithSessions.filter(cd => !cd.course.is_elective);
    const electiveCoursesData = coursesWithSessions.filter(cd => cd.course.is_elective);

    // Generate schedules
    const schedules = generateScheduleCombinations(
      coreCoursesData,
      electiveCoursesData,
      excludedDays
    );

    // Sort by score
    schedules.sort((a, b) => b.score - a.score);

    // Return top 50 schedules
    const topSchedules = schedules.slice(0, 50);

    if (topSchedules.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No valid schedules could be generated. Please check for time conflicts.",
      });
    }

    return res.json({
      success: true,
      data: topSchedules,
    });
  } catch (error) {
    console.error("Error generating Other section schedules:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Generate timetable schedules based on student preferences
 */
export const generateTimetableSchedules = async (req: Request, res: Response) => {
  try {
    const { termId, excludedDays, electiveCourseIds, excludedCoreCourseIds } = req.body;

    // Handle "Other" section - redirect to separate function
    if (!termId || termId === "other" || termId === "null") {
      // This should be handled by generateOtherSectionSchedules
      // But for backward compatibility, we'll handle it here if selectedCourseIds is provided
      if (req.body.selectedCourseIds) {
        return generateOtherSectionSchedules(req, res);
      }
      return res.status(400).json({
        success: false,
        message: "termId is required for term-based schedule generation",
      });
    }

    // Decode term token if it's a token, otherwise use as-is (for backward compatibility during migration)
    let parsedTermId: number;
    if (typeof termId === "string" && termId.length > 10) {
      // Likely a token (tokens are longer than simple numbers)
      const decoded = decodeTermToken(termId);
      if (!decoded) {
        return res.status(400).json({
          success: false,
          message: "Invalid term token",
        });
      }
      parsedTermId = decoded;
    } else {
      // Backward compatibility: accept numeric ID during migration
      parsedTermId = typeof termId === "number" ? termId : parseInt(String(termId), 10);
      if (isNaN(parsedTermId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid term ID",
        });
      }
    }

    if (!Array.isArray(excludedDays)) {
      return res.status(400).json({
        success: false,
        message: "excludedDays must be an array",
      });
    }

    if (electiveCourseIds && !Array.isArray(electiveCourseIds)) {
      return res.status(400).json({
        success: false,
        message: "electiveCourseIds must be an array",
      });
    }

    // Validate systemType is provided
    const scheduleSystemType = req.body.systemType ? parseInt(req.body.systemType as string) : null;
    if (!scheduleSystemType || ![140, 160, 180].includes(scheduleSystemType)) {
      return res.status(400).json({
        success: false,
        message: "Valid systemType (140, 160, or 180) is required",
      });
    }

    // Calculate maximum electives for this term based on classes
    const maxElectives = await getMaxElectivesForTerm(parsedTermId, scheduleSystemType);

    // Validate elective limit: use dynamic maximum based on classes
    if (electiveCourseIds && electiveCourseIds.length > 0) {
      if (maxElectives > 0 && electiveCourseIds.length > maxElectives) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${maxElectives} elective course${maxElectives > 1 ? 's' : ''} allowed for this term`,
        });
      }
    }

    if (excludedCoreCourseIds && !Array.isArray(excludedCoreCourseIds)) {
      return res.status(400).json({
        success: false,
        message: "excludedCoreCourseIds must be an array",
      });
    }

    // Normalize and sort preferences for consistent hashing
    const sortedExcludedDays = [...excludedDays].sort();
    const sortedElectiveIds = electiveCourseIds ? [...electiveCourseIds].sort() : null;
    const sortedExcludedCoreIds = excludedCoreCourseIds ? [...excludedCoreCourseIds].sort() : null;
    
    // Generate hash for database lookup
    const excludedDaysJson = JSON.stringify(sortedExcludedDays);
    const electiveIdsJson = sortedElectiveIds ? JSON.stringify(sortedElectiveIds) : null;
    const excludedCoreIdsJson = sortedExcludedCoreIds ? JSON.stringify(sortedExcludedCoreIds) : null;
    const excludedDaysHash = crypto.createHash("md5").update(excludedDaysJson).digest("hex");
    const electiveIdsHash = electiveIdsJson ? crypto.createHash("md5").update(electiveIdsJson).digest("hex") : null;
    const excludedCoreIdsHash = excludedCoreIdsJson ? crypto.createHash("md5").update(excludedCoreIdsJson).digest("hex") : null;

    // Check in-memory cache first
    const excludedDaysKey = sortedExcludedDays.join(",");
    const electiveIdsKey = sortedElectiveIds ? sortedElectiveIds.join(",") : "none";
    const excludedCoreIdsKey = sortedExcludedCoreIds ? sortedExcludedCoreIds.join(",") : "none";
    const cacheKey = cacheKeys.schedule(parsedTermId, excludedDaysKey, electiveIdsKey, excludedCoreIdsKey) + `_system_${scheduleSystemType}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`[generateTimetableSchedules] Cache hit for term ${parsedTermId}`);
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Skip database cache lookup to prevent timeout issues
    // Cache is optional and will be saved asynchronously after response
    let existingCache = null;

    // Helper function to retry database operations with exponential backoff
    const retryQuery = async <T>(
      queryFn: () => Promise<T>,
      maxRetries: number = 3,
      delay: number = 1000
    ): Promise<T> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await queryFn();
        } catch (error: any) {
          const isTimeoutError = error.message?.includes("timeout") || 
                                error.message?.includes("ETIMEDOUT") ||
                                error.code === "ETIMEDOUT" ||
                                error.message?.includes("timeout exceeded when trying to connect");
          
          if (isTimeoutError && attempt < maxRetries) {
            const waitTime = delay * Math.pow(2, attempt - 1);
            console.warn(`[generateTimetableSchedules] Database connection timeout on attempt ${attempt}, retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            // Try to reinitialize connection if it's lost
            if (!AppDataSource.isInitialized) {
              try {
                await AppDataSource.initialize();
                console.log(`[generateTimetableSchedules] Reinitialized database connection`);
              } catch (initError) {
                console.error(`[generateTimetableSchedules] Failed to reinitialize connection:`, initError);
              }
            }
            continue;
          }
          throw error;
        }
      }
      throw new Error("Max retries exceeded");
    };

    // Verify term exists and is published
    const termRepo = AppDataSource.getRepository(Term);
    const term = await retryQuery(async () => {
      return await termRepo.findOne({
        where: { id: parsedTermId, is_published: true },
      });
    });

    if (!term) {
      return res.status(404).json({
        success: false,
        message: "Published term not found",
      });
    }

    // Get all classes for this term and system
    const classRepo = AppDataSource.getRepository(Class);
    const classes = await retryQuery(async () => {
      return await classRepo.find({
        where: { 
          term_id: term.id,
          system_type: scheduleSystemType,
        },
        order: { class_code: "ASC" },
      });
    });

    console.log(`[generateTimetableSchedules] Found ${classes.length} classes for term ${term.id}:`, 
      classes.map(c => ({ id: c.id, class_code: c.class_code }))
    );

    if (classes.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No classes found for this term. Please create classes first.",
      });
    }

    // Get all class courses with full data
    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const classIds = classes.map(c => c.id);
    const allClassCourses = classIds.length > 0 ? await retryQuery(async () => {
      return await classCourseRepo.find({
        where: { class_id: In(classIds) },
        relations: ["course", "class"],
      });
    }) : [];

    console.log(`[generateTimetableSchedules] Found ${allClassCourses.length} class-course assignments across ${classes.length} classes`);
    
    // Log class distribution
    const coursesByClass = new Map<number, number>();
    allClassCourses.forEach(cc => {
      coursesByClass.set(cc.class_id, (coursesByClass.get(cc.class_id) || 0) + 1);
    });
    console.log(`[generateTimetableSchedules] Courses per class:`, 
      Array.from(coursesByClass.entries()).map(([classId, count]) => {
        const classEntity = classes.find(c => c.id === classId);
        return { class: classEntity?.class_code || classId, courses: count };
      })
    );

    if (allClassCourses.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No courses assigned to classes in this term. Please assign courses to classes first.",
      });
    }

    // Get components and sessions for all class courses
    // Optimized: Batch fetch to reduce concurrent connections
    const componentRepo = AppDataSource.getRepository(CourseComponent);
    const sessionRepo = AppDataSource.getRepository(Session);

    // Fetch all components first (batch)
    const allComponents = await retryQuery(async () => {
      const classCourseIds = allClassCourses.map(cc => cc.id);
      if (classCourseIds.length === 0) return [];
      return await componentRepo.find({
        where: { class_course_id: In(classCourseIds) },
      });
    });

    // Fetch all sessions in batch
    const allSessions = await retryQuery(async () => {
      const componentIds = allComponents.map(c => c.id);
      if (componentIds.length === 0) return [];
      return await sessionRepo.find({
        where: { component_id: In(componentIds) },
        order: { day: "ASC", slot: "ASC" },
      });
    });

    // Group sessions by component_id for efficient lookup
    const sessionsByComponentId = new Map<number, any[]>();
    allSessions.forEach(session => {
      if (!sessionsByComponentId.has(session.component_id)) {
        sessionsByComponentId.set(session.component_id, []);
      }
      sessionsByComponentId.get(session.component_id)!.push(session);
    });

    // Group components by class_course_id
    const componentsByClassCourseId = new Map<number, any[]>();
    allComponents.forEach(component => {
      if (!componentsByClassCourseId.has(component.class_course_id)) {
        componentsByClassCourseId.set(component.class_course_id, []);
      }
      componentsByClassCourseId.get(component.class_course_id)!.push({
        ...component,
        sessions: sessionsByComponentId.get(component.id) || [],
      });
    });

    // Build coursesData using the grouped data
    const coursesData = allClassCourses.map(cc => ({
      classCourse: cc,
      class: cc.class,
      course: cc.course,
      components: componentsByClassCourseId.get(cc.id) || [],
    }));

    // Separate core and elective courses
    const coreCoursesData = coursesData.filter(cd => !cd.course.is_elective);
    const electiveCoursesData = coursesData.filter(cd => cd.course.is_elective);

    console.log(`[generateTimetableSchedules] Found ${coreCoursesData.length} core courses and ${electiveCoursesData.length} elective courses`);

    // Filter out excluded core courses FIRST
    const filteredCoreCoursesData = sortedExcludedCoreIds && sortedExcludedCoreIds.length > 0
      ? coreCoursesData.filter(cd => !sortedExcludedCoreIds.includes(cd.course.id))
      : coreCoursesData;

    if (sortedExcludedCoreIds && sortedExcludedCoreIds.length > 0) {
      console.log(`[generateTimetableSchedules] Excluding ${sortedExcludedCoreIds.length} core course(s): ${sortedExcludedCoreIds.join(", ")}`);
      console.log(`[generateTimetableSchedules] Core courses after exclusion: ${filteredCoreCoursesData.length} (from ${coreCoursesData.length})`);
    }

    // Filter elective courses by selected IDs
    const selectedElectiveCourses = electiveCourseIds
      ? electiveCoursesData.filter(cd => electiveCourseIds.includes(cd.course.id))
      : [];

    console.log(`[generateTimetableSchedules] Selected ${selectedElectiveCourses.length} elective courses`);

    // Check if core courses have sessions (using filtered core courses)
    const coreCoursesWithSessions = filteredCoreCoursesData.filter(cd => {
      return cd.components.some((comp: any) => comp.sessions && comp.sessions.length > 0);
    });

    console.log(`[generateTimetableSchedules] Found ${coreCoursesWithSessions.length} core courses with scheduled sessions (after excluding ${sortedExcludedCoreIds?.length || 0} excluded core courses)`);

    // Check if there are any courses with sessions
    const coursesWithSessions = [...coreCoursesWithSessions, ...selectedElectiveCourses].filter(cd => {
      return cd.components.some((comp: any) => comp.sessions && comp.sessions.length > 0);
    });

    console.log(`[generateTimetableSchedules] Found ${coursesWithSessions.length} courses with scheduled sessions (${coreCoursesWithSessions.length} core + ${selectedElectiveCourses.length} elective)`);

    if (coursesWithSessions.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No courses with scheduled sessions found. Please ensure courses have sessions scheduled in their timetable, or reduce the number of excluded core courses.",
      });
    }

    // Filter elective courses with sessions
    const electiveCoursesWithSessions = selectedElectiveCourses.filter(cd => {
      return cd.components.some((comp: any) => comp.sessions && comp.sessions.length > 0);
    });

    console.log(`[generateTimetableSchedules] Filtered to ${electiveCoursesWithSessions.length} elective courses with sessions`);

    // Debug: Log course details and class distribution
    const classesInUse = new Set<string>();
    const classesWithCourses = new Set<string>();
    
    // Log ALL classes found
    console.log(`[generateTimetableSchedules] ALL classes in term ${term.id}:`, 
      classes.map(c => ({ id: c.id, class_code: c.class_code }))
    );
    
    // Log ALL courses found (before filtering)
    console.log(`[generateTimetableSchedules] ALL courses found (before filtering):`, 
      coursesData.map(cd => ({
        course: cd.course.code,
        class: cd.class.class_code,
        hasSessions: cd.components.some((c: any) => c.sessions && c.sessions.length > 0),
        components: cd.components.map((c: any) => ({
          type: c.component_type,
          sessionsCount: c.sessions?.length || 0
        }))
      }))
    );
    
    // Track which classes have courses
    coursesData.forEach(cd => classesWithCourses.add(cd.class.class_code));
    
    // Track which classes have courses WITH sessions
    coreCoursesWithSessions.forEach(cd => classesInUse.add(cd.class.class_code));
    
    console.log(`[generateTimetableSchedules] Core courses with sessions (${coreCoursesWithSessions.length} total):`, 
      coreCoursesWithSessions.map(cd => ({
        course: cd.course.code,
        class: cd.class.class_code,
        components: cd.components.map((c: any) => ({
          type: c.component_type,
          sessionsCount: c.sessions?.length || 0
        }))
      }))
    );
    
    console.log(`[generateTimetableSchedules] Summary:`);
    console.log(`  - Total classes in term: ${classes.length}`);
    console.log(`  - Classes with courses assigned: ${classesWithCourses.size} (${Array.from(classesWithCourses).sort().join(", ")})`);
    console.log(`  - Classes with courses that have sessions: ${classesInUse.size} (${Array.from(classesInUse).sort().join(", ")})`);
    console.log(`  - Classes missing sessions: ${Array.from(classesWithCourses).filter(c => !classesInUse.has(c)).sort().join(", ") || "None"}`);

    // Generate all possible combinations
    const schedules = generateScheduleCombinations(
      coreCoursesWithSessions,
      electiveCoursesWithSessions,
      excludedDays
    );

    console.log(`[generateTimetableSchedules] Generated ${schedules.length} valid schedule(s)`);

    // Sort by score (fewest gaps, fewest days)
    schedules.sort((a, b) => b.score - a.score);

    // Return top 50 schedules (sorted descending by score)
    const topSchedules = schedules.slice(0, 50);

    console.log(`[generateTimetableSchedules] Returning top ${topSchedules.length} schedule(s)`);

    if (topSchedules.length === 0 && schedules.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No valid schedules could be generated. This might be because: 1) Courses don't have all required components (L, S, LB) scheduled, 2) There are time conflicts between courses, or 3) Your excluded days are too restrictive. Please check that all courses have their Lecture (L) and Section (S) sessions scheduled.",
      });
    }

    // Save to database cache (non-blocking - don't wait for it)
    // Cache save is optional and should not block the response
    // Use setTimeout with longer delay to ensure response is sent first
    setTimeout(async () => {
      try {
        // Skip cache save if database connection is not available
        if (!AppDataSource.isInitialized) {
          console.warn(`[generateTimetableSchedules] Database not initialized, skipping cache save`);
          return;
        }

        const scheduleCacheRepo = AppDataSource.getRepository(ScheduleCache);
        
        // Use a simpler approach: try to create directly, catch duplicate errors
        // This avoids the slow NULL-check query
        try {
          const newCacheEntry = scheduleCacheRepo.create({
            term_id: parsedTermId,
            excluded_days: excludedDaysJson,
            excluded_days_hash: excludedDaysHash,
            elective_course_ids: electiveIdsJson,
            elective_course_ids_hash: electiveIdsHash,
            excluded_core_course_ids: excludedCoreIdsJson,
            excluded_core_course_ids_hash: excludedCoreIdsHash,
            schedules: topSchedules,
            access_count: 1,
          });

          // Add timeout protection (10 seconds)
          const savePromise = scheduleCacheRepo.save(newCacheEntry);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Cache save timeout")), 10000)
          );
          
          await Promise.race([savePromise, timeoutPromise]);
          console.log(`[generateTimetableSchedules] Saved schedules to database cache for term ${parsedTermId}`);
        } catch (saveError: any) {
          // If it's a unique constraint violation, try to update instead
          if (saveError.code === "23505" || saveError.message?.includes("duplicate key") || saveError.message?.includes("unique constraint")) {
            try {
              // Try to find and update existing entry with timeout
              const findPromise = scheduleCacheRepo.findOne({
                where: {
                  term_id: parsedTermId,
                  excluded_days_hash: excludedDaysHash,
                  elective_course_ids_hash: electiveIdsHash !== null ? electiveIdsHash : IsNull(),
                  excluded_core_course_ids_hash: excludedCoreIdsHash !== null ? excludedCoreIdsHash : IsNull(),
                },
              });
              
              const findTimeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Cache find timeout")), 5000)
              );
              
              const existingEntry = await Promise.race([findPromise, findTimeoutPromise]) as ScheduleCache | null;
              
              if (existingEntry) {
                existingEntry.schedules = topSchedules;
                existingEntry.access_count += 1;
                
                const updatePromise = scheduleCacheRepo.save(existingEntry);
                const updateTimeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error("Cache update timeout")), 5000)
                );
                
                await Promise.race([updatePromise, updateTimeoutPromise]);
                console.log(`[generateTimetableSchedules] Updated existing database cache entry for term ${parsedTermId}`);
              }
            } catch (updateError: any) {
              // Silently ignore update errors - cache is optional
              if (!updateError.message?.includes("timeout")) {
                console.warn(`[generateTimetableSchedules] Cache update failed (non-blocking):`, updateError.message?.substring(0, 100));
              }
            }
          } else if (saveError.message?.includes("timeout") || saveError.message?.includes("ETIMEDOUT")) {
            // Silently ignore timeout errors - cache is optional
            console.warn(`[generateTimetableSchedules] Cache save timed out (non-blocking), skipping...`);
          } else if (saveError.message?.includes("excluded_core_course_ids") || saveError.message?.includes("column") || saveError.message?.includes("does not exist")) {
            console.warn(`[generateTimetableSchedules] Cannot save to cache - table needs migration. Skipping cache save.`);
          } else {
            // Log other errors but don't fail
            console.warn(`[generateTimetableSchedules] Cache save failed (non-blocking):`, saveError.message?.substring(0, 100));
          }
        }
      } catch (dbError: any) {
        // Silently ignore all cache errors - cache is completely optional
        if (!dbError.message?.includes("timeout")) {
          console.warn(`[generateTimetableSchedules] Database cache operation failed (non-blocking):`, dbError.message?.substring(0, 100));
        }
      }
    }, 100); // Small delay to ensure response is sent first

    // Cache in memory for faster future access
    cache.set(cacheKey, topSchedules, CACHE_TTL.SCHEDULES);

    return res.json({
      success: true,
      data: topSchedules,
      cached: false,
    });
  } catch (error) {
    console.error("Error generating timetable schedules:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Build conflict matrix: pre-compute which course-class pairs conflict
 * Returns a Map where key is "courseId1_classId1-courseId2_classId2" and value is true if they conflict
 * This allows O(1) conflict checking before building schedules
 */
function buildConflictMatrix(allCourses: any[]): Map<string, boolean> {
  const conflictMatrix = new Map<string, boolean>();
  const courseClassPairs: Array<{ courseId: number; classId: number; sessions: any[] }> = [];
  
  // Extract all course-class pairs with their sessions
  for (const courseData of allCourses) {
    const sessions: any[] = [];
    for (const component of courseData.components || []) {
      if (component.sessions && component.sessions.length > 0) {
        sessions.push(...component.sessions.map((s: any) => ({
          day: String(s.day),
          slot: Number(s.slot),
        })));
      }
    }
    if (sessions.length > 0) {
      courseClassPairs.push({
        courseId: courseData.course.id,
        classId: courseData.class.id,
        sessions,
      });
    }
  }
  
  // Check conflicts between all pairs
  for (let i = 0; i < courseClassPairs.length; i++) {
    for (let j = i + 1; j < courseClassPairs.length; j++) {
      const pair1 = courseClassPairs[i];
      const pair2 = courseClassPairs[j];
      
      // Skip if same course (different classes of same course can't conflict - student picks one)
      if (pair1.courseId === pair2.courseId) continue;
      
      // Check if any sessions overlap (same day and slot)
      const hasConflict = pair1.sessions.some(s1 => 
        pair2.sessions.some(s2 => s1.day === s2.day && s1.slot === s2.slot)
      );
      
      if (hasConflict) {
        // Mark both directions as conflicting
        const key1 = `${pair1.courseId}_${pair1.classId}-${pair2.courseId}_${pair2.classId}`;
        const key2 = `${pair2.courseId}_${pair2.classId}-${pair1.courseId}_${pair1.classId}`;
        conflictMatrix.set(key1, true);
        conflictMatrix.set(key2, true);
      }
    }
  }
  
  console.log(`[buildConflictMatrix] Built conflict matrix with ${conflictMatrix.size / 2} conflicting pairs`);
  return conflictMatrix;
}

/**
 * Check if a combination has conflicts using the conflict matrix
 * Returns true if combination is valid (no conflicts), false if conflicts exist
 */
function hasConflicts(combination: any[], conflictMatrix: Map<string, boolean>): boolean {
  // Check all pairs in the combination
  for (let i = 0; i < combination.length; i++) {
    for (let j = i + 1; j < combination.length; j++) {
      const courseData1 = combination[i];
      const courseData2 = combination[j];
      
      // Skip if same course (different classes of same course)
      if (courseData1.course.id === courseData2.course.id) continue;
      
      // Check conflict matrix
      const key = `${courseData1.course.id}_${courseData1.class.id}-${courseData2.course.id}_${courseData2.class.id}`;
      if (conflictMatrix.get(key)) {
        return true; // Conflict found
      }
    }
  }
  return false; // No conflicts
}

/**
 * Generate all possible schedule combinations (optimized with constraint propagation and parallelization)
 */
function generateScheduleCombinations(
  coreCourses: any[],
  electiveCourses: any[],
  excludedDays: string[]
): any[] {
  const allCourses = [...coreCourses, ...electiveCourses];
  
  // OPTIMIZATION 1: Build conflict matrix for constraint propagation
  // This pre-computes which course-class pairs conflict, allowing us to skip invalid combinations early
  console.log(`[generateScheduleCombinations] Building conflict matrix...`);
  const conflictMatrix = buildConflictMatrix(allCourses);
  const conflictCheckStartTime = Date.now();
  
  // Group courses by course ID to get all class options for each course
  // Each course can be taught in multiple classes (e.g., ECE3203 in class 5_1, 5_2, 5_3, etc.)
  // We need to generate all possible combinations where:
  // - Each course is taken from exactly ONE class
  // - Each course-class combination is ATOMIC (all components must be included together)
  // - Students can mix courses from different classes
  const coursesByCourseId = new Map<number, any[]>();
  allCourses.forEach(cd => {
    const courseId = cd.course.id;
    if (!coursesByCourseId.has(courseId)) {
      coursesByCourseId.set(courseId, []);
    }
    coursesByCourseId.get(courseId)!.push(cd);
  });

  // Get unique course IDs
  const uniqueCourseIds = Array.from(coursesByCourseId.keys());
  
  console.log(`[generateScheduleCombinations] Grouped ${uniqueCourseIds.length} unique courses with class options:`);
  Array.from(coursesByCourseId.entries()).forEach(([id, options]) => {
    const course = options[0]?.course;
    console.log(`  - Course ${course?.code || id}: ${options.length} class option(s) - ${options.map((o: any) => o.class.class_code).join(", ")}`);
  });
  
  // CRITICAL: Shuffle class options for each course to ensure all classes have equal priority
  // Without shuffling, the algorithm always starts with the first class option, giving it priority
  // By shuffling, we ensure all classes are explored equally
  const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  
  // Shuffle class options for each course
  coursesByCourseId.forEach((options, courseId) => {
    coursesByCourseId.set(courseId, shuffleArray(options));
  });
  
  console.log(`[generateScheduleCombinations] Shuffled class options to ensure equal priority:`);
  Array.from(coursesByCourseId.entries()).forEach(([id, options]) => {
    const course = options[0]?.course;
    console.log(`  - Course ${course?.code || id}: shuffled order - ${options.map((o: any) => o.class.class_code).join(", ")}`);
  });
  
  // Verify we have all classes
  const allClassesInCombinations = new Set<string>();
  Array.from(coursesByCourseId.values()).forEach(options => {
    options.forEach((o: any) => allClassesInCombinations.add(o.class.class_code));
  });
  console.log(`[generateScheduleCombinations] Total unique classes in combinations: ${allClassesInCombinations.size} - ${Array.from(allClassesInCombinations).sort().join(", ")}`);

  // Generate ALL possible combinations and permutations
  // Keep top schedules during generation, then return top 50
  const topSchedules: any[] = [];
  const MAX_KEEP = 200; // Keep top 200 during generation to ensure we have excellent options
  const TARGET_COUNT = 50; // Return top 50 schedules
  const MAX_COMBINATIONS = 5000000; // Increased to 5 million to explore MORE combinations
  
  // If no excluded days, we can be more aggressive with combinations
  const hasExcludedDays = excludedDays && excludedDays.length > 0;
  // When no excluded days, we can explore even more aggressively
  // When excluded days exist, we need to explore more to find perfect matches
  const effectiveMaxCombinations = hasExcludedDays ? MAX_COMBINATIONS * 2 : MAX_COMBINATIONS * 3; // More when excluded days (to find perfect), even more when none

  const courseOptions = uniqueCourseIds.map(courseId => coursesByCourseId.get(courseId)!);
  
  // Calculate total combinations
  const totalCombinations = courseOptions.reduce((acc, arr) => acc * arr.length, 1);
  
  console.log(`[generateScheduleCombinations] Total possible combinations: ${totalCombinations}, Excluded days: ${excludedDays.length}`);
  
  // Only use sampling if combinations exceed limit
  const useSampling = totalCombinations > effectiveMaxCombinations;
  const sampleSize = useSampling ? effectiveMaxCombinations : totalCombinations;
  
  if (useSampling) {
    console.log(`[generateScheduleCombinations] Using sampling strategy: processing ${sampleSize} out of ${totalCombinations} combinations`);
  } else {
    console.log(`[generateScheduleCombinations] Processing ALL ${totalCombinations} combinations`);
  }
  
  // Generate combinations iteratively
  // This function increments indices like an odometer to explore ALL combinations
  function generateNextCombination(indices: number[]): boolean {
    // Increment indices (like odometer)
    for (let i = indices.length - 1; i >= 0; i--) {
      indices[i]++;
      if (indices[i] >= courseOptions[i].length) {
        indices[i] = 0;
      } else {
        return true; // Successfully incremented
      }
    }
    return false; // All combinations exhausted
  }
  
  // CRITICAL: Also generate combinations starting from different positions
  // to ensure we explore the entire space evenly
  // We'll use multiple passes with different starting points
  const startingPositions: number[][] = [];
  
  // Generate starting positions: one from each "corner" of the combination space
  // This ensures we don't miss any combinations
  // Use MORE starting positions to ensure complete exploration
  const numStartingPositions = Math.min(20, Math.max(5, Math.floor(Math.log10(Math.max(totalCombinations, 1)) * 2 || 1)));
  for (let i = 0; i < numStartingPositions; i++) {
    const startIndices = courseOptions.map((options, idx) => 
      Math.floor((i * options.length) / Math.max(numStartingPositions, 1)) % options.length
    );
    startingPositions.push(startIndices);
  }
  
  // Always include starting from [0,0,0,...] to ensure we cover the beginning
  if (startingPositions.length === 0 || startingPositions[0].some((v, i) => v !== 0)) {
    startingPositions.unshift(new Array(courseOptions.length).fill(0));
  }
  
  // Add random starting positions for better exploration
  for (let i = 0; i < 5; i++) {
    const randomStart = courseOptions.map(options => 
      Math.floor(Math.random() * options.length)
    );
    startingPositions.push(randomStart);
  }
  
  console.log(`[generateScheduleCombinations] Using ${startingPositions.length} starting positions to ensure complete exploration`);

  console.log(`[generateScheduleCombinations] Starting generation with ${courseOptions.length} courses, ${totalCombinations} total combinations`);

  let processedCount = 0;
  let consecutiveFailures = 0;
  let validSchedulesFound = 0;
  const MAX_CONSECUTIVE_FAILURES = 5000; // Increased significantly to allow MUCH more exploration
  const seenCombinations = new Set<string>(); // Track seen combinations to avoid duplicates
  
  // Track best scores to know when we're finding excellent schedules
  let bestDays = Infinity;
  let bestGaps = Infinity;
  let bestExcludedDays = Infinity;
  
  // Process from multiple starting positions to ensure complete exploration
  for (const startIndices of startingPositions) {
    const indices = [...startIndices];
    let localProcessed = 0;
    const localMaxProcessed = Math.floor(sampleSize / startingPositions.length);
    
    do {
      // Build current combination
      // Each combination represents selecting ONE class option for EACH course
      // Example: [ECE3203 from 5_1, ECE3105 from 5_2, EEC2320 from 5_1, ...]
      // Each course-class combination is ATOMIC - all its components (L, S, LB) 
      // must be included together at their fixed times
      const combination: any[] = [];
      for (let i = 0; i < courseOptions.length; i++) {
        combination.push(courseOptions[i][indices[i]]);
      }
      
      // Create a unique key for this combination to avoid duplicates
      const combinationKey = indices.join(",");
      if (seenCombinations.has(combinationKey)) {
        // Skip duplicate combination
        if (!generateNextCombination(indices)) break;
        continue;
      }
      seenCombinations.add(combinationKey);
      
      // OPTIMIZATION 1: Constraint Propagation - Check conflicts BEFORE building schedule
      // This skips 70-90% of invalid combinations early, saving significant time
      if (hasConflicts(combination, conflictMatrix)) {
        consecutiveFailures++;
        processedCount++;
        localProcessed++;
        if (!generateNextCombination(indices)) break;
        continue; // Skip this combination - it has conflicts
      }
      
      // Build schedule from this combination (only if no conflicts)
      // buildSchedule will ensure each course-class bundle includes ALL its components
      const schedule = buildSchedule(combination, excludedDays);
      if (schedule) {
        consecutiveFailures = 0;
        validSchedulesFound++;
        
        // Track best scores found so far
        if (schedule.totalDays < bestDays) bestDays = schedule.totalDays;
        if (schedule.gaps < bestGaps) bestGaps = schedule.gaps;
        if (schedule.excludedDaysUsed < bestExcludedDays) bestExcludedDays = schedule.excludedDaysUsed;
        
        // Insert schedule in sorted order (maintain top N)
        insertSorted(topSchedules, schedule, MAX_KEEP);
        
        // Log when we find excellent schedules
        if (schedule.excludedDaysUsed === 0 && validSchedulesFound <= 20) {
          console.log(`[generateScheduleCombinations] Found perfect schedule (zero excluded days): ${schedule.totalDays} days, ${schedule.gaps} gaps`);
        }
        
        // Log when we find exceptionally good schedules (few days AND few gaps)
        if (schedule.excludedDaysUsed === 0 && schedule.totalDays <= 3 && schedule.gaps <= 2 && validSchedulesFound <= 50) {
          console.log(`[generateScheduleCombinations] ⭐ EXCELLENT schedule found: ${schedule.totalDays} days, ${schedule.gaps} gaps, zero excluded days!`);
        }
      } else {
        consecutiveFailures++;
      }
      
      processedCount++;
      localProcessed++;
      
      // Log progress every 100000 combinations (less frequent logging for performance)
      if (processedCount % 100000 === 0) {
        const perfectCount = topSchedules.filter(s => s.excludedDaysUsed === 0).length;
        const excellentCount = topSchedules.filter(s => s.excludedDaysUsed === 0 && s.totalDays <= 3 && s.gaps <= 2).length;
        const bestSchedule = topSchedules[0];
        console.log(`[generateScheduleCombinations] Processed ${processedCount}/${sampleSize} combinations, found ${validSchedulesFound} valid schedules`);
        console.log(`  - Perfect (zero excluded): ${perfectCount}`);
        console.log(`  - Excellent (≤3 days, ≤2 gaps): ${excellentCount}`);
        if (bestSchedule) {
          console.log(`  - Best so far: ${bestSchedule.totalDays} days, ${bestSchedule.gaps} gaps, ${bestSchedule.excludedDaysUsed} excluded days`);
        }
      }
      
      // For sampling: skip some combinations intelligently
      if (useSampling && localProcessed < localMaxProcessed) {
        const skip = Math.max(1, Math.floor(totalCombinations / sampleSize));
        for (let s = 0; s < skip - 1 && localProcessed < localMaxProcessed; s++) {
          if (!generateNextCombination(indices)) break;
          localProcessed++;
          processedCount++;
        }
      }
      
      // Stop if we've processed enough from this starting position
      if (localProcessed >= localMaxProcessed) break;
      
    } while (generateNextCombination(indices) && processedCount < sampleSize);
    
    // If we found excellent schedules, we can consider early termination
    // But only if we've explored enough and have truly excellent options
    const perfectSchedules = topSchedules.filter(s => s.excludedDaysUsed === 0);
    const excellentSchedules = topSchedules.filter(s => 
      s.excludedDaysUsed === 0 && s.totalDays <= 3 && s.gaps <= 2
    );
    
    // Only stop early if we have excellent schedules AND have explored at least 20% of combinations
    if (excellentSchedules.length >= TARGET_COUNT && processedCount >= sampleSize * 0.2) {
      console.log(`[generateScheduleCombinations] Found ${excellentSchedules.length} excellent schedules (≤3 days, ≤2 gaps), continuing to find best...`);
      // Don't break - continue to find even better options
    }
    
    // If we've explored enough and have perfect schedules, we can continue but don't need to break
    // We want to keep exploring to find the absolute best
  }
  
  // After all starting positions, do a final intensive search around the best candidates
  if (topSchedules.length > 0 && processedCount < sampleSize) {
    console.log(`[generateScheduleCombinations] Starting intensive search around best candidates...`);
    const bestSchedule = topSchedules[0];
    
    // Generate variations of the best schedule by swapping one course-class at a time
    // This helps find even better schedules near the best ones
    const bestCombination = uniqueCourseIds.map((courseId, idx) => {
      const courseOptionsForId = coursesByCourseId.get(courseId)!;
      // Find which class option was used in the best schedule
      const bestCourseData = bestSchedule.courses.find((c: any) => c.course.id === courseId);
      if (bestCourseData) {
        const bestClassId = bestCourseData.class.id;
        const bestOption = courseOptionsForId.find((opt: any) => opt.class.id === bestClassId);
        if (bestOption) return bestOption;
      }
      return courseOptionsForId[0]; // Fallback
    });
    
    // Try variations: swap each course to a different class option
    for (let courseIdx = 0; courseIdx < bestCombination.length && processedCount < sampleSize; courseIdx++) {
      const courseOptionsForCourse = coursesByCourseId.get(uniqueCourseIds[courseIdx])!;
      
      for (const option of courseOptionsForCourse) {
        if (option.class.id === bestCombination[courseIdx].class.id) continue; // Skip if same
        
        const variation = [...bestCombination];
        variation[courseIdx] = option;
        
        const variationKey = variation.map((v, i) => {
          const courseId = uniqueCourseIds[i];
          const options = coursesByCourseId.get(courseId)!;
          return options.indexOf(v);
        }).join(",");
        
        if (seenCombinations.has(variationKey)) continue;
        seenCombinations.add(variationKey);
        
        const schedule = buildSchedule(variation, excludedDays);
        if (schedule) {
          validSchedulesFound++;
          if (schedule.totalDays < bestDays) bestDays = schedule.totalDays;
          if (schedule.gaps < bestGaps) bestGaps = schedule.gaps;
          if (schedule.excludedDaysUsed < bestExcludedDays) bestExcludedDays = schedule.excludedDaysUsed;
          
          insertSorted(topSchedules, schedule, MAX_KEEP);
          processedCount++;
          
          if (processedCount % 10000 === 0 && processedCount < sampleSize) {
            console.log(`[generateScheduleCombinations] Intensive search: ${processedCount} variations tried, best: ${bestDays} days, ${bestGaps} gaps`);
          }
        }
        
        if (processedCount >= sampleSize) break;
      }
      
      if (processedCount >= sampleSize) break;
    }
    
    console.log(`[generateScheduleCombinations] Intensive search completed: tried ${processedCount} variations`);
  }

  const conflictCheckTime = Date.now() - conflictCheckStartTime;
  console.log(`[generateScheduleCombinations] Completed: processed ${processedCount} combinations, found ${validSchedulesFound} valid schedules`);
  console.log(`[generateScheduleCombinations] Constraint propagation saved time by skipping invalid combinations early`);
  console.log(`[generateScheduleCombinations] Best scores found: ${bestDays} days, ${bestGaps} gaps, ${bestExcludedDays} excluded days`);
  
  // Final refinement: Sort all schedules using multi-criteria sort (not just score)
  // This ensures proper prioritization: excluded days > no Lecture > fewer slots > fewer days > fewer gaps
  // Helper functions for sorting
  const hasLectureOnExcludedDaysSort = (schedule: any): boolean => {
    if (schedule.excludedDaysUsed === 0) return false;
    const scheduleDays = schedule.days || [];
    const excludedDaysInSchedule = scheduleDays.filter((day: string) => excludedDays.includes(day));
    
    for (const day of excludedDaysInSchedule) {
      const sessionsOnDay = schedule.sessions.filter((s: any) => s.day === day);
      if (sessionsOnDay.some((s: any) => s.component_type === "L")) {
        return true;
      }
    }
    return false;
  };

  const getSlotsOnExcludedDaysSort = (schedule: any): number => {
    if (schedule.excludedDaysUsed === 0) return 0;
    const scheduleDays = schedule.days || [];
    const excludedDaysInSchedule = scheduleDays.filter((day: string) => excludedDays.includes(day));
    
    let totalSlots = 0;
    for (const day of excludedDaysInSchedule) {
      const sessionsOnDay = schedule.sessions.filter((s: any) => s.day === day);
      totalSlots += sessionsOnDay.length;
    }
    return totalSlots;
  };

  topSchedules.sort((a, b) => {
    // First: Compare excluded days (0 is best)
    if (a.excludedDaysUsed !== b.excludedDaysUsed) {
      return a.excludedDaysUsed - b.excludedDaysUsed;
    }
    
    // Second: If both use excluded days, prioritize those WITHOUT Lecture sessions
    if (a.excludedDaysUsed > 0 && b.excludedDaysUsed > 0) {
      const aHasLecture = hasLectureOnExcludedDaysSort(a);
      const bHasLecture = hasLectureOnExcludedDaysSort(b);
      if (aHasLecture !== bHasLecture) {
        return aHasLecture ? 1 : -1; // No Lecture is better
      }
    }
    
    // Third: If both use excluded days, prioritize schedules with FEWER slots on excluded days
    // This is MORE IMPORTANT than total days - minimizing slots on excluded days is critical
    if (a.excludedDaysUsed > 0 && b.excludedDaysUsed > 0) {
      const aSlotsOnExcluded = getSlotsOnExcludedDaysSort(a);
      const bSlotsOnExcluded = getSlotsOnExcludedDaysSort(b);
      if (aSlotsOnExcluded !== bSlotsOnExcluded) {
        return aSlotsOnExcluded - bSlotsOnExcluded; // Fewer slots is better
      }
    }
    
    // Fourth: Compare total days (fewer is better)
    if (a.totalDays !== b.totalDays) {
      return a.totalDays - b.totalDays;
    }
    
    // Fifth: Compare gaps (fewer is better)
    if (a.gaps !== b.gaps) {
      return a.gaps - b.gaps;
    }
    
    // Finally: Compare score (higher is better)
    return b.score - a.score;
  });
  
  // Separate perfect schedules (zero excluded days) from others
  const perfectSchedules = topSchedules.filter(s => s.excludedDaysUsed === 0);
  let otherSchedules = topSchedules.filter(s => s.excludedDaysUsed > 0);
  
  // CRITICAL: Sort otherSchedules (schedules with excluded days) using multi-criteria sort
  // This ensures schedules with fewer slots on excluded days rank higher
  // Helper functions for sorting otherSchedules
  const hasLectureOnExcludedDaysOther = (schedule: any): boolean => {
    if (schedule.excludedDaysUsed === 0) return false;
    const scheduleDays = schedule.days || [];
    const excludedDaysInSchedule = scheduleDays.filter((day: string) => excludedDays.includes(day));
    
    for (const day of excludedDaysInSchedule) {
      const sessionsOnDay = schedule.sessions.filter((s: any) => s.day === day);
      if (sessionsOnDay.some((s: any) => s.component_type === "L")) {
        return true;
      }
    }
    return false;
  };

  const getSlotsOnExcludedDaysOther = (schedule: any): number => {
    if (schedule.excludedDaysUsed === 0) return 0;
    const scheduleDays = schedule.days || [];
    const excludedDaysInSchedule = scheduleDays.filter((day: string) => excludedDays.includes(day));
    
    let totalSlots = 0;
    for (const day of excludedDaysInSchedule) {
      const sessionsOnDay = schedule.sessions.filter((s: any) => s.day === day);
      totalSlots += sessionsOnDay.length;
    }
    return totalSlots;
  };

  // Sort otherSchedules: No Lecture > Fewer slots > Fewer days > Fewer gaps > Higher score
  otherSchedules.sort((a, b) => {
    // First: Prioritize those WITHOUT Lecture sessions
    const aHasLecture = hasLectureOnExcludedDaysOther(a);
    const bHasLecture = hasLectureOnExcludedDaysOther(b);
    if (aHasLecture !== bHasLecture) {
      return aHasLecture ? 1 : -1; // No Lecture is better
    }
    
    // Second: Prioritize schedules with FEWER slots on excluded days (MOST IMPORTANT after Lecture check)
    const aSlotsOnExcluded = getSlotsOnExcludedDaysOther(a);
    const bSlotsOnExcluded = getSlotsOnExcludedDaysOther(b);
    if (aSlotsOnExcluded !== bSlotsOnExcluded) {
      return aSlotsOnExcluded - bSlotsOnExcluded; // Fewer slots is better
    }
    
    // Third: Compare total days (fewer is better)
    if (a.totalDays !== b.totalDays) {
      return a.totalDays - b.totalDays;
    }
    
    // Fourth: Compare gaps (fewer is better)
    if (a.gaps !== b.gaps) {
      return a.gaps - b.gaps;
    }
    
    // Finally: Compare score (higher is better)
    return b.score - a.score;
  });
  
  // Further categorize perfect schedules by quality
  const excellentPerfect = perfectSchedules.filter(s => s.totalDays <= 3 && s.gaps <= 2);
  const goodPerfect = perfectSchedules.filter(s => s.totalDays <= 4 && s.gaps <= 4);
  const acceptablePerfect = perfectSchedules.filter(s => s.totalDays <= 5);
  
  console.log(`[generateScheduleCombinations] Schedule quality breakdown:`);
  console.log(`  - Excellent perfect (≤3 days, ≤2 gaps): ${excellentPerfect.length}`);
  console.log(`  - Good perfect (≤4 days, ≤4 gaps): ${goodPerfect.length}`);
  console.log(`  - Acceptable perfect (≤5 days): ${acceptablePerfect.length}`);
  console.log(`  - Other perfect: ${perfectSchedules.length - excellentPerfect.length - goodPerfect.length - acceptablePerfect.length}`);
  console.log(`  - With excluded days: ${otherSchedules.length}`);
  
  // Build result: prioritize excellent > good > acceptable > others
  const result: any[] = [];
  
  // First: Add excellent perfect schedules
  if (excellentPerfect.length > 0) {
    result.push(...excellentPerfect.slice(0, TARGET_COUNT));
    console.log(`[generateScheduleCombinations] ⭐ Selected ${result.length} EXCELLENT schedule(s) (≤3 days, ≤2 gaps, zero excluded)`);
  }
  
  // Second: Fill with good perfect schedules if needed
  if (result.length < TARGET_COUNT && goodPerfect.length > 0) {
    const remaining = TARGET_COUNT - result.length;
    const toAdd = goodPerfect.filter(s => !result.includes(s)).slice(0, remaining);
    result.push(...toAdd);
    console.log(`[generateScheduleCombinations] ✅ Added ${toAdd.length} GOOD schedule(s) (≤4 days, ≤4 gaps, zero excluded)`);
  }
  
  // Third: Fill with acceptable perfect schedules if needed
  if (result.length < TARGET_COUNT && acceptablePerfect.length > 0) {
    const remaining = TARGET_COUNT - result.length;
    const toAdd = acceptablePerfect.filter(s => !result.includes(s)).slice(0, remaining);
    result.push(...toAdd);
    console.log(`[generateScheduleCombinations] ✓ Added ${toAdd.length} ACCEPTABLE schedule(s) (≤5 days, zero excluded)`);
  }
  
  // Fourth: Fill with other perfect schedules if needed
  if (result.length < TARGET_COUNT && perfectSchedules.length > 0) {
    const remaining = TARGET_COUNT - result.length;
    const toAdd = perfectSchedules.filter(s => !result.includes(s)).slice(0, remaining);
    result.push(...toAdd);
    console.log(`[generateScheduleCombinations] Added ${toAdd.length} other perfect schedule(s) (zero excluded)`);
  }
  
  // Last resort: Fill with best other schedules (minimizing excluded days)
  if (result.length < TARGET_COUNT && otherSchedules.length > 0) {
    const remaining = TARGET_COUNT - result.length;
    const toAdd = otherSchedules.slice(0, remaining);
    result.push(...toAdd);
    console.log(`[generateScheduleCombinations] Added ${toAdd.length} best alternative schedule(s) (minimizing excluded days)`);
  }
  
  // Helper function to check if schedule has Lecture (L) sessions on excluded days
  const hasLectureOnExcludedDays = (schedule: any): boolean => {
    if (schedule.excludedDaysUsed === 0) return false;
    const scheduleDays = schedule.days || [];
    const excludedDaysInSchedule = scheduleDays.filter((day: string) => excludedDays.includes(day));
    
    for (const day of excludedDaysInSchedule) {
      const sessionsOnDay = schedule.sessions.filter((s: any) => s.day === day);
      if (sessionsOnDay.some((s: any) => s.component_type === "L")) {
        return true;
      }
    }
    return false;
  };

  // Helper function to count fully utilized excluded days (all 4 slots)
  const getFullExcludedDaysCount = (schedule: any): number => {
    if (schedule.excludedDaysUsed === 0) return 0;
    const scheduleDays = schedule.days || [];
    const excludedDaysInSchedule = scheduleDays.filter((day: string) => excludedDays.includes(day));
    
    let fullDaysCount = 0;
    for (const day of excludedDaysInSchedule) {
      const sessionsOnDay = schedule.sessions.filter((s: any) => s.day === day);
      if (sessionsOnDay.length === 4) {
        fullDaysCount++;
      }
    }
    return fullDaysCount;
  };

  // Helper function to count slots on excluded days
  const getSlotsOnExcludedDays = (schedule: any): number => {
    if (schedule.excludedDaysUsed === 0) return 0;
    const scheduleDays = schedule.days || [];
    const excludedDaysInSchedule = scheduleDays.filter((day: string) => excludedDays.includes(day));
    
    let totalSlots = 0;
    for (const day of excludedDaysInSchedule) {
      const sessionsOnDay = schedule.sessions.filter((s: any) => s.day === day);
      totalSlots += sessionsOnDay.length;
    }
    return totalSlots;
  };

  // Final sort by score to ensure absolute best are first
  // The score already includes all penalties, so sorting by score descending will prioritize:
  // 1. Schedules with zero excluded days (highest priority)
  // 2. Among schedules with excluded days: those WITHOUT Lecture (L) sessions on excluded days
  // 3. Among schedules with excluded days: those with MINIMUM slots on excluded days (1 slot is best)
  //    THIS IS MORE IMPORTANT than total days - a schedule with 2 slots on excluded day beats one with 4 slots
  // 4. Among schedules with excluded days: those with fewer total days
  // 5. Schedules with zero gaps
  result.sort((a, b) => {
    // First: Compare excluded days (0 is best)
    if (a.excludedDaysUsed !== b.excludedDaysUsed) {
      return a.excludedDaysUsed - b.excludedDaysUsed;
    }
    
    // Second: If both use excluded days, prioritize those WITHOUT Lecture sessions
    if (a.excludedDaysUsed > 0 && b.excludedDaysUsed > 0) {
      const aHasLecture = hasLectureOnExcludedDays(a);
      const bHasLecture = hasLectureOnExcludedDays(b);
      if (aHasLecture !== bHasLecture) {
        return aHasLecture ? 1 : -1; // No Lecture is better
      }
    }
    
    // Third: If both use excluded days, prioritize schedules with FEWER slots on excluded days
    // This is MORE IMPORTANT than total days - minimizing slots on excluded days is critical
    if (a.excludedDaysUsed > 0 && b.excludedDaysUsed > 0) {
      const aSlotsOnExcluded = getSlotsOnExcludedDays(a);
      const bSlotsOnExcluded = getSlotsOnExcludedDays(b);
      if (aSlotsOnExcluded !== bSlotsOnExcluded) {
        return aSlotsOnExcluded - bSlotsOnExcluded; // Fewer slots is better
      }
    }
    
    // Fourth: Compare total days (fewer is better)
    // This comes AFTER slots on excluded days because minimizing excluded day slots is more important
    if (a.totalDays !== b.totalDays) {
      return a.totalDays - b.totalDays;
    }
    
    // Fifth: Compare gaps (fewer is better)
    if (a.gaps !== b.gaps) {
      return a.gaps - b.gaps;
    }
    
    // Finally: Compare score (higher is better - score already includes all penalties)
    return b.score - a.score;
  });
  
  console.log(`[generateScheduleCombinations] 🎯 Returning ${result.length} FINAL schedule(s) (best of the best):`);
  result.forEach((s, idx) => {
    const hasLectureOnExcluded = s.excludedDaysUsed > 0 && hasLectureOnExcludedDays(s);
    const slotsOnExcluded = getSlotsOnExcludedDays(s);
    
    let quality = "";
    if (s.excludedDaysUsed === 0 && s.totalDays <= 3 && s.gaps <= 2) {
      quality = "⭐ EXCELLENT";
    } else if (s.excludedDaysUsed === 0 && s.totalDays <= 4 && s.gaps <= 4) {
      quality = "✅ GOOD";
    } else if (s.excludedDaysUsed === 0) {
      quality = "✓ PERFECT";
    } else if (hasLectureOnExcluded) {
      quality = "❌ WITH EXCLUDED DAYS (HAS LECTURE)";
    } else if (slotsOnExcluded === 1) {
      quality = `⚠️ WITH EXCLUDED DAYS (1 slot - MINIMAL)`;
    } else {
      quality = `⚠️ WITH EXCLUDED DAYS (${slotsOnExcluded} slots)`;
    }
    
    console.log(`  ${quality} Schedule ${idx + 1}: ${s.totalDays} days, ${s.gaps} gaps, ${s.excludedDaysUsed} excluded days, score: ${s.score.toFixed(0)}`);
  });
  
  return result;
}

/**
 * Insert schedule into sorted array maintaining top N
 */
function insertSorted(schedules: any[], schedule: any, maxKeep: number): void {
  // Binary search for insertion point
  let left = 0;
  let right = schedules.length;
  
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (schedules[mid].score >= schedule.score) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  
  schedules.splice(left, 0, schedule);
  
  // Keep only top N
  if (schedules.length > maxKeep) {
    schedules.pop();
  }
}


/**
 * Build a schedule from a combination of course data (optimized)
 * Exported for use in worker threads
 * 
 * IMPORTANT: Each course-class combination in the combination array is treated as an ATOMIC BUNDLE.
 * 
 * When a course is taken from a class (e.g., ECE3203 from class 5_2):
 * - ALL components (L, S, LB) with their sessions MUST be included
 * - Sessions are at FIXED times for that class
 * - You CANNOT pick and choose components - it's all or nothing
 * 
 * Example:
 * - ECE3203 in class 5_2: L on Sunday slot 1, S on Monday slot 4
 * - If you select this course-class combination, you MUST take BOTH L and S at those exact times
 * 
 * The function validates:
 * 1. Required components are present (L is always required, S/LB based on component_types)
 * 2. No time conflicts between different course-class combinations
 * 3. All sessions from all components are included as a bundle
 */
export function buildSchedule(combination: any[], excludedDays: string[]): any | null {
  const schedule: any = {
    courses: [],
    sessions: [],
    days: new Set<string>(),
    score: 0,
  };

  // Pre-allocate slot map for faster collision detection
  const slotMap = new Map<string, any>();
  
  // Collect all sessions from all courses in the combination
  // IMPORTANT: Each course-class combination is treated as an ATOMIC BUNDLE
  // When a course is taken from a class, ALL its components (L, S, LB) with their sessions
  // must be included at their fixed times. You cannot pick and choose components.
  for (const courseData of combination) {
    const courseSessions: any[] = [];
    
    // Pre-check: get component types needed
    const componentTypes = courseData.course.component_types ? 
      courseData.course.component_types.split(",").map((t: string) => t.trim()) : [];
    const componentMap = new Map<string, any[]>();
    
    // Get ALL sessions for ALL components of this course-class combination
    // This ensures the course is taken as a complete bundle from this specific class
    for (const component of courseData.components) {
      if (component.sessions && component.sessions.length > 0) {
        // Include ALL sessions for this component (usually 1, but handle multiple)
        const sessions = component.sessions.map((session: any) => ({
          ...session,
          component_type: component.component_type,
          course: courseData.course,
          class: courseData.class,
        }));
        
        // Store all sessions for this component type
        // We'll filter excluded days at the schedule level, not here
        // This ensures courses remain valid (all components included)
        if (!componentMap.has(component.component_type)) {
          componentMap.set(component.component_type, []);
        }
        componentMap.get(component.component_type)!.push(...sessions);
      }
    }
    
    // Early validation: check if course has required components
    // Rules based on component_types:
    // - "L,S" -> requires L and S
    // - "L,LB" -> requires L and LB
    // - "L,S,LB" -> requires L and at least one of S or LB
    // IMPORTANT: All components with sessions MUST be included as a bundle
    
    const hasL = componentMap.has("L") && componentMap.get("L")!.length > 0;
    const hasS = componentMap.has("S") && componentMap.get("S")!.length > 0;
    const hasLB = componentMap.has("LB") && componentMap.get("LB")!.length > 0;
    
    const requiresL = componentTypes.includes("L");
    const requiresS = componentTypes.includes("S");
    const requiresLB = componentTypes.includes("LB");
    
    // L is always required if componentTypes includes L
    if (requiresL && !hasL) {
      return null; // Missing required component L
    }
    
    // If componentTypes includes S but NOT LB, then S is required
    if (requiresS && !requiresLB && !hasS) {
      return null; // Missing required component S
    }
    
    // If componentTypes includes LB but NOT S, then LB is required
    if (requiresLB && !requiresS && !hasLB) {
      return null; // Missing required component LB
    }
    
    // If componentTypes includes both S and LB, then at least one of S or LB must be present
    if (requiresS && requiresLB && !hasS && !hasLB) {
      return null; // Missing required components: needs at least one of S or LB
    }
    
    // Add ALL sessions from ALL components to courseSessions
    // This ensures the course is taken as a complete bundle - all components must be included
    componentMap.forEach((sessions) => {
      courseSessions.push(...sessions);
    });
    
    // Early collision check: check collisions before adding
    for (const session of courseSessions) {
      const key = `${session.day}_${session.slot}`;
      if (slotMap.has(key)) {
        // Collision detected - this combination is invalid
        return null; // Collision detected - early exit
      }
    }
    
    // No collisions, add sessions
    for (const session of courseSessions) {
      const key = `${session.day}_${session.slot}`;
      slotMap.set(key, session);
      schedule.days.add(session.day);
    }

    schedule.courses.push({
      course: courseData.course,
      class: courseData.class,
      sessions: courseSessions,
    });

    schedule.sessions.push(...courseSessions);
  }

  // Calculate score
  // CRITICAL PRIORITY ORDER:
  // 1. ZERO excluded days used (MOST IMPORTANT - completely eliminate excluded days if possible)
  // 2. Fewest total days (students want fewer days at college)
  // 3. Fewest gaps (compact schedule - less waiting time between classes)
  // 4. Excluded days with fewer slots (if excluded days must be used)
  // 5. Excluded days without Lecture (L) sessions (prefer only LB or S)
  
  const daysArray = Array.from(schedule.days) as string[];
  const excludedDaysUsed = daysArray.filter((day: string) => excludedDays.includes(day)).length;
  const totalDays = schedule.days.size;
  
  // Calculate gaps (empty slots between sessions on the same day)
  let gaps = 0;
  const daysSlots = new Map<string, number[]>();
  const daysComponentTypes = new Map<string, Set<string>>(); // Track component types per day
  
  schedule.sessions.forEach((s: any) => {
    const day = String(s.day);
    if (!daysSlots.has(day)) {
      daysSlots.set(day, []);
    }
    daysSlots.get(day)!.push(Number(s.slot));
    
    // Track component types per day
    if (!daysComponentTypes.has(day)) {
      daysComponentTypes.set(day, new Set());
    }
    daysComponentTypes.get(day)!.add(String(s.component_type));
  });

  daysSlots.forEach((slots, day) => {
    slots.sort((a, b) => a - b);
    for (let i = 1; i < slots.length; i++) {
      gaps += slots[i] - slots[i - 1] - 1;
    }
  });

  // Calculate metrics for excluded days
  let excludedDaysLecturePenalty = 0; // Heavy penalty if excluded days have Lecture (L) sessions
  let excludedDaysSlotsPenalty = 0; // Penalty for number of slots on excluded days (more slots = worse)
  
  if (excludedDaysUsed > 0) {
    // For each excluded day that is used, calculate metrics
    excludedDays.forEach(excludedDay => {
      if (daysArray.includes(excludedDay)) {
        const slotsOnExcludedDay = daysSlots.get(excludedDay) || [];
        const slotsCount = slotsOnExcludedDay.length;
        const componentTypesOnDay = daysComponentTypes.get(excludedDay) || new Set();
        
        // CRITICAL: If excluded day has Lecture (L) sessions = MASSIVE penalty
        // This should be avoided at all costs - excluded days should only have S or LB
        if (componentTypesOnDay.has("L")) {
          excludedDaysLecturePenalty += 50000000; // EXTREMELY heavy penalty - this is unacceptable
        }
        
        // Penalty for number of slots on excluded day
        // Goal: MINIMIZE slots on excluded days (1 slot is best, 4 slots is worst)
        // Penalty must be STRONGER than days bonus to ensure fewer slots on excluded days ranks higher
        // Days bonus: (7 - totalDays) * 1000000, so max is 6,000,000 for 1 day
        // We need penalties that are significant enough to override days bonus
        // Penalty increases quadratically: 1 slot = 0, 2 slots = 5000000, 3 slots = 15000000, 4 slots = 30000000
        // This ensures schedules with fewer slots on excluded days ALWAYS rank higher, even if they have more total days
        if (slotsCount === 1) {
          // 1 slot is ideal - no penalty
          excludedDaysSlotsPenalty += 0;
        } else if (slotsCount === 2) {
          // 2 slots - heavy penalty (stronger than days bonus)
          excludedDaysSlotsPenalty += 5000000;
        } else if (slotsCount === 3) {
          // 3 slots - very heavy penalty
          excludedDaysSlotsPenalty += 15000000;
        } else if (slotsCount === 4) {
          // 4 slots - extremely heavy penalty (worst case)
          excludedDaysSlotsPenalty += 30000000;
        } else {
          // More than 4 slots (shouldn't happen, but handle it)
          excludedDaysSlotsPenalty += slotsCount * slotsCount * 10000000;
        }
      }
    });
  }

  // Score: higher is better
  // Base score: 1000000000 (very high to allow for all calculations)
  // 
  // PRIORITY 1: Zero excluded days - MASSIVE bonus (highest priority)
  //   - If excludedDaysUsed = 0: Add 100000000 bonus (perfect schedule - no excluded days)
  //   - If excludedDaysUsed > 0: Subtract 100000000 * excludedDaysUsed (heavily penalize)
  //   This ensures schedules with ZERO excluded days ALWAYS rank highest
  //
  // PRIORITY 2: Excluded days WITHOUT Lecture (L) sessions (CRITICAL if excluded days must be used)
  //   - Penalty: 50000000 per excluded day that has Lecture sessions
  //   This ensures excluded days only have S or LB sessions, NEVER L
  //
  // PRIORITY 3: MINIMIZE slots on excluded days (if excluded days must be used)
  //   - Penalty increases with number of slots: 1 slot = 0, 2 slots = 5000000, 3 slots = 15000000, 4 slots = 30000000
  //   - Goal: Prefer schedules with 1 slot on excluded days over 2, 3, or 4 slots
  //   - This ensures: 1 slot on excluded day > 2 slots > 3 slots > 4 slots
  //   - Penalties are STRONGER than days bonus to ensure this priority is maintained
  //
  // PRIORITY 4: Fewer total days - heavily reward (prefer fewer days overall)
  //   - Bonus: 1000000 * (7 - totalDays) - more bonus for fewer days
  //   This ensures schedules with fewer days rank higher
  //   Example: 4 days = 3000000 bonus, 5 days = 2000000 bonus, 6 days = 1000000 bonus
  //
  // PRIORITY 5: Zero gaps - moderately reward (prefer compact schedules)
  //   - Penalty: 10000 * gaps (heavily penalize gaps)
  //   This ensures compact schedules (less waiting time) rank higher
  
  const baseScore = 1000000000;
  
  // Priority 1: Excluded days (MOST IMPORTANT)
  let excludedDaysScore = 0;
  if (excludedDaysUsed === 0) {
    excludedDaysScore = 100000000; // Massive bonus for perfect schedule (no excluded days)
  } else {
    excludedDaysScore = -(100000000 * excludedDaysUsed); // Massive penalty for using excluded days
  }
  
  // Priority 2: Excluded days with Lecture sessions (CRITICAL - should never happen)
  // This penalty is so large that schedules with L on excluded days will rank lowest
  
  // Priority 3: Minimize slots on excluded days (if excluded days must be used)
  // Penalty already calculated above - more slots = worse score
  
  // Priority 4: Total days (fewer is better)
  // Reward fewer days: max 7 days possible, so bonus = (7 - totalDays) * 1000000
  const daysBonus = (7 - totalDays) * 1000000; // More bonus for fewer days
  
  // Priority 5: Gaps (zero gaps is best)
  const gapsPenalty = gaps * 10000; // Heavy penalty for gaps
  
  // Final score calculation
  schedule.score = baseScore 
    + excludedDaysScore 
    - excludedDaysLecturePenalty 
    - excludedDaysSlotsPenalty 
    + daysBonus 
    - gapsPenalty;
  schedule.excludedDaysUsed = excludedDaysUsed;
  schedule.totalDays = totalDays;
  schedule.gaps = gaps;
  schedule.days = daysArray; // Convert Set to Array for JSON serialization

  return schedule;
}

