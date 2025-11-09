import mongoose, { Document, Schema } from 'mongoose';

export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId;
  hostel: mongoose.Types.ObjectId;
  roomId: string;
  roomType: string;
  checkInDate: Date;
  checkOutDate?: Date; // Optional for monthly bookings
  pricePerMonth: number;
  priceTotal: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  bookingType: 'monthly' | 'fixed'; // New field for booking type
  isActive: boolean; // For monthly bookings
  source: 'web' | 'mobile';
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  hostel: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true },
  roomId: { type: String, required: true },
  roomType: { type: String, required: true },
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date }, // Optional for monthly bookings
  pricePerMonth: { type: Number, required: true },
  priceTotal: { type: Number, required: true },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'], 
    default: 'pending' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed'], 
    default: 'pending' 
  },
  bookingType: { 
    type: String, 
    enum: ['monthly', 'fixed'], 
    default: 'monthly' 
  },
  isActive: { type: Boolean, default: true },
  source: { type: String, enum: ['web', 'mobile'], default: 'web' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

bookingSchema.index({ userId: 1 });
bookingSchema.index({ hostel: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ createdAt: -1 });

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);