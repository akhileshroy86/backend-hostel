"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettlementStats = exports.getOwnerSettlements = exports.markSettlementPaid = exports.getPendingSettlements = exports.generateMonthlySettlements = void 0;
const Settlement_1 = require("../models/Settlement");
const Commission_1 = require("../models/Commission");
const logger_1 = require("../utils/logger");
const generateMonthlySettlements = async (req, res) => {
    try {
        const { month, year } = req.body;
        // Get all pending commissions for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const commissions = await Commission_1.Commission.find({
            status: 'pending',
            createdAt: { $gte: startDate, $lte: endDate }
        }).populate('ownerId');
        // Group by owner
        const ownerCommissions = commissions.reduce((acc, commission) => {
            const ownerId = commission.ownerId._id.toString();
            if (!acc[ownerId]) {
                acc[ownerId] = {
                    ownerId: commission.ownerId,
                    commissions: []
                };
            }
            acc[ownerId].commissions.push(commission);
            return acc;
        }, {});
        const settlements = [];
        // Create settlements for each owner
        for (const ownerId in ownerCommissions) {
            const ownerData = ownerCommissions[ownerId];
            const ownerCommissionList = ownerData.commissions;
            const totalBookings = ownerCommissionList.length;
            const totalRevenue = ownerCommissionList.reduce((sum, c) => sum + c.bookingAmount, 0);
            const totalCommission = ownerCommissionList.reduce((sum, c) => sum + c.commissionAmount, 0);
            const netPayout = ownerCommissionList.reduce((sum, c) => sum + c.ownerPayout, 0);
            // Check if settlement already exists
            const existingSettlement = await Settlement_1.Settlement.findOne({
                ownerId,
                month,
                year
            });
            if (!existingSettlement && totalBookings > 0) {
                const settlement = new Settlement_1.Settlement({
                    ownerId,
                    month,
                    year,
                    totalBookings,
                    totalRevenue,
                    totalCommission,
                    netPayout
                });
                await settlement.save();
                settlements.push(settlement);
                // Mark commissions as settled
                await Commission_1.Commission.updateMany({ _id: { $in: ownerCommissionList.map((c) => c._id) } }, { status: 'settled' });
            }
        }
        res.json({
            message: `Generated ${settlements.length} settlements for ${month}/${year}`,
            settlements
        });
    }
    catch (error) {
        logger_1.logger.error('Generate settlements error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.generateMonthlySettlements = generateMonthlySettlements;
const getPendingSettlements = async (req, res) => {
    try {
        const { month, year } = req.query;
        let query = { status: 'pending' };
        if (month && year) {
            query.month = parseInt(month);
            query.year = parseInt(year);
        }
        const settlements = await Settlement_1.Settlement.find(query)
            .populate('ownerId', 'name email phone')
            .sort({ createdAt: -1 });
        res.json({ settlements });
    }
    catch (error) {
        logger_1.logger.error('Get pending settlements error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getPendingSettlements = getPendingSettlements;
const markSettlementPaid = async (req, res) => {
    try {
        const { settlementId } = req.params;
        const { paymentMethod, transactionId } = req.body;
        const settlement = await Settlement_1.Settlement.findById(settlementId);
        if (!settlement) {
            return res.status(404).json({ error: 'Settlement not found' });
        }
        settlement.status = 'paid';
        // Map to fields defined in the Settlement model
        settlement.paymentReference = transactionId || paymentMethod || '';
        settlement.paymentDate = new Date();
        await settlement.save();
        res.json({
            message: 'Settlement marked as paid',
            settlement
        });
    }
    catch (error) {
        logger_1.logger.error('Mark settlement paid error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.markSettlementPaid = markSettlementPaid;
const getOwnerSettlements = async (req, res) => {
    try {
        const ownerId = req.user._id;
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const settlements = await Settlement_1.Settlement.find({ ownerId })
            .sort({ year: -1, month: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        const total = await Settlement_1.Settlement.countDocuments({ ownerId });
        res.json({
            settlements,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Get owner settlements error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getOwnerSettlements = getOwnerSettlements;
const getSettlementStats = async (req, res) => {
    try {
        const totalPending = await Settlement_1.Settlement.aggregate([
            { $match: { status: 'pending' } },
            { $group: { _id: null, total: { $sum: '$netPayout' }, count: { $sum: 1 } } }
        ]);
        const totalPaid = await Settlement_1.Settlement.aggregate([
            { $match: { status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$netPayout' }, count: { $sum: 1 } } }
        ]);
        res.json({
            pending: totalPending[0] || { total: 0, count: 0 },
            paid: totalPaid[0] || { total: 0, count: 0 }
        });
    }
    catch (error) {
        logger_1.logger.error('Get settlement stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getSettlementStats = getSettlementStats;
