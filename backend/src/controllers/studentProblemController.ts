import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { StudentProblem } from "../entities/StudentProblem";

const VALID_TERMS = ["4", "5", "6", "7", "8", "9", "10", "other"] as const;

/**
 * POST /api/problems - Submit a problem report (student, public)
 * Body: { name, registration_number, northampton: "yes"|"no", term: "4"|"5"|...|"10"|"other", description }
 */
export async function createProblem(req: Request, res: Response): Promise<void> {
  try {
    const { name, registration_number, northampton, term, description } = req.body;

    const trimmedName = name && typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      res.status(400).json({ success: false, message: "Name is required." });
      return;
    }
    if (!trimmedName.includes(" ")) {
      res.status(400).json({ success: false, message: "Please enter both first and last name (at least one space)." });
      return;
    }
    const regNum = registration_number && typeof registration_number === "string" ? registration_number.trim() : "";
    if (!regNum) {
      res.status(400).json({ success: false, message: "Registration number is required." });
      return;
    }
    if (!/^\d{8}$|^\d{9}$/.test(regNum)) {
      res.status(400).json({ success: false, message: "Registration number must be exactly 8 or 9 digits only." });
      return;
    }
    const northamptonVal = northampton === "yes" || northampton === "no" ? northampton : null;
    if (!northamptonVal) {
      res.status(400).json({ success: false, message: "Northampton must be 'yes' or 'no'." });
      return;
    }
    const termVal = term && typeof term === "string" ? term.trim().toLowerCase() : "";
    if (!termVal || !VALID_TERMS.includes(termVal as (typeof VALID_TERMS)[number])) {
      res.status(400).json({ success: false, message: "Term must be one of: 4, 5, 6, 7, 8, 9, 10, other." });
      return;
    }
    if (!description || typeof description !== "string" || description.trim().length === 0) {
      res.status(400).json({ success: false, message: "Full description of problem is required." });
      return;
    }

    const repo = AppDataSource.getRepository(StudentProblem);
    const problem = repo.create({
      name: trimmedName.slice(0, 200),
      registration_number: regNum,
      northampton: northamptonVal,
      term: termVal,
      description: description.trim(),
    });
    await repo.save(problem);

    res.status(201).json({
      success: true,
      message: "Your problem report has been submitted. We will address it as soon as possible.",
      data: { id: problem.id },
    });
  } catch (err) {
    console.error("[StudentProblem] createProblem error:", err);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
}

const VALID_STATUSES = ["pending", "solved", "not_solved"] as const;

/**
 * GET /api/problems - List all problem reports (admin only)
 * Sorted by created_at ASC so first submitted = served first.
 */
export async function getProblems(req: Request, res: Response): Promise<void> {
  try {
    const repo = AppDataSource.getRepository(StudentProblem);
    const problems = await repo.find({
      order: { created_at: "ASC" },
      take: 1000,
    });
    res.json({
      success: true,
      data: problems,
    });
  } catch (err) {
    console.error("[StudentProblem] getProblems error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/**
 * PATCH /api/problems/:id - Update problem status (admin only)
 * Body: { status: "pending" | "solved" | "not_solved" }
 */
export async function updateProblemStatus(req: Request, res: Response): Promise<void> {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(idParam ?? "", 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid problem ID." });
      return;
    }
    const { status } = req.body;
    const statusVal = status && typeof status === "string" ? status.trim().toLowerCase() : "";
    if (!statusVal || !VALID_STATUSES.includes(statusVal as (typeof VALID_STATUSES)[number])) {
      res.status(400).json({ success: false, message: "Status must be one of: pending, solved, not_solved." });
      return;
    }

    const repo = AppDataSource.getRepository(StudentProblem);
    const problem = await repo.findOne({ where: { id } });
    if (!problem) {
      res.status(404).json({ success: false, message: "Problem not found." });
      return;
    }
    problem.status = statusVal;
    await repo.save(problem);

    res.json({
      success: true,
      data: { id: problem.id, status: problem.status },
    });
  } catch (err) {
    console.error("[StudentProblem] updateProblemStatus error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}
