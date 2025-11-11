"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClosedDates = exports.closeHostelDates = exports.processMonthlyPayment = exports.getPendingPayments = exports.createMonthlyPaymentSchedule = void 0;
const MonthlyPayment_1 = require("../models/MonthlyPayment");
const Booking_1 = require("../models/Booking");
const HostelAvailability_1 = require("../models/HostelAvailability");
// Create monthly payment schedule after initial booking
const createMonthlyPaymentSchedule = async (bookingId) => {
    try {
        console.log('Creating monthly payment schedule for booking:', bookingId);
        const booking = await Booking_1.Booking.findById(bookingId);
        console.log('Booking found:', booking ? 'Yes' : 'No');
        console.log('Booking type:', booking?.bookingType);
        if (!booking || booking.bookingType !== 'monthly') {
            console.log('Skipping monthly payment schedule - not a monthly booking');
            return;
        }
        const checkInDate = new Date(booking.checkInDate);
        const currentDate = new Date();
        // Create payment for next month
        const nextMonth = new Date(checkInDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const monthlyPayment = new MonthlyPayment_1.MonthlyPayment({
            bookingId: booking._id,
            userId: booking.userId,
            hostelId: booking.hostelId,
            month: nextMonth.getMonth() + 1,
            year: nextMonth.getFullYear(),
            amount: booking.pricePerMonth,
            dueDate: nextMonth
        });
        console.log('Saving monthly payment:', monthlyPayment);
        await monthlyPayment.save();
        console.log('Monthly payment schedule created successfully');
        return monthlyPayment;
    }
    catch (error) {
        console.error('=== MONTHLY PAYMENT SCHEDULE ERROR ===');
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        throw error;
    }
};
exports.createMonthlyPaymentSchedule = createMonthlyPaymentSchedule;
// Get pending payments for a user
const getPendingPayments = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const pendingPayments = await MonthlyPayment_1.MonthlyPayment.find({
            userId,
            paymentStatus: { $in: ['pending', 'overdue'] }
        })
            .populate('hostelId', 'name address')
            .populate('bookingId', 'roomType')
            .sort({ dueDate: 1 });
        res.json({ success: true, payments: pendingPayments });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch pending payments' });
    }
};
exports.getPendingPayments = getPendingPayments;
// Process monthly payment
const processMonthlyPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.user?._id || req.user?.id;
        const payment = await MonthlyPayment_1.MonthlyPayment.findOne({ _id: paymentId, userId });
        if (!payment) {
            return res.status(404).json({ success: false, error: 'Payment not found' });
        }
        // Update payment status
        payment.paymentStatus = 'paid';
        payment.paidAt = new Date();
        await payment.save();
        // Create next month's payment
        const nextMonth = new Date(payment.dueDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const nextPayment = new MonthlyPayment_1.MonthlyPayment({
            bookingId: payment.bookingId,
            userId: payment.userId,
            hostelId: payment.hostelId,
            month: nextMonth.getMonth() + 1,
            year: nextMonth.getFullYear(),
            amount: payment.amount,
            dueDate: nextMonth
        });
        await nextPayment.save();
        res.json({ success: true, message: 'Payment processed successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to process payment' });
    }
};
exports.processMonthlyPayment = processMonthlyPayment;
// Close hostel dates (for owners after payment)
const closeHostelDates = async (req, res) => {
    try {
        const { hostelId, roomId, dates, reason } = req.body;
        const userId = req.user?._id || req.user?.id;
        const availability = await HostelAvailability_1.HostelAvailability.findOne({ hostelId, roomId });
        if (availability) {
            // Add new dates to existing closed dates
            const newDates = dates.map((date) => new Date(date));
            availability.closedDates.push(...newDates);
            availability.updatedAt = new Date();
            await availability.save();
        }
        else {
            // Create new availability record
            const newAvailability = new HostelAvailability_1.HostelAvailability({
                hostelId,
                roomId,
                closedDates: dates.map((date) => new Date(date)),
                closedBy: userId,
                reason: reason || 'Maintenance/Booking'
            });
            await newAvailability.save();
        }
        res.json({ success: true, message: 'Dates closed successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to close dates' });
    }
};
exports.closeHostelDates = closeHostelDates;
// Get closed dates for a hostel
const getClosedDates = async (req, res) => {
    try {
        const { hostelId, roomId } = req.params;
        const availability = await HostelAvailability_1.HostelAvailability.findOne({ hostelId, roomId });
        const closedDates = availability ? availability.closedDates : [];
        res.json({ success: true, closedDates });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch closed dates' });
    }
};
exports.getClosedDates = getClosedDates;
