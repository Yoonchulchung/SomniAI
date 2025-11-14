/**
 * Authentication Controller
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../types';
import authService from '../services/authService';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  /**
   * Register new user
   */
  async register(req: Request, res: Response) {
    try {
      const { email, password, username } = req.body;

      if (!email || !password || !username) {
        const response: ApiResponse = {
          success: false,
          error: 'Email, password, and username are required',
        };
        return res.status(400).json(response);
      }

      const user = await authService.register(email, password, username);

      const response: ApiResponse = {
        success: true,
        data: user,
        message: 'User registered successfully',
      };

      return res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };

      return res.status(400).json(response);
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        const response: ApiResponse = {
          success: false,
          error: 'Email and password are required',
        };
        return res.status(400).json(response);
      }

      const result = await authService.login(email, password);

      // Set cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Login successful',
      };

      return res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };

      return res.status(401).json(response);
    }
  }

  /**
   * Logout user
   */
  async logout(_req: Request, res: Response) {
    res.clearCookie('token');

    const response: ApiResponse = {
      success: true,
      message: 'Logout successful',
    };

    return res.json(response);
  }

  /**
   * Get current user
   */
  async me(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Not authenticated',
        };
        return res.status(401).json(response);
      }

      const user = await authService.getUserById(req.user.id);

      const response: ApiResponse = {
        success: true,
        data: user,
      };

      return res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get user info',
      };

      return res.status(500).json(response);
    }
  }
}

export default new AuthController();
