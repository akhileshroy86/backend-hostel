"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processSuccessfulPayment = exports.calculateCommission = exports.verifyPaymentSignature = exports.createPaymentOrder = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const Booking_1 = require("../models/Booking");
const Commission_1 = require("../models/Commission");
const logger_1 = require("../utils/logger");
// Initialize Razorpay with environment variables
const key_id = process.env.RZP_KEY_ID || 'rzp_test_Rdg9mn7VyBwR7t';
const key_secret = process.env.RZP_KEY_SECRET || 'cmwPlpIqAVQRkoL3q5D5Gv5y';
if (!key_id || !key_secret) {
    logger_1.logger.error('Razorpay credentials not found in environment variables');
    throw new Error('Razorpay credentials are required');
}
const razorpay = new razorpay_1.default({
    key_id,
    key_secret,
});
logger_1.logger.info('Razorpay initialized successfully');
const createPaymentOrder = async (bookingData) => {
    try {
        const { amount, currency = 'INR', receipt } = bookingData;
        const order = await razorpay.orders.create({
            amount: amount * 100, // Convert to paise
            currency,
            receipt,
        });
        return order;
    }
    catch (error) {
        logger_1.logger.error('Payment order creation error:', error);
        throw error;
    }
};
exports.createPaymentOrder = createPaymentOrder;
const verifyPaymentSignature = (orderId, paymentId, signature) => {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto_1.default
        .createHmac('sha256', process.env.RZP_KEY_SECRET)
        .update(body.toString())
        .digest('hex');
    return expectedSignature === signature;
};
exports.verifyPaymentSignature = verifyPaymentSignature;
const calculateCommission = (bookingAmount) => {
    const commissionRate = parseFloat(process.env.COMMISSION_RATE || '15');
    const commissionAmount = (bookingAmount * commissionRate) / 100;
    const ownerPayout = bookingAmount - commissionAmount;
    return {
        commissionRate,
        commissionAmount,
        ownerPayout,
    };
};
exports.calculateCommission = calculateCommission;
const processSuccessfulPayment = async (bookingId, paymentDetails) => {
    try {
        // Update booking status
        const booking = await Booking_1.Booking.findById(bookingId).populate('hostelId');
        if (!booking) {
            throw new Error('Booking not found');
        }
        booking.paymentStatus = 'paid';
        await booking.save();
        // Calculate and store commission
        const { commissionRate, commissionAmount, ownerPayout } = (0, exports.calculateCommission)(booking.priceTotal);
        const commission = new Commission_1.Commission({
            bookingId: booking._id,
            hostelId: booking.hostelId,
            ownerId: booking.hostelId.ownerId,
            bookingAmount: booking.priceTotal,
            commissionRate,
            commissionAmount,
            ownerPayout,
        });
        await commission.save();
        logger_1.logger.info(`Payment processed successfully for booking ${bookingId}`);
        return { booking, commission };
    }
    catch (error) {
        logger_1.logger.error('Payment processing error:', error);
        throw error;
    }
};
exports.processSuccessfulPayment = processSuccessfulPayment;
