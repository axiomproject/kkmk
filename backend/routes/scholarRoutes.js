const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const authenticateToken = require('../middleware/authenticateToken'); // Add this line
const ScholarModel = require('../models/scholarModel');
const ReportCardModel = require('../models/reportCardModel');
const notificationModel = require('../models/notificationModel'); // Add this import
const emailService = require('../services/emailService'); // Add this import
const db = require('../config/db'); // Use the shared db connection
const notificationUtils = require('../utils/notificationUtils'); // Add this import

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for Cloudinary upload
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'scholars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  }
});

const upload = multer({ storage: storage });

// Reorder routes to put more specific routes first
// Report card routes
router.get('/report-cards/all', async (req, res) => {
  try {
    const reportCards = await ReportCardModel.getAllReportCards();
    res.json(reportCards);
  } catch (error) {
    console.error('Error fetching report cards:', error);
    res.status(500).json({ error: 'Failed to fetch report cards' });
  }
});

// Update report card routes for the 3-step process
router.post('/report-card', async (req, res) => {
  try {
    const { userId, frontImage, backImage, gradeLevel, gradingPeriod } = req.body;
    
    // Check for active submission first
    const activeReport = await ReportCardModel.getActiveReportCard(userId);
    if (activeReport) {
      return res.status(400).json({ 
        error: 'Active submission exists',
        message: 'You already have an active report card submission. Please wait for it to be processed.'
      });
    }

    if (!userId || !frontImage || !backImage || !gradeLevel || !gradingPeriod) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          userId: !userId,
          frontImage: !frontImage,
          backImage: !backImage,
          gradeLevel: !gradeLevel,
          gradingPeriod: !gradingPeriod
        }
      });
    }

    const reportCard = await ReportCardModel.submitReportCard(
      userId, 
      frontImage, 
      backImage, 
      gradeLevel,
      gradingPeriod
    );
    
    // Send notification that the report card was submitted and is pending
    await notificationModel.createReportCardStatusNotification(userId, 'pending');
    
    // Fetch scholar details for admin notification
    const scholarResult = await db.query(
      'SELECT name FROM users WHERE id = $1 AND role = $2', 
      [userId, 'scholar']
    );
    
    if (scholarResult.rows.length > 0) {
      const scholar = scholarResult.rows[0];
      // Send notification to admins
      await notificationUtils.notifyReportCardUpdate(
        reportCard.id,
        userId,
        scholar.name,
        `New report card submitted by ${scholar.name} (Grade: ${gradeLevel})`,
        'pending'
      );
    }
    
    res.status(201).json({ message: 'Report card submitted successfully', reportCard });
  } catch (error) {
    console.error('Error submitting report card:', error);
    res.status(500).json({ error: 'Failed to submit report card', details: error.message });
  }
});

// New route to move report card to "in_review" status
router.put('/report-cards/:id/review', async (req, res) => {
  try {
    const reportCard = await ReportCardModel.reviewReportCard(req.params.id);
    
    // Send notification to the scholar
    if (reportCard && reportCard.user_id) {
      await notificationModel.createReportCardStatusNotification(reportCard.user_id, 'in_review');
      
      // Fetch scholar details for admin notification
      const scholarResult = await db.query(
        'SELECT name FROM users WHERE id = $1 AND role = $2', 
        [reportCard.user_id, 'scholar']
      );
      
      if (scholarResult.rows.length > 0) {
        const scholar = scholarResult.rows[0];
        // Send notification to admins
        await notificationUtils.notifyReportCardUpdate(
          reportCard.id,
          reportCard.user_id,
          scholar.name,
          `Report card for ${scholar.name} is now under review`,
          'in_review'
        );
      }
    }
    
    res.json(reportCard);
  } catch (error) {
    console.error('Error updating report card to review status:', error);
    res.status(500).json({ error: 'Failed to update report card status' });
  }
});

// Existing verify route - now the final step
router.put('/report-cards/:id/verify', async (req, res) => {
  try {
    const reportCard = await ReportCardModel.verifyReportCard(req.params.id);
    
    // Send notification to the scholar
    if (reportCard && reportCard.user_id) {
      await notificationModel.createReportCardStatusNotification(reportCard.user_id, 'verified');
      
      // Fetch scholar details for admin notification
      const scholarResult = await db.query(
        'SELECT name FROM users WHERE id = $1 AND role = $2', 
        [reportCard.user_id, 'scholar']
      );
      
      if (scholarResult.rows.length > 0) {
        const scholar = scholarResult.rows[0];
        // Send notification to admins
        await notificationUtils.notifyReportCardUpdate(
          reportCard.id,
          reportCard.user_id,
          scholar.name,
          `Report card for ${scholar.name} has been verified successfully ✅`,
          'verified'
        );
      }
    }
    
    res.json(reportCard);
  } catch (error) {
    console.error('Error verifying report card:', error);
    res.status(500).json({ error: 'Failed to verify report card' });
  }
});

router.put('/report-cards/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const reportCard = await ReportCardModel.rejectReportCard(req.params.id, reason);
    
    // Send notification to the scholar
    if (reportCard && reportCard.user_id) {
      await notificationModel.createReportCardStatusNotification(
        reportCard.user_id, 
        'rejected',
        `Your report card was rejected: ${reason}. Please submit a new report card.`
      );
      
      // Fetch scholar details for admin notification
      const scholarResult = await db.query(
        'SELECT name FROM users WHERE id = $1 AND role = $2', 
        [reportCard.user_id, 'scholar']
      );
      
      if (scholarResult.rows.length > 0) {
        const scholar = scholarResult.rows[0];
        // Send notification to admins
        await notificationUtils.notifyReportCardUpdate(
          reportCard.id,
          reportCard.user_id,
          scholar.name,
          `Report card for ${scholar.name} has been rejected ❌ Reason: ${reason}. Scholar needs to resubmit.`,
          'rejected'
        );
      }

      // Send email notification
      try {
        const userResult = await db.query(
          'SELECT email, name FROM users WHERE id = $1',
          [reportCard.user_id]
        );
        
        if (userResult.rows.length > 0) {
          await emailService.sendReportCardStatusEmail(
            userResult.rows[0].email,
            userResult.rows[0].name,
            'rejected',
            reason
          );
        }
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }
    }
    
    res.json(reportCard);
  } catch (error) {
    console.error('Error rejecting report card:', error);
    res.status(500).json({ error: 'Failed to reject report card', details: error.message });
  }
});

router.get('/report-card/:userId', async (req, res) => {
  try {
    const reportCard = await ReportCardModel.getReportCardByUserId(req.params.userId);
    if (!reportCard) {
      return res.status(404).json({ error: 'No report card found' });
    }
    res.json(reportCard);
  } catch (error) {
    console.error('Error fetching report card:', error);
    res.status(500).json({ error: 'Failed to fetch report card status' });
  }
});

// Add new route to check for active report card
router.get('/report-card/:userId/active', async (req, res) => {
  try {
    const reportCard = await ReportCardModel.getActiveReportCard(req.params.userId);
    res.json(reportCard);
  } catch (error) {
    console.error('Error checking active report card:', error);
    res.status(500).json({ error: 'Failed to check report card status' });
  }
});

// Add this route with other report card routes
router.delete('/report-cards/:id', async (req, res) => {
  try {
    const result = await ReportCardModel.deleteReportCard(req.params.id);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Report card not found' });
    }
    res.json({ message: 'Report card deleted successfully' });
  } catch (error) {
    console.error('Error deleting report card:', error);
    res.status(500).json({ error: 'Failed to delete report card' });
  }
});

// Update the renew endpoint to better handle notifications
router.put('/report-cards/:id/renew', async (req, res) => {
  try {
    const reportCard = await ReportCardModel.renewReportCard(req.params.id);
    
    // Send notification to the scholar
    if (reportCard && reportCard.user_id) {
      await notificationModel.createReportCardStatusNotification(
        reportCard.user_id, 
        'renewal_requested', 
        'You need to submit a new report card with updated information. Your previous report card history is still available.'
      );
      
      // Fetch scholar details for admin notification
      const scholarResult = await db.query(
        'SELECT name FROM users WHERE id = $1 AND role = $2', 
        [reportCard.user_id, 'scholar']
      );
      
      if (scholarResult.rows.length > 0) {
        const scholar = scholarResult.rows[0];
        // Send notification to admins
        await notificationUtils.notifyReportCardUpdate(
          reportCard.id,
          reportCard.user_id,
          scholar.name,
          `Renewal requested for ${scholar.name}'s report card`,
          'renewal_requested'
        );
      }
      
      // Send email notification
      try {
        await emailService.sendReportCardRenewalEmail(
          reportCard.user_email,
          reportCard.user_name
        );
      } catch (emailError) {
        console.error('Failed to send renewal email:', emailError);
        // Continue even if email fails
      }
    }
    
    res.json(reportCard);
  } catch (error) {
    console.error('Error renewing report card:', error);
    res.status(500).json({ error: 'Failed to renew report card' });
  }
});

// Add new route to get report card history - Make sure ReportCardModel is properly imported
router.get('/report-card/:userId/history', authenticateToken, async (req, res) => {
  try {
    console.log(`Fetching history for user ID: ${req.params.userId}`);
    
    // Check if the function exists
    if (typeof ReportCardModel.getReportCardHistory !== 'function') {
      console.error('ReportCardModel.getReportCardHistory is not a function');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'The history function is not properly defined'
      });
    }
    
    const history = await ReportCardModel.getReportCardHistory(req.params.userId);
    res.json(history);
  } catch (error) {
    console.error('Error fetching report card history:', error);
    res.status(500).json({ error: 'Failed to fetch report card history' });
  }
});

// Add route to get a specific history entry - Add authentication middleware
router.get('/report-card/history/:historyId', authenticateToken, async (req, res) => {
  try {
    const historyEntry = await ReportCardModel.getReportCardHistoryById(req.params.historyId);
    if (!historyEntry) {
      return res.status(404).json({ error: 'Report card history entry not found' });
    }
    res.json(historyEntry);
  } catch (error) {
    console.error('Error fetching report card history entry:', error);
    res.status(500).json({ error: 'Failed to fetch report card history entry' });
  }
});

// Scholar routes
router.get('/:id([0-9]+)', async (req, res) => {
  try {
    const scholar = await ScholarModel.getScholarById(req.params.id);
    if (!scholar) {
      return res.status(404).json({ error: 'Scholar not found' });
    }
    res.json(scholar);
  } catch (error) {
    console.error('Error fetching scholar:', error);
    res.status(500).json({ error: 'Failed to fetch scholar details' });
  }
});

// Add a route to get all scholars
router.get('/', async (req, res) => {
  try {
    const scholars = await ScholarModel.getAllScholars();
    res.json(scholars);
  } catch (error) {
    console.error('Error fetching scholars:', error);
    res.status(500).json({ error: 'Failed to fetch scholars' });
  }
});

// Create a new scholar
router.post('/create', upload.single('image'), async (req, res) => {
  try {
    const scholarData = {
      ...req.body,
      imageUrl: req.file ? req.file.path : null
    };

    const scholar = await ScholarModel.createScholar(scholarData);
    res.status(201).json(scholar);
  } catch (error) {
    console.error('Error creating scholar:', error);
    res.status(500).json({ error: 'Failed to create scholar' });
  }
});

// Update a scholar
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const updates = {
      ...req.body
    };

    if (req.file) {
      updates.imageUrl = req.file.path;
    }

    const scholar = await ScholarModel.updateScholar(req.params.id, updates);
    res.json(scholar);
  } catch (error) {
    console.error('Error updating scholar:', error);
    res.status(500).json({ error: 'Failed to update scholar' });
  }
});

// Add new route for assigning user to scholar profile
router.post('/:id/assign-user', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const updatedScholar = await ScholarModel.assignUser(id, userId);
    res.json(updatedScholar);
  } catch (error) {
    console.error('Error assigning user to scholar:', error);
    if (error.message.includes('already assigned')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to assign user to scholar profile' });
  }
});

// Add new route for removing user assignment
router.delete('/:id/unassign-user', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedScholar = await ScholarModel.unassignUser(id);
    res.json(updatedScholar);
  } catch (error) {
    console.error('Error removing user assignment:', error);
    res.status(500).json({ error: 'Failed to remove user assignment' });
  }
});

// Add this DELETE route before other scholar routes
router.delete('/:id', async (req, res) => {
  try {
    const result = await ScholarModel.deleteScholar(req.params.id);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Scholar not found' });
    }
    res.json({ message: 'Scholar deleted successfully' });
  } catch (error) {
    console.error('Error deleting scholar:', error);
    res.status(500).json({ error: 'Failed to delete scholar' });
  }
});

// Add these new routes
router.get('/pending-locations', authenticateToken, async (req, res) => {
  try {
    // Replace pool.query with db.query
    const result = await db.query(`
      SELECT 
        id,
        name,
        latitude::text,
        longitude::text,
        profile_photo,
        location_updated_at,
        location_verified,
        email,
        phone
      FROM users
      WHERE role = 'scholar'
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND (location_verified = false OR location_verified IS NULL)
      ORDER BY location_updated_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending locations:', error);
    res.status(500).json({ error: 'Failed to fetch pending locations' });
  }
});

// Update this route to include admin notification
router.put('/verify-location/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { verified, address } = req.body;
  
  try {
    // Get scholar details before updating
    const scholarResult = await db.query(`
      SELECT name, email FROM users WHERE id = $1 AND role = 'scholar'
    `, [id]);
    
    if (scholarResult.rows.length === 0) {
      return res.status(404).json({ error: 'Scholar not found' });
    }
    
    const scholar = scholarResult.rows[0];
    
    // Update the scholar's location verification status
    const result = await db.query(`
      UPDATE users
      SET location_verified = $1,
          location_updated_at = CURRENT_TIMESTAMP,
          location_remark = $2,
          address = $3
      WHERE id = $4 AND role = 'scholar'
      RETURNING id, location_updated_at, address
    `, [
      verified, 
      'Your location is verified',
      address,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scholar not found' });
    }
    
    // Send notification to scholar
    await notificationModel.createLocationVerificationNotification(
      id,
      'Your location has been verified successfully! 📍✅'
    );
    
    // Send notification to admins - make sure notificationUtils is imported at the top
    await notificationUtils.notifyScholarLocationUpdate(
      id,
      scholar.name,
      `Location for scholar ${scholar.name} has been verified ✅`
    );
    
    // Send email notification
    try {
      await emailService.sendLocationStatusEmail(
        scholar.email,
        scholar.name,
        'verified'
      );
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue even if email fails - the API update was successful
    }
    
    res.json({ 
      success: true, 
      verifiedAt: result.rows[0].location_updated_at,
      address: result.rows[0].address
    });
  } catch (error) {
    console.error('Error verifying location:', error);
    res.status(500).json({ error: 'Failed to verify location' });
  }
});

router.get('/verified-locations', authenticateToken, async (req, res) => {
  try {
    // Replace pool.query with db.query
    const result = await db.query(`
      SELECT 
        s.id,
        s.name,
        s.latitude::text,
        s.longitude::text,
        s.email,
        s.phone,
        s.location_verified,
        s.location_updated_at,
        s.address,
        CASE 
          WHEN s.profile_photo LIKE 'http%' THEN s.profile_photo
          WHEN s.profile_photo LIKE 'data:image%' THEN s.profile_photo
          WHEN s.profile_photo LIKE '/uploads/%' THEN s.profile_photo
          WHEN s.profile_photo IS NOT NULL THEN '/uploads/' || s.profile_photo
          ELSE NULL
        END as profile_photo
      FROM users s
      WHERE s.role = 'scholar'
        AND s.latitude IS NOT NULL
        AND s.longitude IS NOT NULL
        AND s.location_verified = true
      ORDER BY s.name ASC
    `);
    
    // Handle different types of profile photo data
    const scholars = result.rows.map(scholar => ({
      ...scholar,
      profile_photo: scholar.profile_photo ? (
        scholar.profile_photo.startsWith('data:image') ? scholar.profile_photo :
        scholar.profile_photo.startsWith('http') ? scholar.profile_photo :
        `${scholar.profile_photo}`
      ) : null
    }));

    console.log('Profile photo debug:', scholars.map(s => ({
      id: s.id,
      photoType: s.profile_photo ? (
        s.profile_photo.startsWith('data:image') ? 'base64' :
        s.profile_photo.startsWith('http') ? 'url' : 'path'
      ) : 'none'
    })));

    res.json(scholars);
  } catch (error) {
    console.error('Error fetching verified locations:', error);
    res.status(500).json({ error: 'Failed to fetch verified locations' });
  }
});

// Add this route near the other location-related routes
router.post('/location-remark/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { remark, visitDate } = req.body;
  
  try {
    // Get scholar details first
    const scholarResult = await db.query(`
      SELECT name, email FROM users WHERE id = $1 AND role = 'scholar'
    `, [id]);
    
    if (scholarResult.rows.length === 0) {
      return res.status(404).json({ error: 'Scholar not found' });
    }
    
    const scholar = scholarResult.rows[0];
    
    // Update the database
    const result = await db.query(`
      UPDATE users
      SET location_remark = $1,
          scheduled_visit = $2,
          remark_added_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND role = 'scholar'
      RETURNING id, name, email
    `, [remark, visitDate, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scholar not found' });
    }

    // Send notification
    await notificationModel.createLocationRemarkNotification(
      id,
      `Scheduled visit: ${new Date(visitDate).toLocaleDateString()} 📅`
    );
    
    // Send email notification
    try {
      await emailService.sendLocationStatusEmail(
        scholar.email,
        scholar.name,
        'remark',
        remark,
        visitDate
      );
    } catch (emailError) {
      console.error('Failed to send remark email:', emailError);
      // Continue even if email fails
    }
    
    res.json({ 
      success: true, 
      message: 'Remark added successfully',
      scholar: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding remark:', error);
    res.status(500).json({ error: 'Failed to add remark' });
  }
});

// Add this new route
router.get('/location-remarks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Replace pool.query with db.query
    const result = await db.query(`
      SELECT 
        location_remark,
        scheduled_visit,
        remark_added_at,
        location_verified
      FROM users
      WHERE id = $1 AND role = 'scholar'
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scholar not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching remarks:', error);
    res.status(500).json({ error: 'Failed to fetch remarks' });
  }
});

// Update the reject location endpoint
router.post('/location-remarks/:scholarId/reject', authenticateToken, async (req, res) => {
  try {
    const { scholarId } = req.params;
    const { location_remark } = req.body;
    
    // Get scholar details first
    const scholarResult = await db.query(`
      SELECT name, email FROM users WHERE id = $1 AND role = 'scholar'
    `, [scholarId]);
    
    if (scholarResult.rows.length === 0) {
      return res.status(404).json({ error: 'Scholar not found' });
    }
    
    const scholar = scholarResult.rows[0];
    
    // Reset user's location data and set verification to false
    const result = await db.query(
      `UPDATE users 
       SET location_verified = false,
           latitude = NULL,
           longitude = NULL,
           location_updated_at = NULL,
           location_remark = $1
       WHERE id = $2 AND role = 'scholar'
       RETURNING id`,
      [location_remark, scholarId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scholar not found' });
    }

    // Send notification to scholar
    await notificationModel.createLocationVerificationNotification(
      scholarId,
      'Your location has been rejected. Please update your location. 📍❌'
    );
    
    // Send notification to admins - make sure notificationUtils is imported at the top
    await notificationUtils.notifyScholarLocationUpdate(
      scholarId,
      scholar.name,
      `Location for scholar ${scholar.name} has been rejected ❌ Reason: ${location_remark || 'No reason provided'}`
    );
    
    // Send email notification
    try {
      await emailService.sendLocationStatusEmail(
        scholar.email,
        scholar.name,
        'rejected',
        location_remark
      );
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
      // Continue even if email fails
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error rejecting location:', error);
    res.status(500).json({ error: 'Failed to reject location' });
  }
});

// Fix the route path by removing 'scholars' from the path
router.put('/reset-location/:id', authenticateToken, async (req, res) => {
  try {
    const scholarId = req.params.id;
    // Replace pool.query with db.query
    const result = await db.query(
      `UPDATE users 
       SET location_verified = FALSE,
           latitude = NULL,
           longitude = NULL,
           location_updated_at = NULL,
           location_remark = NULL,
           scheduled_visit = NULL,
           remark_added_at = NULL,
           address = NULL
       WHERE id = $1 AND role = 'scholar'
       RETURNING id`,
      [scholarId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scholar not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error resetting location:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add notification when a scholar updates their location
router.post('/update-location', authenticateToken, async (req, res) => {
  try {
    const { userId, latitude, longitude, address } = req.body;
    
    // Validate input
    if (!userId || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user details to ensure it's a scholar
    const userResult = await db.query(
      'SELECT name, email, role FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    if (user.role !== 'scholar') {
      return res.status(403).json({ error: 'Only scholars can update their location' });
    }
    
    // Update location
    const result = await db.query(
      `UPDATE users 
       SET latitude = $1,
           longitude = $2,
           location_updated_at = CURRENT_TIMESTAMP,
           location_verified = false,
           address = $3
       WHERE id = $4
       RETURNING id, latitude, longitude, location_updated_at`,
      [latitude, longitude, address, userId]
    );
    
    // Notify admins about the updated location
    await notificationUtils.notifyScholarLocationUpdate(
      userId,
      user.name,
      `New location update from scholar ${user.name} requires verification 📍`
    );
    
    res.json({ 
      success: true, 
      message: 'Location updated successfully',
      location: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

module.exports = router;
