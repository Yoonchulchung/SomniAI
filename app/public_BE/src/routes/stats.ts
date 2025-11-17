/**
 * Statistics Routes
 */

import { Router } from 'express';
import statsController from '../controllers/statsController';
import { cacheMiddleware } from '../middleware/cache';

const router = Router();

/**
 * @route   GET /api/stats
 * @desc    Get system statistics
 * @access  Public
 */
router.get('/', cacheMiddleware(30), statsController.getStats);

/**
 * @route   POST /api/stats
 * @desc    Update statistics
 * @access  Public
 */
router.post('/', statsController.updateStats);

/**
 * @route   POST /api/stats/frames/increment
 * @desc    Increment frame counter
 * @access  Public
 */
router.post('/frames/increment', statsController.incrementFrames);

export default router;
