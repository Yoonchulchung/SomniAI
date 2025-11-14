/**
 * API Routes Index
 */

import { Router } from 'express';
import healthRoutes from './health';
import statsRoutes from './stats';
import mqttRoutes from './mqtt';
import authRoutes from './auth';
import descriptionRoutes from './description';

const router = Router();

// Mount routes
router.use('/health', healthRoutes);
router.use('/stats', statsRoutes);
router.use('/mqtt', mqttRoutes);
router.use('/auth', authRoutes);
router.use('/descriptions', descriptionRoutes);

export default router;
