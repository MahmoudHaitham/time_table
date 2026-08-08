import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { GenerationLog } from "../entities/GenerationLog";

export interface SaveGenerationLogParams {
  user_name: string;
  flow_type: "system" | "other";
  term_display: string;
  electives_selected: string | null;
  core_selected: string | null;
  result_summary: string;
  result_json?: Record<string, unknown> | null;
}

/**
 * Save a generation log (called from timetableViewController after successful generation)
 */
export async function saveGenerationLog(params: SaveGenerationLogParams): Promise<void> {
  try {
    if (!AppDataSource.isInitialized) {
      return;
    }
    const repo = AppDataSource.getRepository(GenerationLog);
    const log = repo.create({
      user_name: params.user_name.trim().slice(0, 200),
      flow_type: params.flow_type,
      term_display: params.term_display.slice(0, 200),
      electives_selected: params.electives_selected?.slice(0, 10000) ?? null,
      core_selected: params.core_selected?.slice(0, 10000) ?? null,
      result_summary: params.result_summary.slice(0, 500),
      result_json: params.result_json ?? null,
    });
    await repo.save(log);
  } catch (err) {
    console.warn("[GenerationLog] Failed to save log:", (err as Error)?.message);
  }
}

/**
 * GET /api/generation-logs - List all generation logs (admin only)
 */
export async function getGenerationLogs(req: Request, res: Response): Promise<void> {
  try {
    const repo = AppDataSource.getRepository(GenerationLog);
    const logs = await repo.find({
      order: { generated_at: "DESC" },
      take: 500,
    });
    res.json({
      success: true,
      data: logs,
    });
  } catch (err) {
    console.error("[GenerationLog] getGenerationLogs error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}
