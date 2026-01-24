import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Course } from "../entities/Course";
import { Class } from "../entities/Class";
import { ClassCourse } from "../entities/ClassCourse";
import { CourseComponent, ComponentType } from "../entities/CourseComponent";
import { Session } from "../entities/Session";
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
    // Get all courses
    const courseRepo = AppDataSource.getRepository(Course);
    const courses = await courseRepo.find({
      order: { code: "ASC" },
    });

    // Get all terms
    const termRepo = AppDataSource.getRepository(Term);
    const terms = await termRepo.find();

    // Get all classes for all terms
    const classRepo = AppDataSource.getRepository(Class);
    const allClasses = await classRepo.find({
      relations: ["term"],
    });

    // Get all class courses
    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const allClassCourses = await classCourseRepo.find({
      relations: ["course"],
    });

    // Get all components
    const componentRepo = AppDataSource.getRepository(CourseComponent);
    const allComponents = await componentRepo.find();

    // Get all sessions
    const sessionRepo = AppDataSource.getRepository(Session);
    const allSessions = await sessionRepo.find();

    // Build efficient lookup maps
    const classesByTermId = new Map<number, Class[]>();
    allClasses.forEach(cls => {
      if (!classesByTermId.has(cls.term_id)) {
        classesByTermId.set(cls.term_id, []);
      }
      classesByTermId.get(cls.term_id)!.push(cls);
    });

    const classCoursesByClassId = new Map<number, ClassCourse[]>();
    allClassCourses.forEach(cc => {
      if (!classCoursesByClassId.has(cc.class_id)) {
        classCoursesByClassId.set(cc.class_id, []);
      }
      classCoursesByClassId.get(cc.class_id)!.push(cc);
    });

    const componentsByClassCourseId = new Map<number, CourseComponent[]>();
    allComponents.forEach(comp => {
      if (!componentsByClassCourseId.has(comp.class_course_id)) {
        componentsByClassCourseId.set(comp.class_course_id, []);
      }
      componentsByClassCourseId.get(comp.class_course_id)!.push(comp);
    });

    const sessionsByComponentId = new Map<number, Session[]>();
    allSessions.forEach(session => {
      if (!sessionsByComponentId.has(session.component_id)) {
        sessionsByComponentId.set(session.component_id, []);
      }
      sessionsByComponentId.get(session.component_id)!.push(session);
    });

    // Build the response structure
    const courseAssignments = courses.map(course => {
      const courseClasses: Array<{
        class: Class;
        components: Array<CourseComponent & { sessions: Session[] }>;
        totalSessions: number;
      }> = [];

      // Find all class courses for this course
      const relevantClassCourses = allClassCourses.filter(cc => cc.course_id === course.id);

      for (const classCourse of relevantClassCourses) {
        const classItem = allClasses.find(c => c.id === classCourse.class_id);
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

