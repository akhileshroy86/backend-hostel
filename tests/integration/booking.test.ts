import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../src/models/User';
import { Hostel } from '../../src/models/Hostel';
import { Booking } from '../../src/models/Booking';
import bookingRoutes from '../../src/routes/bookingRoutes';
import '../setup';

const app = express();
app.use(express.json());
app.use('/bookings', bookingRoutes);

describe('Booking Integration Tests', () => {
  let customerToken: string;
  let customerId: string;
  let hostelId: string;

  beforeEach(async () => {
    // Create customer
    const customer = new User({
      name: 'Test Customer',
      email: 'customer@example.com',
      phone: '1234567890',
      passwordHash: 'hashedpassword',
      role: 'customer'
    });
    await customer.save();
    customerId = customer._id.toString();
    customerToken = jwt.sign({ userId: customerId }, process.env.JWT_SECRET || 'test-secret');

    // Create owner
    const owner = new User({
      name: 'Hostel Owner',
      email: 'owner@example.com',
      phone: '9876543210',
      passwordHash: 'hashedpassword',
      role: 'hostel_owner'
    });
    await owner.save();

    // Create hostel
    const hostel = new Hostel({
      ownerId: owner._id,
      name: 'Test Hostel',
      type: 'boys',
      address: {
        street: '123 Test St',
        city: 'Test City',
        area: 'Test Area',
        pincode: '123456'
      },
      location: {
        type: 'Point',
        coordinates: [77.5946, 12.9716]
      },
      rooms: [{
        roomId: 'room1',
        type: 'single',
        pricePerMonth: 5000,
        availabilityCount: 2
      }],
      amenities: ['wifi', 'ac'],
      verified: true
    });
    await hostel.save();
    hostelId = hostel._id.toString();
  });

  describe('Complete Booking Flow', () => {
    it('should create booking and process payment', async () => {
      // Step 1: Create booking
      const bookingData = {
        hostelId,
        roomId: 'room1',
        checkInDate: new Date('2024-01-01'),
        checkOutDate: new Date('2024-01-31'),
        source: 'web'
      };

      const bookingResponse = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(bookingData)
        .expect(201);

      expect(bookingResponse.body.booking).toHaveProperty('_id');
      expect(bookingResponse.body.paymentOrder).toHaveProperty('id');

      const bookingId = bookingResponse.body.booking._id;

      // Step 2: Confirm payment
      const paymentData = {
        bookingId,
        paymentId: 'pay_test_123',
        orderId: bookingResponse.body.paymentOrder.id,
        signature: 'test_signature'
      };

      const paymentResponse = await request(app)
        .post('/bookings/confirm-payment')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(paymentData)
        .expect(200);

      expect(paymentResponse.body.message).toBe('Payment confirmed successfully');

      // Verify booking status
      const booking = await Booking.findById(bookingId);
      expect(booking?.paymentStatus).toBe('paid');
    });

    it('should get user bookings', async () => {
      // Create a booking first
      const booking = new Booking({
        userId: customerId,
        hostelId,
        roomId: 'room1',
        checkInDate: new Date('2024-01-01'),
        checkOutDate: new Date('2024-01-31'),
        priceTotal: 5000,
        paymentStatus: 'paid',
        source: 'web'
      });
      await booking.save();

      const response = await request(app)
        .get('/bookings/my-bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.bookings).toHaveLength(1);
      expect(response.body.bookings[0].userId).toBe(customerId);
    });
  });
});