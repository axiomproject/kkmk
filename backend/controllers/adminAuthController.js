const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const adminLogin = async (req, res) => {
  const { email, password } = req.body;
  console.log('Attempting admin login for:', email);

  try {
    const query = 'SELECT * FROM admin_users WHERE email = $1';
    console.log('Executing query:', query);
    
    // Replace db.oneOrNone with db.query
    const adminResult = await db.query(query, [email]);
    const admin = adminResult.rows[0];
    
    console.log('Admin found:', admin ? 'Yes' : 'No');
    console.log('Stored password hash:', admin?.password);
    console.log('Attempting to compare with:', password);

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);
    console.log('Password valid:', isValidPassword ? 'Yes' : 'No');

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const token = jwt.sign(
      { 
        id: admin.id,  // Change userId to id to match what we expect
        role: 'admin',
        email: admin.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Check if MPIN is enabled
    if (admin.is_mpin_enabled) {
      res.json({
        requireMpin: true,
        token,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: 'admin',
          profilePhoto: admin.profile_photo // Just pass the relative path
        }
      });
    } else {
      // Regular login response without MPIN
      res.json({
        token,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: 'admin',
          profilePhoto: admin.profile_photo // Just pass the relative path
        }
      });
    }
  } catch (error) {
    console.error('Detailed admin login error:', error);
    res.status(500).json({ 
      error: 'Login failed', 
      details: error.message 
    });
  }
};

module.exports = { adminLogin };
