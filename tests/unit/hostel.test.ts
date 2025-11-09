import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../src/models/User';
import { Hostel } from '../../src/models/Hostel';
import hostelRoutes from '../../src/routes/hostelRoutes';
import { auth } from '../../src/middlewares/auth';
import '../setup';

const app = express();
app.use(express.json());
app.use('/hostels', hostelRoutes);

describe('Hostel Controller', () => {
  let ownerToken: string;
  let ownerId: string;

  beforeEach(async () => {
    const owner = new User({
      name: 'Hostel Owner',
      email: 'owner@example.com',
      phone: '9876543210',
      passwordHash: 'hashedpassword',
      role: 'hostel_owner'
    });
    await owner.save();
    ownerId = owner._id.toString();

    ownerToken = jwt.sign({ userId: ownerId }, process.env.JWT_SECRET || 'test-secret');
  });

  describe('POST /hostels', () => {
    it('should create a new hostel', async () => {
      const hostelData = {
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
        amenities: ['wifi', 'ac']
      };

      const response = await request(app)
        .post('/hostels')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(hostelData)
        .expect(201);

      expect(response.body.hostel.name).toBe(hostelData.name);
      expect(response.body.hostel.ownerId).toBe(ownerId);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/hostels')
        .send({})
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided.');
    });
  });

  describe('GET /hostels', () => {
    beforeEach(async () => {
      await Hostel.create({
        ownerId,
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
    });

    it('should get all hostels', async () => {
      const response = await request(app)
        .get('/hostels')
        .expect(200);

      expect(response.body.hostels).toHaveLength(1);
      expect(response.body.hostels[0].name).toBe('Test Hostel');
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/hostels?type=boys')
        .expect(200);

      expect(response.body.hostels).toHaveLength(1);
    });

    it('should filter by city', async () => {
      const response = await request(app)
        .get('/hostels?city=Test City')
        .expect(200);

      expect(response.body.hostels).toHaveLength(1);
    });
  });
});