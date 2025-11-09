import express from 'express';
import { 
  getPendingPayments, 
  processMonthlyPayment, 
  closeHostelDates, 
  getClosedDates 
} from '../controllers/monthlyPaymentController';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// Get pending payments for user
router.get('/pending', authenticate, getPendingPayments);

// Process monthly payment
router.post('/pay/:paymentId', authenticate, processMonthlyPayment);

// Close hostel dates (for owners)
router.post('/close-dates', authenticate, closeHostelDates);

// Get closed dates for hostel
router.get('/closed-dates/:hostelId/:roomId', getClosedDates);

export default router;