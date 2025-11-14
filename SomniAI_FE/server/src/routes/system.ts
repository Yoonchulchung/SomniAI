/**
 * System Routes
 * System health and performance monitoring
 */

import express from 'express';
import systemController from '../controllers/systemController';

const router = express.Router();

/**
 * @route   GET /api/system/health
 * @desc    Get system health metrics
 * @access  Public
 */
router.get('/health', systemController.getHealth);

export default router;
