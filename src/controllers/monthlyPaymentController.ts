import { Request, Response } from 'express';
import { MonthlyPayment } from '../models/MonthlyPayment';
import { Booking } from '../models/Booking';
import { HostelAvailability } from '../models/HostelAvailability';

// Create monthly payment schedule after initial booking
export const createMonthlyPaymentSchedule = async (bookingId: string) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking || booking.bookingType !== 'monthly') return;

    const checkInDate = new Date(booking.checkInDate);
    const currentDate = new Date();
    
    // Create payment for next month
    const nextMonth = new Date(checkInDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const monthlyPayment = new MonthlyPayment({
      bookingId: booking._id,
      userId: booking.userId,
      hostelId: booking.hostel,
      month: nextMonth.getMonth() + 1,
      year: nextMonth.getFullYear(),
      amount: booking.pricePerMonth,
      dueDate: nextMonth
    });

    await monthlyPayment.save();
    return monthlyPayment;
  } catch (error) {
    console.error('Error creating monthly payment schedule:', error);
    throw error;
  }
};

// Get pending payments for a user
export const getPendingPayments = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const pendingPayments = await MonthlyPayment.find({
      userId,
      paymentStatus: { $in: ['pending', 'overdue'] }
    })
    .populate('hostelId', 'name address')
    .populate('bookingId', 'roomType')
    .sort({ dueDate: 1 });

    res.json({ success: true, payments: pendingPayments });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch pending payments' });
  }
};

// Process monthly payment
export const processMonthlyPayment = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user?.id;

    const payment = await MonthlyPayment.findOne({ _id: paymentId, userId });
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

    const nextPayment = new MonthlyPayment({
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
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to process payment' });
  }
};

// Close hostel dates (for owners after payment)
export const closeHostelDates = async (req: Request, res: Response) => {
  try {
    const { hostelId, roomId, dates, reason } = req.body;
    const userId = req.user?.id;

    const availability = await HostelAvailability.findOne({ hostelId, roomId });
    
    if (availability) {
      // Add new dates to existing closed dates
      const newDates = dates.map((date: string) => new Date(date));
      availability.closedDates.push(...newDates);
      availability.updatedAt = new Date();
      await availability.save();
    } else {
      // Create new availability record
      const newAvailability = new HostelAvailability({
        hostelId,
        roomId,
        closedDates: dates.map((date: string) => new Date(date)),
        closedBy: userId,
        reason: reason || 'Maintenance/Booking'
      });
      await newAvailability.save();
    }

    res.json({ success: true, message: 'Dates closed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to close dates' });
  }
};

// Get closed dates for a hostel
export const getClosedDates = async (req: Request, res: Response) => {
  try {
    const { hostelId, roomId } = req.params;
    
    const availability = await HostelAvailability.findOne({ hostelId, roomId });
    const closedDates = availability ? availability.closedDates : [];

    res.json({ success: true, closedDates });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch closed dates' });
  }
};