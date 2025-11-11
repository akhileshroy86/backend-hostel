"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settlementController_1 = require("../controllers/settlementController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Admin routes
router.post('/generate', auth_1.authenticate, (0, auth_1.authorize)(['admin']), settlementController_1.generateMonthlySettlements);
router.get('/pending', auth_1.authenticate, (0, auth_1.authorize)(['admin']), settlementController_1.getPendingSettlements);
router.put('/:settlementId/pay', auth_1.authenticate, (0, auth_1.authorize)(['admin']), settlementController_1.markSettlementPaid);
router.get('/stats', auth_1.authenticate, (0, auth_1.authorize)(['admin']), settlementController_1.getSettlementStats);
// Owner routes
router.get('/my-settlements', auth_1.authenticate, (0, auth_1.authorize)(['hostel_owner']), settlementController_1.getOwnerSettlements);
exports.default = router;
