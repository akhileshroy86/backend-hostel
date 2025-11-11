import { Router } from 'express';
import { trackEvent, getDashboardAnalytics, getOwnerAnalytics, trackOwnerResponse } from '../controllers/analyticsController';
import { 
  getOwnerDashboardStats, 
  getOwnerAnalytics as getOwnerAnalyticsAdmin,
  getOwnerBookings,
  updateBookingStatus,
  getOwnerProperties,
  updateRoomPricing,
  getAllUsers,
  getAllHostels,
  approveHostel,
  rejectHostel,
  getAllSettlements
} from '../controllers/adminController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.post('/events', trackEvent);
router.post('/owner/response', authenticate, authorize(['hostel_owner']), trackOwnerResponse);
router.get('/dashboard', authenticate, authorize(['admin']), getDashboardAnalytics);
router.get('/owner', authenticate, authorize(['hostel_owner']), getOwnerAnalytics);
router.get('/owner/dashboard', authenticate, authorize(['hostel_owner']), getOwnerAnalytics);
router.get('/owner/dashboard-stats', authenticate, authorize(['hostel_owner']), getOwnerDashboardStats);
router.get('/owner/bookings', authenticate, authorize(['hostel_owner']), getOwnerBookings);
router.get('/owner/analytics', authenticate, authorize(['hostel_owner']), getOwnerAnalytics);
router.put('/owner/bookings/:bookingId', authenticate, authorize(['hostel_owner']), updateBookingStatus);
router.get('/owner/:ownerId/analytics', authenticate, authorize(['hostel_owner']), getOwnerAnalyticsAdmin);
router.get('/owner/:ownerId/bookings', authenticate, authorize(['hostel_owner']), getOwnerBookings);
router.put('/owner/bookings/:bookingId', authenticate, authorize(['hostel_owner']), updateBookingStatus);
router.get('/owner/:ownerId/properties', authenticate, authorize(['hostel_owner']), getOwnerProperties);
router.put('/owner/properties/:propertyId/pricing', authenticate, authorize(['hostel_owner']), updateRoomPricing);


export default router;