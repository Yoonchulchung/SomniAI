/**
 * Description Routes
 */

import { Router } from 'express';
import descriptionController from '../controllers/descriptionController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/descriptions
 * @desc    Get all descriptions
 * @access  Public (only published for non-admin)
 */
router.get('/', descriptionController.getAll);

/**
 * @route   GET /api/descriptions/:id
 * @desc    Get description by ID
 * @access  Public (only published for non-admin)
 */
router.get('/:id', descriptionController.getById);

/**
 * @route   POST /api/descriptions
 * @desc    Create new description
 * @access  Private (Admin only)
 */
router.post('/', authenticateToken, requireAdmin, descriptionController.create);

/**
 * @route   PUT /api/descriptions/:id
 * @desc    Update description
 * @access  Private (Admin only)
 */
router.put('/:id', authenticateToken, requireAdmin, descriptionController.update);

/**
 * @route   POST /api/descriptions/:id/publish
 * @desc    Publish description
 * @access  Private (Admin only)
 */
router.post('/:id/publish', authenticateToken, requireAdmin, descriptionController.publish);

/**
 * @route   POST /api/descriptions/:id/unpublish
 * @desc    Unpublish description
 * @access  Private (Admin only)
 */
router.post('/:id/unpublish', authenticateToken, requireAdmin, descriptionController.unpublish);

/**
 * @route   DELETE /api/descriptions/:id
 * @desc    Delete description
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticateToken, requireAdmin, descriptionController.delete);

/**
 * @route   GET /api/descriptions/:id/history
 * @desc    Get description history
 * @access  Private (Admin only)
 */
router.get('/:id/history', authenticateToken, requireAdmin, descriptionController.getHistory);

export default router;
