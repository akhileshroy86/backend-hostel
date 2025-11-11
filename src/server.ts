import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { app, connectDB } from './app';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin safely (avoid double-init during hot reloads/warm starts)
if (!admin.apps || admin.apps.length === 0) {
  if (process.env.FB_CLIENT_EMAIL && process.env.FB_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FB_PROJECT_ID,
        clientEmail: process.env.FB_CLIENT_EMAIL,
        // Replace escaped newlines with real newlines
        privateKey: process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('Firebase Admin initialized with service account (env)');
  } else {
    // Fallback to default credentials when running on GCP
    admin.initializeApp();
    console.log('Firebase Admin initialized with default credentials');
  }
} else {
  console.log('Firebase Admin already initialized');
}

// Connect to MongoDB (connectDB has internal guard to avoid reconnects)
connectDB()
  .then(() => console.log('🔥 MongoDB connected for Firebase Function'))
  .catch((err) => console.error('❌ Firebase DB connection error:', err));

// Export Express app as a Firebase HTTPS function
export const api = functions.https.onRequest(app);
