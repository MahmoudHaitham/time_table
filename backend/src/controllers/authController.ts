import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

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

    // Generate token
    const token = jwt.sign(
      { userId: user.id, registrationNumber: user.registration_number, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

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
        token,
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

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, registrationNumber: user.registration_number, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

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
        token,
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

