import { app, connectDB } from './app';
import { Request, Response } from 'express';

let isConnected = false; // Prevents reconnecting on each function call

export default async function handler(req: Request, res: Response) {
  try {
    if (!isConnected) {
      await connectDB();
      isConnected = true;
      console.log('✅ MongoDB connected (serverless)');
    }

    // Let Express handle the request
    return app(req as any, res as any);
  } catch (err) {
    console.error('🔥 Serverless function error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
