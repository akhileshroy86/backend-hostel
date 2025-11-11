import { app, connectDB } from './app';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { logger } from './utils/logger';

let isConnected = false;

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    if (!isConnected) {
      await connectDB();
      isConnected = true;
      logger.info('✅ MongoDB connected (serverless)');
    }

    return app(req as any, res as any);
  } catch (error) {
    logger.error('🔥 Serverless function error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
