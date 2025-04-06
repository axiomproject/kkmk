const express = require('express');
const path = require('path');
// ...existing imports...

// Add CORS configuration
app.use(cors({
  origin: 'http://localhost:5173', // Add your frontend URL
  credentials: true
}));

// Configure static file serving - make sure this comes before your routes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add debug logging for static files
app.use('/uploads', (req, res, next) => {
  console.log('Static file request:', req.url);
  console.log('Full path:', path.join(__dirname, 'uploads', req.url));
  next();
});

// ...existing code...

// Ensure we have a public route for events that doesn't need authentication
// This should be BEFORE any auth middleware is applied to the /events route
app.use('/events', require('./routes/eventRoutes'));

const adminRoutes = require('./routes/adminRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');

// ...existing middleware...

// IMPORTANT: Fix routes configuration to prevent duplicate /api prefixes
// =====================================================================

// 1. First configure the public routes (no auth required)
app.use('/events', require('./routes/eventRoutes'));

// 2. Configure authenticated routes with proper middleware
// Make sure we don't mount the same routes twice - remove this line:
// app.use('/api', eventRoutes); // REMOVE THIS LINE - it causes duplication

// 3. Configure authenticated routes correctly
app.use('/api/events', authMiddleware, require('./routes/eventRoutes'));

// 4. Keep other routes as they are
app.use('/api/admin', adminRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/content', require('./routes/contentRoutes'));

// Add staff routes
const staffRoutes = require('./routes/staffRoutes');
app.use('/api/staff', staffRoutes);
app.use('/donations', donationRoutes);

// Add static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add donation routes
const donationRoutes = require('./routes/donationRoutes');
app.use('/donations', donationRoutes);

// For authenticated routes, make sure middleware is applied correctly
// Protected routes should use the /api prefix
app.use('/api/events', authMiddleware, require('./routes/eventRoutes'));


