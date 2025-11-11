const functions = require('firebase-functions');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Firebase Functions config
const config = functions.config();

// Set Razorpay environment variables from Firebase config
if (config.razorpay) {
  process.env.RZP_KEY_ID = config.razorpay.key_id;
  process.env.RZP_KEY_SECRET = config.razorpay.key_secret;
}
if (config.payment) {
  process.env.PAYMENT_MODE = config.payment.mode;
}

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

// Module-level flag to avoid reconnects on warm invocations
let isConnected = false;
const connectDB = async () => {
  try {
    if (isConnected || mongoose.connection.readyState === 1) {
      console.log('MongoDB: already connected, skipping reconnect');
      isConnected = true;
      return;
    }

    let mongoUri = process.env.MONGO_URI || config.mongo?.uri;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined');
    }
    await mongoose.connect(mongoUri);
    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Import routes
const routes = require('./routes-simple');

// Basic routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// API routes
app.use('/api/v1', routes);

// Initialize Firebase Admin safely
if (!admin.apps || admin.apps.length === 0) {
  if (process.env.FB_CLIENT_EMAIL && process.env.FB_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FB_PROJECT_ID,
        clientEmail: process.env.FB_CLIENT_EMAIL,
        privateKey: process.env.FB_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    console.log('Firebase Admin initialized with service account (env)');
  } else {
    admin.initializeApp();
    console.log('Firebase Admin initialized with default credentials');
  }
} else {
  console.log('Firebase Admin already initialized');
}

connectDB().catch((error) => {
  console.error('Failed to connect to database:', error);
});

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);