import { Router } from 'express';
import { createReview, getHostelReviews, updateReview, deleteReview } from '../controllers/reviewController';
import { authenticate } from '../middlewares/auth';
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });
const router = Router();

router.post('/', authenticate, upload.array('images', 5), createReview);
router.get('/hostel/:hostelId', getHostelReviews);
router.put('/:id', authenticate, updateReview);
router.delete('/:id', authenticate, deleteReview);

export default router;