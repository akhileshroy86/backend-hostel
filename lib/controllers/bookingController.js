"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelBooking = exports.getBookingById = exports.getUserBookings = exports.confirmPayment = exports.createBooking = void 0;
const Booking_1 = require("../models/Booking");
const Hostel_1 = require("../models/Hostel");
// Force mock payment service for testing
const mockPaymentService = require('../services/mockPaymentService');
const createPaymentOrder = mockPaymentService.createMockPaymentOrder;
const processSuccessfulPayment = mockPaymentService.processSuccessfulPayment;
const verifyPaymentSignature = mockPaymentService.verifyMockPaymentSignature;
console.log('Using mock payment service for testing');
const monthlyPaymentController_1 = require("./monthlyPaymentController");
const logger_1 = require("../utils/logger");
const createBooking = async (req, res) => {
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
        const hostel = await Hostel_1.Hostel.findById(hostelId);
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
        const booking = new Booking_1.Booking({
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
    }
    catch (error) {
        console.error('=== BOOKING ERROR ===');
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        logger_1.logger.error('Create booking error:', error);
        res.status(500).json({
            error: 'Failed to create booking',
            details: error.message,
            debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
exports.createBooking = createBooking;
const confirmPayment = async (req, res) => {
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
            await (0, monthlyPaymentController_1.createMonthlyPaymentSchedule)(bookingId);
            console.log('Monthly payment schedule created');
        }
        res.json({
            message: 'Payment confirmed successfully',
            booking: result.booking,
            commission: result.commission,
        });
    }
    catch (error) {
        console.error('=== PAYMENT CONFIRMATION ERROR ===');
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        logger_1.logger.error('Payment confirmation error:', error);
        res.status(500).json({
            error: 'Payment confirmation failed. Please contact support.',
            details: error.message,
            debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
exports.confirmPayment = confirmPayment;
const getUserBookings = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const bookings = await Booking_1.Booking.find({ userId: req.user._id })
            .populate('hostelId', 'name address images')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        const total = await Booking_1.Booking.countDocuments({ userId: req.user._id });
        res.json({
            bookings,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get user bookings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getUserBookings = getUserBookings;
const getBookingById = async (req, res) => {
    try {
        const booking = await Booking_1.Booking.findById(req.params.id)
            .populate('hostelId', 'name address images ownerId')
            .populate('userId', 'name email phone');
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        // Check if user owns this booking or is the hostel owner
        const isOwner = booking.userId._id.toString() === req.user._id.toString();
        const isHostelOwner = booking.hostelId.ownerId.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isHostelOwner && !isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json({ booking });
    }
    catch (error) {
        logger_1.logger.error('Get booking by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getBookingById = getBookingById;
const cancelBooking = async (req, res) => {
    try {
        const booking = await Booking_1.Booking.findById(req.params.id);
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
    }
    catch (error) {
        logger_1.logger.error('Cancel booking error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.cancelBooking = cancelBooking;
