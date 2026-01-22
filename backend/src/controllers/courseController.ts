import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Course } from "../entities/Course";
import { Class } from "../entities/Class";
import { ClassCourse } from "../entities/ClassCourse";
import { CourseComponent, ComponentType } from "../entities/CourseComponent";

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

