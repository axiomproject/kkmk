const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg'); // Add pool import
const authenticateToken = require('../middleware/authenticateToken'); // Add this line
const ScholarModel = require('../models/scholarModel');
const ReportCardModel = require('../models/reportCardModel');

const pool = new Pool({
  user: process.env.DB_USER || 'kkmk_db',
  host: process.env.DB_HOST || 'dpg-cuq5r8ggph6c73cuq6ig-a.singapore-postgres.render.com',
  database: process.env.DB_NAME || 'kkmk',
  password: process.env.DB_PASSWORD || 'c3dv1H1UcmugVinLWsxd1J4ozszIyK3C',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
}); // Updated pool configuration with Render details

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/scholars');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'scholar-' + uniqueSuffix + path.extname(file.originalname));
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

router.post('/report-card', async (req, res) => {
  try {
    const { userId, frontImage, backImage } = req.body;
    if (!userId || !frontImage || !backImage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const reportCard = await ReportCardModel.submitReportCard(userId, frontImage, backImage);
    res.status(201).json({ message: 'Report card submitted successfully', reportCard });
  } catch (error) {
    console.error('Error submitting report card:', error);
    res.status(500).json({ error: 'Failed to submit report card', details: error.message });
  }
});

router.put('/report-cards/:id/verify', async (req, res) => {
  try {
    const reportCard = await ReportCardModel.verifyReportCard(req.params.id);
    res.json(reportCard);
  } catch (error) {
    console.error('Error verifying report card:', error);
    res.status(500).json({ error: 'Failed to verify report card' });
  }
});

router.put('/report-cards/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const reportCard = await ReportCardModel.rejectReportCard(req.params.id, reason);
    res.json(reportCard);
  } catch (error) {
    console.error('Error rejecting report card:', error);
    res.status(500).json({ error: 'Failed to reject report card' });
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

router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    console.log('Updating scholar with data:', req.body);

    // Convert form data to match database columns
    const scholarData = {
      // ...existing fields...
      current_amount: parseFloat(req.body.currentAmount) || 0,
      amount_needed: parseFloat(req.body.amountNeeded) || 0,
      // Make sure these are properly converted to numbers
      first_name: req.body.firstName,
      last_name: req.body.lastName,
      address: req.body.address,
      date_of_birth: req.body.dateOfBirth,
      grade_level: req.body.gradeLevel,
      school: req.body.school,
      guardian_name: req.body.guardianName,
      guardian_phone: req.body.guardianPhone,
      gender: req.body.gender,
      favorite_subject: req.body.favoriteSubject,
      favorite_activity: req.body.favoriteActivity,
      favorite_color: req.body.favoriteColor,
      other_details: req.body.otherDetails,
      status: req.body.status // Add status handling
    };

    // Only add image_url if a new image was uploaded
    if (req.file) {
      scholarData.image_url = `/uploads/scholars/${req.file.filename}`;
    }
    
    // Log the data being sent to the model
    console.log('Scholar data being sent to update:', scholarData);
    
    const updatedScholar = await ScholarModel.updateScholar(req.params.id, scholarData);
    res.json(updatedScholar);
  } catch (error) {
    console.error('Error updating scholar:', error);
    res.status(500).json({ 
      error: 'Failed to update scholar',
      details: error.message 
    });
  }
});

// Update the route to match the frontend request
router.post('/create', upload.single('image'), async (req, res) => {
  try {
    console.log('Received scholar data:', req.body);
    
    const scholarData = {
      ...req.body,
      imageUrl: req.file ? `/uploads/scholars/${req.file.filename}` : null,
      status: req.body.status || 'active'
    };

    const newScholar = await ScholarModel.createScholar(scholarData);

    // Handle user assignment if userId is provided
    if (req.body.userId) {
      await ScholarModel.assignUser(newScholar.id, parseInt(req.body.userId));
    }

    // Fetch the complete scholar data with user info
    const finalScholar = await ScholarModel.getScholarById(newScholar.id);
    res.status(201).json(finalScholar);
  } catch (error) {
    console.error('Error creating scholar:', error);
    res.status(500).json({ error: 'Failed to create scholar profile', details: error.message });
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
    const result = await pool.query(`
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

router.put('/verify-location/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { verified, address } = req.body;
  
  try {
    const result = await pool.query(`
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
      address, // Add address to the update
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scholar not found' });
    }
    
    res.json({ 
      success: true, 
      verifiedAt: result.rows[0].location_updated_at,
      address: result.rows[0].address // Return the address in response
    });
  } catch (error) {
    console.error('Error verifying location:', error);
    res.status(500).json({ error: 'Failed to verify location' });
  }
});

router.get('/verified-locations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
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
        `http://localhost:5175${scholar.profile_photo}`
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
    const result = await pool.query(`
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

    // You could add notification logic here
    
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
    const result = await pool.query(`
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
    
    // Reset user's location data and set verification to false
    const result = await pool.query(
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
    const result = await pool.query(
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

module.exports = router;
