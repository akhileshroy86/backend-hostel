"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookingController_1 = require("../controllers/bookingController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Test endpoint
router.get('/test', (req, res) => {
    res.json({ message: 'Booking routes working', timestamp: new Date() });
});
// Temporary: Remove auth for testing
router.post('/', bookingController_1.createBooking);
// router.post('/', authenticate, createBooking);
// Temporary: Remove auth for testing
router.post('/confirm-payment', bookingController_1.confirmPayment);
// router.post('/confirm-payment', authenticate, confirmPayment);
router.get('/my-bookings', auth_1.authenticate, bookingController_1.getUserBookings);
router.get('/:id', auth_1.authenticate, bookingController_1.getBookingById);
router.put('/:id/cancel', auth_1.authenticate, bookingController_1.cancelBooking);
exports.default = router;
