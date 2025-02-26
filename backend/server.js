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

// Create absolute path for uploads directory
const uploadsBaseDir = path.join(__dirname, 'uploads');

// Create forum uploads directory
const forumUploadsDir = path.join(uploadsBaseDir, 'forum');
if (!fs.existsSync(forumUploadsDir)) {
  fs.mkdirSync(forumUploadsDir, { recursive: true });
}

// Fix the connection handling code
db.connect()
  .then(client => {
    console.log('Connected to PostgreSQL');
    client.release(); // Use release() instead of done()
  })
  .catch(error => {
    console.error('Error connecting to PostgreSQL:', error);
  });

// Update CORS configuration to allow all origins in production
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://kkmkpayatas.onrender.com', 'http://localhost:5173']
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(express.json());

// Create donations uploads directory
const uploadsDir = path.join(uploadsBaseDir, 'donations');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create uploads directory for admin photos and copy default avatar
const adminUploadsDir = path.join(uploadsBaseDir, 'admin');
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
const scholarUploadsDir = path.join(uploadsBaseDir, 'scholars');
if (!fs.existsSync(scholarUploadsDir)) {
  fs.mkdirSync(scholarUploadsDir, { recursive: true });
}

// Create uploads directory for scholar donations
const scholarDonationsDir = path.join(uploadsBaseDir, 'scholardonations');
if (!fs.existsSync(scholarDonationsDir)) {
  fs.mkdirSync(scholarDonationsDir, { recursive: true });
}

// Create events uploads directory if it doesn't exist
const eventsUploadsDir = path.join(uploadsBaseDir, 'events');
if (!fs.existsSync(eventsUploadsDir)) {
  fs.mkdirSync(eventsUploadsDir, { recursive: true });
}

// Explicitly define uploads directory path with console logging for debugging
console.log('Uploads directory path:', uploadsBaseDir);
app.use('/uploads', express.static(uploadsBaseDir));

// Add specific routes for different upload directories with logging
app.use('/uploads/admin', (req, res, next) => {
  console.log('Admin upload request:', req.url);
  next();
}, express.static(adminUploadsDir));

app.use('/uploads/events', (req, res, next) => {
  console.log('Events upload request:', req.url);
  next();
}, express.static(eventsUploadsDir));

app.use('/uploads/scholars', (req, res, next) => {
  console.log('Scholar upload request:', req.url);
  next();
}, express.static(scholarUploadsDir));

app.use('/uploads/scholardonations', (req, res, next) => {
  console.log('Scholar donation upload request:', req.url);
  next();
}, express.static(scholarDonationsDir));

app.use('/uploads/forum', (req, res, next) => {
  console.log('Forum upload request:', req.url);
  next();
}, express.static(forumUploadsDir));

// Debugging route to check uploads directory
app.get('/api/check-uploads', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsBaseDir);
    const directories = {};
    
    // Get subdirectories
    fs.readdirSync(uploadsBaseDir).forEach(dir => {
      const dirPath = path.join(uploadsBaseDir, dir);
      if (fs.statSync(dirPath).isDirectory()) {
        directories[dir] = fs.readdirSync(dirPath);
      }
    });
    
    res.json({
      uploadsPath: uploadsBaseDir,
      exists: fs.existsSync(uploadsBaseDir),
      files,
      directories
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      stack: err.stack
    });
  }
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
app.use('/api/donations', donationRoutes);

// Add a root path handler to show API is running
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'KKMK Payatas API Server',
    version: '1.0.0',
    documentation: '/api/docs',
    checkUploads: '/api/check-uploads'
  });
});

// Add basic API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.status(200).json({
    apiEndpoints: {
      auth: '/api/auth - User authentication endpoints',
      admin: '/api/admin - Admin management endpoints',
      staff: '/api/staff - Staff management endpoints',
      scholars: '/api/scholars - Scholar management endpoints',
      donations: '/api/donations - Donation management endpoints',
      events: '/api/events - Event management endpoints',
      forum: '/api/forum - Forum management endpoints',
      inventory: '/api/inventory - Inventory management endpoints',
      notifications: '/api/notifications - Notification management endpoints',
      content: '/api/content - Content management endpoints',
      contacts: '/api/contacts - Contact management endpoints'
    },
    uploadsCheck: '/api/check-uploads - Debug endpoint to verify uploads directory'
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
