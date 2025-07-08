const express = require('express');
const router = express.Router();
const { adminLogin } = require('../controllers/adminAuthController');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const bcrypt = require('bcryptjs'); // Changed from 'bcrypt' to 'bcryptjs'

// Explicitly handle the login path
router.post('/login', (req, res, next) => {
  console.log('Admin login attempt:', req.body);
  adminLogin(req, res, next);
});

router.post('/verify-mpin', async (req, res) => {
  try {
    const { mpin, token } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get admin user and verify MPIN - replace db.one with db.query
    const result = await db.query(
      'SELECT mpin, is_mpin_enabled FROM admin_users WHERE id = $1', 
      [decoded.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    const admin = result.rows[0];
    
    if (!admin.is_mpin_enabled) {
      return res.status(400).json({ error: 'MPIN is not enabled for this account' });
    }

    const isValidMpin = await bcrypt.compare(mpin, admin.mpin);
    if (!isValidMpin) {
      return res.status(401).json({ error: 'Invalid MPIN' });
    }

    res.json({ verified: true });
  } catch (error) {
    console.error('MPIN verification error:', error);
    res.status(500).json({ error: 'MPIN verification failed' });
  }
});

module.exports = router;
