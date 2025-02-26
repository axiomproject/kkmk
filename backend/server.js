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

const app = express();
const port = 5175; // Changed port to avoid conflicts

const forumUploadsDir = path.join(__dirname, 'uploads', 'forum');
if (!fs.existsSync(forumUploadsDir)) {
  fs.mkdirSync(forumUploadsDir, { recursive: true });
}

// Test database connection
db.connect()
  .then(client => {
    console.log('Connected to PostgreSQL');
    client.done(); // Release the client back to the pool
  })
  .catch(error => {
    console.error('Error connecting to PostgreSQL:', error);
  });

// Update CORS configuration to allow credentials
app.use(cors({
  origin: 'http://localhost:5173', // Frontend URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(express.json());

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
app.use('/api/scholardonations', scholarDonationRoutes); // Add this line
app.use('/api/events', eventRoutes);  // Add this line to register event routes
app.use('/api', userRoutes);  // Add this line before authRoutes
app.use('/api', authRoutes);

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

// Add error handling middleware after routes
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ error: 'Internal server error' });
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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
  } else {
    console.error('Error starting server:', err);
  }
});
