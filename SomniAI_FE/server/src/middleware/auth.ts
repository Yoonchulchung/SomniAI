/**
 * Authentication Middleware
 * JWT-based authentication
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { ApiResponse } from '../types';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Verify JWT token
 */
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1] || req.cookies?.token;

    if (!token) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication required',
      };
      return res.status(401).json(response);
    }

    // Verify token
    jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
      if (err) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid or expired token',
        };
        return res.status(403).json(response);
      }

      req.user = decoded as { id: string; email: string; role: string };
      next();
    });
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Authentication failed',
    };
    res.status(500).json(response);
  }
};

/**
 * Check if user is admin
 */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'ADMIN') {
    const response: ApiResponse = {
      success: false,
      error: 'Admin access required',
    };
    return res.status(403).json(response);
  }

  next();
};
