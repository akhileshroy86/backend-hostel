import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import routes from './routes';

dotenv.config();

const app = express();

// Minimal environment debug (avoid printing secrets)
console.log('Environment variables loaded: MONGO_URI', process.env.MONGO_URI ? 'Set' : 'Not set');

// ---- MIDDLEWARE ---- //
app.use(helmet());
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'https://your-frontend.vercel.app', // change this to your deployed frontend
    ],
    credentials: true,
  })
);
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // limit each IP
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging to console (safe for serverless)
app.use(
  morgan('combined', {
    stream: { write: (msg) => console.log(msg.trim()) },
  })
);

// Routes
app.use('/api/v1', routes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ---- DATABASE CONNECTION ---- //
// Use a module-level flag to avoid reconnecting on warm function invocations
let isConnected = false;

export const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('❌ MONGO_URI is not set in environment variables');
  }

  // If mongoose is already connected, skip
  if (isConnected || mongoose.connection.readyState === 1) {
    console.log('MongoDB: already connected, skipping reconnect');
    isConnected = true;
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);
  isConnected = true;
  console.log('✅ MongoDB connected');

  // Reset flag if disconnected
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
    isConnected = false;
  });
};

export { app };
