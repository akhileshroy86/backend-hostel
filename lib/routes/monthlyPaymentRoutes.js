"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const monthlyPaymentController_1 = require("../controllers/monthlyPaymentController");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
// Get pending payments for user
router.get('/pending', auth_1.authenticate, monthlyPaymentController_1.getPendingPayments);
// Process monthly payment
router.post('/pay/:paymentId', auth_1.authenticate, monthlyPaymentController_1.processMonthlyPayment);
// Close hostel dates (for owners)
router.post('/close-dates', auth_1.authenticate, monthlyPaymentController_1.closeHostelDates);
// Get closed dates for hostel
router.get('/closed-dates/:hostelId/:roomId', monthlyPaymentController_1.getClosedDates);
exports.default = router;
