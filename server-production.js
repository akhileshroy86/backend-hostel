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

// Cloud Run and many hosting platforms provide the listen port via the PORT env var.
// Respect that first, then fall back to APP_PORT (project-specific override), then 4000.
const PORT = process.env.PORT || process.env.APP_PORT || 4000;

// Start the HTTP server immediately so the container becomes healthy quickly.
// Connect to the database in the background; if DB connection fails we'll log the error
// but keep the server running so the service can respond to health checks and return informative errors.
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

connectDB().then(() => {
  console.log('MongoDB connection established');
}).catch((error) => {
  console.error('Failed to connect to MongoDB:', error);
  // Don't exit the process — keep the server running so Cloud Run health checks can pass and
  // the application can surface a clear error via /health endpoints.
});