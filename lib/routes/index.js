"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authRoutes_1 = __importDefault(require("./authRoutes"));
const hostelRoutes_1 = __importDefault(require("./hostelRoutes"));
const bookingRoutes_1 = __importDefault(require("./bookingRoutes"));
const reviewRoutes_1 = __importDefault(require("./reviewRoutes"));
const analyticsRoutes_1 = __importDefault(require("./analyticsRoutes"));
const settlementRoutes_1 = __importDefault(require("./settlementRoutes"));
const adminRoutes_1 = __importDefault(require("./adminRoutes"));
const uploadRoutes_1 = __importDefault(require("./uploadRoutes"));
const monthlyPaymentRoutes_1 = __importDefault(require("./monthlyPaymentRoutes"));
const router = (0, express_1.Router)();
router.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});
router.use('/auth', authRoutes_1.default);
router.use('/hostels', hostelRoutes_1.default);
router.use('/bookings', bookingRoutes_1.default);
router.use('/reviews', reviewRoutes_1.default);
router.use('/analytics', analyticsRoutes_1.default);
router.use('/settlements', settlementRoutes_1.default);
router.use('/admin', adminRoutes_1.default);
router.use('/monthly-payments', monthlyPaymentRoutes_1.default);
router.use('/', uploadRoutes_1.default);
exports.default = router;
