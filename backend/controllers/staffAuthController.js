const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const staffLogin = async (req, res) => {
  const { email, password } = req.body;
  console.log('Attempting staff login for:', email);

  try {
    // Replace db.oneOrNone with db.query - explicitly select profile_photo
    const query = `
      SELECT id, name, email, password, role, profile_photo, status, department 
      FROM staff_users 
      WHERE email = $1
    `;
    const staffResult = await db.query(query, [email]);
    const staff = staffResult.rows[0];

    if (!staff) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check staff status before allowing login
    if (staff.status === 'suspended') {
      return res.status(403).json({ 
        error: 'Account suspended. Please contact administrator.' 
      });
    }

    if (staff.status === 'inactive') {
      return res.status(403).json({ 
        error: 'Account inactive. Please contact administrator to reactivate your account.' 
      });
    }

    const isValidPassword = await bcrypt.compare(password, staff.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Only proceed with login if status is active
    const token = jwt.sign(
      { 
        userId: staff.id, 
        role: 'staff',
        email: staff.email,
        status: staff.status,
        profilePhoto: staff.profile_photo  // Add this
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Update last login - replace db.none with db.query
    await db.query('UPDATE staff_users SET last_login = NOW() WHERE id = $1', [staff.id]);

    // Log the response data for debugging
    const userData = {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: 'staff',
      profilePhoto: staff.profile_photo,
      department: staff.department,
      status: staff.status
    };
    
    console.log('Sending user data:', userData);

    res.json({
      token,
      user: userData
    });
  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({ 
      error: 'Login failed', 
      details: error.message 
    });
  }
};

module.exports = { staffLogin };
