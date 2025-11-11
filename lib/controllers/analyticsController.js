"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackOwnerResponse = exports.getOwnerAnalytics = exports.getDashboardAnalytics = exports.trackEvent = void 0;
const Event_1 = require("../models/Event");
const User_1 = require("../models/User");
const Booking_1 = require("../models/Booking");
const Hostel_1 = require("../models/Hostel");
const Commission_1 = require("../models/Commission");
const logger_1 = require("../utils/logger");
const trackEvent = async (req, res) => {
    try {
        const { sessionId, eventType, payload, locationArea, device, source } = req.body;
        const event = new Event_1.Event({
            userId: req.user?._id,
            sessionId,
            eventType,
            payload,
            locationArea,
            device,
            source,
        });
        await event.save();
        res.status(201).json({ message: "Event tracked successfully" });
    }
    catch (error) {
        logger_1.logger.error("Track event error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.trackEvent = trackEvent;
const getDashboardAnalytics = async (req, res) => {
    try {
        const { from, to } = req.query;
        const startDate = new Date(from);
        const endDate = new Date(to);
        // ✅ Daily Active Users Pipeline
        const dauPipeline = [
            {
                $match: {
                    eventType: "open_app",
                    createdAt: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                    },
                    count: { $addToSet: "$userId" },
                },
            },
            {
                $project: { _id: 1, count: { $size: "$count" } },
            },
            {
                $sort: { _id: 1 },
            },
        ];
        // ✅ New Signups Pipeline
        const signupsPipeline = [
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ];
        // ✅ Bookings Pipeline
        const bookingsPipeline = [
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                    },
                    count: { $sum: 1 },
                    revenue: { $sum: "$priceTotal" },
                },
            },
            { $sort: { _id: 1 } },
        ];
        // ✅ Area Distribution Pipeline
        const areaPipeline = [
            {
                $match: {
                    eventType: "search",
                    createdAt: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: { _id: "$locationArea", count: { $sum: 1 } },
            },
            {
                $sort: { count: -1 },
            },
            { $limit: 10 },
        ];
        // Run all 4 aggregations concurrently
        const [dau, signups, bookings, areas] = await Promise.all([
            Event_1.Event.aggregate(dauPipeline),
            User_1.User.aggregate(signupsPipeline),
            Booking_1.Booking.aggregate(bookingsPipeline),
            Event_1.Event.aggregate(areaPipeline),
        ]);
        res.json({
            dau,
            signups,
            bookings,
            topAreas: areas,
        });
    }
    catch (error) {
        logger_1.logger.error("Dashboard analytics error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getDashboardAnalytics = getDashboardAnalytics;
const getOwnerAnalytics = async (req, res) => {
    try {
        const ownerId = req.user._id;
        const { month, year } = req.query;
        const hostels = await Hostel_1.Hostel.find({ ownerId }).select("_id name");
        const hostelIds = hostels.map((h) => h._id);
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        const bookings = await Booking_1.Booking.find({
            hostelId: { $in: hostelIds },
            createdAt: { $gte: startDate, $lte: endDate },
            paymentStatus: "paid",
        });
        const commissions = await Commission_1.Commission.find({
            ownerId,
            createdAt: { $gte: startDate, $lte: endDate },
        });
        const totalBookings = bookings.length;
        const totalRevenue = bookings.reduce((sum, b) => sum + b.priceTotal, 0);
        const totalCommission = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
        const netPayout = commissions.reduce((sum, c) => sum + c.ownerPayout, 0);
        const appBookings = bookings.filter((b) => b.source === "app").length;
        const webBookings = bookings.filter((b) => b.source === "web").length;
        res.json({
            hostels: hostels.length,
            totalBookings,
            totalRevenue,
            totalCommission,
            netPayout,
            appBookings,
            webBookings,
            commissionRate: commissions[0]?.commissionRate || 15,
        });
    }
    catch (error) {
        logger_1.logger.error("Owner analytics error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getOwnerAnalytics = getOwnerAnalytics;
const trackOwnerResponse = async (req, res) => {
    try {
        const { responseTimeHours, context } = req.body;
        const event = new Event_1.Event({
            userId: req.user._id,
            sessionId: Date.now().toString(),
            eventType: "owner_response",
            payload: {
                responseTimeHours: responseTimeHours || 2,
                context: context || "general",
            },
            device: "web",
            source: "web",
        });
        await event.save();
        res.status(201).json({ message: "Response tracked successfully" });
    }
    catch (error) {
        logger_1.logger.error("Track owner response error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.trackOwnerResponse = trackOwnerResponse;
