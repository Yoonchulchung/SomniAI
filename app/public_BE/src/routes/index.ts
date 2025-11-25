/**
 * API Routes Index
 */

import { Router } from 'express';
import healthRoutes from './health';
import statsRoutes from './stats';
import mqttRoutes from './mqtt';
import authRoutes from './auth';
import descriptionRoutes from './description';
import systemRoutes from './system';
import inferenceRoutes from './inference';

const router = Router();

// Mount routes
router.use('/health', healthRoutes);
router.use('/stats', statsRoutes);
router.use('/mqtt', mqttRoutes);
router.use('/auth', authRoutes);
router.use('/descriptions', descriptionRoutes);
router.use('/inference', inferenceRoutes);
router.use('/system', systemRoutes);

export default router;
