"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllSettlements = exports.rejectHostel = exports.approveHostel = exports.getAllHostels = exports.getAllUsers = exports.updateRoomPricing = exports.getOwnerProperties = exports.updateBookingStatus = exports.getOwnerBookings = exports.getOwnerAnalytics = exports.getOwnerDashboardStats = exports.updateCommissionSettings = exports.getCommissionSettings = exports.getAnalytics = exports.getBookings = exports.verifyHostel = exports.getHostels = exports.getUsers = exports.getAdminStats = void 0;
const User_1 = require("../models/User");
const Hostel_1 = require("../models/Hostel");
const Booking_1 = require("../models/Booking");
const Commission_1 = require("../models/Commission");
const Settlement_1 = require("../models/Settlement");
const Event_1 = require("../models/Event");
const logger_1 = require("../utils/logger");
const getAdminStats = async (req, res) => {
    try {
        const [totalUsers, totalHostels, totalBookings, totalCommission] = await Promise.all([
            User_1.User.countDocuments(),
            Hostel_1.Hostel.countDocuments(),
            Booking_1.Booking.countDocuments(),
            Commission_1.Commission.aggregate([
                { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
            ])
        ]);
        res.json({
            totalUsers,
            totalHostels,
            totalBookings,
            totalRevenue: totalCommission[0]?.total || 0
        });
    }
    catch (error) {
        logger_1.logger.error('Admin stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAdminStats = getAdminStats;
const getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, role, search } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const filter = {};
        if (role)
            filter.role = role;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        const users = await User_1.User.find(filter)
            .select('-passwordHash')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await User_1.User.countDocuments(filter);
        res.json({
            users,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getUsers = getUsers;
const getHostels = async (req, res) => {
    try {
        const { page = 1, limit = 10, verified, city } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const filter = {};
        if (verified !== undefined)
            filter.verified = verified === 'true';
        if (city)
            filter['address.city'] = { $regex: city, $options: 'i' };
        const hostels = await Hostel_1.Hostel.find(filter)
            .populate('ownerId', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await Hostel_1.Hostel.countDocuments(filter);
        res.json({
            hostels,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Get hostels error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getHostels = getHostels;
const verifyHostel = async (req, res) => {
    try {
        const { hostelId } = req.params;
        const { verified } = req.body;
        const hostel = await Hostel_1.Hostel.findByIdAndUpdate(hostelId, { verified }, { new: true });
        if (!hostel) {
            return res.status(404).json({ error: 'Hostel not found' });
        }
        res.json({ message: 'Hostel verification updated', hostel });
    }
    catch (error) {
        logger_1.logger.error('Verify hostel error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.verifyHostel = verifyHostel;
const getBookings = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, from, to } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const filter = {};
        if (status)
            filter.paymentStatus = status;
        if (from || to) {
            filter.createdAt = {};
            if (from)
                filter.createdAt.$gte = new Date(from);
            if (to)
                filter.createdAt.$lte = new Date(to);
        }
        const bookings = await Booking_1.Booking.find(filter)
            .populate('userId', 'name email')
            .populate('hostelId', 'name address')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await Booking_1.Booking.countDocuments(filter);
        res.json({
            bookings,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Get bookings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getBookings = getBookings;
const getAnalytics = async (req, res) => {
    try {
        const { from, to, groupBy = 'day' } = req.query;
        const matchStage = {};
        if (from || to) {
            matchStage.createdAt = {};
            if (from)
                matchStage.createdAt.$gte = new Date(from);
            if (to)
                matchStage.createdAt.$lte = new Date(to);
        }
        const dateFormat = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';
        const [userSignups, bookingStats, revenueStats] = await Promise.all([
            User_1.User.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Booking_1.Booking.aggregate([
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
            Commission_1.Commission.aggregate([
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
    }
    catch (error) {
        logger_1.logger.error('Get analytics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAnalytics = getAnalytics;
const getCommissionSettings = async (req, res) => {
    try {
        const commissionRate = process.env.COMMISSION_RATE || '15';
        res.json({ commissionRate: parseFloat(commissionRate) });
    }
    catch (error) {
        logger_1.logger.error('Get commission settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getCommissionSettings = getCommissionSettings;
const updateCommissionSettings = async (req, res) => {
    try {
        const { commissionRate } = req.body;
        if (!commissionRate || commissionRate < 0 || commissionRate > 50) {
            return res.status(400).json({ error: 'Invalid commission rate' });
        }
        // In production, this would update environment variables or database config
        process.env.COMMISSION_RATE = commissionRate.toString();
        res.json({ message: 'Commission rate updated', commissionRate });
    }
    catch (error) {
        logger_1.logger.error('Update commission settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateCommissionSettings = updateCommissionSettings;
const getOwnerDashboardStats = async (req, res) => {
    try {
        const ownerId = req.user._id;
        const hostels = await Hostel_1.Hostel.find({ ownerId });
        const hostelIds = hostels.map(h => h._id);
        const bookings = await Booking_1.Booking.find({ hostel: { $in: hostelIds } });
        const totalRevenue = bookings.reduce((sum, b) => sum + b.priceTotal, 0);
        // Get hostel view analytics
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeSearchers = await Event_1.Event.countDocuments({
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
    }
    catch (error) {
        logger_1.logger.error('Owner dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getOwnerDashboardStats = getOwnerDashboardStats;
const getOwnerAnalytics = async (req, res) => {
    try {
        const { ownerId } = req.params;
        const hostels = await Hostel_1.Hostel.find({ ownerId });
        const hostelIds = hostels.map(h => h._id);
        const bookings = await Booking_1.Booking.find({ hostelId: { $in: hostelIds } })
            .populate('userId', 'name')
            .sort({ createdAt: -1 });
        // Get property view analytics
        const propertyViews = await Event_1.Event.aggregate([
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
    }
    catch (error) {
        logger_1.logger.error('Owner analytics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getOwnerAnalytics = getOwnerAnalytics;
const getOwnerBookings = async (req, res) => {
    try {
        const { ownerId } = req.params;
        const hostels = await Hostel_1.Hostel.find({ ownerId });
        const hostelIds = hostels.map(h => h._id);
        const bookings = await Booking_1.Booking.find({ hostelId: { $in: hostelIds } })
            .populate('userId', 'name email')
            .populate('hostelId', 'name')
            .sort({ createdAt: -1 });
        res.json({ bookings });
    }
    catch (error) {
        logger_1.logger.error('Owner bookings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getOwnerBookings = getOwnerBookings;
const updateBookingStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status } = req.body;
        const booking = await Booking_1.Booking.findByIdAndUpdate(bookingId, { paymentStatus: status }, { new: true });
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.json({ message: 'Booking status updated', booking });
    }
    catch (error) {
        logger_1.logger.error('Update booking status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateBookingStatus = updateBookingStatus;
const getOwnerProperties = async (req, res) => {
    try {
        const { ownerId } = req.params;
        const hostels = await Hostel_1.Hostel.find({ ownerId });
        res.json({ hostels });
    }
    catch (error) {
        logger_1.logger.error('Owner properties error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getOwnerProperties = getOwnerProperties;
const updateRoomPricing = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const { pricing } = req.body;
        const hostel = await Hostel_1.Hostel.findByIdAndUpdate(propertyId, { 'rooms.$.pricing': pricing }, { new: true });
        if (!hostel) {
            return res.status(404).json({ error: 'Property not found' });
        }
        res.json({ message: 'Pricing updated', hostel });
    }
    catch (error) {
        logger_1.logger.error('Update room pricing error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateRoomPricing = updateRoomPricing;
const getAllUsers = async (req, res) => {
    try {
        const users = await User_1.User.find().select('-passwordHash').sort({ createdAt: -1 });
        res.json({ users });
    }
    catch (error) {
        logger_1.logger.error('Get all users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAllUsers = getAllUsers;
const getAllHostels = async (req, res) => {
    try {
        const hostels = await Hostel_1.Hostel.find().populate('ownerId', 'name email').sort({ createdAt: -1 });
        res.json({ hostels });
    }
    catch (error) {
        logger_1.logger.error('Get all hostels error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAllHostels = getAllHostels;
const approveHostel = async (req, res) => {
    try {
        const { id } = req.params;
        await Hostel_1.Hostel.findByIdAndUpdate(id, { verified: true });
        res.json({ message: 'Hostel approved successfully' });
    }
    catch (error) {
        logger_1.logger.error('Approve hostel error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.approveHostel = approveHostel;
const rejectHostel = async (req, res) => {
    try {
        const { id } = req.params;
        await Hostel_1.Hostel.findByIdAndUpdate(id, { verified: false });
        res.json({ message: 'Hostel rejected successfully' });
    }
    catch (error) {
        logger_1.logger.error('Reject hostel error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.rejectHostel = rejectHostel;
const getAllSettlements = async (req, res) => {
    try {
        const settlements = await Settlement_1.Settlement.find().populate('ownerId', 'name email').sort({ createdAt: -1 });
        res.json({ settlements });
    }
    catch (error) {
        logger_1.logger.error('Get all settlements error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAllSettlements = getAllSettlements;
