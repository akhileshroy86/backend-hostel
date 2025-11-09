import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { User } from '../models/User';
import { Booking } from '../models/Booking';
import { Hostel } from '../models/Hostel';
import { Commission } from '../models/Commission';
import { AuthRequest } from '../middlewares/auth';
import { logger } from '../utils/logger';

export const trackEvent = async (req: Request, res: Response) => {
  try {
    const { sessionId, eventType, payload, locationArea, device, source } = req.body;
    
    const event = new Event({
      userId: (req as any).user?._id,
      sessionId,
      eventType,
      payload,
      locationArea,
      device,
      source
    });

    await event.save();
    res.status(201).json({ message: 'Event tracked successfully' });
  } catch (error) {
    logger.error('Track event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDashboardAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { from, to } = req.query;
    const startDate = new Date(from as string);
    const endDate = new Date(to as string);

    // Daily Active Users
    const dauPipeline = [
      { $match: { eventType: 'open_app', createdAt: { $gte: startDate, $lte: endDate } } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
          count: { $addToSet: "$userId" } 
        } 
      },
      { $project: { _id: 1, count: { $size: "$count" } } },
      { $sort: { "_id": 1 } }
    ];

    // New Signups
    const signupsPipeline = [
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { "_id": 1 } }
    ];

    // Bookings
    const bookingsPipeline = [
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
          count: { $sum: 1 },
          revenue: { $sum: "$priceTotal" }
        } 
      },
      { $sort: { "_id": 1 } }
    ];

    // Area Distribution
    const areaPipeline = [
      { $match: { eventType: 'search', createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: "$locationArea", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ];

    const [dau, signups, bookings, areas] = await Promise.all([
      Event.aggregate(dauPipeline),
      User.aggregate(signupsPipeline),
      Booking.aggregate(bookingsPipeline),
      Event.aggregate(areaPipeline)
    ]);

    res.json({
      dau,
      signups,
      bookings,
      topAreas: areas
    });
  } catch (error) {
    logger.error('Dashboard analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOwnerAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = req.user._id;
    const { month, year } = req.query;

    // Get owner's hostels
    const hostels = await Hostel.find({ ownerId }).select('_id name');
    const hostelIds = hostels.map(h => h._id);

    // Monthly bookings and revenue
    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0);

    const bookings = await Booking.find({
      hostelId: { $in: hostelIds },
      createdAt: { $gte: startDate, $lte: endDate },
      paymentStatus: 'paid'
    });

    const commissions = await Commission.find({
      ownerId,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, b) => sum + b.priceTotal, 0);
    const totalCommission = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    const netPayout = commissions.reduce((sum, c) => sum + c.ownerPayout, 0);

    // App vs Direct bookings
    const appBookings = bookings.filter(b => b.source === 'app').length;
    const webBookings = bookings.filter(b => b.source === 'web').length;

    res.json({
      hostels: hostels.length,
      totalBookings,
      totalRevenue,
      totalCommission,
      netPayout,
      appBookings,
      webBookings,
      commissionRate: commissions[0]?.commissionRate || 15
    });
  } catch (error) {
    logger.error('Owner analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const trackOwnerResponse = async (req: AuthRequest, res: Response) => {
  try {
    const { responseTimeHours, context } = req.body;
    
    const event = new Event({
      userId: req.user._id,
      sessionId: Date.now().toString(),
      eventType: 'owner_response',
      payload: {
        responseTimeHours: responseTimeHours || 2,
        context: context || 'general'
      },
      device: 'web',
      source: 'web'
    });

    await event.save();
    res.status(201).json({ message: 'Response tracked successfully' });
  } catch (error) {
    logger.error('Track owner response error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOwnerDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = req.user._id;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get owner's hostels
    const hostels = await Hostel.find({ ownerId });
    const hostelIds = hostels.map(h => h._id);

    // Today's bookings
    const todayBookings = await Booking.countDocuments({
      hostelId: { $in: hostelIds },
      createdAt: { $gte: todayStart }
    });

    // Active searchers (users who viewed/clicked owner's properties in last 24 hours)
    const activeSearchers = await Event.distinct('userId', {
      eventType: { $in: ['view_property', 'click_property'] },
      'payload.hostelId': { $in: hostelIds.map(id => id.toString()) },
      createdAt: { $gte: last24Hours }
    });

    // Monthly revenue
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyBookings = await Booking.find({
      hostelId: { $in: hostelIds },
      createdAt: { $gte: monthStart },
      paymentStatus: 'paid'
    });
    const monthlyRevenue = monthlyBookings.reduce((sum, b) => sum + b.priceTotal, 0);

    // Calculate real occupancy rate
    const totalRooms = hostels.reduce((sum, hostel) => {
      return sum + hostel.rooms.reduce((roomSum: number, room: any) => roomSum + room.availabilityCount, 0);
    }, 0);
    
    const bookedRooms = await Booking.countDocuments({
      hostelId: { $in: hostelIds },
      checkInDate: { $lte: today },
      checkOutDate: { $gte: today },
      paymentStatus: 'paid'
    });
    
    const occupancyRate = totalRooms > 0 ? Math.round((bookedRooms / totalRooms) * 100) : 0;

    // Calculate real average rating from all hostels
    const hostelRatings = hostels.map(h => h.rating || 0);
    const avgRating = hostelRatings.length > 0 
      ? Math.round((hostelRatings.reduce((sum, rating) => sum + rating, 0) / hostelRatings.length) * 10) / 10
      : 0;

    // Calculate response time from owner messages/responses
    const ownerResponses = await Event.find({
      userId: ownerId,
      eventType: 'owner_response',
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });
    
    const avgResponseTime = ownerResponses.length > 0 
      ? Math.round(ownerResponses.reduce((sum, response) => {
          const responseTime = response.payload?.responseTimeHours || 2;
          return sum + responseTime;
        }, 0) / ownerResponses.length)
      : 2; // Default 2 hours if no data

    // Recent activity with real user interactions
    const recentEvents = await Event.find({
      $or: [
        { eventType: 'booking', 'payload.hostelId': { $in: hostelIds.map(id => id.toString()) } },
        { eventType: 'view_property', 'payload.hostelId': { $in: hostelIds.map(id => id.toString()) } },
        { eventType: 'search', locationArea: { $in: hostels.map(h => h.address?.city).filter(Boolean) } }
      ],
      createdAt: { $gte: last24Hours }
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('userId', 'name');

    const liveActivity = recentEvents.map(event => {
      const userName = event.userId?.name || 'Anonymous User';
      let message = '';
      
      switch (event.eventType) {
        case 'booking':
          message = `${userName} made a booking`;
          break;
        case 'view_property':
          const hostelName = hostels.find(h => h._id.toString() === event.payload?.hostelId)?.name || 'your property';
          message = `${userName} viewed ${hostelName}`;
          break;
        case 'search':
          message = `${userName} searched in ${event.locationArea || 'your area'}`;
          break;
        default:
          message = `${userName} interacted with your properties`;
      }
      
      return {
        message,
        time: new Date(event.createdAt).toLocaleTimeString()
      };
    });

    res.json({
      totalProperties: hostels.length,
      todayBookings,
      activeSearchers: activeSearchers.length,
      monthlyRevenue,
      occupancyRate,
      avgRating,
      responseTime: avgResponseTime,
      liveActivity
    });
  } catch (error) {
    logger.error('Owner dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOwnerBookings = async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = req.user._id;
    const hostels = await Hostel.find({ ownerId });
    const hostelIds = hostels.map(h => h._id);
    
    const bookings = await Booking.find({ hostelId: { $in: hostelIds } })
      .populate('userId', 'name email phone')
      .populate('hostelId', 'name')
      .sort({ createdAt: -1 });
    
    res.json({ bookings });
  } catch (error) {
    logger.error('Owner bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOwnerAnalyticsData = async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = req.user._id;
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // Get owner's hostels
    const hostels = await Hostel.find({ ownerId });
    const hostelIds = hostels.map(h => h._id);

    // This month's data
    const thisMonthBookings = await Booking.find({
      hostelId: { $in: hostelIds },
      createdAt: { $gte: thisMonth },
      paymentStatus: 'paid'
    });

    // Last month's data
    const lastMonthBookings = await Booking.find({
      hostelId: { $in: hostelIds },
      createdAt: { $gte: lastMonth, $lte: lastMonthEnd },
      paymentStatus: 'paid'
    });

    const thisMonthRevenue = thisMonthBookings.reduce((sum, b) => sum + b.priceTotal, 0);
    const lastMonthRevenue = lastMonthBookings.reduce((sum, b) => sum + b.priceTotal, 0);
    const revenueGrowth = lastMonthRevenue > 0 ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0;

    const thisMonthBookingCount = thisMonthBookings.length;
    const lastMonthBookingCount = lastMonthBookings.length;
    const bookingGrowth = lastMonthBookingCount > 0 ? Math.round(((thisMonthBookingCount - lastMonthBookingCount) / lastMonthBookingCount) * 100) : 0;

    // Calculate occupancy rate
    const totalRooms = hostels.reduce((sum, hostel) => {
      return sum + hostel.rooms.reduce((roomSum: number, room: any) => roomSum + room.availabilityCount, 0);
    }, 0);
    
    const bookedRooms = await Booking.countDocuments({
      hostelId: { $in: hostelIds },
      checkInDate: { $lte: today },
      checkOutDate: { $gte: today },
      paymentStatus: 'paid'
    });
    
    const occupancyRate = totalRooms > 0 ? Math.round((bookedRooms / totalRooms) * 100) : 0;

    // Property performance
    const properties = await Promise.all(hostels.map(async (hostel) => {
      const hostelBookings = await Booking.find({
        hostelId: hostel._id,
        createdAt: { $gte: thisMonth },
        paymentStatus: 'paid'
      });
      
      const revenue = hostelBookings.reduce((sum, b) => sum + b.priceTotal, 0);
      const bookingCount = hostelBookings.length;
      
      const hostelRooms = hostel.rooms.reduce((sum: number, room: any) => sum + room.availabilityCount, 0);
      const hostelBookedRooms = await Booking.countDocuments({
        hostelId: hostel._id,
        checkInDate: { $lte: today },
        checkOutDate: { $gte: today },
        paymentStatus: 'paid'
      });
      
      const hostelOccupancy = hostelRooms > 0 ? Math.round((hostelBookedRooms / hostelRooms) * 100) : 0;
      
      return {
        name: hostel.name,
        revenue,
        bookings: bookingCount,
        occupancy: hostelOccupancy
      };
    }));

    res.json({
      revenue: {
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        growth: revenueGrowth
      },
      bookings: {
        thisMonth: thisMonthBookingCount,
        lastMonth: lastMonthBookingCount,
        growth: bookingGrowth
      },
      occupancy: {
        current: occupancyRate,
        target: 90
      },
      properties
    });
  } catch (error) {
    logger.error('Owner analytics data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateOwnerBookingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    const ownerId = req.user._id;
    
    // Verify the booking belongs to the owner
    const booking = await Booking.findById(bookingId).populate('hostelId');
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if ((booking.hostelId as any).ownerId.toString() !== ownerId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    booking.paymentStatus = status;
    await booking.save();
    
    res.json({ message: 'Booking status updated', booking });
  } catch (error) {
    logger.error('Update owner booking status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};