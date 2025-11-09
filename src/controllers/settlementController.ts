import { Response } from 'express';
import { Settlement } from '../models/Settlement';
import { Commission } from '../models/Commission';
import { User } from '../models/User';
import { AuthRequest } from '../middlewares/auth';
import { logger } from '../utils/logger';

export const generateMonthlySettlements = async (req: AuthRequest, res: Response) => {
  try {
    const { month, year } = req.body;
    
    // Get all pending commissions for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const commissions = await Commission.find({
      status: 'pending',
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('ownerId');

    // Group by owner
    const ownerCommissions = commissions.reduce((acc: any, commission) => {
      const ownerId = commission.ownerId._id.toString();
      if (!acc[ownerId]) {
        acc[ownerId] = {
          ownerId: commission.ownerId,
          commissions: []
        };
      }
      acc[ownerId].commissions.push(commission);
      return acc;
    }, {});

    const settlements = [];

    // Create settlements for each owner
    for (const ownerId in ownerCommissions) {
      const ownerData = ownerCommissions[ownerId];
      const ownerCommissions = ownerData.commissions;
      
      const totalBookings = ownerCommissions.length;
      const totalRevenue = ownerCommissions.reduce((sum: number, c: any) => sum + c.bookingAmount, 0);
      const totalCommission = ownerCommissions.reduce((sum: number, c: any) => sum + c.commissionAmount, 0);
      const netPayout = ownerCommissions.reduce((sum: number, c: any) => sum + c.ownerPayout, 0);

      // Check if settlement already exists
      const existingSettlement = await Settlement.findOne({
        ownerId,
        month,
        year
      });

      if (!existingSettlement && totalBookings > 0) {
        const settlement = new Settlement({
          ownerId,
          month,
          year,
          totalBookings,
          totalRevenue,
          totalCommission,
          netPayout
        });

        await settlement.save();
        settlements.push(settlement);

        // Mark commissions as settled
        await Commission.updateMany(
          { _id: { $in: ownerCommissions.map((c: any) => c._id) } },
          { status: 'settled' }
        );
      }
    }

    res.json({
      message: `Generated ${settlements.length} settlements for ${month}/${year}`,
      settlements
    });
  } catch (error) {
    logger.error('Generate settlements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPendingSettlements = async (req: AuthRequest, res: Response) => {
  try {
    const { month, year } = req.query;
    
    let query: any = { status: 'pending' };
    if (month && year) {
      query.month = parseInt(month as string);
      query.year = parseInt(year as string);
    }

    const settlements = await Settlement.find(query)
      .populate('ownerId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({ settlements });
  } catch (error) {
    logger.error('Get pending settlements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markSettlementPaid = async (req: AuthRequest, res: Response) => {
  try {
    const { settlementId } = req.params;
    const { paymentMethod, transactionId } = req.body;

    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    settlement.status = 'paid';
    settlement.paymentMethod = paymentMethod;
    settlement.transactionId = transactionId;
    settlement.settledAt = new Date();

    await settlement.save();

    res.json({
      message: 'Settlement marked as paid',
      settlement
    });
  } catch (error) {
    logger.error('Mark settlement paid error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOwnerSettlements = async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const settlements = await Settlement.find({ ownerId })
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await Settlement.countDocuments({ ownerId });

    res.json({
      settlements,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Get owner settlements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSettlementStats = async (req: AuthRequest, res: Response) => {
  try {
    const totalPending = await Settlement.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$netPayout' }, count: { $sum: 1 } } }
    ]);

    const totalPaid = await Settlement.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$netPayout' }, count: { $sum: 1 } } }
    ]);

    res.json({
      pending: totalPending[0] || { total: 0, count: 0 },
      paid: totalPaid[0] || { total: 0, count: 0 }
    });
  } catch (error) {
    logger.error('Get settlement stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};