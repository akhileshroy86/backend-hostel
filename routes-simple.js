const express = require('express');
const router = express.Router();

// Basic auth routes
router.post('/auth/register', (req, res) => {
  res.json({ message: 'Register endpoint', body: req.body });
});

router.post('/auth/login', (req, res) => {
  res.json({ message: 'Login endpoint', body: req.body });
});

// Basic hostel routes
router.get('/hostels', (req, res) => {
  res.json({ message: 'Get hostels', query: req.query });
});

router.post('/hostels', (req, res) => {
  res.json({ message: 'Create hostel', body: req.body });
});

// Basic booking routes
router.get('/bookings', (req, res) => {
  res.json({ message: 'Get bookings' });
});

router.post('/bookings', (req, res) => {
  res.json({ message: 'Create booking', body: req.body });
});

module.exports = router;