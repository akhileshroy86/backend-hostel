import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  passwordHash?: string;
  role: 'customer' | 'hostel_owner' | 'admin';
  gender?: 'male' | 'female' | 'other';
  preferences: {
    types: string[];
    budgetRange: [number, number];
  };
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  createdAt: Date;
  lastSeenAt: Date;
  analyticsOptIn: boolean;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  passwordHash: { type: String },
  role: { type: String, enum: ['customer', 'hostel_owner', 'admin'], default: 'customer' },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  preferences: {
    types: [String],
    budgetRange: { type: [Number], default: [0, 50000] }
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  createdAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  analyticsOptIn: { type: Boolean, default: true }
});

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ location: '2dsphere' });
userSchema.index({ lastSeenAt: 1 });

export const User = mongoose.model<IUser>('User', userSchema);