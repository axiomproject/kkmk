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

const adminRoutes = require('./routes/adminRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');

// ...existing middleware...

// Admin routes
app.use('/api/admin', adminRoutes);

// Admin authentication routes
app.use('/api/admin/auth', adminAuthRoutes);

// Event routes
const eventRoutes = require('./routes/eventRoutes');
app.use('/api', eventRoutes);

// Add this to your existing routes
app.use('/api/content', require('./routes/contentRoutes'));

// Add staff routes
const staffRoutes = require('./routes/staffRoutes');
app.use('/api/staff', staffRoutes);

// Add static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add donation routes
const donationRoutes = require('./routes/donationRoutes');
app.use('/donations', donationRoutes);


