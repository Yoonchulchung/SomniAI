/**
 * MQTT Routes
 */

import { Router } from 'express';
import mqttController from '../controllers/mqttController';

const router = Router();

/**
 * @route   POST /api/mqtt/publish
 * @desc    Publish message to MQTT topic
 * @access  Public
 */
router.post('/publish', mqttController.publish);

/**
 * @route   POST /api/mqtt/subscribe
 * @desc    Subscribe to MQTT topic
 * @access  Public
 */
router.post('/subscribe', mqttController.subscribe);

/**
 * @route   POST /api/mqtt/unsubscribe
 * @desc    Unsubscribe from MQTT topic
 * @access  Public
 */
router.post('/unsubscribe', mqttController.unsubscribe);

/**
 * @route   GET /api/mqtt/messages
 * @desc    Get recent MQTT messages
 * @access  Public
 */
router.get('/messages', mqttController.getMessages);

/**
 * @route   GET /api/mqtt/status
 * @desc    Get MQTT connection status
 * @access  Public
 */
router.get('/status', mqttController.getStatus);

export default router;
