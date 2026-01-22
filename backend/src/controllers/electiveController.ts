import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { ElectivesAllowed } from "../entities/ElectivesAllowed";
import { Term } from "../entities/Term";
import { Course } from "../entities/Course";

/**
 * Set allowed electives for a term
 */
export const setElectives = async (req: Request, res: Response) => {
  try {
    const { termId } = req.params;
    const { course_ids } = req.body; // Array of course IDs

    // Validate termId exists
    if (!termId || (typeof termId === "string" && termId.trim() === "")) {
      return res.status(400).json({
        success: false,
        message: "Invalid term ID: termId parameter is missing or empty",
      });
    }

    // Parse and validate termId
    const parsedTermId = typeof termId === "string" ? parseInt(termId.trim(), 10) : parseInt(String(termId), 10);
    if (isNaN(parsedTermId) || parsedTermId <= 0 || !Number.isInteger(parsedTermId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid term ID: "${termId}" cannot be parsed as a positive integer`,
      });
    }

    if (!Array.isArray(course_ids)) {
      return res.status(400).json({
        success: false,
        message: "course_ids must be an array",
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

    // Verify all courses exist and are electives
    const courseRepo = AppDataSource.getRepository(Course);
    if (course_ids.length > 0) {
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

      // Verify all are electives
      const nonElectives = courses.filter((c) => !c.is_elective);
      if (nonElectives.length > 0) {
        return res.status(400).json({
          success: false,
          message: `The following courses are not electives: ${nonElectives.map((c) => c.code).join(", ")}`,
        });
      }
    }

    const electiveRepo = AppDataSource.getRepository(ElectivesAllowed);

    // Delete existing electives for this term
    await electiveRepo.delete({ term_id: parsedTermId });

    // Create new electives
    const created: ElectivesAllowed[] = [];

    for (const courseId of course_ids) {
      const elective = electiveRepo.create({
        term_id: parsedTermId,
        course_id: courseId,
      });

      await electiveRepo.save(elective);
      created.push(elective);
    }

    return res.json({
      success: true,
      data: created,
      message: `Set ${created.length} elective(s) for term`,
    });
  } catch (error) {
    console.error("Error setting electives:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Get allowed electives for a term
 */
export const getElectives = async (req: Request, res: Response) => {
  try {
    console.log(`[getElectives] Request received:`, {
      params: req.params,
      query: req.query,
      url: req.url,
      path: req.path,
      method: req.method,
    });
    
    const { termId } = req.params;
    console.log(`[getElectives] Extracted termId:`, { termId, type: typeof termId, params: req.params });

    // Validate termId exists
    if (!termId || (typeof termId === "string" && termId.trim() === "")) {
      console.error(`[getElectives] termId parameter is missing or empty:`, {
        termId,
        params: req.params,
        url: req.url,
      });
      return res.status(400).json({
        success: false,
        message: "Invalid term ID: termId parameter is missing or empty",
      });
    }

    // Parse and validate termId
    const parsedTermId = typeof termId === "string" ? parseInt(termId.trim(), 10) : parseInt(String(termId), 10);
    console.log(`[getElectives] Parsed termId:`, { termId, parsedTermId, isNaN: isNaN(parsedTermId) });
    
    if (isNaN(parsedTermId) || parsedTermId <= 0 || !Number.isInteger(parsedTermId)) {
      console.error(`[getElectives] Invalid parsedTermId:`, {
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

    console.log(`[getElectives] Querying database for electives with termId:`, parsedTermId);
    const electiveRepo = AppDataSource.getRepository(ElectivesAllowed);
    const electives = await electiveRepo.find({
      where: { term_id: parsedTermId },
      relations: ["course"],
    });

    console.log(`[getElectives] Successfully found electives:`, { count: electives.length, termId: parsedTermId });
    return res.json({
      success: true,
      data: electives,
    });
  } catch (error: any) {
    console.error(`[getElectives] Exception caught:`, {
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

