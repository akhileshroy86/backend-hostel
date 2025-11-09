import mongoose, { Document, Schema } from 'mongoose';

export interface ISettlement extends Document {
  ownerId: mongoose.Types.ObjectId;
  month: number;
  year: number;
  totalRevenue: number;
  totalCommission: number;
  netPayout: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  paymentDate?: Date;
  paymentReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

const settlementSchema = new Schema<ISettlement>({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  totalRevenue: { type: Number, required: true, default: 0 },
  totalCommission: { type: Number, required: true, default: 0 },
  netPayout: { type: Number, required: true, default: 0 },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'paid', 'failed'], 
    default: 'pending' 
  },
  paymentDate: { type: Date },
  paymentReference: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

settlementSchema.index({ ownerId: 1, month: 1, year: 1 }, { unique: true });
settlementSchema.index({ status: 1 });
settlementSchema.index({ createdAt: -1 });

export const Settlement = mongoose.model<ISettlement>('Settlement', settlementSchema);