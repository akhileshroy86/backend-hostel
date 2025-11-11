"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processSuccessfulPayment = exports.calculateCommission = exports.verifyMockPaymentSignature = exports.simulatePaymentSuccess = exports.createMockPaymentOrder = void 0;
const crypto_1 = __importDefault(require("crypto"));
const Booking_1 = require("../models/Booking");
const Commission_1 = require("../models/Commission");
const logger_1 = require("../utils/logger");
const createMockPaymentOrder = async (bookingData) => {
    try {
        const { amount, currency = 'INR', receipt } = bookingData;
        // Generate mock order ID
        const orderId = `order_${crypto_1.default.randomBytes(8).toString('hex')}`;
        const order = {
            id: orderId,
            amount: amount * 100, // Convert to paise for consistency
            currency,
            receipt,
            status: 'created',
            created_at: Math.floor(Date.now() / 1000)
        };
        return order;
    }
    catch (error) {
        logger_1.logger.error('Mock payment order creation error:', error);
        throw error;
    }
};
exports.createMockPaymentOrder = createMockPaymentOrder;
const simulatePaymentSuccess = (orderId) => {
    // Generate mock payment ID and signature
    const paymentId = `pay_${crypto_1.default.randomBytes(8).toString('hex')}`;
    const signature = crypto_1.default.randomBytes(16).toString('hex');
    return {
        paymentId,
        signature
    };
};
exports.simulatePaymentSuccess = simulatePaymentSuccess;
const verifyMockPaymentSignature = (orderId, paymentId, signature) => {
    console.log('Mock signature verification:', { orderId, paymentId, signature });
    // For mock payments, always return true for testing
    // Accept any non-empty signature
    const isValid = Boolean(signature && signature.trim().length > 0);
    console.log('Mock signature valid:', isValid);
    return isValid;
};
exports.verifyMockPaymentSignature = verifyMockPaymentSignature;
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
        logger_1.logger.info(`Mock payment processed successfully for booking ${bookingId}`);
        return { booking, commission };
    }
    catch (error) {
        logger_1.logger.error('Mock payment processing error:', error);
        throw error;
    }
};
exports.processSuccessfulPayment = processSuccessfulPayment;
