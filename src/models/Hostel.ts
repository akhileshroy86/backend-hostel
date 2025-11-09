import mongoose, { Document, Schema } from 'mongoose';

export interface IRoom {
  roomId: string;
  type: 'single' | 'double' | 'triple' | 'dormitory';
  pricePerMonth: number;
  capacity: number;
  availabilityCount: number;
}

export interface IHostel extends Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  type: 'boys' | 'girls' | 'pg' | 'co-living' | 'travelers' | 'student';
  address: {
    street: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
  };
  contact: {
    phone: string;
    email?: string;
    whatsapp?: string;
  };
  googleMapsUrl?: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  rooms: IRoom[];
  amenities: string[];
  images: string[];
  verified: boolean;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>({
  roomId: { type: String, required: true },
  type: { type: String, enum: ['single', 'double', 'triple', 'dormitory'], required: true },
  pricePerMonth: { type: Number, required: true },
  capacity: { type: Number, required: true },
  availabilityCount: { type: Number, default: 0 }
});

const hostelSchema = new Schema<IHostel>({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['boys', 'girls', 'pg', 'co-living', 'travelers', 'student'], required: true },
  address: {
    street: { type: String, required: true },
    area: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true }
  },
  contact: {
    phone: { type: String, required: true },
    email: { type: String },
    whatsapp: { type: String }
  },
  googleMapsUrl: { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  rooms: [roomSchema],
  amenities: [String],
  images: [String],
  verified: { type: Boolean, default: true },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

hostelSchema.index({ location: '2dsphere' });
hostelSchema.index({ type: 1 });
hostelSchema.index({ ownerId: 1 });
hostelSchema.index({ 'address.city': 1, 'address.area': 1 });

export const Hostel = mongoose.model<IHostel>('Hostel', hostelSchema);