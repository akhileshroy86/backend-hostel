import crypto from 'crypto';
import { Booking } from '../models/Booking';
import { Commission } from '../models/Commission';
import { logger } from '../utils/logger';

export const createMockPaymentOrder = async (bookingData: any) => {
  try {
    const { amount, currency = 'INR', receipt } = bookingData;
    
    // Generate mock order ID
    const orderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    
    const order = {
      id: orderId,
      amount: amount * 100, // Convert to paise for consistency
      currency,
      receipt,
      status: 'created',
      created_at: Math.floor(Date.now() / 1000)
    };

    return order;
  } catch (error) {
    logger.error('Mock payment order creation error:', error);
    throw error;
  }
};

export const simulatePaymentSuccess = (orderId: string): {
  paymentId: string;
  signature: string;
} => {
  // Generate mock payment ID and signature
  const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
  const signature = crypto.randomBytes(16).toString('hex');
  
  return {
    paymentId,
    signature
  };
};

export const verifyMockPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  // For mock payments, always return true for testing
  // In real implementation, this would verify the actual signature
  return signature && signature.length > 0;
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

    logger.info(`Mock payment processed successfully for booking ${bookingId}`);
    return { booking, commission };
  } catch (error) {
    logger.error('Mock payment processing error:', error);
    throw error;
  }
};