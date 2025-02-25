const express = require('express');
const { 
  register, 
  login, 
  logout, 
  getUserByEmail,
  updateUserPhotoHandler,
  updateUserInfoHandler,
  updateUserDetailsHandler,  // Make sure this is imported
  updatePasswordHandler,  // Add this line
  verifyEmailHandler,  // Add this line
  forgotPasswordHandler,  // Add this line
  resetPasswordHandler,  // Add this line
  updateUserSocialsHandler,  // Add this import
  loginWithFace  // Add this import
} = require('../controllers/authController');
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middleware/authMiddleware'); // Add this import
const db = require('../config/db');

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
router.delete('/events/:eventId/participants/:userId', authMiddleware, eventController.removeParticipant);

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
    const existing = await db.oneOrNone(
      'SELECT id FROM dismissed_feedback WHERE user_id = $1 AND event_id = $2',
      [userId, eventId]
    );

    if (!existing) {
      await db.none(
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

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/user', getUserByEmail);
router.put('/user/photos', updateUserPhotoHandler); // Make sure this matches frontend URL
router.put('/user/info', updateUserInfoHandler);
router.put('/user/details', updateUserDetailsHandler);  // Make sure this is registered
router.put('/user/password', updatePasswordHandler);  // Add this line
router.post('/forgot-password', forgotPasswordHandler);  // Add this line
router.post('/reset-password', resetPasswordHandler);  // Add this line
router.put('/user/socials', updateUserSocialsHandler);  // Add this new route

// Add route to get users by role
router.get('/users/role/:role', async (req, res) => {
  try {
    const { role } = req.params;
    const users = await db.any(
      'SELECT id, name, email, profile_photo, role FROM users WHERE role = $1',
      [role]
    );
    res.json(users);
  } catch (error) {
    console.error('Error fetching users by role:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Add test endpoint for face data saving
router.post('/test-face-save', async (req, res) => {
  const { faceData } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (face_data, has_face_verification) VALUES ($1, $2) RETURNING id',
      [faceData, true]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Test face save error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug any unmatched routes
router.use((req, res) => {
  console.log('Unmatched auth route:', req.method, req.url);
  res.status(404).json({ error: 'Auth route not found' });
});

module.exports = router;