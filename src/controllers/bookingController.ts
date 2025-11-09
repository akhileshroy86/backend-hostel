import { Response } from 'express';
import { Booking } from '../models/Booking';
import { Hostel } from '../models/Hostel';
import { AuthRequest } from '../middlewares/auth';
import { createMockPaymentOrder, processSuccessfulPayment, verifyMockPaymentSignature } from '../services/mockPaymentService';
import { createMonthlyPaymentSchedule } from './monthlyPaymentController';
import { logger } from '../utils/logger';

export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, roomId, checkInDate, checkOutDate, bookingType = 'monthly', source = 'web' } = req.body;
    
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) {
      return res.status(404).json({ error: 'Hostel not found' });
    }

    const room = hostel.rooms.find(r => r.roomId === roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const checkIn = new Date(checkInDate);
    let priceTotal = room.pricePerMonth; // Default to monthly price
    
    // For fixed bookings, calculate based on days
    if (bookingType === 'fixed' && checkOutDate) {
      const checkOut = new Date(checkOutDate);
      const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      priceTotal = (room.pricePerMonth / 30) * days;
    }

    const booking = new Booking({
      userId: req.user._id,
      hostel: hostelId,
      roomId,
      roomType: room.type,
      checkInDate: checkIn,
      checkOutDate: checkOutDate ? new Date(checkOutDate) : undefined,
      pricePerMonth: room.pricePerMonth,
      priceTotal,
      bookingType,
      source,
    });

    await booking.save();

    // Create mock payment order
    const paymentOrder = await createMockPaymentOrder({
      amount: priceTotal,
      receipt: `booking_${booking._id}`,
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking,
      paymentOrder,
    });
  } catch (error) {
    logger.error('Create booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const confirmPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, paymentId, orderId, signature } = req.body;

    // Verify mock payment signature
    const isValidSignature = verifyMockPaymentSignature(orderId, paymentId, signature);
    if (!isValidSignature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Process successful payment
    const result = await processSuccessfulPayment(bookingId, {
      paymentId,
      orderId,
      signature,
    });

    // Create monthly payment schedule for monthly bookings
    if (result.booking.bookingType === 'monthly') {
      await createMonthlyPaymentSchedule(bookingId);
    }

    res.json({
      message: 'Payment confirmed successfully',
      booking: result.booking,
      commission: result.commission,
    });
  } catch (error) {
    logger.error('Payment confirmation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserBookings = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const bookings = await Booking.find({ userId: req.user._id })
      .populate('hostelId', 'name address images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await Booking.countDocuments({ userId: req.user._id });

    res.json({
      bookings,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    logger.error('Get user bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBookingById = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('hostelId', 'name address images ownerId')
      .populate('userId', 'name email phone');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if user owns this booking or is the hostel owner
    const isOwner = booking.userId._id.toString() === req.user._id.toString();
    const isHostelOwner = (booking.hostelId as any).ownerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isHostelOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ booking });
  } catch (error) {
    logger.error('Get booking by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const cancelBooking = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (booking.paymentStatus === 'cancelled') {
      return res.status(400).json({ error: 'Booking already cancelled' });
    }

    booking.paymentStatus = 'cancelled';
    await booking.save();

    res.json({
      message: 'Booking cancelled successfully',
      booking,
    });
  } catch (error) {
    logger.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};