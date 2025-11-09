import { Router } from 'express';
import { 
  createBooking, 
  confirmPayment, 
  getUserBookings, 
  getBookingById, 
  cancelBooking 
} from '../controllers/bookingController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/', authenticate, createBooking);
router.post('/confirm-payment', authenticate, confirmPayment);
router.get('/my-bookings', authenticate, getUserBookings);
router.get('/:id', authenticate, getBookingById);
router.put('/:id/cancel', authenticate, cancelBooking);

export default router;