const jwt = require('jsonwebtoken');

const roleAuth = (allowedRoles) => {
  return (req, res, next) => {
    try {
      console.log('Checking auth for path:', req.path);
      console.log('Auth header:', req.headers.authorization);
      
      const token = req.headers.authorization?.split(' ')[1];
      console.log('Extracted token:', token ? 'Present' : 'Missing');
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', { ...decoded, token: 'HIDDEN' });
      
      req.user = decoded;

      if (allowedRoles.includes(decoded.role)) {
        console.log('Role authorized:', decoded.role);
        next();
      } else {
        console.log('Role unauthorized:', decoded.role);
        res.status(403).json({ error: 'Unauthorized access' });
      }
    } catch (error) {
      console.error('Auth error:', error);
      res.status(401).json({ error: 'Invalid token' });
    }
  };
};

module.exports = roleAuth;
