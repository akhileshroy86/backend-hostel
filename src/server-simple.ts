import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Mock auth endpoints
app.post('/api/v1/auth/register', (req, res) => {
  res.json({ 
    message: 'User registered successfully',
    token: 'mock-jwt-token-12345',
    user: { id: '1', name: req.body.name, email: req.body.email, role: req.body.role }
  });
});

app.post('/api/v1/auth/login', (req, res) => {
  res.json({ 
    message: 'Login successful',
    token: 'mock-jwt-token-12345',
    user: { id: '1', name: 'Test User', email: req.body.email, role: 'hostel_owner' }
  });
});

// Mock hostel endpoint
app.post('/api/v1/hostels', (req, res) => {
  res.json({ 
    message: 'Hostel created successfully',
    hostel: { id: '1', ...req.body, createdAt: new Date() }
  });
});

const PORT = process.env.APP_PORT || 4000;

app.listen(PORT, () => {
  console.log(`Simple server running on port ${PORT}`);
});