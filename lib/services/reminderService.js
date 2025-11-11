"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runReminderService = exports.sendPaymentReminders = void 0;
const MonthlyPayment_1 = require("../models/MonthlyPayment");
const logger_1 = require("../utils/logger");
const sendPaymentReminders = async () => {
    try {
        const today = new Date();
        const reminderDate = new Date(today);
        reminderDate.setDate(today.getDate() + 3); // 3 days before due date
        // Find payments due in 3 days that haven't been reminded
        const paymentsToRemind = await MonthlyPayment_1.MonthlyPayment.find({
            dueDate: {
                $gte: new Date(reminderDate.toDateString()),
                $lt: new Date(reminderDate.getTime() + 24 * 60 * 60 * 1000)
            },
            paymentStatus: 'pending',
            reminderSent: false
        }).populate('userId', 'name email phone');
        logger_1.logger.info(`Found ${paymentsToRemind.length} payments to remind`);
        for (const payment of paymentsToRemind) {
            // In a real app, you would send email/SMS here
            // For now, we'll just log and mark as reminded
            const userName = payment.userId?.name || 'user';
            logger_1.logger.info(`Reminder: ${userName} has payment of ₹${payment.amount} due on ${payment.dueDate.toDateString()}`);
            // Mark reminder as sent
            payment.reminderSent = true;
            await payment.save();
        }
        // Mark overdue payments
        const overduePayments = await MonthlyPayment_1.MonthlyPayment.find({
            dueDate: { $lt: today },
            paymentStatus: 'pending'
        });
        for (const payment of overduePayments) {
            payment.paymentStatus = 'overdue';
            await payment.save();
        }
        logger_1.logger.info(`Marked ${overduePayments.length} payments as overdue`);
    }
    catch (error) {
        logger_1.logger.error('Error sending payment reminders:', error);
    }
};
exports.sendPaymentReminders = sendPaymentReminders;
// Function to be called manually or via cron job
const runReminderService = () => {
    logger_1.logger.info('Starting payment reminder service...');
    (0, exports.sendPaymentReminders)();
};
exports.runReminderService = runReminderService;
