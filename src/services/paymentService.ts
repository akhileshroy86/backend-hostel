import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Booking } from '../models/Booking';
import { Commission } from '../models/Commission';
import { Hostel } from '../models/Hostel';
import { logger } from '../utils/logger';

// Initialize Razorpay with environment variables
const key_id = process.env.RZP_KEY_ID || 'rzp_test_Rdg9mn7VyBwR7t';
const key_secret = process.env.RZP_KEY_SECRET || 'cmwPlpIqAVQRkoL3q5D5Gv5y';

if (!key_id || !key_secret) {
  logger.error('Razorpay credentials not found in environment variables');
  throw new Error('Razorpay credentials are required');
}

const razorpay = new Razorpay({
  key_id,
  key_secret,
});

logger.info('Razorpay initialized successfully');

export const createPaymentOrder = async (bookingData: any) => {
  try {
    const { amount, currency = 'INR', receipt } = bookingData;
    
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency,
      receipt,
    });

    return order;
  } catch (error) {
    logger.error('Payment order creation error:', error);
    throw error;
  }
};

export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RZP_KEY_SECRET!)
    .update(body.toString())
    .digest('hex');

  return expectedSignature === signature;
};

export const calculateCommission = (bookingAmount: number): {
  commissionRate: number;
  commissionAmount: number;
  ownerPayout: number;
} => {
  const commissionRate = parseFloat(process.env.COMMISSION_RATE || '15');
  const commissionAmount = (bookingAmount * commissionRate) / 100;
  const ownerPayout = bookingAmount - commissionAmount;

  return {
    commissionRate,
    commissionAmount,
    ownerPayout,
  };
};

export const processSuccessfulPayment = async (
  bookingId: string,
  paymentDetails: any
) => {
  try {
    // Update booking status
    const booking = await Booking.findById(bookingId).populate('hostelId');
    if (!booking) {
      throw new Error('Booking not found');
    }

    booking.paymentStatus = 'paid';
    await booking.save();

    // Calculate and store commission
    const { commissionRate, commissionAmount, ownerPayout } = calculateCommission(
      booking.priceTotal
    );

    const commission = new Commission({
      bookingId: booking._id,
      hostelId: booking.hostelId,
      ownerId: (booking.hostelId as any).ownerId,
      bookingAmount: booking.priceTotal,
      commissionRate,
      commissionAmount,
      ownerPayout,
    });

    await commission.save();

    logger.info(`Payment processed successfully for booking ${bookingId}`);
    return { booking, commission };
  } catch (error) {
    logger.error('Payment processing error:', error);
    throw error;
  }
};