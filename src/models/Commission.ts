import mongoose, { Document, Schema } from 'mongoose';

export interface ICommission extends Document {
  bookingId: mongoose.Types.ObjectId;
  hostelId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  bookingAmount: number;
  commissionRate: number;
  commissionAmount: number;
  ownerPayout: number;
  status: 'pending' | 'settled';
  createdAt: Date;
  settledAt?: Date;
}

const commissionSchema = new Schema<ICommission>({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  bookingAmount: { type: Number, required: true },
  commissionRate: { type: Number, required: true },
  commissionAmount: { type: Number, required: true },
  ownerPayout: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'settled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  settledAt: { type: Date }
});

commissionSchema.index({ ownerId: 1, status: 1 });
commissionSchema.index({ createdAt: 1 });

export const Commission = mongoose.model<ICommission>('Commission', commissionSchema);