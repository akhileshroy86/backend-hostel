import { Request, Response } from 'express';
import { User } from '../models/User';
import { Hostel } from '../models/Hostel';
import { Booking } from '../models/Booking';
import { Commission } from '../models/Commission';
import { Settlement } from '../models/Settlement';
import { Event } from '../models/Event';
import { AuthRequest } from '../middlewares/auth';
import { logger } from '../utils/logger';

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const [totalUsers, totalHostels, totalBookings, totalCommission] = await Promise.all([
      User.countDocuments(),
      Hostel.countDocuments(),
      Booking.countDocuments(),
      Commission.aggregate([
        { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
      ])
    ]);

    res.json({
      totalUsers,
      totalHostels,
      totalBookings,
      totalRevenue: totalCommission[0]?.total || 0
    });
  } catch (error) {
    logger.error('Admin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getHostels = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, verified, city } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = {};
    if (verified !== undefined) filter.verified = verified === 'true';
    if (city) filter['address.city'] = { $regex: city, $options: 'i' };

    const hostels = await Hostel.find(filter)
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Hostel.countDocuments(filter);

    res.json({
      hostels,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Get hostels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyHostel = async (req: Request, res: Response) => {
  try {
    const { hostelId } = req.params;
    const { verified } = req.body;

    const hostel = await Hostel.findByIdAndUpdate(
      hostelId,
      { verified },
      { new: true }
    );

    if (!hostel) {
      return res.status(404).json({ error: 'Hostel not found' });
    }

    res.json({ message: 'Hostel verification updated', hostel });
  } catch (error) {
    logger.error('Verify hostel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBookings = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status, from, to } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = {};
    if (status) filter.paymentStatus = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from as string);
      if (to) filter.createdAt.$lte = new Date(to as string);
    }

    const bookings = await Booking.find(filter)
      .populate('userId', 'name email')
      .populate('hostelId', 'name address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments(filter);

    res.json({
      bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Get bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const { from, to, groupBy = 'day' } = req.query;
    
    const matchStage: any = {};
    if (from || to) {
      matchStage.createdAt = {};
      if (from) matchStage.createdAt.$gte = new Date(from as string);
      if (to) matchStage.createdAt.$lte = new Date(to as string);
    }

    const dateFormat = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';

    const [userSignups, bookingStats, revenueStats] = await Promise.all([
      User.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Booking.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
            count: { $sum: 1 },
            revenue: { $sum: '$priceTotal' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Commission.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
            commission: { $sum: '$commissionAmount' },
            ownerPayout: { $sum: '$ownerPayout' }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      userSignups,
      bookingStats,
      revenueStats
    });
  } catch (error) {
    logger.error('Get analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCommissionSettings = async (req: Request, res: Response) => {
  try {
    const commissionRate = process.env.COMMISSION_RATE || '15';
    res.json({ commissionRate: parseFloat(commissionRate) });
  } catch (error) {
    logger.error('Get commission settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCommissionSettings = async (req: Request, res: Response) => {
  try {
    const { commissionRate } = req.body;
    
    if (!commissionRate || commissionRate < 0 || commissionRate > 50) {
      return res.status(400).json({ error: 'Invalid commission rate' });
    }

    // In production, this would update environment variables or database config
    process.env.COMMISSION_RATE = commissionRate.toString();
    
    res.json({ message: 'Commission rate updated', commissionRate });
  } catch (error) {
    logger.error('Update commission settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOwnerDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = req.user._id;
    const hostels = await Hostel.find({ ownerId });
    const hostelIds = hostels.map(h => h._id);
    
    const bookings = await Booking.find({ hostel: { $in: hostelIds } });
    const totalRevenue = bookings.reduce((sum, b) => sum + b.priceTotal, 0);
    
    // Get hostel view analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeSearchers = await Event.countDocuments({
      eventType: 'view_property',
      'payload.hostelId': { $in: hostelIds.map(id => id.toString()) },
      createdAt: { $gte: today }
    });
    
    res.json({
      totalProperties: hostels.length,
      totalBookings: bookings.length,
      totalRevenue,
      activeSearchers
    });
  } catch (error) {
    logger.error('Owner dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOwnerAnalytics = async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params;
    const hostels = await Hostel.find({ ownerId });
    const hostelIds = hostels.map(h => h._id);
    
    const bookings = await Booking.find({ hostelId: { $in: hostelIds } })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });
    
    // Get property view analytics
    const propertyViews = await Event.aggregate([
      {
        $match: {
          eventType: 'view_property',
          'payload.hostelId': { $in: hostelIds.map(id => id.toString()) }
        }
      },
      {
        $group: {
          _id: '$payload.hostelId',
          viewCount: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          hostelId: '$_id',
          viewCount: 1,
          uniqueUserCount: { $size: '$uniqueUsers' }
        }
      }
    ]);
    
    res.json({ bookings, propertyViews });
  } catch (error) {
    logger.error('Owner analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOwnerBookings = async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params;
    const hostels = await Hostel.find({ ownerId });
    const hostelIds = hostels.map(h => h._id);
    
    const bookings = await Booking.find({ hostelId: { $in: hostelIds } })
      .populate('userId', 'name email')
      .populate('hostelId', 'name')
      .sort({ createdAt: -1 });
    
    res.json({ bookings });
  } catch (error) {
    logger.error('Owner bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { paymentStatus: status },
      { new: true }
    );
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json({ message: 'Booking status updated', booking });
  } catch (error) {
    logger.error('Update booking status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOwnerProperties = async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params;
    const hostels = await Hostel.find({ ownerId });
    res.json({ hostels });
  } catch (error) {
    logger.error('Owner properties error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateRoomPricing = async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const { pricing } = req.body;
    
    const hostel = await Hostel.findByIdAndUpdate(
      propertyId,
      { 'rooms.$.pricing': pricing },
      { new: true }
    );
    
    if (!hostel) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    res.json({ message: 'Pricing updated', hostel });
  } catch (error) {
    logger.error('Update room pricing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllHostels = async (req: AuthRequest, res: Response) => {
  try {
    const hostels = await Hostel.find().populate('ownerId', 'name email').sort({ createdAt: -1 });
    res.json({ hostels });
  } catch (error) {
    logger.error('Get all hostels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveHostel = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await Hostel.findByIdAndUpdate(id, { verified: true });
    res.json({ message: 'Hostel approved successfully' });
  } catch (error) {
    logger.error('Approve hostel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectHostel = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await Hostel.findByIdAndUpdate(id, { verified: false });
    res.json({ message: 'Hostel rejected successfully' });
  } catch (error) {
    logger.error('Reject hostel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllSettlements = async (req: AuthRequest, res: Response) => {
  try {
    const settlements = await Settlement.find().populate('ownerId', 'name email').sort({ createdAt: -1 });
    res.json({ settlements });
  } catch (error) {
    logger.error('Get all settlements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};