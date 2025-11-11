const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined');
    }
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'OK', message: 'Velin Backend API is running' });
});

// Basic API routes
app.post('/api/v1/auth/register', (req, res) => {
  res.json({ message: 'Register endpoint', body: req.body });
});

app.post('/api/v1/auth/login', (req, res) => {
  res.json({ message: 'Login endpoint', body: req.body });
});

app.get('/api/v1/hostels', (req, res) => {
  res.json({ message: 'Get hostels', query: req.query });
});

app.post('/api/v1/hostels', (req, res) => {
  res.json({ message: 'Create hostel', body: req.body });
});

app.get('/api/v1/bookings', (req, res) => {
  res.json({ message: 'Get bookings' });
});

app.post('/api/v1/bookings', (req, res) => {
  res.json({ message: 'Create booking', body: req.body });
});

const PORT = process.env.APP_PORT || 4000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});