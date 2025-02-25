const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const roleAuth = require('../middleware/roleAuth');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../config/db');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/staff';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Access userId directly from decoded token
    const userId = req.user?.userId || req.user?.id;
    console.log('UserId in multer config:', userId);
    cb(null, `staff-${userId}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Staff dashboard routes
router.get('/dashboard', roleAuth(['staff']), staffController.getDashboardData);

// Profile management
router.get('/profile', roleAuth(['staff']), staffController.getProfile);
router.put('/profile',
  authMiddleware,
  roleAuth(['staff']),
  staffController.updateProfile
);

// Update profile photo route for staff
router.post('/profile-photo',
  authMiddleware,
  (req, res, next) => {
    console.log('User object in route:', req.user);
    next();
  },
  roleAuth(['staff']),
  upload.single('profilePhoto'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const userId = req.user.userId || req.user.id;
      console.log('Staff user object:', req.user);
      console.log('Staff ID being used:', userId);

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found in token' });
      }

      const uploadDir = path.join(__dirname, '..', 'uploads', 'staff');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = `/uploads/staff/${req.file.filename}`;
      console.log('File path to be saved:', filePath);
      
      // Update database with new photo path
      const result = await db.one(
        `UPDATE staff_users 
         SET profile_photo = $1 
         WHERE id = $2 
         RETURNING id, name, email, profile_photo, role`,
        [filePath, userId]
      );

      console.log('Updated staff user:', result);
      res.json({ user: result });
    } catch (error) {
      console.error('Error updating profile photo:', error);
      res.status(500).json({ error: 'Failed to update profile photo' });
    }
  }
);

// Volunteer management routes - staff can only view and update
router.get('/volunteers', roleAuth(['staff']), staffController.getVolunteers);
router.get('/volunteers/:id', roleAuth(['staff']), staffController.getVolunteerById);
router.put('/volunteers/:id', roleAuth(['staff']), staffController.updateVolunteer);

// Event management routes
router.get('/events', roleAuth(['staff']), staffController.getEvents);
router.post('/events', roleAuth(['staff']), staffController.createEvent);
router.put('/events/:id', roleAuth(['staff']), staffController.updateEvent);

module.exports = router;
