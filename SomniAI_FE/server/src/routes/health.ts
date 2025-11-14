/**
 * Health Routes
 */

import { Router } from 'express';
import healthController from '../controllers/healthController';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Health check
 * @access  Public
 */
router.get('/', healthController.health);

/**
 * @route   GET /api/health/status
 * @desc    System status
 * @access  Public
 */
router.get('/status', healthController.status);

export default router;
