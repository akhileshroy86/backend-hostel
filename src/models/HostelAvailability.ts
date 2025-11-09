import mongoose, { Document, Schema } from 'mongoose';

export interface IHostelAvailability extends Document {
  hostelId: mongoose.Types.ObjectId;
  roomId: string;
  closedDates: Date[];
  closedBy: mongoose.Types.ObjectId; // User who closed the dates
  reason: string;
  createdAt: Date;
  updatedAt: Date;
}

const hostelAvailabilitySchema = new Schema<IHostelAvailability>({
  hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true },
  roomId: { type: String, required: true },
  closedDates: [{ type: Date }],
  closedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, default: 'Maintenance/Booking' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

hostelAvailabilitySchema.index({ hostelId: 1, roomId: 1 });

export const HostelAvailability = mongoose.model<IHostelAvailability>('HostelAvailability', hostelAvailabilitySchema);