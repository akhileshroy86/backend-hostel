import { Response } from 'express';
import { Booking } from '../models/Booking';
import { Hostel } from '../models/Hostel';
import { AuthRequest } from '../middlewares/auth';
// Force mock payment service for testing
const mockPaymentService = require('../services/mockPaymentService');
const createPaymentOrder = mockPaymentService.createMockPaymentOrder;
const processSuccessfulPayment = mockPaymentService.processSuccessfulPayment;
const verifyPaymentSignature = mockPaymentService.verifyMockPaymentSignature;
console.log('Using mock payment service for testing');
import { createMonthlyPaymentSchedule } from './monthlyPaymentController';
import { logger } from '../utils/logger';

export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    console.log('=== CREATE BOOKING DEBUG ===');
    console.log('Request body:', req.body);
    console.log('User:', req.user);
    
    // Mock user for testing if no auth
    if (!req.user) {
      req.user = { _id: '507f1f77bcf86cd799439011', email: 'test@example.com' };
      console.log('Using mock user for testing');
    }
    
    const { hostelId, roomId, checkInDate, checkOutDate, bookingType = 'monthly', source = 'web' } = req.body;
    
    console.log('Extracted data:', { hostelId, roomId, checkInDate, checkOutDate, bookingType, source });
    
    if (!hostelId) {
      return res.status(400).json({ error: 'Hostel ID is required' });
    }
    
    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }
    
    console.log('Finding hostel with ID:', hostelId);
    const hostel = await Hostel.findById(hostelId);
    console.log('Hostel found:', hostel ? 'Yes' : 'No');
    
    if (!hostel) {
      return res.status(404).json({ error: 'Hostel not found' });
    }

    console.log('Available rooms:', hostel.rooms);
    const room = hostel.rooms.find(r => r.roomId === roomId);
    console.log('Room found:', room ? 'Yes' : 'No');
    
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

    console.log('Creating booking with data:', {
      userId: req.user._id,
      hostelId: hostelId,
      roomId,
      roomType: room.type,
      checkInDate: checkIn,
      checkOutDate: checkOutDate ? new Date(checkOutDate) : undefined,
      pricePerMonth: room.pricePerMonth,
      priceTotal,
      bookingType,
      source,
    });
    
    const booking = new Booking({
      userId: req.user._id,
      hostelId: hostelId,
      roomId,
      roomType: room.type,
      checkInDate: checkIn,
      checkOutDate: checkOutDate ? new Date(checkOutDate) : undefined,
      pricePerMonth: room.pricePerMonth,
      priceTotal,
      bookingType,
      source,
    });

    console.log('Saving booking...');
    await booking.save();
    console.log('Booking saved successfully:', booking._id);

    // Create payment order (Razorpay or Mock)
    const paymentOrder = await createPaymentOrder({
      amount: priceTotal,
      receipt: `booking_${booking._id}`,
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking,
      paymentOrder,
    });
  } catch (error) {
    console.error('=== BOOKING ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    logger.error('Create booking error:', error);
    res.status(500).json({ 
      error: 'Failed to create booking',
      details: error.message,
      debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const confirmPayment = async (req: AuthRequest, res: Response) => {
  try {
    console.log('=== PAYMENT CONFIRMATION DEBUG ===');
    console.log('Request body:', req.body);
    console.log('User:', req.user);
    
    // Mock user for testing if no auth
    if (!req.user) {
      req.user = { _id: '507f1f77bcf86cd799439011', email: 'test@example.com' };
      console.log('Using mock user for payment confirmation testing');
    }
    
    const { bookingId, paymentId, orderId, signature } = req.body;
    
    console.log('Payment data:', { bookingId, paymentId, orderId, signature });
    
    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }
    
    if (!paymentId || !orderId || !signature) {
      return res.status(400).json({ error: 'Payment details are incomplete' });
    }

    console.log('Verifying payment signature...');
    // Verify payment signature
    const isValidSignature = verifyPaymentSignature(orderId, paymentId, signature);
    console.log('Signature valid:', isValidSignature);
    
    if (!isValidSignature) {
      console.log('Payment signature verification failed');
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    console.log('Processing successful payment...');
    // Process successful payment
    const result = await processSuccessfulPayment(bookingId, {
      paymentId,
      orderId,
      signature,
    });
    console.log('Payment processed successfully:', result.booking._id);

    // Create monthly payment schedule for monthly bookings
    if (result.booking.bookingType === 'monthly') {
      console.log('Creating monthly payment schedule...');
      await createMonthlyPaymentSchedule(bookingId);
      console.log('Monthly payment schedule created');
    }

    res.json({
      message: 'Payment confirmed successfully',
      booking: result.booking,
      commission: result.commission,
    });
  } catch (error) {
    console.error('=== PAYMENT CONFIRMATION ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    logger.error('Payment confirmation error:', error);
    res.status(500).json({ 
      error: 'Payment confirmation failed. Please contact support.',
      details: error.message,
      debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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