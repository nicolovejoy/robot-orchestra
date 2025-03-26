import { Request, Response, NextFunction } from "express";
import * as userRepository from "../repositories/userRepository";
import { generateToken } from "../utils/auth";
import { ApplicationError } from "../middleware/errorHandler";

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new ApplicationError("User with this email already exists", 400);
    }

    // Create new user
    const user = await userRepository.createUser({
      name,
      email,
      password,
    });

    // Generate JWT token
    const token = generateToken(user);

    // Return success response with token
    res.status(201).json({
      status: "success",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    // Validate credentials
    const user = await userRepository.validateCredentials(email, password);

    if (!user) {
      throw new ApplicationError("Invalid email or password", 401);
    }

    // Generate JWT token
    const token = generateToken(user);

    // Send response with token
    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user info
 * GET /api/auth/me
 */
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // User is already attached to request by auth middleware
    const userId = req.user?.id;

    if (!userId) {
      throw new ApplicationError("User ID not found in request", 401);
    }

    // Get user from database
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApplicationError("User not found", 404);
    }

    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
