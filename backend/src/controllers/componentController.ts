import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { CourseComponent, ComponentType } from "../entities/CourseComponent";
import { ClassCourse } from "../entities/ClassCourse";

/**
 * Create components for a class-course (atomic bundle)
 */
export const createComponents = async (req: Request, res: Response) => {
  try {
    console.log(`[createComponents] Request received:`, {
      params: req.params,
      query: req.query,
      url: req.url,
      path: req.path,
      originalUrl: req.originalUrl,
      body: req.body,
      method: req.method,
    });
    
    const { id } = req.params; // class_course_id
    console.log(`[createComponents] Extracted id:`, { id, type: typeof id, params: req.params });
    
    const { components } = req.body; // Array of { component_type: 'L' | 'S' | 'LB' }

    // Validate id exists
    if (!id || (typeof id === "string" && id.trim() === "")) {
      console.error(`[createComponents] id parameter is missing or empty:`, {
        id,
        params: req.params,
        url: req.url,
      });
      return res.status(400).json({
        success: false,
        message: "Invalid class-course ID: id parameter is missing or empty",
      });
    }

    // Parse and validate id
    const parsedId = typeof id === "string" ? parseInt(id.trim(), 10) : parseInt(String(id), 10);
    console.log(`[createComponents] Parsed id:`, { id, parsedId, isNaN: isNaN(parsedId) });
    
    if (isNaN(parsedId) || parsedId <= 0 || !Number.isInteger(parsedId)) {
      console.error(`[createComponents] Invalid parsedId:`, {
        id,
        parsedId,
        isNaN: isNaN(parsedId),
        isPositive: parsedId > 0,
        isInteger: Number.isInteger(parsedId),
      });
      return res.status(400).json({
        success: false,
        message: `Invalid class-course ID: "${id}" cannot be parsed as a positive integer`,
      });
    }

    if (!Array.isArray(components) || components.length === 0) {
      return res.status(400).json({
        success: false,
        message: "components must be a non-empty array",
      });
    }

    // Verify class-course exists
    console.log(`[createComponents] Verifying class-course exists with id:`, parsedId);
    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const classCourse = await classCourseRepo.findOne({
      where: { id: parsedId },
    });

    if (!classCourse) {
      console.error(`[createComponents] Class-course not found:`, { parsedId });
      return res.status(404).json({
        success: false,
        message: "Class-course not found",
      });
    }
    
    console.log(`[createComponents] Class-course found:`, { id: classCourse.id, class_id: classCourse.class_id, course_id: classCourse.course_id });

    // Validate component types
    const validTypes = [
      ComponentType.LECTURE,
      ComponentType.SECTION,
      ComponentType.LAB,
    ];
    const componentTypes = components.map((c) => c.component_type);

    for (const type of componentTypes) {
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid component type: ${type}. Must be L, S, or LB`,
        });
      }
    }

    // Check if components already exist for this class-course
    console.log(`[createComponents] Checking for existing components with class_course_id:`, parsedId);
    const componentRepo = AppDataSource.getRepository(CourseComponent);
    const existingComponents = await componentRepo.find({
      where: { class_course_id: parsedId },
    });

    // CRITICAL BUSINESS RULE: Must have at least one L
    // But only require it if no components exist yet (first time creating components)
    // If components already exist, allow adding new component types without requiring L in the array
    if (existingComponents.length === 0 && !componentTypes.includes(ComponentType.LECTURE)) {
      return res.status(400).json({
        success: false,
        message: "At least one Lecture (L) component is required when creating components for the first time",
      });
    }

    // Check if any of the components being created already exist
    const existingTypes = existingComponents.map(c => c.component_type);
    const duplicateTypes = componentTypes.filter(type => existingTypes.includes(type));
    
    if (duplicateTypes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Component(s) of type(s) ${duplicateTypes.join(", ")} already exist(s) for this class-course.`,
      });
    }

    // Create all components atomically
    const created: CourseComponent[] = [];

    console.log(`[createComponents] Creating ${components.length} component(s)...`);
    for (const comp of components) {
      const component = componentRepo.create({
        class_course_id: parsedId,
        component_type: comp.component_type,
      });

      await componentRepo.save(component);
      created.push(component);
    }

    console.log(`[createComponents] Successfully created ${created.length} component(s)`);
    return res.status(201).json({
      success: true,
      data: created,
      message: `Created ${created.length} component(s)`,
    });
  } catch (error: any) {
    console.error(`[createComponents] Exception caught:`, {
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
 * Get all components for a class-course
 */
export const getComponents = async (req: Request, res: Response) => {
  try {
    console.log(`[getComponents] Request received:`, {
      params: req.params,
      query: req.query,
      url: req.url,
      path: req.path,
      originalUrl: req.originalUrl,
      method: req.method,
    });
    
    const { id } = req.params; // class_course_id
    console.log(`[getComponents] Extracted id:`, { id, type: typeof id, params: req.params });

    // Validate id exists
    if (!id || (typeof id === "string" && id.trim() === "")) {
      console.error(`[getComponents] id parameter is missing or empty:`, {
        id,
        params: req.params,
        url: req.url,
      });
      return res.status(400).json({
        success: false,
        message: "Invalid class-course ID: id parameter is missing or empty",
      });
    }

    // Parse and validate id
    const parsedId = typeof id === "string" ? parseInt(id.trim(), 10) : parseInt(String(id), 10);
    console.log(`[getComponents] Parsed id:`, { id, parsedId, isNaN: isNaN(parsedId) });
    
    if (isNaN(parsedId) || parsedId <= 0 || !Number.isInteger(parsedId)) {
      console.error(`[getComponents] Invalid parsedId:`, {
        id,
        parsedId,
        isNaN: isNaN(parsedId),
        isPositive: parsedId > 0,
        isInteger: Number.isInteger(parsedId),
      });
      return res.status(400).json({
        success: false,
        message: `Invalid class-course ID: "${id}" cannot be parsed as a positive integer`,
      });
    }

    console.log(`[getComponents] Querying database for components with class_course_id:`, parsedId);
    const componentRepo = AppDataSource.getRepository(CourseComponent);
    const components = await componentRepo.find({
      where: { class_course_id: parsedId },
      relations: ["sessions"],
    });

    console.log(`[getComponents] Query completed, found ${components.length} components`);
    console.log(`[getComponents] Sending response...`);

    return res.json({
      success: true,
      data: components,
    });
  } catch (error: any) {
    console.error(`[getComponents] Exception caught:`, {
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

