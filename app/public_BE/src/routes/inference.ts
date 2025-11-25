import { Router } from 'express';
import multer from 'multer';
import inferController from '../controllers/inferController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('image'), inferController.upload);
router.get('/view', inferController.view);

export default router;