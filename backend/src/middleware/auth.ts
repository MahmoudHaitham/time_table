import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";

// Require JWT_SECRET to be set in environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    "JWT_SECRET environment variable must be set and be at least 32 characters long. " +
    "This is required for security. Please set it in your .env file."
  );
}

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    registrationNumber: string;
    role: string;
  };
}

/**
 * Verify JWT token
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (req as AuthRequest).user = {
        userId: decoded.userId,
        registrationNumber: decoded.registrationNumber,
        role: decoded.role,
      };
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
};

/**
 * Require admin role - verifies role from database
 * Async wrapper to handle database queries
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as AuthRequest).user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // Verify user role from database to prevent token tampering
  (async () => {
    try {
      const userRepo = AppDataSource.getRepository(User);
      const dbUser = await userRepo.findOne({
        where: { id: user.userId },
        select: ["id", "role"],
      });

      if (!dbUser) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      if (dbUser.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin access required",
        });
      }

      // Update req.user with verified role
      (req as AuthRequest).user = {
        ...user,
        role: dbUser.role,
      };

      next();
    } catch (error) {
      console.error("Error verifying admin role:", error);
      return res.status(500).json({
        success: false,
        message: "Authorization error",
      });
    }
  })().catch((error) => {
    console.error("Error in requireAdmin middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Authorization error",
    });
  });
};

