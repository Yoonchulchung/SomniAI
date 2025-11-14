/**
 * API Routes Index
 */

import { Router } from 'express';
import healthRoutes from './health';
import statsRoutes from './stats';
import mqttRoutes from './mqtt';

const router = Router();

// Mount routes
router.use('/health', healthRoutes);
router.use('/stats', statsRoutes);
router.use('/mqtt', mqttRoutes);

export default router;
