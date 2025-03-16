const express = require('express');
const { 
  register, 
  login, 
  logout, 
  getUserByEmail,
  updateUserPhotoHandler,
  updateUserInfoHandler,
  updateUserDetailsHandler,
  updatePasswordHandler,
  verifyEmailHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  updateUserSocialsHandler,
  loginWithFace
} = require('../controllers/authController');
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const userModel = require('../models/userModel');
const emailService = require('../services/emailService');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

// Add a check to skip forum routes
router.use((req, res, next) => {
  if (req.path.startsWith('/forum')) {
    return next('route');
  }
  console.log('Auth route hit:', req.method, req.url);
  next();
});

// Add more detailed logging middleware
router.use((req, res, next) => {
  console.log('Auth route details:', {
    method: req.method,
    url: req.url,
    path: req.path,
    params: req.params,
    query: req.query,
    originalUrl: req.originalUrl
  });
  next();
});

// Add debug middleware for face data
router.use('/register', (req, res, next) => {
  if (req.body.faceData) {
    try {
      const parsed = JSON.parse(req.body.faceData);
      console.log('Face data structure:', {
        hasDescriptors: !!parsed.descriptors,
        descriptorsLength: parsed.descriptors?.length,
        descriptorsSample: parsed.descriptors?.[0]?.slice(0, 5),
        hasLandmarks: !!parsed.landmarks,
        landmarksLength: parsed.landmarks?.length
      });
    } catch (e) {
      console.error('Face data parsing error:', e);
    }
  }
  next();
});

// Move verify email route to top and add logging
router.get('/verify-email/:token', (req, res, next) => {
  console.log('Verification route hit:', {
    token: req.params.token,
    fullUrl: req.originalUrl
  });
  verifyEmailHandler(req, res, next);
});

// Add the face login route
router.post('/login/face', loginWithFace);
router.post('/events/:eventId/join', authMiddleware, eventController.joinEvent);
router.post('/events/:eventId/unjoin', authMiddleware, eventController.unjoinEvent);
router.get('/events/:eventId/participants', eventController.getEventParticipants);
router.get('/events/:eventId/check-participation', authMiddleware, eventController.checkParticipation);

// Add this route with other event routes
router.delete('/events/:eventId/participants/:userId', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin or staff
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Not authorized to remove participants' });
    }

    const { eventId, userId } = req.params;
    const { reason } = req.body; // Get optional removal reason from request body
    
    // Remove participant and get info for notifications
    const EventModel = require('../models/eventModel');
    const result = await EventModel.removeParticipant(eventId, userId, reason, {
      id: req.user.id,
      name: req.user.name,
      profile_photo: req.user.profile_photo
    });
    
    // Send email notification if we have email service configured
    try {
      const emailService = require('../services/emailService');
      await emailService.sendParticipantRemovalEmail(
        result.user.email,
        result.user.name,
        result.eventTitle,
        reason || 'No specific reason provided'
      );
    } catch (emailError) {
      console.error('Failed to send removal email:', emailError);
      // Continue even if email fails - we don't want to fail the API call
    }
    
    // Create in-app notification for the volunteer
    try {
      const notificationModel = require('../models/notificationModel');
      await notificationModel.createParticipantRemovalNotification(
        userId, 
        eventId, 
        result.eventTitle, 
        reason,
        {
          id: req.user.id,
          name: req.user.name,
          profile_photo: req.user.profile_photo
        }
      );
    } catch (notificationError) {
      console.error('Failed to create removal notification:', notificationError);
      // Continue even if notification fails
    }

    res.json({ 
      message: 'Participant removed successfully',
      event: result.event
    });
  } catch (error) {
    console.error('Error removing participant:', error);
    res.status(500).json({ error: 'Failed to remove participant' });
  }
});

// Add new route for manually adding volunteers
router.post('/events/:eventId/add-volunteer', authMiddleware, eventController.addVolunteer);

// Add new route to get volunteers list
router.get('/admin/volunteers', authMiddleware, eventController.getVolunteers);

// Modify the dismiss feedback route to handle duplicates
router.post('/events/:eventId/dismiss-feedback', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // First check if already dismissed
    // Replace db.oneOrNone with db.query
    const existingResult = await db.query(
      'SELECT id FROM dismissed_feedback WHERE user_id = $1 AND event_id = $2',
      [userId, eventId]
    );
    
    const existing = existingResult.rows[0];

    if (!existing) {
      // Replace db.none with db.query
      await db.query(
        `INSERT INTO dismissed_feedback (user_id, event_id, dismissed_at) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        [userId, eventId]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error dismissing feedback:', error);
    res.status(500).json({ error: 'Failed to dismiss feedback' });
  }
});

// Add this route with other event routes
router.put('/events/:eventId/participants/:userId/approve', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin or staff
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Not authorized to approve participants' });
    }

    const { eventId, userId } = req.params;

    // First, check if the participant exists and is in PENDING status
    const participantResult = await db.query(
      'SELECT ep.*, e.title as event_title, u.email as user_email, u.name as user_name FROM event_participants ep JOIN events e ON ep.event_id = e.id JOIN users u ON ep.user_id = u.id WHERE ep.event_id = $1 AND ep.user_id = $2',
      [eventId, userId]
    );

    if (participantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found in this event' });
    }

    const participant = participantResult.rows[0];
    
    if (participant.status !== 'PENDING') {
      return res.status(400).json({ error: 'Participant is already approved or has another status' });
    }

    // Update participant status to ACTIVE
    await db.query(
      'UPDATE event_participants SET status = $1 WHERE event_id = $2 AND user_id = $3',
      ['ACTIVE', eventId, userId]
    );

    // Send email notification if we have email service configured
    try {
      const emailService = require('../services/emailService');
      await emailService.sendParticipantApprovalEmail(
        participant.user_email,
        participant.user_name,
        participant.event_title
      );
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
      // Continue even if email fails - we don't want to fail the API call
    }
    
    // Create in-app notification for the volunteer
    try {
      const notificationModel = require('../models/notificationModel');
      await notificationModel.createNotification({
        userId: userId,
        type: 'event_approval',
        content: `Your participation in "${participant.event_title}" has been approved!`,
        relatedId: eventId,
        actorId: req.user.id,
        actorName: req.user.name || 'Admin',
        actorAvatar: req.user.profile_photo || '/images/notify-icon.png'
      });
    } catch (notificationError) {
      console.error('Failed to create approval notification:', notificationError);
      // Continue even if notification fails
    }

    // Return updated participant info
    res.json({
      message: 'Participant approved successfully',
      eventId,
      userId
    });
    
  } catch (error) {
    console.error('Error approving participant:', error);
    res.status(500).json({ error: 'Failed to approve participant' });
  }
});

// Add this route for rejecting participants
router.put('/events/:eventId/participants/:userId/reject', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin or staff
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Not authorized to reject participants' });
    }

    const { eventId, userId } = req.params;
    const { reason } = req.body; // Optional rejection reason

    // First, check if the participant exists and is in PENDING status
    const participantResult = await db.query(
      'SELECT ep.*, e.title as event_title, u.email as user_email, u.name as user_name FROM event_participants ep JOIN events e ON ep.event_id = e.id JOIN users u ON ep.user_id = u.id WHERE ep.event_id = $1 AND ep.user_id = $2',
      [eventId, userId]
    );

    if (participantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found in this event' });
    }

    const participant = participantResult.rows[0];
    
    // Remove the participant from the event
    await db.query(
      'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );

    // Update event's current_volunteers count
    await db.query(
      'UPDATE events SET current_volunteers = current_volunteers - 1 WHERE id = $1 AND current_volunteers > 0',
      [eventId]
    );

    // Send email notification if we have email service configured
    try {
      const emailService = require('../services/emailService');
      await emailService.sendParticipantRejectionEmail(
        participant.user_email,
        participant.user_name,
        participant.event_title,
        reason || 'No specific reason provided'
      );
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
      // Continue even if email fails
    }

    // Create in-app notification for the volunteer
    try {
      const notificationModel = require('../models/notificationModel');
      await notificationModel.createNotification({
        userId: userId,
        type: 'event_rejection',
        content: `Your request to join "${participant.event_title}" was not approved.${reason ? ' Reason: ' + reason : ''}`,
        relatedId: eventId,
        actorId: req.user.id,
        actorName: req.user.name || 'Admin',
        actorAvatar: req.user.profile_photo || '/images/notify-icon.png'
      });
    } catch (notificationError) {
      console.error('Failed to create rejection notification:', notificationError);
      // Continue even if notification fails
    }

    // Return success response
    res.json({
      message: 'Participant rejected successfully',
      eventId,
      userId
    });
    
  } catch (error) {
    console.error('Error rejecting participant:', error);
    res.status(500).json({ error: 'Failed to reject participant' });
  }
});

// Configure multer storage for document uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/scholar-documents';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Create a unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Set file filter for documents
const fileFilter = (req, file, cb) => {
  // Accept only specific file types
  if (
    file.mimetype === 'application/pdf' || 
    file.mimetype === 'image/jpeg' || 
    file.mimetype === 'image/png'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed.'), false);
  }
};

// Configure multer upload
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Setup fields for document uploads
const documentUpload = upload.fields([
  { name: 'schoolRegistrationForm', maxCount: 1 },
  { name: 'psaDocument', maxCount: 1 },
  { name: 'parentsId', maxCount: 1 },
  { name: 'reportCard', maxCount: 1 }
]);

// Add logging middleware for debugging registration requests
router.post('/register', documentUpload, async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      extension,
      gender,
      name,
      username,
      email,
      phone,
      password,
      dateOfBirth,
      role,
      faceData,
      guardianName,
      guardianPhone,
      address,
      educationLevel,
      school,
      parentsIncome,
    } = req.body;

    // Parse skills and disability data
    let skills = null;
    if (req.body.skills) {
      try {
        skills = JSON.parse(req.body.skills);
      } catch (e) {
        console.error('Error parsing skills JSON:', e);
      }
    }
    
    let disability = null;
    if (req.body.disability) {
      try {
        disability = JSON.parse(req.body.disability);
      } catch (e) {
        console.error('Error parsing disability JSON:', e);
      }
    }
    
    // Handle document file paths
    const documentPaths = {};
    if (req.files) {
      Object.keys(req.files).forEach(fieldname => {
        if (req.files[fieldname] && req.files[fieldname].length > 0) {
          documentPaths[fieldname] = `/uploads/scholar-documents/${req.files[fieldname][0].filename}`;
        }
      });
    }

    // Create user
    const { user, verificationToken } = await userModel.createUser(
      firstName,
      middleName,
      lastName,
      extension,
      gender,
      name,
      username,
      email,
      phone,
      password,
      dateOfBirth,
      role,
      faceData,
      guardianName,
      guardianPhone,
      address,
      educationLevel,
      school,
      parentsIncome,
      skills,
      disability,
      documentPaths // Pass document paths to be stored in the database
    );

    // Send verification email
    if (email) {
      try {
        await emailService.sendVerificationEmail(email, verificationToken);
      } catch (error) {
        console.error('Failed to send verification email:', error);
        // Continue without failing the registration
      }
    }

    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      userId: user.id,
      role: user.role
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Check for specific error types
    if (error.message.includes('duplicate key') && error.message.includes('username')) {
      return res.status(409).json({ 
        error: 'Username already taken',
        field: 'username',
        detail: 'This username is already in use. Please choose another one.'
      });
    }
    
    if (error.message.includes('duplicate key') && error.message.includes('email')) {
      return res.status(409).json({ 
        error: 'Email already registered',
        field: 'email',
        detail: 'This email address is already registered. Please use a different email or try to log in.'
      });
    }
    
    // If error was caused by multer
    if (error.message.includes('Invalid file type')) {
      return res.status(400).json({ 
        error: 'Invalid file type',
        detail: 'Only PDF, JPEG, and PNG files are allowed for document uploads.'
      });
    }
    
    if (error.message.includes('File too large')) {
      return res.status(400).json({
        error: 'File too large',
        detail: 'File size exceeds the 5MB limit.'
      });
    }
    
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', login);
router.post('/logout', logout);
router.get('/user', getUserByEmail);
router.put('/user/photos', updateUserPhotoHandler);
router.put('/user/info', updateUserInfoHandler);
router.put('/user/details', updateUserDetailsHandler);
router.put('/user/password', updatePasswordHandler);
router.post('/forgot-password', forgotPasswordHandler);
router.post('/reset-password', resetPasswordHandler);
router.put('/user/socials', updateUserSocialsHandler);

// Add route to get users by role
router.get('/users/role/:role', async (req, res) => {
  try {
    const { role } = req.params;
    // Replace db.any with db.query
    const result = await db.query(
      'SELECT id, name, email, profile_photo, role FROM users WHERE role = $1',
      [role]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users by role:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Add test endpoint for face data saving
router.post('/test-face-save', async (req, res) => {
  const { faceData } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO users (face_data, has_face_verification) VALUES ($1, $2) RETURNING id',
      [faceData, true]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Test face save error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add endpoint to check if username is available
router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const result = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    
    if (result.rows.length > 0) {
      return res.status(409).json({ available: false, message: 'This username is already registered. Please choose another username.' });
    }
    
    res.json({ available: true, message: 'Username is available' });
  } catch (error) {
    console.error('Error checking username:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to check username availability' });
  }
});

// Add endpoint to check if email is available
router.get('/check-email', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const result = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (result.rows.length > 0) {
      return res.status(409).json({ available: false, message: 'This email is already registered. Please use another email address.' });
    }
    
    res.json({ available: true, message: 'Email is available' });
  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to check email availability' });
  }
});

// Debug any unmatched routes
router.use((req, res) => {
  console.log('Unmatched auth route:', req.method, req.url);
  res.status(404).json({ error: 'Auth route not found' });
});

module.exports = router;