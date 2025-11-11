import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('=== AUTH DEBUG ===');
    console.log('Authorization header:', req.header('Authorization'));
    
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('Extracted token:', token ? 'Present' : 'Missing');
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    console.log('JWT_SECRET available:', process.env.JWT_SECRET ? 'Yes' : 'No');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    console.log('Token decoded:', decoded);
    
    const user = await User.findById(decoded.userId);
    console.log('User found:', user ? user.email : 'Not found');
    
    if (!user) {
      console.log('User not found in database');
      return res.status(401).json({ error: 'Invalid token.' });
    }

    req.user = user;
    console.log('Authentication successful for:', user.email);
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(401).json({ error: 'Invalid token.', details: error.message });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};