import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateCSRFToken } from "../middleware/csrf";

// Require JWT_SECRET to be set in environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    "JWT_SECRET environment variable must be set and be at least 32 characters long. " +
    "This is required for security. Please set it in your .env file."
  );
}

// Token expiration times
const ACCESS_TOKEN_EXPIRY = "15m"; // Short-lived access token
const REFRESH_TOKEN_EXPIRY = "7d"; // Long-lived refresh token

/**
 * Register a new admin user
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { registration_number, password, full_name } = req.body;

    if (!registration_number || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: "Registration number, password, and full name are required",
      });
    }

    const userRepo = AppDataSource.getRepository(User);

    // Check if user already exists
    const existingUser = await userRepo.findOne({
      where: { registration_number },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this registration number already exists",
      });
    }

    // Validate input length
    if (registration_number.length > 50 || full_name.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Input length exceeds maximum allowed",
      });
    }

    // Validate password strength
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 128 characters",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = userRepo.create({
      registration_number,
      password: hashedPassword,
      full_name,
      role: "admin",
    });

    await userRepo.save(user);

    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      { userId: user.id, registrationNumber: user.registration_number, role: user.role, type: "access" },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(
      { userId: user.id, type: "refresh" },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Generate CSRF token for authenticated user
    (req as any).user = { userId: user.id };
    generateCSRFToken(req, res);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: user.id,
          registration_number: user.registration_number,
          full_name: user.full_name,
          role: user.role,
        },
        token: accessToken,
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Login
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { registration_number, password } = req.body;

    if (!registration_number || !password) {
      return res.status(400).json({
        success: false,
        message: "Registration number and password are required",
      });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { registration_number },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Validate input length
    if (registration_number.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      { userId: user.id, registrationNumber: user.registration_number, role: user.role, type: "access" },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(
      { userId: user.id, type: "refresh" },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Generate CSRF token for authenticated user
    (req as any).user = { userId: user.id };
    generateCSRFToken(req, res);

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          registration_number: user.registration_number,
          full_name: user.full_name,
          role: user.role,
        },
        token: accessToken,
      },
    });
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: (req as any).user.userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        registration_number: user.registration_number,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error getting current user:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token required",
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;

      if (decoded.type !== "refresh") {
        return res.status(401).json({
          success: false,
          message: "Invalid token type",
        });
      }

      // Get user from database
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { id: decoded.userId },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { userId: user.id, registrationNumber: user.registration_number, role: user.role, type: "access" },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      return res.json({
        success: true,
        data: {
          token: accessToken,
        },
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }
  } catch (error) {
    console.error("Error refreshing token:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Logout - invalidate refresh token
 */
export const logout = async (req: Request, res: Response) => {
  try {
    // Clear refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // Note: Access tokens are stateless and cannot be invalidated server-side
    // They will expire naturally after 15 minutes
    // For production, consider implementing a token blacklist/revocation system

    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Error logging out:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

