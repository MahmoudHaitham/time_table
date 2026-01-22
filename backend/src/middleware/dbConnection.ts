import { Request, Response, NextFunction } from "express";
import { ensureDbConnection } from "../utils/dbConnection";

/**
 * Middleware to ensure database connection before handling requests
 * Automatically attempts to reconnect if connection is lost
 */
export const ensureDatabaseConnection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const isReady = await ensureDbConnection();
    if (!isReady) {
      return res.status(503).json({
        success: false,
        message: "Database connection not available. Please try again later.",
      });
    }
    next();
  } catch (error: any) {
    console.error("[ensureDatabaseConnection middleware] Error:", error.message);
    return res.status(503).json({
      success: false,
      message: "Database connection error. Please try again later.",
    });
  }
};
