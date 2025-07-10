require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRoutes = require('./routes/authRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminRoutes = require('./routes/adminRoutes');
const forumRoutes = require('./routes/forumRoutes');
const notificationRoutes = require('./routes/notificationRoutes'); 
const donationRoutes = require('./routes/donationRoutes');
const path = require('path');
const inventoryRoutes = require('./routes/inventoryRoutes');
const contactRoutes = require('./routes/contactRoutes');
const staffAuthRoutes = require('./routes/staffAuthRoutes');
const staffRoutes = require('./routes/staffRoutes');
const scholarRoutes = require('./routes/scholarRoutes');
const scholarDonationRoutes = require('./routes/scholarDonationRoutes');
const eventRoutes = require('./routes/eventRoutes');
const contentRoutes = require('./routes/contentRoutes');
const userRoutes = require('./routes/userRoutes');
const geocodeRoutes = require('./routes/geocodeRoutes');
const schedulerService = require('./services/schedulerService');

const app = express();
const port = process.env.PORT || 5175;

// Move database connection to the top and make it a global promise
let dbClient = null;
const initDatabase = async () => {
  try {
    dbClient = await db.connect();
    console.log('Connected to PostgreSQL');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
};

// Add request logging middleware first
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Update CORS configuration to handle both development and production
const allowedOrigins = [
  'https://kmfi.netlify.app',
  'https://kmfi.onrender.com',
  'http://localhost:5173'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json());

// Make sure this comes before your routes
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/donations', donationRoutes);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Add API prefix to all routes
app.use('/api/*', (req, res, next) => {
  console.log('API request:', req.method, req.originalUrl);
  next();
});

// Move API routes before the catch-all route
app.use('/api/content', contentRoutes);
app.use('/api/scholars', scholarRoutes);

// Add the geocode routes
app.use('/api/geocode', geocodeRoutes);

// Important: Move staff routes before admin routes for proper matching
app.use('/api/staff/auth', staffAuthRoutes);
app.use('/api/staff', staffRoutes);

// Admin routes after staff routes
app.use('/admin/events', require('./routes/adminRoutes')); 
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);

// Other routes
app.use('/api/content', contentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/inventory', inventoryRoutes); 
app.use('/api/forum', forumRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/scholars', scholarRoutes);
app.use('/api/scholardonations', scholarDonationRoutes);
app.use('/api', eventRoutes); // Changed from /api/events to /api to match route definitions
app.use('/api', userRoutes);
app.use('/api', authRoutes);

// Handle SPA routing - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Update middleware to only log errors
app.use((req, res, next) => {
  if (res.statusCode >= 400) {
    console.error('Error request:', {
      method: req.method,
      url: req.url,
      status: res.statusCode
    });
  }
  next();
});

// Add debug middleware for notifications
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    url: req.url,
    path: req.path
  });
  next();
});

// Add health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const dbConnected = await db.testConnection(1, 1000); // Quick check with 1 retry
    // Test Cloudinary connection
    const { testCloudinaryConnection } = require('./config/cloudinaryConfig');
    const cloudinaryConnected = await testCloudinaryConnection();
    
    res.json({
      status: 'healthy',
      database: dbConnected ? 'connected' : 'disconnected',
      cloudinary: cloudinaryConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start the server
const startServer = async () => {
  let retries = 5;
  let connected = false;

  while (retries > 0 && !connected) {
    try {
      connected = await db.testConnection();
      if (connected) {
        console.log('Database connection test successful');
        const server = app.listen(port, () => {
          console.log(`Server is running on port ${port}`);
        });

        // Handle server shutdown gracefully
        const shutdown = async () => {
          console.log('Shutting down server...');
          server.close(async () => {
            console.log('Server closed');
            try {
              await db.pool.end();
              console.log('Database pool closed');
              process.exit(0);
            } catch (err) {
              console.error('Error closing database pool:', err);
              process.exit(1);
            }
          });
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
      }
    } catch (error) {
      console.error(`Failed to start server (${retries} retries left):`, error);
      retries--;
      if (retries === 0) {
        console.error('Failed to connect to database after all retries');
        process.exit(1);
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

startServer();
