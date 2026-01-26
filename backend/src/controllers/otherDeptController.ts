import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Course } from "../entities/Course";
import { Term } from "../entities/Term";
import { Class } from "../entities/Class";
import { ClassCourse } from "../entities/ClassCourse";
import { CourseComponent, ComponentType } from "../entities/CourseComponent";
import { Session, Day } from "../entities/Session";

const OTHER_DEPT_TERM_NUMBER = "Other_Departments";
const OTHER_DEPT_CLASS_CODE = "OTHER_DEPT";

/**
 * Get or create the "Other Departments" term and class
 */
async function getOrCreateOtherDeptStructure() {
  const termRepo = AppDataSource.getRepository(Term);
  const classRepo = AppDataSource.getRepository(Class);

  // Find or create term
  let term = await termRepo.findOne({
    where: { term_number: OTHER_DEPT_TERM_NUMBER },
  });

  if (!term) {
    term = termRepo.create({
      term_number: OTHER_DEPT_TERM_NUMBER,
      is_published: false,
    });
    await termRepo.save(term);
  }

  // Find or create class
  let classEntity = await classRepo.findOne({
    where: {
      term_id: term.id,
      class_code: OTHER_DEPT_CLASS_CODE,
    },
  });

  if (!classEntity) {
    classEntity = classRepo.create({
      term_id: term.id,
      class_code: OTHER_DEPT_CLASS_CODE,
      system_type: null,
    });
    await classRepo.save(classEntity);
  }

  return { term, class: classEntity };
}

/**
 * Create a course for other departments
 */
export const createOtherDeptCourse = async (req: Request, res: Response) => {
  try {
    const { code, name, hasLab } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: "Course code and name are required",
      });
    }

    const courseRepo = AppDataSource.getRepository(Course);

    // Check if course already exists
    const existingCourse = await courseRepo.findOne({
      where: { code },
    });

    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: `Course code "${code}" already exists!`,
      });
    }

    // Create course with L, S, and optionally LB components
    const componentTypes = hasLab ? "L,S,LB" : "L,S";

    const course = courseRepo.create({
      code,
      name,
      is_elective: false,
      component_types: componentTypes,
    });

    await courseRepo.save(course);

    // Get or create Other Departments structure
    const { class: classEntity } = await getOrCreateOtherDeptStructure();

    // Assign course to the Other Departments class
    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const classCourse = classCourseRepo.create({
      class_id: classEntity.id,
      course_id: course.id,
    });

    await classCourseRepo.save(classCourse);

    // Create components for the course
    const componentRepo = AppDataSource.getRepository(CourseComponent);
    const components: CourseComponent[] = [];

    // Always create L and S components
    const componentTypesArray = componentTypes.split(",").map(t => t.trim() as ComponentType);
    
    for (const componentType of componentTypesArray) {
      const component = componentRepo.create({
        class_course_id: classCourse.id,
        component_type: componentType,
      });
      await componentRepo.save(component);
      components.push(component);
    }

    return res.status(201).json({
      success: true,
      data: {
        course,
        components: components.map(c => ({
          id: c.id,
          component_type: c.component_type,
        })),
      },
      message: "Course created successfully for other departments",
    });
  } catch (error: any) {
    console.error("Error creating other dept course:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

/**
 * Get all courses for other departments
 */
export const getOtherDeptCourses = async (req: Request, res: Response) => {
  try {
    const { class: classEntity } = await getOrCreateOtherDeptStructure();

    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const classCourses = await classCourseRepo.find({
      where: { class_id: classEntity.id },
      relations: ["course"],
    });

    // Load components and sessions separately
    const componentRepo = AppDataSource.getRepository(CourseComponent);
    const sessionRepo = AppDataSource.getRepository(Session);

    const courses = await Promise.all(
      classCourses.map(async (cc) => {
        const components = await componentRepo.find({
          where: { class_course_id: cc.id },
        });

        const componentsWithSessions = await Promise.all(
          components.map(async (comp) => {
            const sessions = await sessionRepo.find({
              where: { component_id: comp.id },
              order: { day: "ASC", slot: "ASC" },
            });
            return {
              id: comp.id,
              component_type: comp.component_type,
              sessions: sessions.map((s) => ({
                id: s.id,
                day: s.day,
                slot: s.slot,
                room: s.room,
                instructor: s.instructor,
              })),
            };
          })
        );

        return {
          id: cc.course.id,
          code: cc.course.code,
          name: cc.course.name,
          component_types: cc.course.component_types,
          components: componentsWithSessions,
        };
      })
    );

    // Sort courses by code
    courses.sort((a, b) => a.code.localeCompare(b.code));

    return res.json({
      success: true,
      data: courses,
    });
  } catch (error: any) {
    console.error("Error fetching other dept courses:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

/**
 * Create or update a session for a component
 */
export const upsertComponentSession = async (req: Request, res: Response) => {
  try {
    const componentIdParam = Array.isArray(req.params.componentId) ? req.params.componentId[0] : req.params.componentId;
    const { day, slot, room, instructor } = req.body;

    if (!day || !slot) {
      return res.status(400).json({
        success: false,
        message: "Day and slot are required",
      });
    }

    // Validate slot range
    if (slot < 1 || slot > 4) {
      return res.status(400).json({
        success: false,
        message: "Slot must be between 1 and 4",
      });
    }

    // Validate day
    const validDays = Object.values(Day);
    if (!validDays.includes(day)) {
      return res.status(400).json({
        success: false,
        message: `Invalid day. Must be one of: ${validDays.join(", ")}`,
      });
    }

    const parsedComponentId = parseInt(String(componentIdParam), 10);
    if (isNaN(parsedComponentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid component ID",
      });
    }

    const componentRepo = AppDataSource.getRepository(CourseComponent);
    const component = await componentRepo.findOne({
      where: { id: parsedComponentId },
      relations: ["classCourse", "classCourse.class"],
    });

    if (!component) {
      return res.status(404).json({
        success: false,
        message: "Component not found",
      });
    }

    const sessionRepo = AppDataSource.getRepository(Session);

    // Check if session already exists for this component at this day/slot
    let session = await sessionRepo.findOne({
      where: {
        component_id: parsedComponentId,
        day: day as Day,
        slot: slot,
      },
    });

    if (session) {
      // Update existing session
      session.room = room || null;
      session.instructor = instructor || null;
      await sessionRepo.save(session);
    } else {
      // Create new session
      session = sessionRepo.create({
        component_id: parsedComponentId,
        day: day as Day,
        slot,
        room: room || null,
        instructor: instructor || null,
      });
      await sessionRepo.save(session);
    }

    return res.json({
      success: true,
      data: session,
      message: session.id ? "Session updated successfully" : "Session created successfully",
    });
  } catch (error: any) {
    console.error("Error upserting component session:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

/**
 * Delete a session for a component (by day and slot)
 */
export const deleteComponentSession = async (req: Request, res: Response) => {
  try {
    const componentIdParam = Array.isArray(req.params.componentId) ? req.params.componentId[0] : req.params.componentId;
    const { day, slot } = req.query;

    const parsedComponentId = parseInt(String(componentIdParam), 10);
    if (isNaN(parsedComponentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid component ID",
      });
    }

    const sessionRepo = AppDataSource.getRepository(Session);
    
    // If day and slot are provided, delete specific session
    if (day && slot) {
      const parsedSlot = parseInt(slot as string, 10);
      const session = await sessionRepo.findOne({
        where: {
          component_id: parsedComponentId,
          day: day as Day,
          slot: parsedSlot,
        },
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }

      await sessionRepo.remove(session);
    } else {
      // Delete all sessions for this component (fallback)
      const sessions = await sessionRepo.find({
        where: { component_id: parsedComponentId },
      });

      if (sessions.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No sessions found",
        });
      }

      await sessionRepo.remove(sessions);
    }

    return res.json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting component session:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

/**
 * Delete a course for other departments
 */
export const deleteOtherDeptCourse = async (req: Request, res: Response) => {
  try {
    const courseIdParam = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;

    const parsedCourseId = parseInt(String(courseIdParam), 10);
    if (isNaN(parsedCourseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    const { class: classEntity } = await getOrCreateOtherDeptStructure();

    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const classCourse = await classCourseRepo.findOne({
      where: {
        class_id: classEntity.id,
        course_id: parsedCourseId,
      },
      relations: ["components", "components.sessions"],
    });

    if (!classCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found in other departments",
      });
    }

    // Delete all sessions
    const sessionRepo = AppDataSource.getRepository(Session);
    for (const component of classCourse.components || []) {
      for (const session of component.sessions || []) {
        await sessionRepo.remove(session);
      }
    }

    // Delete components
    const componentRepo = AppDataSource.getRepository(CourseComponent);
    for (const component of classCourse.components || []) {
      await componentRepo.remove(component);
    }

    // Delete class course relationship
    await classCourseRepo.remove(classCourse);

    // Delete course
    const courseRepo = AppDataSource.getRepository(Course);
    await courseRepo.delete(parsedCourseId);

    return res.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting other dept course:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};
