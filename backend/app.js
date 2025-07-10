const express = require('express');
const path = require('path');
const cors = require('cors');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();

// Add CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:5174',  // Alternative dev port
    'http://localhost:3000',  // Common React dev port
    'https://kmfi.onrender.com' // Production URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const eventRoutes = require('./routes/eventRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const staffRoutes = require('./routes/staffRoutes');
const donationRoutes = require('./routes/donationRoutes');
const scholarRoutes = require('./routes/scholarRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const contactRoutes = require('./routes/contactRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const forumRoutes = require('./routes/forumRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const contentRoutes = require('./routes/contentRoutes');
const geocodeRoutes = require('./routes/geocodeRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');

// Debug middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Public routes
app.use('/api/events', eventRoutes); // This will make GET /api/events public
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/feedback', feedbackRoutes);

// Protected routes
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/staff', authMiddleware, staffRoutes);
app.use('/api/donations', authMiddleware, donationRoutes);
app.use('/api/scholars', authMiddleware, scholarRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/forum', authMiddleware, forumRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);
app.use('/api/content', authMiddleware, contentRoutes);
app.use('/api/geocode', authMiddleware, geocodeRoutes);
app.use('/api/inventory', authMiddleware, inventoryRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

module.exports = app;


