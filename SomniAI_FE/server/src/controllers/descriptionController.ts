/**
 * Description Controller
 * Handles Notion-like description documents
 */

import { Response } from 'express';
import { ApiResponse } from '../types';
import descriptionService from '../services/descriptionService';
import { AuthRequest } from '../middleware/auth';

export class DescriptionController {
  /**
   * Get all descriptions
   */
  async getAll(req: AuthRequest, res: Response) {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      const descriptions = await descriptionService.getAll(isAdmin);

      const response: ApiResponse = {
        success: true,
        data: descriptions,
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch descriptions',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get description by ID
   */
  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const isAdmin = req.user?.role === 'ADMIN';

      const description = await descriptionService.getById(id, isAdmin);

      const response: ApiResponse = {
        success: true,
        data: description,
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch description',
      };

      res.status(404).json(response);
    }
  }

  /**
   * Create new description
   */
  async create(req: AuthRequest, res: Response) {
    try {
      const { title, content } = req.body;

      if (!title) {
        const response: ApiResponse = {
          success: false,
          error: 'Title is required',
        };
        return res.status(400).json(response);
      }

      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        return res.status(401).json(response);
      }

      const description = await descriptionService.create({
        title,
        content: content || {},
        authorId: req.user.id,
      });

      const response: ApiResponse = {
        success: true,
        data: description,
        message: 'Description created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create description',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Update description
   */
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { title, content } = req.body;

      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        return res.status(401).json(response);
      }

      const description = await descriptionService.update(id, {
        title,
        content,
        authorId: req.user.id,
      });

      const response: ApiResponse = {
        success: true,
        data: description,
        message: 'Description updated successfully',
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update description',
      };

      const statusCode = error instanceof Error && error.message === 'Unauthorized' ? 403 : 500;
      res.status(statusCode).json(response);
    }
  }

  /**
   * Publish description
   */
  async publish(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        return res.status(401).json(response);
      }

      const description = await descriptionService.publish(id, req.user.id);

      const response: ApiResponse = {
        success: true,
        data: description,
        message: 'Description published successfully',
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish description',
      };

      const statusCode = error instanceof Error && error.message === 'Unauthorized' ? 403 : 500;
      res.status(statusCode).json(response);
    }
  }

  /**
   * Unpublish description
   */
  async unpublish(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        return res.status(401).json(response);
      }

      const description = await descriptionService.unpublish(id, req.user.id);

      const response: ApiResponse = {
        success: true,
        data: description,
        message: 'Description unpublished successfully',
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unpublish description',
      };

      const statusCode = error instanceof Error && error.message === 'Unauthorized' ? 403 : 500;
      res.status(statusCode).json(response);
    }
  }

  /**
   * Delete description
   */
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        return res.status(401).json(response);
      }

      await descriptionService.delete(id, req.user.id);

      const response: ApiResponse = {
        success: true,
        message: 'Description deleted successfully',
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete description',
      };

      const statusCode = error instanceof Error && error.message === 'Unauthorized' ? 403 : 500;
      res.status(statusCode).json(response);
    }
  }

  /**
   * Get description history
   */
  async getHistory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        return res.status(401).json(response);
      }

      const history = await descriptionService.getHistory(id, req.user.id);

      const response: ApiResponse = {
        success: true,
        data: history,
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch history',
      };

      const statusCode = error instanceof Error && error.message === 'Unauthorized' ? 403 : 500;
      res.status(statusCode).json(response);
    }
  }
}

export default new DescriptionController();
