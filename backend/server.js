require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRoutes = require('./routes/authRoutes'); // Import auth routes
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminRoutes = require('./routes/adminRoutes');
const forumRoutes = require('./routes/forumRoutes');
const notificationRoutes = require('./routes/notificationRoutes'); 
const donationRoutes = require('./routes/donationRoutes'); // Import donation routes
const path = require('path'); // Import path module
const fs = require('fs'); // Import fs module
const inventoryRoutes = require('./routes/inventoryRoutes'); // Import inventory routes
const contactRoutes = require('./routes/contactRoutes');
const staffAuthRoutes = require('./routes/staffAuthRoutes');
const staffRoutes = require('./routes/staffRoutes');
const scholarRoutes = require('./routes/scholarRoutes'); // Import scholar routes
const scholarDonationRoutes = require('./routes/scholarDonationRoutes'); // Add this line
const eventRoutes = require('./routes/eventRoutes'); // Add this line
const contentRoutes = require('./routes/contentRoutes'); // Import content routes
const userRoutes = require('./routes/userRoutes'); // Import user routes
const geocodeRoutes = require('./routes/geocodeRoutes'); // Add this line
const schedulerService = require('./services/schedulerService'); // Import scheduler service

const app = express();
const port = 5175; // Changed port to avoid conflicts

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
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
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

const forumUploadsDir = path.join(__dirname, 'uploads', 'forum');
if (!fs.existsSync(forumUploadsDir)) {
  fs.mkdirSync(forumUploadsDir, { recursive: true });
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads', 'donations');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create uploads directory for admin photos and copy default avatar
const adminUploadsDir = path.join(__dirname, 'uploads', 'admin');
const defaultAvatarSource = path.join(__dirname, 'assets', 'default-avatar.png');
const defaultAvatarDest = path.join(adminUploadsDir, 'default-avatar.png');

if (!fs.existsSync(adminUploadsDir)) {
  fs.mkdirSync(adminUploadsDir, { recursive: true });
}

// Copy default avatar if it doesn't exist in uploads
if (!fs.existsSync(defaultAvatarDest)) {
  try {
    fs.copyFileSync(defaultAvatarSource, defaultAvatarDest);
    console.log('Default avatar copied successfully');
  } catch (error) {
    console.error('Error copying default avatar:', error);
  }
}

// Create uploads directory for staff photos
const staffUploadsDir = path.join(__dirname, 'uploads', 'staff');
if (!fs.existsSync(staffUploadsDir)) {
  fs.mkdirSync(staffUploadsDir, { recursive: true });
}

// Create uploads directory for scholars
const scholarUploadsDir = path.join(__dirname, 'uploads', 'scholars');
if (!fs.existsSync(scholarUploadsDir)) {
  fs.mkdirSync(scholarUploadsDir, { recursive: true });
}

// Create uploads directory for scholar donations (if it doesn't exist)
const scholarDonationsDir = path.join(__dirname, 'uploads', 'scholardonations');
if (!fs.existsSync(scholarDonationsDir)) {
  fs.mkdirSync(scholarDonationsDir, { recursive: true });
}

// Create uploads directory for events
const eventsUploadsDir = path.join(__dirname, 'uploads', 'events');
if (!fs.existsSync(eventsUploadsDir)) {
  fs.mkdirSync(eventsUploadsDir, { recursive: true });
  console.log('Created events uploads directory:', eventsUploadsDir);
}

// Update static file serving - add this before routes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Update static file serving for admin uploads
app.use('/uploads/admin', express.static(path.join(__dirname, 'uploads', 'admin')));

// Update the static file serving for events
app.use('/uploads/events', express.static(path.join(__dirname, 'uploads', 'events')));

// Add specific static route for scholar images
app.use('/uploads/scholars', express.static(path.join(__dirname, 'uploads', 'scholars')));

// Add this before your routes
app.use((req, res, next) => {
  if (req.url.startsWith('/uploads/')) {
    console.log('Static file request:', req.url);
  }
  next();
});

// Log static file requests
app.use('/uploads', (req, res, next) => {
  console.log('Static file request:', req.url);
  next();
});

// Make sure this comes before your routes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/donations', donationRoutes);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

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

app.use('/api', eventRoutes);
// Add debug middleware for notifications
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    url: req.url,
    path: req.path
  });
  next();
});

// Ensure routes are properly ordered

// Add the geocode routes
app.use('/api/geocode', geocodeRoutes); // Add this line before other routes

// Important: Move staff routes before admin routes for proper matching
app.use('/api/staff/auth', staffAuthRoutes);
app.use('/api/staff', staffRoutes);

// Admin routes after staff routes
app.use('/api/admin/events', require('./routes/adminRoutes')); 
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);

// Other routes
app.use('/api/content', contentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/inventory', inventoryRoutes); 
app.use('/api/forum', forumRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/scholars', scholarRoutes); // Move scholar routes before auth routes
app.use('/api/scholardonations', scholarDonationRoutes); // Ensure this line is present and correct
app.use('/api/events', eventRoutes);  // Add this line to register event routes
app.use('/api', userRoutes);  // Add this line before authRoutes
app.use('/api', authRoutes);

// Add specific debug logging for image requests
app.use('/uploads/events', (req, res, next) => {
  console.log('Event image request:', req.url);
  // Check if file exists
  const filePath = path.join(__dirname, 'uploads', 'events', req.url);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`File not found: ${filePath}`);
    } else {
      console.log(`Serving file: ${filePath}`);
    }
    next();
  });
});

// Add specific debug logging for event image requests
app.use('/uploads/events', (req, res, next) => {
  const fullPath = req.path;
  console.log('Event image request:', fullPath);
  
  // Check if file exists
  const filePath = path.join(__dirname, 'uploads', 'events', path.basename(fullPath));
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`Event image file not found: ${filePath}`);
    } else {
      console.log(`Serving event image file: ${filePath}`);
    }
    next();
  });
});

// Add debug middleware for API requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    params: req.params
  });
  next();
});

// Update 404 handler
app.use((req, res) => {
  console.log('404 - Detailed route info:', {
    method: req.method,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
    params: req.params,
    query: req.query
  });
  res.status(404).json({ error: 'Route not found' });
});

// Add error handling middleware before routes
app.use((err, req, res, next) => {
  console.error('Error:', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized access' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Add detailed error logging
app.use((err, req, res, next) => {
  console.error('Detailed error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Add database check middleware before routes
app.use(async (req, res, next) => {
  if (!dbClient) {
    try {
      const connected = await initDatabase();
      if (!connected) {
        return res.status(503).json({ 
          error: 'Database connection not available',
          message: 'Service temporarily unavailable'
        });
      }
    } catch (error) {
      return res.status(503).json({ 
        error: 'Database connection failed',
        message: 'Service temporarily unavailable'
      });
    }
  }
  next();
});

// Initialize server with database connection
const startServer = async () => {
  try {
    await initDatabase();
    
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      try {
        schedulerService.initScheduledTasks();
        console.log('Scheduled tasks initialized');
      } catch (error) {
        console.error('Failed to initialize scheduled tasks:', error);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
