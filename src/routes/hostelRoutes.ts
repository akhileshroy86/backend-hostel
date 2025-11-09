import { Router } from 'express';
import { createHostel, getHostels, getHostelById, updateHostel, getOwnerHostels, updateRoomPrice } from '../controllers/hostelController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.post('/', authenticate, authorize(['hostel_owner', 'admin']), createHostel);
router.get('/', getHostels);
router.get('/owner', authenticate, getOwnerHostels);
router.get('/:id', getHostelById);
router.put('/:id', authenticate, updateHostel);
router.put('/:hostelId/rooms/:roomId/price', authenticate, updateRoomPrice);

export default router;