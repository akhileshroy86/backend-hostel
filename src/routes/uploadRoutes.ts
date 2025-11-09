import { Router } from 'express';
import { uploadImage, handleImageUpload } from '../controllers/uploadController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/upload', authenticate, uploadImage, handleImageUpload);

export default router;