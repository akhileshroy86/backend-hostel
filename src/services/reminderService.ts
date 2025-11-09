import { MonthlyPayment } from '../models/MonthlyPayment';
import { User } from '../models/User';
import { logger } from '../utils/logger';

export const sendPaymentReminders = async () => {
  try {
    const today = new Date();
    const reminderDate = new Date(today);
    reminderDate.setDate(today.getDate() + 3); // 3 days before due date

    // Find payments due in 3 days that haven't been reminded
    const paymentsToRemind = await MonthlyPayment.find({
      dueDate: {
        $gte: new Date(reminderDate.toDateString()),
        $lt: new Date(reminderDate.getTime() + 24 * 60 * 60 * 1000)
      },
      paymentStatus: 'pending',
      reminderSent: false
    }).populate('userId', 'name email phone');

    logger.info(`Found ${paymentsToRemind.length} payments to remind`);

    for (const payment of paymentsToRemind) {
      // In a real app, you would send email/SMS here
      // For now, we'll just log and mark as reminded
      logger.info(`Reminder: ${payment.userId.name} has payment of ₹${payment.amount} due on ${payment.dueDate.toDateString()}`);
      
      // Mark reminder as sent
      payment.reminderSent = true;
      await payment.save();
    }

    // Mark overdue payments
    const overduePayments = await MonthlyPayment.find({
      dueDate: { $lt: today },
      paymentStatus: 'pending'
    });

    for (const payment of overduePayments) {
      payment.paymentStatus = 'overdue';
      await payment.save();
    }

    logger.info(`Marked ${overduePayments.length} payments as overdue`);

  } catch (error) {
    logger.error('Error sending payment reminders:', error);
  }
};

// Function to be called manually or via cron job
export const runReminderService = () => {
  logger.info('Starting payment reminder service...');
  sendPaymentReminders();
};