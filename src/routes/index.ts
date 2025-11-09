import { Router } from 'express';
import authRoutes from './authRoutes';
import hostelRoutes from './hostelRoutes';
import bookingRoutes from './bookingRoutes';
import reviewRoutes from './reviewRoutes';
import analyticsRoutes from './analyticsRoutes';
import settlementRoutes from './settlementRoutes';
import adminRoutes from './adminRoutes';
import uploadRoutes from './uploadRoutes';
import monthlyPaymentRoutes from './monthlyPaymentRoutes';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

router.use('/auth', authRoutes);
router.use('/hostels', hostelRoutes);
router.use('/bookings', bookingRoutes);
router.use('/reviews', reviewRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/settlements', settlementRoutes);
router.use('/admin', adminRoutes);
router.use('/monthly-payments', monthlyPaymentRoutes);
router.use('/', uploadRoutes);

export default router;