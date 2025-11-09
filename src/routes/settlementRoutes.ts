import { Router } from 'express';
import { 
  generateMonthlySettlements,
  getPendingSettlements,
  markSettlementPaid,
  getOwnerSettlements,
  getSettlementStats
} from '../controllers/settlementController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Admin routes
router.post('/generate', authenticate, authorize(['admin']), generateMonthlySettlements);
router.get('/pending', authenticate, authorize(['admin']), getPendingSettlements);
router.put('/:settlementId/pay', authenticate, authorize(['admin']), markSettlementPaid);
router.get('/stats', authenticate, authorize(['admin']), getSettlementStats);

// Owner routes
router.get('/my-settlements', authenticate, authorize(['hostel_owner']), getOwnerSettlements);

export default router;