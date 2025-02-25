const express = require('express');
const router = express.Router();
const { staffLogin } = require('../controllers/staffAuthController');

// Make sure this matches the exact path
router.post('/login', (req, res, next) => {
  console.log('Staff login attempt received at /api/staff/auth/login');
  staffLogin(req, res, next);
});

module.exports = router;
