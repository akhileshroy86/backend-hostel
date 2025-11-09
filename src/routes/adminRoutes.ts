import { Router } from 'express';
import { 
  getAdminStats,
  getUsers,
  getHostels,
  getAnalytics,
  verifyHostel,
  getBookings,
  getCommissionSettings,
  updateCommissionSettings,
  getAllUsers,
  getAllHostels,
  approveHostel,
  rejectHostel,
  getAllSettlements
} from '../controllers/adminController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.get('/stats', authenticate, authorize(['admin']), getAdminStats);
router.get('/users', authenticate, authorize(['admin']), getAllUsers);
router.get('/hostels', authenticate, authorize(['admin']), getAllHostels);
router.put('/hostels/:id/approve', authenticate, authorize(['admin']), approveHostel);
router.put('/hostels/:id/reject', authenticate, authorize(['admin']), rejectHostel);
router.get('/settlements', authenticate, authorize(['admin']), getAllSettlements);
router.put('/hostels/:hostelId/verify', authenticate, authorize(['admin']), verifyHostel);
router.get('/bookings', authenticate, authorize(['admin']), getBookings);
router.get('/analytics', authenticate, authorize(['admin']), getAnalytics);
router.get('/commission', authenticate, authorize(['admin']), getCommissionSettings);
router.put('/commission', authenticate, authorize(['admin']), updateCommissionSettings);

export default router;