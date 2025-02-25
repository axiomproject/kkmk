const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info to request object with consistent ID field
    req.user = {
      ...decoded,
      id: decoded.userId,      // Keep id for backward compatibility
      userId: decoded.userId   // Ensure userId is always available
    };

    console.log('Auth middleware user object:', {
      id: req.user.id,
      userId: req.user.userId,
      role: req.user.role,
      decoded
    });

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
