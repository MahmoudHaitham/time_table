import { Request, Response, NextFunction } from "express";

/**
 * Input validation middleware
 */

// Maximum lengths for various fields
const MAX_LENGTHS = {
  term_number: 20,
  class_code: 50,
  course_code: 20,
  course_name: 200,
  full_name: 200,
  registration_number: 50,
  instructor: 200,
  room: 50,
  password: 128,
  day: 20,
};

/**
 * Validate string length
 */
export const validateLength = (field: string, value: string, maxLength: number): boolean => {
  if (typeof value !== "string") return false;
  return value.length > 0 && value.length <= maxLength;
};

/**
 * Validate integer ID
 */
export const validateId = (id: any): number | null => {
  if (typeof id === "number") {
    return id > 0 && Number.isInteger(id) ? id : null;
  }
  if (typeof id === "string") {
    const parsed = parseInt(id, 10);
    return !isNaN(parsed) && parsed > 0 && Number.isInteger(parsed) ? parsed : null;
  }
  return null;
};

/**
 * Validate term number input
 */
export const validateTermInput = (req: Request, res: Response, next: NextFunction) => {
  const { term_number } = req.body;

  if (!term_number || typeof term_number !== "string") {
    return res.status(400).json({
      success: false,
      message: "Term number is required and must be a string",
    });
  }

  if (!validateLength("term_number", term_number, MAX_LENGTHS.term_number)) {
    return res.status(400).json({
      success: false,
      message: `Term number must be between 1 and ${MAX_LENGTHS.term_number} characters`,
    });
  }

  next();
};

/**
 * Validate class code input
 */
export const validateClassCode = (req: Request, res: Response, next: NextFunction) => {
  const { class_code } = req.body;

  if (!class_code || typeof class_code !== "string") {
    return res.status(400).json({
      success: false,
      message: "Class code is required and must be a string",
    });
  }

  if (!validateLength("class_code", class_code, MAX_LENGTHS.class_code)) {
    return res.status(400).json({
      success: false,
      message: `Class code must be between 1 and ${MAX_LENGTHS.class_code} characters`,
    });
  }

  next();
};

/**
 * Validate course input
 */
export const validateCourseInput = (req: Request, res: Response, next: NextFunction) => {
  const { code, name } = req.body;

  if (!code || typeof code !== "string") {
    return res.status(400).json({
      success: false,
      message: "Course code is required and must be a string",
    });
  }

  if (!name || typeof name !== "string") {
    return res.status(400).json({
      success: false,
      message: "Course name is required and must be a string",
    });
  }

  if (!validateLength("course_code", code, MAX_LENGTHS.course_code)) {
    return res.status(400).json({
      success: false,
      message: `Course code must be between 1 and ${MAX_LENGTHS.course_code} characters`,
    });
  }

  if (!validateLength("course_name", name, MAX_LENGTHS.course_name)) {
    return res.status(400).json({
      success: false,
      message: `Course name must be between 1 and ${MAX_LENGTHS.course_name} characters`,
    });
  }

  next();
};

/**
 * Validate session input
 */
export const validateSessionInput = (req: Request, res: Response, next: NextFunction) => {
  const { day, slot, room, instructor } = req.body;

  if (day && typeof day === "string" && !validateLength("day", day, MAX_LENGTHS.day)) {
    return res.status(400).json({
      success: false,
      message: `Day must be between 1 and ${MAX_LENGTHS.day} characters`,
    });
  }

  if (slot !== undefined) {
    const slotNum = typeof slot === "number" ? slot : parseInt(String(slot), 10);
    if (isNaN(slotNum) || slotNum < 1 || slotNum > 10 || !Number.isInteger(slotNum)) {
      return res.status(400).json({
        success: false,
        message: "Slot must be an integer between 1 and 10",
      });
    }
  }

  if (room && typeof room === "string" && !validateLength("room", room, MAX_LENGTHS.room)) {
    return res.status(400).json({
      success: false,
      message: `Room must be between 1 and ${MAX_LENGTHS.room} characters`,
    });
  }

  if (instructor && typeof instructor === "string" && !validateLength("instructor", instructor, MAX_LENGTHS.instructor)) {
    return res.status(400).json({
      success: false,
      message: `Instructor must be between 1 and ${MAX_LENGTHS.instructor} characters`,
    });
  }

  next();
};

/**
 * Validate ID parameter
 */
export const validateIdParam = (paramName: string = "id") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    const validatedId = validateId(id);

    if (!validatedId) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName}: must be a positive integer`,
      });
    }

    // Store validated ID in request for use in controllers
    (req as any).validatedId = validatedId;
    next();
  };
};

/**
 * Sanitize query parameters (for course IDs, etc.)
 */
export const sanitizeQueryArray = (paramName: string, maxItems: number = 100) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const param = req.query[paramName];
    
    if (!param) {
      next();
      return;
    }

    if (typeof param !== "string") {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} parameter format`,
      });
    }

    const items = param.split(",").map(item => item.trim()).filter(item => item);
    
    if (items.length > maxItems) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${maxItems} items allowed for ${paramName}`,
      });
    }

    // Validate each item is a valid integer
    const validatedItems: number[] = [];
    for (const item of items) {
      const id = validateId(item);
      if (!id) {
        return res.status(400).json({
          success: false,
          message: `Invalid item in ${paramName}: ${item} is not a valid ID`,
        });
      }
      validatedItems.push(id);
    }

    // Store sanitized array in request
    (req as any)[`sanitized_${paramName}`] = validatedItems;
    next();
  };
};
