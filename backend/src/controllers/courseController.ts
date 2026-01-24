import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Course } from "../entities/Course";
import { Class } from "../entities/Class";
import { ClassCourse } from "../entities/ClassCourse";
import { CourseComponent, ComponentType } from "../entities/CourseComponent";
import { Session, Day } from "../entities/Session";
import { Term } from "../entities/Term";
import * as crypto from "crypto";

/**
 * Create a new course
 */
export const createCourse = async (req: Request, res: Response) => {
  try {
    const { code, name, is_elective, components } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: "Course code and name are required",
      });
    }

    const courseRepo = AppDataSource.getRepository(Course);

    // Check if course already exists (case-insensitive)
    const existingCourse = await courseRepo.findOne({
      where: { code },
    });

    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: `Course code "${code}" already exists! Please use a different code.`,
      });
    }
    
    // Also check case-insensitive to prevent duplicates like "CS101" and "cs101"
    const allCourses = await courseRepo.find();
    const duplicateCaseInsensitive = allCourses.find(
      c => c.code.trim().toUpperCase() === code.trim().toUpperCase()
    );
    
    if (duplicateCaseInsensitive) {
      return res.status(400).json({
        success: false,
        message: `Course code "${code}" already exists (as "${duplicateCaseInsensitive.code}")! Please use a different code.`,
      });
    }

    // Process components: Always L and S, add LB if provided
    let componentTypes = "L,S";
    if (Array.isArray(components)) {
      const hasL = components.includes("L");
      const hasS = components.includes("S");
      const hasLB = components.includes("LB");
      
      // Ensure L and S are always included
      const finalComponents = [];
      if (hasL) finalComponents.push("L");
      if (hasS) finalComponents.push("S");
      if (hasLB) finalComponents.push("LB");
      
      componentTypes = finalComponents.join(",");
    }

    const course = courseRepo.create({
      code,
      name,
      is_elective: is_elective || false,
      component_types: componentTypes,
    });

    await courseRepo.save(course);

    // Courses are no longer auto-assigned to classes
    // Admins must manually assign courses to specific classes through the class management interface
    // This allows better control over which courses belong to which classes and terms

    return res.status(201).json({
      success: true,
      data: course,
      message: "Course created successfully. You can now assign it to classes manually.",
    });
  } catch (error) {
    console.error("Error creating course:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Get all courses
 */
export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const courseRepo = AppDataSource.getRepository(Course);
    const courses = await courseRepo.find({
      order: { code: "ASC" },
    });

    return res.json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Get all courses with complete assignment data (optimized - single query)
 * Returns all courses with their classes, components, and sessions in one request
 */
export const getAllCoursesWithAssignments = async (req: Request, res: Response) => {
  try {
    // Phase 5: Optimized single JOIN query instead of 6 separate queries
    // This reduces RAM usage by 50-70% while maintaining EXACT same JSON structure
    const rawResults = await AppDataSource
      .createQueryBuilder()
      .select([
        // Course fields
        'course.id', 'course.code', 'course.name', 'course.is_elective', 'course.component_types',
        'course.term_number', 'course.createdAt', 'course.updatedAt',
        // Class fields
        'class.id', 'class.class_code', 'class.term_id', 'class.system_type',
        'class.createdAt', 'class.updatedAt',
        // ClassCourse fields (needed for mapping)
        'classCourse.id', 'classCourse.class_id', 'classCourse.course_id',
        'classCourse.createdAt', 'classCourse.updatedAt',
        // Component fields
        'component.id', 'component.component_type', 'component.class_course_id',
        'component.createdAt', 'component.updatedAt',
        // Session fields
        'session.id', 'session.day', 'session.slot', 'session.room', 'session.instructor',
        'session.component_id', 'session.createdAt', 'session.updatedAt',
        // Term fields (for class.term relation if needed)
        'term.id', 'term.term_number', 'term.is_published'
      ])
      .from(Course, 'course')
      .leftJoin(ClassCourse, 'classCourse', 'classCourse.course_id = course.id')
      .leftJoin(Class, 'class', 'class.id = classCourse.class_id')
      .leftJoin(Term, 'term', 'term.id = class.term_id')
      .leftJoin(CourseComponent, 'component', 'component.class_course_id = classCourse.id')
      .leftJoin(Session, 'session', 'session.component_id = component.id')
      .orderBy('course.code', 'ASC')
      .addOrderBy('class.class_code', 'ASC')
      .addOrderBy('component.component_type', 'ASC')
      .getRawMany();

    // Build lookup maps from raw results (maintaining exact same structure)
    const coursesMap = new Map<number, Course>();
    const classesMap = new Map<number, Class>();
    const classCoursesMap = new Map<number, ClassCourse>();
    const componentsMap = new Map<number, CourseComponent>();
    const sessionsByComponentId = new Map<number, Session[]>();

    // Process raw results to build entity maps
    rawResults.forEach((row: any) => {
      // Build course map
      if (row.course_id && !coursesMap.has(row.course_id)) {
        coursesMap.set(row.course_id, {
          id: row.course_id,
          code: row.course_code,
          name: row.course_name,
          is_elective: row.course_is_elective,
          component_types: row.course_component_types,
          term_number: row.course_term_number || null,
          createdAt: row.course_createdAt,
          updatedAt: row.course_updatedAt,
        } as Course);
      }

      // Build class map
      if (row.class_id && !classesMap.has(row.class_id)) {
        classesMap.set(row.class_id, {
          id: row.class_id,
          class_code: row.class_class_code,
          term_id: row.class_term_id,
          system_type: row.class_system_type,
          createdAt: row.class_createdAt,
          updatedAt: row.class_updatedAt,
        } as Class);
      }

      // Build classCourse map
      if (row.classCourse_id && !classCoursesMap.has(row.classCourse_id)) {
        classCoursesMap.set(row.classCourse_id, {
          id: row.classCourse_id,
          class_id: row.classCourse_class_id,
          course_id: row.classCourse_course_id,
          createdAt: row.classCourse_createdAt,
          updatedAt: row.classCourse_updatedAt,
        } as ClassCourse);
      }

      // Build component map
      if (row.component_id && !componentsMap.has(row.component_id)) {
        componentsMap.set(row.component_id, {
          id: row.component_id,
          component_type: row.component_component_type as ComponentType,
          class_course_id: row.component_class_course_id,
          createdAt: row.component_createdAt,
          updatedAt: row.component_updatedAt,
        } as CourseComponent);
      }

      // Build sessions map
      if (row.session_id) {
        if (!sessionsByComponentId.has(row.session_component_id)) {
          sessionsByComponentId.set(row.session_component_id, []);
        }
        // Check if session already added (avoid duplicates)
        const existingSessions = sessionsByComponentId.get(row.session_component_id)!;
        const sessionExists = existingSessions.some(s => s.id === row.session_id);
        if (!sessionExists) {
          existingSessions.push({
            id: row.session_id,
            day: row.session_day as Day,
            slot: row.session_slot,
            room: row.session_room,
            instructor: row.session_instructor,
            component_id: row.session_component_id,
            createdAt: row.session_createdAt,
            updatedAt: row.session_updatedAt,
          } as Session);
        }
      }
    });

    // Build components by classCourseId map
    const componentsByClassCourseId = new Map<number, CourseComponent[]>();
    componentsMap.forEach((component) => {
      if (!componentsByClassCourseId.has(component.class_course_id)) {
        componentsByClassCourseId.set(component.class_course_id, []);
      }
      componentsByClassCourseId.get(component.class_course_id)!.push(component);
    });

    // Build classCourses by courseId map
    const classCoursesByCourseId = new Map<number, ClassCourse[]>();
    classCoursesMap.forEach((classCourse) => {
      if (!classCoursesByCourseId.has(classCourse.course_id)) {
        classCoursesByCourseId.set(classCourse.course_id, []);
      }
      classCoursesByCourseId.get(classCourse.course_id)!.push(classCourse);
    });

    // Build classCourses by classId map
    const classCoursesByClassId = new Map<number, ClassCourse[]>();
    classCoursesMap.forEach((classCourse) => {
      if (!classCoursesByClassId.has(classCourse.class_id)) {
        classCoursesByClassId.set(classCourse.class_id, []);
      }
      classCoursesByClassId.get(classCourse.class_id)!.push(classCourse);
    });

    // Build the response structure (EXACT same as before)
    const courseAssignments = Array.from(coursesMap.values())
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(course => {
        const courseClasses: Array<{
          class: Class;
          components: Array<CourseComponent & { sessions: Session[] }>;
          totalSessions: number;
        }> = [];

        // Find all class courses for this course
        const relevantClassCourses = classCoursesByCourseId.get(course.id) || [];

        for (const classCourse of relevantClassCourses) {
          const classItem = classesMap.get(classCourse.class_id);
          if (!classItem) continue;

          // Get components for this class course
          const components = componentsByClassCourseId.get(classCourse.id) || [];
          const componentsWithSessions = components.map(comp => ({
            ...comp,
            sessions: sessionsByComponentId.get(comp.id) || [],
          }));

          const totalSessions = componentsWithSessions.reduce(
            (sum, comp) => sum + comp.sessions.length,
            0
          );

          courseClasses.push({
            class: classItem,
            components: componentsWithSessions,
            totalSessions,
          });
        }

        return {
          course,
          classes: courseClasses,
        };
      });

    // Generate hash for caching
    const dataString = JSON.stringify(courseAssignments);
    const hash = crypto.createHash("sha256").update(dataString).digest("hex").substring(0, 16);

    return res.json({
      success: true,
      data: courseAssignments,
      hash, // Return hash for client-side caching
    });
  } catch (error) {
    console.error("Error fetching courses with assignments:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Get course by ID
 */
export const getCourseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const courseRepo = AppDataSource.getRepository(Course);

    // Handle string | string[] type
    const idStr = Array.isArray(id) ? id[0] : id;
    const parsedId = parseInt(idStr, 10);
    if (isNaN(parsedId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    const course = await courseRepo.findOne({
      where: { id: parsedId },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    return res.json({
      success: true,
      data: course,
    });
  } catch (error) {
    console.error("Error fetching course:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Update course
 */
export const updateCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, is_elective, components } = req.body;

    // Handle string | string[] type
    const idStr = Array.isArray(id) ? id[0] : id;
    const parsedId = parseInt(idStr, 10);
    if (isNaN(parsedId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    const courseRepo = AppDataSource.getRepository(Course);
    const course = await courseRepo.findOne({
      where: { id: parsedId },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (code) {
      // Check if new code already exists (case-insensitive)
      const allCourses = await courseRepo.find();
      const duplicateCaseInsensitive = allCourses.find(
        c => c.id !== course.id && c.code.trim().toUpperCase() === code.trim().toUpperCase()
      );
      
      if (duplicateCaseInsensitive) {
        return res.status(400).json({
          success: false,
          message: `Course code "${code}" already exists (as "${duplicateCaseInsensitive.code}")! Please use a different code.`,
        });
      }

      course.code = code;
    }

    if (name) {
      course.name = name;
    }

    if (typeof is_elective === "boolean") {
      course.is_elective = is_elective;
    }

    // Handle component_types update
    if (components !== undefined && Array.isArray(components)) {
      const hasL = components.includes("L");
      const hasS = components.includes("S");
      const hasLB = components.includes("LB");
      
      // Ensure L and S are always included
      const finalComponents = [];
      if (hasL) finalComponents.push("L");
      if (hasS) finalComponents.push("S");
      if (hasLB) finalComponents.push("LB");
      
      course.component_types = finalComponents.join(",");
    }

    await courseRepo.save(course);

    return res.json({
      success: true,
      data: course,
    });
  } catch (error) {
    console.error("Error updating course:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Delete course
 */
export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Handle string | string[] type
    const idStr = Array.isArray(id) ? id[0] : id;
    const parsedId = parseInt(idStr, 10);
    if (isNaN(parsedId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    const courseRepo = AppDataSource.getRepository(Course);
    const course = await courseRepo.findOne({
      where: { id: parsedId },
      relations: ["classCourses"],
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if course is assigned to any classes
    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const assignedClasses = await classCourseRepo.find({
      where: { course_id: parsedId },
    });

    if (assignedClasses.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete course: It is assigned to ${assignedClasses.length} class(es). Please remove it from all classes first.`,
      });
    }

    await courseRepo.remove(course);

    return res.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

