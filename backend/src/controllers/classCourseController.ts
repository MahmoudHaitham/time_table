import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { ClassCourse } from "../entities/ClassCourse";
import { Class } from "../entities/Class";
import { Course } from "../entities/Course";
import { CourseComponent, ComponentType } from "../entities/CourseComponent";
import { Session } from "../entities/Session";

/**
 * Assign courses to a class
 */
export const assignCoursesToClass = async (req: Request, res: Response) => {
  try {
    console.log(`[assignCoursesToClass] Request received:`, {
      params: req.params,
      query: req.query,
      url: req.url,
      path: req.path,
      originalUrl: req.originalUrl,
      body: req.body,
      method: req.method,
    });
    
    const { classId } = req.params;
    console.log(`[assignCoursesToClass] Extracted classId:`, { classId, type: typeof classId, params: req.params });
    
    const { course_ids } = req.body; // Array of course IDs

    // Validate classId exists
    if (!classId || (typeof classId === "string" && classId.trim() === "")) {
      console.error(`[assignCoursesToClass] classId parameter is missing or empty:`, {
        classId,
        params: req.params,
        url: req.url,
      });
      return res.status(400).json({
        success: false,
        message: "Invalid class ID: classId parameter is missing or empty",
      });
    }

    // Parse and validate classId
    const parsedClassId = typeof classId === "string" ? parseInt(classId.trim(), 10) : parseInt(String(classId), 10);
    console.log(`[assignCoursesToClass] Parsed classId:`, { classId, parsedClassId, isNaN: isNaN(parsedClassId) });
    
    if (isNaN(parsedClassId) || parsedClassId <= 0 || !Number.isInteger(parsedClassId)) {
      console.error(`[assignCoursesToClass] Invalid parsedClassId:`, {
        classId,
        parsedClassId,
        isNaN: isNaN(parsedClassId),
        isPositive: parsedClassId > 0,
        isInteger: Number.isInteger(parsedClassId),
      });
      return res.status(400).json({
        success: false,
        message: `Invalid class ID: "${classId}" cannot be parsed as a positive integer`,
      });
    }

    if (!Array.isArray(course_ids) || course_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "course_ids must be a non-empty array",
      });
    }

    // Verify class exists
    console.log(`[assignCoursesToClass] Verifying class exists with id:`, parsedClassId);
    const classRepo = AppDataSource.getRepository(Class);
    const classEntity = await classRepo.findOne({
      where: { id: parsedClassId },
    });

    if (!classEntity) {
      console.error(`[assignCoursesToClass] Class not found:`, { parsedClassId });
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }
    
    console.log(`[assignCoursesToClass] Class found:`, { id: classEntity.id, class_code: classEntity.class_code });

    // Verify all courses exist
    const courseRepo = AppDataSource.getRepository(Course);
    const courses = await courseRepo
      .createQueryBuilder("course")
      .where("course.id IN (:...ids)", { ids: course_ids })
      .getMany();

    if (courses.length !== course_ids.length) {
      return res.status(400).json({
        success: false,
        message: "One or more courses not found",
      });
    }

    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const created: ClassCourse[] = [];

    // Create class-course relationships
    for (const courseId of course_ids) {
      // Check if already assigned
      const existing = await classCourseRepo.findOne({
        where: {
          class_id: parsedClassId,
          course_id: courseId,
        },
      });

      if (!existing) {
            const classCourse = classCourseRepo.create({
              class_id: parsedClassId,
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
        
        created.push(classCourse);
      }
    }

    return res.status(201).json({
      success: true,
      data: created,
      message: `Assigned ${created.length} course(s) to class`,
    });
  } catch (error) {
    console.error("Error assigning courses to class:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Get all courses for a class
 */
export const getClassCourses = async (req: Request, res: Response) => {
  try {
    console.log(`[getClassCourses] Request received:`, {
      params: req.params,
      query: req.query,
      url: req.url,
      path: req.path,
      originalUrl: req.originalUrl,
      method: req.method,
    });
    
    const { classId } = req.params;
    console.log(`[getClassCourses] Extracted classId:`, { classId, type: typeof classId, params: req.params });

    // Validate classId exists
    if (!classId || (typeof classId === "string" && classId.trim() === "")) {
      console.error(`[getClassCourses] classId parameter is missing or empty:`, {
        classId,
        params: req.params,
        url: req.url,
      });
      return res.status(400).json({
        success: false,
        message: "Invalid class ID: classId parameter is missing or empty",
      });
    }

    // Parse and validate classId
    const parsedClassId = typeof classId === "string" ? parseInt(classId.trim(), 10) : parseInt(String(classId), 10);
    console.log(`[getClassCourses] Parsed classId:`, { classId, parsedClassId, isNaN: isNaN(parsedClassId) });
    
    if (isNaN(parsedClassId) || parsedClassId <= 0 || !Number.isInteger(parsedClassId)) {
      console.error(`[getClassCourses] Invalid parsedClassId:`, {
        classId,
        parsedClassId,
        isNaN: isNaN(parsedClassId),
        isPositive: parsedClassId > 0,
        isInteger: Number.isInteger(parsedClassId),
      });
      return res.status(400).json({
        success: false,
        message: `Invalid class ID: "${classId}" cannot be parsed as a positive integer`,
      });
    }

    console.log(`[getClassCourses] Querying database for class courses with classId:`, parsedClassId);
    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const classCourses = await classCourseRepo.find({
      where: { class_id: parsedClassId },
      relations: ["course", "class", "components", "components.sessions"],
    });

    console.log(`[getClassCourses] Query completed, found ${classCourses.length} class courses`);
    console.log(`[getClassCourses] Sending response...`);

    return res.json({
      success: true,
      data: classCourses,
    });
  } catch (error: any) {
    console.error(`[getClassCourses] Exception caught:`, {
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
 * Delete a course assignment from a class
 */
export const deleteClassCourse = async (req: Request, res: Response) => {
  try {
    console.log(`[deleteClassCourse] Request received:`, {
      params: req.params,
      url: req.url,
      method: req.method,
    });
    
    const { id } = req.params; // class_course_id
    
    // Validate id exists
    if (!id || (typeof id === "string" && id.trim() === "")) {
      console.error(`[deleteClassCourse] id parameter is missing or empty:`, {
        id,
        params: req.params,
        url: req.url,
      });
      return res.status(400).json({
        success: false,
        message: "Invalid class course ID: id parameter is missing or empty",
      });
    }

    // Parse and validate id
    const parsedId = typeof id === "string" ? parseInt(id.trim(), 10) : parseInt(String(id), 10);
    console.log(`[deleteClassCourse] Parsed id:`, { id, parsedId, isNaN: isNaN(parsedId) });
    
    if (isNaN(parsedId) || parsedId <= 0 || !Number.isInteger(parsedId)) {
      console.error(`[deleteClassCourse] Invalid parsedId:`, {
        id,
        parsedId,
        isNaN: isNaN(parsedId),
        isPositive: parsedId > 0,
        isInteger: Number.isInteger(parsedId),
      });
      return res.status(400).json({
        success: false,
        message: `Invalid class course ID: "${id}" cannot be parsed as a positive integer`,
      });
    }

    // Verify class course exists
    console.log(`[deleteClassCourse] Verifying class course exists with id:`, parsedId);
    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const classCourse = await classCourseRepo.findOne({
      where: { id: parsedId },
      relations: ["components", "components.sessions"],
    });

    if (!classCourse) {
      console.error(`[deleteClassCourse] Class course not found:`, { parsedId });
      return res.status(404).json({
        success: false,
        message: "Class course assignment not found",
      });
    }
    
    console.log(`[deleteClassCourse] Class course found:`, { id: classCourse.id, class_id: classCourse.class_id, course_id: classCourse.course_id });

    // Delete all components and their sessions (cascade delete)
    const componentRepo = AppDataSource.getRepository(CourseComponent);
    const sessionRepo = AppDataSource.getRepository(Session);
    if (classCourse.components && classCourse.components.length > 0) {
      for (const component of classCourse.components) {
        // Delete sessions first (if any)
        if (component.sessions && component.sessions.length > 0) {
          for (const session of component.sessions) {
            await sessionRepo.delete(session.id);
          }
        }
        // Delete component
        await componentRepo.delete(component.id);
      }
    }

    // Delete the class course assignment
    await classCourseRepo.delete(parsedId);

    console.log(`[deleteClassCourse] Successfully deleted class course assignment:`, { id: parsedId });

    return res.json({
      success: true,
      message: "Course assignment deleted successfully",
    });
  } catch (error: any) {
    console.error(`[deleteClassCourse] Exception caught:`, {
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

