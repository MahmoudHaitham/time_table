import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { In } from "typeorm";
import { Class } from "../entities/Class";
import { Term } from "../entities/Term";
import { Course } from "../entities/Course";
import { ClassCourse } from "../entities/ClassCourse";
import { CourseComponent, ComponentType } from "../entities/CourseComponent";
import { Session } from "../entities/Session";

/**
 * Helper function to copy Lecture (L) sessions from odd class to even class
 * Pattern: Even classes (2, 4, 6...) follow odd classes (1, 3, 5...)
 * Example: Class 3_2 gets L sessions from class 3_1, class 3_4 gets from 3_3
 */
async function copyLectureSessionsFromOddClass(
  newClass: Class,
  termId: number,
  systemType: number | null
): Promise<void> {
  try {
    // Parse class_code to check if it's even-numbered (e.g., "3_2", "3_4")
    const classCodeParts = newClass.class_code.split("_");
    if (classCodeParts.length !== 2) {
      // Class code format is not "X_Y", skip
      return;
    }

    const classNumber = parseInt(classCodeParts[1], 10);
    if (isNaN(classNumber) || classNumber % 2 !== 0) {
      // Not an even number, skip (only even classes copy from odd)
      return;
    }

    // Find the corresponding odd class (e.g., for "3_2" find "3_1", for "3_4" find "3_3")
    const oddClassNumber = classNumber - 1;
    const oddClassCode = `${classCodeParts[0]}_${oddClassNumber}`;

    const classRepo = AppDataSource.getRepository(Class);
    const oddClass = await classRepo.findOne({
      where: {
        term_id: termId,
        system_type: systemType,
        class_code: oddClassCode,
      },
    });

    if (!oddClass) {
      // No corresponding odd class found, skip
      return;
    }

    // Get all L components with sessions from the odd class
    const componentRepo = AppDataSource.getRepository(CourseComponent);
    const sessionRepo = AppDataSource.getRepository(Session);
    const classCourseRepo = AppDataSource.getRepository(ClassCourse);

    // Get all class courses for both classes
    const oddClassCourses = await classCourseRepo.find({
      where: { class_id: oddClass.id },
      relations: ["course"],
    });

    const newClassCourses = await classCourseRepo.find({
      where: { class_id: newClass.id },
      relations: ["course"],
    });

    // Create a map of course_id to class_course_id for the new class
    const newClassCourseMap = new Map<number, number>();
    newClassCourses.forEach(cc => {
      newClassCourseMap.set(cc.course_id, cc.id);
    });

    // Get all L components from odd class that have sessions
    const oddLComponents = await componentRepo.find({
      where: {
        class_course_id: In(oddClassCourses.map(cc => cc.id)),
        component_type: "L",
      },
      relations: ["classCourse"],
    });

    let copiedSessionsCount = 0;

    for (const oddComponent of oddLComponents) {
      // Get the session for this L component in the odd class
      const oddSession = await sessionRepo.findOne({
        where: { component_id: oddComponent.id },
      });

      if (!oddSession) {
        // No session in odd class, skip
        continue;
      }

      // Find the corresponding course in the new class
      const oddClassCourse = oddClassCourses.find(cc => cc.id === oddComponent.class_course_id);
      if (!oddClassCourse) {
        continue;
      }

      const newClassCourseId = newClassCourseMap.get(oddClassCourse.course_id);
      if (!newClassCourseId) {
        // Course not found in new class, skip
        continue;
      }

      // Find the L component for this course in the new class
      const newLComponent = await componentRepo.findOne({
        where: {
          class_course_id: newClassCourseId,
          component_type: "L",
        },
      });

      if (!newLComponent) {
        // L component not found in new class, skip
        continue;
      }

      // Check if session already exists for this component
      const existingSession = await sessionRepo.findOne({
        where: { component_id: newLComponent.id },
      });

      if (existingSession) {
        // Session already exists, skip
        continue;
      }

      // Copy the session to the new class's L component
      const newSession = sessionRepo.create({
        component_id: newLComponent.id,
        day: oddSession.day,
        slot: oddSession.slot,
        room: oddSession.room,
        instructor: oddSession.instructor,
      });

      await sessionRepo.save(newSession);
      copiedSessionsCount++;
    }

    if (copiedSessionsCount > 0) {
      console.log(`[copyLectureSessionsFromOddClass] Copied ${copiedSessionsCount} L session(s) from class ${oddClassCode} to ${newClass.class_code}`);
    }
  } catch (error) {
    console.error(`[copyLectureSessionsFromOddClass] Error copying L sessions:`, error);
    // Don't throw - this is a helper function, errors shouldn't break class creation
  }
}

/**
 * Create a new class for a term
 */
export const createClass = async (req: Request, res: Response) => {
  try {
    const { termId } = req.params;
    const { class_code, system_type } = req.body;

    // Validate termId - handle string | string[] type
    const termIdStr = Array.isArray(termId) ? termId[0] : (termId as string);
    const parsedTermId = parseInt(termIdStr, 10);
    if (isNaN(parsedTermId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid term ID",
      });
    }

    if (!class_code) {
      return res.status(400).json({
        success: false,
        message: "Class code is required",
      });
    }

    // Validate system_type if provided
    if (system_type !== undefined && system_type !== null) {
      const parsedSystemType = parseInt(String(system_type), 10);
      if (![140, 160, 180].includes(parsedSystemType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid system_type. Must be 140, 160, or 180",
        });
      }
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

    const classRepo = AppDataSource.getRepository(Class);

    // Check if class code with same system_type already exists in this term
    // Note: Same class_code can exist multiple times with different system_types
    const existingClass = await classRepo.findOne({
      where: {
        term_id: term.id,
        class_code,
        system_type: system_type !== undefined && system_type !== null ? parseInt(String(system_type), 10) : null,
      },
    });

    if (existingClass) {
      return res.status(400).json({
        success: false,
        message: `Class with code "${class_code}" and system_type ${system_type || 'null'} already exists in this term`,
      });
    }

    const classEntity = classRepo.create({
      term_id: term.id,
      class_code,
      system_type: system_type !== undefined && system_type !== null ? parseInt(String(system_type), 10) : null,
    });

    await classRepo.save(classEntity);

    // Automatically assign core courses from other classes in the same term and system_type
    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const courseRepo = AppDataSource.getRepository(Course);
    
    // Find other classes in the same term with the same system_type
    const otherClasses = await classRepo.find({
      where: {
        term_id: term.id,
        system_type: classEntity.system_type,
      },
    });

    // Filter out the newly created class
    const existingClasses = otherClasses.filter(c => c.id !== classEntity.id);

    if (existingClasses.length > 0) {
      // Get all class-course relationships from existing classes
      const existingClassIds = existingClasses.map(c => c.id);
      const existingClassCourses = await classCourseRepo.find({
        where: {
          class_id: In(existingClassIds),
        },
        relations: ["course"],
      });

      // Extract unique core courses (is_elective = false) from existing classes
      const coreCourseIds = new Set<number>();
      existingClassCourses.forEach(cc => {
        if (!cc.course.is_elective) {
          coreCourseIds.add(cc.course.id);
        }
      });

      // Assign core courses to the new class
      if (coreCourseIds.size > 0) {
        const coursesToAssign = Array.from(coreCourseIds);
        const courses = await courseRepo.find({
          where: { id: In(coursesToAssign) },
        });

        const assignedCourses: ClassCourse[] = [];
        for (const courseId of coursesToAssign) {
          // Check if already assigned (shouldn't happen, but safety check)
          const existing = await classCourseRepo.findOne({
            where: {
              class_id: classEntity.id,
              course_id: courseId,
            },
          });

          if (!existing) {
            const classCourse = classCourseRepo.create({
              class_id: classEntity.id,
              course_id: courseId,
            });

            await classCourseRepo.save(classCourse);

            // Automatically create components based on course's component_types
            const course = courses.find((c) => c.id === courseId);
            if (course && course.component_types) {
              const componentTypes = course.component_types.split(",").map((t) => t.trim() as ComponentType);
              const componentRepo = AppDataSource.getRepository(CourseComponent);
              
              for (const componentType of componentTypes) {
                const component = componentRepo.create({
                  class_course_id: classCourse.id,
                  component_type: componentType,
                });
                await componentRepo.save(component);
              }
            }

            assignedCourses.push(classCourse);
          }
        }

        // Copy L (Lecture) sessions from corresponding odd class to even class
        await copyLectureSessionsFromOddClass(classEntity, term.id, classEntity.system_type);

        // Invalidate cache for the term
        const { invalidateTermCache } = require("../utils/cacheInvalidation");
        invalidateTermCache(term.id);

        return res.status(201).json({
          success: true,
          data: classEntity,
          message: `Class created successfully. Automatically assigned ${assignedCourses.length} core course(s) from other classes in the same term and system type.`,
        });
      }
    }

    // Copy L (Lecture) sessions from corresponding odd class to even class (even if no courses were auto-assigned)
    await copyLectureSessionsFromOddClass(classEntity, term.id, classEntity.system_type);

    // Invalidate cache for the term
    const { invalidateTermCache } = require("../utils/cacheInvalidation");
    invalidateTermCache(term.id);

    return res.status(201).json({
      success: true,
      data: classEntity,
      message: "Class created successfully. No core courses found in other classes of the same term and system type.",
    });
  } catch (error) {
    console.error("Error creating class:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Get all classes for a term
 */
export const getClassesByTerm = async (req: Request, res: Response) => {
  try {
    // When mounting router with app.use("/api/terms/:termId/classes", router),
    // Express merges params, but we need to check both the mounted route params
    // and any params from parent routes. The termId should be in req.params.
    console.log(`[getClassesByTerm] Request received:`, {
      params: req.params,
      query: req.query,
      url: req.url,
      path: req.path,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      method: req.method,
    });
    
    // Try to get termId from params - it should be there from the parent route
    const termId = req.params.termId;
    console.log(`[getClassesByTerm] Extracted termId:`, { termId, type: typeof termId, params: req.params });
    
    // If termId is not in params, try to extract from originalUrl
    let finalTermId = termId;
    if (!finalTermId && req.originalUrl) {
      const match = req.originalUrl.match(/\/terms\/(\d+)\/classes/);
      if (match) {
        finalTermId = match[1];
        console.log(`[getClassesByTerm] Extracted termId from originalUrl:`, finalTermId);
      }
    }

    // Use finalTermId (either from params or extracted from URL)
    const termIdToUse = finalTermId;
    
    // Validate termId exists
    if (!termIdToUse || (typeof termIdToUse === "string" && termIdToUse.trim() === "")) {
      console.error(`[getClassesByTerm] termId parameter is missing or empty:`, {
        termId: termIdToUse,
        params: req.params,
        originalUrl: req.originalUrl,
        url: req.url,
      });
      return res.status(400).json({
        success: false,
        message: "Invalid term ID: termId parameter is missing or empty",
      });
    }

    // Parse and validate termId
    const parsedTermId = typeof termIdToUse === "string" ? parseInt(termIdToUse.trim(), 10) : parseInt(String(termIdToUse), 10);
    console.log(`[getClassesByTerm] Parsed termId:`, { termId, parsedTermId, isNaN: isNaN(parsedTermId) });
    
    if (isNaN(parsedTermId) || parsedTermId <= 0 || !Number.isInteger(parsedTermId)) {
      console.error(`[getClassesByTerm] Invalid parsedTermId:`, {
        termId,
        parsedTermId,
        isNaN: isNaN(parsedTermId),
        isPositive: parsedTermId > 0,
        isInteger: Number.isInteger(parsedTermId),
      });
      return res.status(400).json({
        success: false,
        message: `Invalid term ID: "${termId}" cannot be parsed as a positive integer`,
      });
    }

    // Verify term exists
    console.log(`[getClassesByTerm] Verifying term exists with id:`, parsedTermId);
    const termRepo = AppDataSource.getRepository(Term);
    const term = await termRepo.findOne({
      where: { id: parsedTermId },
    });

    if (!term) {
      console.error(`[getClassesByTerm] Term not found:`, { parsedTermId });
      return res.status(404).json({
        success: false,
        message: "Term not found",
      });
    }

    console.log(`[getClassesByTerm] Querying database for classes with termId:`, parsedTermId);
    console.log(`[getClassesByTerm] AppDataSource initialized:`, AppDataSource.isInitialized);
    
    const classRepo = AppDataSource.getRepository(Class);
    console.log(`[getClassesByTerm] Repository obtained, executing query...`);

    const classes = await classRepo.find({
      where: { term_id: term.id },
    });
    
    // Sort classes: first by system_type (descending: 180, 160, 140, null), then by class_code numerically
    classes.sort((a, b) => {
      // Sort by system_type first (descending: 180 > 160 > 140 > null)
      if (a.system_type !== b.system_type) {
        if (a.system_type === null) return 1;
        if (b.system_type === null) return -1;
        return b.system_type - a.system_type;
      }
      
      // Then sort by class_code numerically (extract number after underscore)
      const extractNumber = (code: string): number => {
        const parts = code.split("_");
        if (parts.length === 2) {
          const num = parseInt(parts[1], 10);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      };
      
      const numA = extractNumber(a.class_code);
      const numB = extractNumber(b.class_code);
      
      if (numA !== numB) {
        return numA - numB;
      }
      
      // If numbers are equal, fall back to string comparison
      return a.class_code.localeCompare(b.class_code);
    });

    console.log(`[getClassesByTerm] Query completed, found ${classes.length} classes`);
    console.log(`[getClassesByTerm] Sending response...`);

    return res.json({
      success: true,
      data: classes,
    });
  } catch (error: any) {
    console.error(`[getClassesByTerm] Exception caught:`, {
      message: error.message,
      stack: error.stack,
      error,
      params: req.params,
      url: req.url,
    });
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Delete a class
 */
export const deleteClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate id - handle string | string[] type
    const idStr = Array.isArray(id) ? id[0] : (id as string);
    const parsedId = parseInt(idStr, 10);
    if (isNaN(parsedId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID",
      });
    }

    const classRepo = AppDataSource.getRepository(Class);
    const classEntity = await classRepo.findOne({
      where: { id: parsedId },
      relations: ["classCourses"],
    });

    if (!classEntity) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // Check if class has courses assigned (prevent deletion if it has associated data)
    if (classEntity.classCourses && classEntity.classCourses.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete class: It has ${classEntity.classCourses.length} course(s) assigned. Please remove all courses first.`,
      });
    }

    const termId = classEntity.term_id;

    // Delete the class
    await classRepo.remove(classEntity);

    // Invalidate cache for the term
    const { invalidateTermCache } = require("../utils/cacheInvalidation");
    invalidateTermCache(termId);

    return res.json({
      success: true,
      message: "Class deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting class:", error);
    
    // Handle foreign key constraint errors
    if (error.code === "23503" || error.message?.includes("foreign key")) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete class: It has associated data (courses, components, or sessions). Please remove all associated data first.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

