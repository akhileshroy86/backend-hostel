import mongoose, { Document, Schema } from 'mongoose';

export interface IMonthlyPayment extends Document {
  bookingId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  hostelId: mongoose.Types.ObjectId;
  month: number; // 1-12
  year: number;
  amount: number;
  dueDate: Date;
  paymentStatus: 'pending' | 'paid' | 'overdue';
  paidAt?: Date;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const monthlyPaymentSchema = new Schema<IMonthlyPayment>({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'overdue'], 
    default: 'pending' 
  },
  paidAt: { type: Date },
  reminderSent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

monthlyPaymentSchema.index({ bookingId: 1 });
monthlyPaymentSchema.index({ userId: 1 });
monthlyPaymentSchema.index({ hostelId: 1 });
monthlyPaymentSchema.index({ dueDate: 1 });
monthlyPaymentSchema.index({ paymentStatus: 1 });

export const MonthlyPayment = mongoose.model<IMonthlyPayment>('MonthlyPayment', monthlyPaymentSchema);