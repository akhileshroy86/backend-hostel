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

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Booking routes working', timestamp: new Date() });
});

// Temporary: Remove auth for testing
router.post('/', createBooking);
// router.post('/', authenticate, createBooking);
// Temporary: Remove auth for testing
router.post('/confirm-payment', confirmPayment);
// router.post('/confirm-payment', authenticate, confirmPayment);
router.get('/my-bookings', authenticate, getUserBookings);
router.get('/:id', authenticate, getBookingById);
router.put('/:id/cancel', authenticate, cancelBooking);

export default router;