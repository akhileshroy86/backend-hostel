import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  userId?: mongoose.Types.ObjectId;
  sessionId: string;
  eventType: string;
  payload: any;
  locationArea?: string;
  device: string;
  source: 'web' | 'mobile';
  createdAt: Date;
}

const eventSchema = new Schema<IEvent>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  sessionId: { type: String, required: true },
  eventType: { type: String, required: true },
  payload: { type: Schema.Types.Mixed },
  locationArea: { type: String },
  device: { type: String, required: true },
  source: { type: String, enum: ['web', 'mobile'], required: true },
  createdAt: { type: Date, default: Date.now }
});

eventSchema.index({ eventType: 1, createdAt: -1 });
eventSchema.index({ userId: 1, createdAt: -1 });
eventSchema.index({ locationArea: 1, createdAt: -1 });

export const Event = mongoose.model<IEvent>('Event', eventSchema);