import { Request, Response } from "express";
import { PipelineStage } from "mongoose";
import { Event } from "../models/Event";
import { User } from "../models/User";
import { Booking } from "../models/Booking";
import { Hostel } from "../models/Hostel";
import { Commission } from "../models/Commission";
import { AuthRequest } from "../middlewares/auth";
import { logger } from "../utils/logger";

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
      source,
    });

    await event.save();
    res.status(201).json({ message: "Event tracked successfully" });
  } catch (error) {
    logger.error("Track event error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getDashboardAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { from, to } = req.query;
    const startDate = new Date(from as string);
    const endDate = new Date(to as string);

    // ✅ Daily Active Users Pipeline
    const dauPipeline: PipelineStage[] = [
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
        $sort: { _id: 1 as 1 | -1 },
      },
    ];

    // ✅ New Signups Pipeline
    const signupsPipeline: PipelineStage[] = [
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 as 1 | -1 } },
    ];

    // ✅ Bookings Pipeline
    const bookingsPipeline: PipelineStage[] = [
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
      { $sort: { _id: 1 as 1 | -1 } },
    ];

    // ✅ Area Distribution Pipeline
    const areaPipeline: PipelineStage[] = [
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
        $sort: { count: -1 as 1 | -1 },
      },
      { $limit: 10 },
    ];

    // Run all 4 aggregations concurrently
    const [dau, signups, bookings, areas] = await Promise.all([
      Event.aggregate(dauPipeline),
      User.aggregate(signupsPipeline),
      Booking.aggregate(bookingsPipeline),
      Event.aggregate(areaPipeline),
    ]);

    res.json({
      dau,
      signups,
      bookings,
      topAreas: areas,
    });
  } catch (error) {
    logger.error("Dashboard analytics error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getOwnerAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = req.user._id;
    const { month, year } = req.query;

    const hostels = await Hostel.find({ ownerId }).select("_id name");
    const hostelIds = hostels.map((h) => h._id);

    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0);

    const bookings = await Booking.find({
      hostelId: { $in: hostelIds },
      createdAt: { $gte: startDate, $lte: endDate },
      paymentStatus: "paid",
    });

    const commissions = await Commission.find({
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
  } catch (error) {
    logger.error("Owner analytics error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const trackOwnerResponse = async (req: AuthRequest, res: Response) => {
  try {
    const { responseTimeHours, context } = req.body;

    const event = new Event({
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
  } catch (error) {
    logger.error("Track owner response error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
