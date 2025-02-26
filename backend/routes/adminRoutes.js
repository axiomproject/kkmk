const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const scholarController = require('../controllers/scholarController'); // Add this line
const adminModel = require('../models/adminModel');
const roleAuth = require('../middleware/roleAuth');
const eventController = require('../controllers/eventController');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware'); // Add this line
const db = require('../config/db'); // Add this line
const bcrypt = require('bcrypt'); // Add this line
const fs = require('fs'); // Add this line

// Add this constant for sponsor routes
const authenticateToken = authMiddleware;

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userRole = req.user.role;
    const uploadDir = `uploads/${userRole}`;
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userRole = req.user.role;
    cb(null, `${userRole}-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
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

// User management
router.get('/users', roleAuth(['admin', 'staff']), adminController.getUsers);
router.put('/users/:id', roleAuth(['admin']), adminController.updateUser);
router.delete('/users/:id', roleAuth(['admin']), adminController.deleteUser);


// Volunteer management - Update these routes
router.get('/volunteers', roleAuth(['admin', 'staff']), adminController.getVolunteers);
router.post('/volunteers', roleAuth(['admin', 'staff']), adminController.createVolunteer);

// Move bulk delete BEFORE the /:id routes
router.delete('/volunteers/bulk', roleAuth(['admin', 'staff']), async (req, res) => {
  try {
    const { ids } = req.body;
    console.log('Received IDs for bulk delete:', ids); // Debug log

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      console.log('Invalid or empty IDs array:', ids); // Debug log
      return res.status(400).json({ error: 'Invalid volunteer IDs provided' });
    }

    // Validate that all IDs are numbers
    const validIDs = ids.every(id => !isNaN(id) && Number.isInteger(Number(id)));

    if (!validIDs) {
      console.log('Invalid ID format found in:', ids); // Debug log
      return res.status(400).json({ error: 'Invalid ID format: all IDs must be integers' });
    }

    const result = await adminModel.bulkDeleteVolunteers(ids);
    console.log('Bulk delete result:', result); // Debug log
    res.json({ message: 'Volunteers deleted successfully', count: result.rowCount });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete volunteers' });
  }
});

// Then place the individual routes after
router.get('/volunteers/:id', roleAuth(['admin', 'staff']), adminController.getVolunteerById);
router.put('/volunteers/:id', roleAuth(['admin', 'staff']), adminController.updateVolunteer);
router.delete('/volunteers/:id', roleAuth(['admin', 'staff']), adminController.deleteVolunteer);

// Staff management (admin only) - Reorder routes to put bulk delete first
router.get('/staff', roleAuth(['admin']), adminController.getStaffMembers);
router.post('/staff', roleAuth(['admin']), adminController.createStaffMember);

// Add bulk delete route for staff BEFORE the /:id routes
router.delete('/staff/bulk', roleAuth(['admin']), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid staff IDs provided' });
    }

    // Validate that all IDs are numbers
    const validIDs = ids.every(id => !isNaN(id) && Number.isInteger(Number(id)));

    if (!validIDs) {
      return res.status(400).json({ error: 'Invalid ID format: all IDs must be integers' });
    }

    const result = await adminModel.bulkDeleteStaffMembers(ids);
    res.json({ message: 'Staff members deleted successfully', count: result.rowCount });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete staff members' });
  }
});

// Then place the individual ID routes after
router.get('/staff/:id', roleAuth(['admin']), adminController.getStaffMember);
router.put('/staff/:id', roleAuth(['admin']), adminController.updateStaffMember);
router.delete('/staff/:id', roleAuth(['admin']), adminController.deleteStaffMember);

// Scholar management routes
router.get('/scholars', roleAuth(['admin', 'staff']), scholarController.getScholars);
router.get('/scholars/:id', roleAuth(['admin', 'staff']), scholarController.getScholarById);
router.post('/scholars', roleAuth(['admin']), scholarController.createScholar);
router.put('/scholars/:id', roleAuth(['admin']), scholarController.updateScholar);
router.delete('/scholars/:id', roleAuth(['admin']), scholarController.deleteScholar);
router.post('/scholars/bulk-delete', roleAuth(['admin']), scholarController.bulkDeleteScholars); // Changed from delete to post

// Add this new endpoint
router.get('/scholar-count', async (req, res) => {
  try {
    // Replace db.one with db.query
    const result = await db.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role = 'scholar'
    `);
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error getting scholar count:', error);
    res.status(500).json({ error: 'Failed to get scholar count' });
  }
});

// Simplify the scholar reports endpoint to just count total reports
router.get('/scholar-reports', async (req, res) => {
  try {
    // Replace db.one with db.query
    const result = await db.query(`
      SELECT COUNT(*) as count
      FROM report_cards
      WHERE submitted_at >= NOW() - INTERVAL '30 days'
    `);
    
    res.json({
      count: parseInt(result.rows[0].count)
    });
  } catch (error) {
    console.error('Error getting scholar reports count:', error);
    res.status(500).json({ error: 'Failed to get scholar reports count' });
  }
});

// Update this endpoint to simply sum quantities without status check
router.get('/items-distributed', async (req, res) => {
  try {
    // Replace db.one with db.query
    const result = await db.query(`
      SELECT COALESCE(SUM(quantity), 0) as total_items
      FROM item_distributions
    `);
    res.json({ count: parseInt(result.rows[0].total_items) });
  } catch (error) {
    console.error('Error getting items distributed count:', error);
    res.status(500).json({ error: 'Failed to get items distributed count' });
  }
});

// Add the profile photo upload route
router.post('/profile-photo', 
  authMiddleware, // Add main auth middleware first
  roleAuth(['admin', 'staff']), 
  upload.single('profilePhoto'), 
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { role, id } = req.user;
      const filePath = `/uploads/${role}/${req.file.filename}`;
      const tableName = role === 'admin' ? 'admin_users' : 'staff_users';

      // Replace db.one with db.query
      const result = await db.query(
        `UPDATE ${tableName} 
         SET profile_photo = $1 
         WHERE id = $2 
         RETURNING id, name, email, profile_photo, role`,
        [filePath, id]
      );

      res.json({ user: result.rows[0] });
    } catch (error) {
      console.error('Error updating profile photo:', error);
      res.status(500).json({ error: 'Failed to update profile photo' });
    }
  }
);

// Add profile update route
router.put('/profile', 
  authMiddleware,
  roleAuth(['admin', 'staff']),
  async (req, res) => {
    try {
      const { name, email, currentPassword, newPassword } = req.body;
      const { role, id } = req.user;
      const tableName = role === 'admin' ? 'admin_users' : 'staff_users';

      // Get current user data - replace db.one with db.query
      const userResult = await db.query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
      const user = userResult.rows[0];

      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Prepare update query
      let updateQuery = `
        UPDATE ${tableName}
        SET name = $1, email = $2
      `;
      let queryParams = [name, email];

      // Add password update if provided
      if (newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        updateQuery += `, password = $${queryParams.length + 1}`;
        queryParams.push(hashedPassword);
      }

      // Add WHERE clause and RETURNING
      updateQuery += ` WHERE id = $${queryParams.length + 1}
                      RETURNING id, name, email, profile_photo, role`;
      queryParams.push(id);

      // Replace db.one with db.query
      const result = await db.query(updateQuery, queryParams);
      res.json({ user: result.rows[0] });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// Event management
router.get('/events', eventController.getEvents);
router.get('/events/:id', eventController.getEvent);
router.post('/events', eventController.createEvent);
router.put('/events/:id', eventController.updateEvent);
router.delete('/events/:id', eventController.deleteEvent);

// Add new endpoint for events count
router.get('/events-count', async (req, res) => {
  try {
    // Replace db.one with db.query
    const result = await db.query(`
      SELECT COUNT(*) as count 
      FROM events
    `);
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error getting events count:', error);
    res.status(500).json({ error: 'Failed to get events count' });
  }
});

// Add new endpoint for new users count (volunteers and sponsors)
router.get('/new-users-count', async (req, res) => {
  try {
    // Replace db.one with db.query
    const result = await db.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role IN ('volunteer', 'sponsor')
      AND created_at >= NOW() - INTERVAL '30 days'
    `);
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error getting new users count:', error);
    res.status(500).json({ error: 'Failed to get new users count' });
  }
});

// Update generous donors endpoint to only show donors who have made donations in the current month
router.get('/generous-donors', async (req, res) => {
  try {
    // Replace db.any with db.query
    const result = await db.query(`
      WITH combined_donations AS (
        -- First, handle registered users' donations separately
        SELECT 
          u.id,
          u.name,
          u.profile_photo,
          COALESCE(SUM(sd.amount), 0) as total_donations
        FROM users u
        LEFT JOIN scholar_donations sd ON u.id = sd.sponsor_id 
        WHERE sd.verification_status = 'verified'
        AND DATE_TRUNC('month', sd.created_at) = DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY u.id, u.name, u.profile_photo

        UNION ALL

        -- Then handle anonymous monetary donations separately
        SELECT 
          NULL as id,
          md.full_name as name,
          NULL as profile_photo,
          SUM(md.amount) as total_donations
        FROM monetary_donations md
        WHERE md.verification_status = 'verified'
        AND DATE_TRUNC('month', md.created_at) = DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY md.full_name
      )
      SELECT 
        id,
        name,
        profile_photo,
        SUM(total_donations) as total_donations
      FROM combined_donations
      WHERE total_donations > 0
      GROUP BY id, name, profile_photo
      ORDER BY total_donations DESC
      LIMIT 4
    `);

    const donorsWithFormattedAmount = result.rows.map(donor => ({
      ...donor,
      total_donations: parseFloat(donor.total_donations).toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP'
      })
    }));

    res.json(donorsWithFormattedAmount);
  } catch (error) {
    console.error('Error getting generous donors:', error);
    res.status(500).json({ error: 'Failed to get generous donors' });
  }
});

// Update donations summary endpoint to match Bank and ScholarDonations logic
router.get('/donations-summary', async (req, res) => {
  try {
    // Replace db.one with db.query
    const result = await db.query(`
      WITH monthly_totals AS (
        SELECT 
          DATE_TRUNC('month', month) as month_start,
          SUM(total) as total_amount
        FROM (
          -- Get verified scholar donations
          SELECT 
            created_at as month,
            amount as total
          FROM scholar_donations
          WHERE verification_status = 'verified'
          
          UNION ALL
          
          -- Get verified monetary donations
          SELECT 
            created_at as month,
            amount as total
          FROM monetary_donations
          WHERE verification_status = 'verified'
        ) all_donations
        WHERE month >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
        GROUP BY DATE_TRUNC('month', month)
      )
      SELECT 
        COALESCE((
          SELECT total_amount 
          FROM monthly_totals 
          WHERE month_start = DATE_TRUNC('month', NOW())
        ), 0) as current_month,
        COALESCE((
          SELECT total_amount 
          FROM monthly_totals 
          WHERE month_start = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
        ), 0) as previous_month,
        CASE 
          WHEN COALESCE((
            SELECT total_amount 
            FROM monthly_totals 
            WHERE month_start = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
          ), 0) = 0 THEN 0
          ELSE (
            ((COALESCE((
              SELECT total_amount 
              FROM monthly_totals 
              WHERE month_start = DATE_TRUNC('month', NOW())
            ), 0) - 
            COALESCE((
              SELECT total_amount 
              FROM monthly_totals 
              WHERE month_start = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
            ), 0)) * 100.0) /
            NULLIF(COALESCE((
              SELECT total_amount 
              FROM monthly_totals 
              WHERE month_start = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
            ), 0), 0)
          )
        END as percentage_change
    `);

    res.json({
      current_total: parseFloat(result.rows[0].current_month).toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP'
      }),
      percentage_change: parseFloat(result.rows[0].percentage_change || 0).toFixed(2)
    });
  } catch (error) {
    console.error('Error getting donations summary:', error);
    res.status(500).json({ error: 'Failed to get donations summary' });
  }
});

// Add new endpoint for donation time distribution
router.get('/donation-time-stats', async (req, res) => {
  try {
    // Replace db.one with db.query
    const result = await db.query(`
      WITH all_donations AS (
        SELECT created_at
        FROM scholar_donations
        WHERE verification_status = 'verified'
        UNION ALL
        SELECT created_at
        FROM monetary_donations
        WHERE verification_status = 'verified'
      ),
      time_periods AS (
        SELECT
          COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM created_at) >= 5 AND EXTRACT(HOUR FROM created_at) < 12) as morning,
          COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM created_at) >= 12 AND EXTRACT(HOUR FROM created_at) < 16) as afternoon,
          COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM created_at) >= 16 AND EXTRACT(HOUR FROM created_at) >= 21) as evening
        FROM all_donations
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      )
      SELECT
        morning,
        afternoon,
        evening,
        morning + afternoon + evening as total,
        TO_CHAR(CURRENT_DATE - INTERVAL '30 days', 'DD Mon, YYYY') as start_date,
        TO_CHAR(CURRENT_DATE, 'DD Mon, YYYY') as end_date
      FROM time_periods
    `);

    const row = result.rows[0];
    res.json({
      data: [row.morning, row.afternoon, row.evening],
      period: `${row.start_date} - ${row.end_date}`,
      donations: {
        morning: row.morning,
        afternoon: row.afternoon,
        evening: row.evening
      },
      total: row.total
    });
  } catch (error) {
    console.error('Error getting donation time stats:', error);
    res.status(500).json({ error: 'Failed to get donation time statistics' });
  }
});

// Add new endpoint for donation trends
router.get('/donation-trends', async (req, res) => {
  try {
    // Replace db.any with db.query
    const results = await db.query(`
      WITH RECURSIVE months AS (
        SELECT 
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months') as month
        UNION ALL
        SELECT 
          DATE_TRUNC('month', month + INTERVAL '1 month')
        FROM months
        WHERE month < DATE_TRUNC('month', CURRENT_DATE)
      ),
      monthly_totals AS (
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          SUM(amount) as total
        FROM (
          SELECT amount, created_at 
          FROM scholar_donations 
          WHERE verification_status = 'verified'
          UNION ALL
          SELECT amount, created_at 
          FROM monetary_donations 
          WHERE verification_status = 'verified'
        ) all_donations
        GROUP BY DATE_TRUNC('month', created_at)
      )
      SELECT 
        TO_CHAR(m.month, 'Mon') as month_label,
        COALESCE(mt.total, 0) as amount
      FROM months m
      LEFT JOIN monthly_totals mt ON m.month = mt.month
      ORDER BY m.month ASC
    `);

    // Get current and previous month totals from the results
    const currentMonthTotal = parseFloat(results.rows[results.rows.length - 1].amount);
    const previousMonthTotal = parseFloat(results.rows[results.rows.length - 2]?.amount || 0);
    
    // Calculate percentage change
    const percentageChange = previousMonthTotal === 0 ? 0 :
      ((currentMonthTotal - previousMonthTotal) / previousMonthTotal * 100);

    res.json({
      labels: results.rows.map(r => r.month_label),
      data: results.rows.map(r => parseFloat(r.amount)),
      current_total: currentMonthTotal.toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP'
      }),
      percentage_change: percentageChange.toFixed(2)
    });
  } catch (error) {
    console.error('Error getting donation trends:', error);
    res.status(500).json({ error: 'Failed to get donation trends' });
  }
});

// Fix daily traffic endpoint to properly read donations
router.get('/daily-traffic', async (req, res) => {
  try {
    // Replace db.one with db.query
    const result = await db.query(`
      WITH RECURSIVE time_slots AS (
        SELECT 
          generate_series(
            date_trunc('day', CURRENT_DATE) + interval '5 hours',
            date_trunc('day', CURRENT_DATE) + interval '21 hours',
            interval '4 hours'
          ) as slot_start
      ),
      all_donations AS (
        SELECT created_at 
        FROM scholar_donations 
        WHERE DATE(created_at) = CURRENT_DATE
        AND verification_status = 'verified'
        UNION ALL
        SELECT created_at 
        FROM monetary_donations
        WHERE DATE(created_at) = CURRENT_DATE
        AND verification_status = 'verified'
      ),
      slot_counts AS (
        SELECT 
          slot_start,
          COUNT(d.created_at) as donation_count
        FROM time_slots ts
        LEFT JOIN all_donations d ON 
          d.created_at >= ts.slot_start AND 
          d.created_at < ts.slot_start + interval '4 hours'
        GROUP BY slot_start
        ORDER BY slot_start
      ),
      today_total AS (
        SELECT COUNT(*) as total
        FROM all_donations
      ),
      yesterday_donations AS (
        SELECT created_at 
        FROM scholar_donations 
        WHERE DATE(created_at) = CURRENT_DATE - 1
        AND verification_status = 'verified'
        UNION ALL
        SELECT created_at 
        FROM monetary_donations
        WHERE DATE(created_at) = CURRENT_DATE - 1
        AND verification_status = 'verified'
      ),
      yesterday_total AS (
        SELECT COUNT(*) as total
        FROM yesterday_donations
      )
      SELECT 
        json_agg(donation_count ORDER BY slot_start) as hourly_data,
        (SELECT total FROM today_total) as today_total,
        (SELECT total FROM yesterday_total) as yesterday_total
      FROM slot_counts
    `);

    const row = result.rows[0];
    const todayTotal = parseInt(row.today_total) || 0;
    const yesterdayTotal = parseInt(row.yesterday_total) || 0;
    const percentageChange = yesterdayTotal === 0 ? 0 :
      ((todayTotal - yesterdayTotal) / yesterdayTotal * 100);

    res.json({
      hourlyData: row.hourly_data || [0, 0, 0, 0, 0], // Default to zeros if no data
      total: todayTotal,
      percentageChange: percentageChange.toFixed(2)
    });
  } catch (error) {
    console.error('Error getting daily traffic:', error);
    res.status(500).json({ error: 'Failed to get daily traffic statistics' });
  }
});

// Sponsor Management Routes
router.get('/sponsors', roleAuth(['admin', 'staff']), async (req, res) => {
  try {
    const sponsors = await adminModel.getSponsors();
    res.json(sponsors);
  } catch (error) {
    console.error('Error fetching sponsors:', error);
    res.status(500).json({ error: 'Failed to fetch sponsors' });
  }
});

router.get('/sponsors/:id', roleAuth(['admin', 'staff']), async (req, res) => {
  try {
    const sponsor = await adminModel.getSponsorById(req.params.id);
    if (!sponsor) {
      return res.status(404).json({ error: 'Sponsor not found' });
    }
    res.json(sponsor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sponsor details' });
  }
});

router.post('/sponsors', roleAuth(['admin']), async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const sponsorData = { ...req.body, password: hashedPassword };
    const newSponsor = await adminModel.createSponsor(sponsorData);
    res.status(201).json(newSponsor);
  } catch (error) {
    console.error('Error creating sponsor:', error);
    res.status(500).json({ error: 'Failed to create sponsor' });
  }
});

router.put('/sponsors/:id', roleAuth(['admin']), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    const updatedSponsor = await adminModel.updateSponsor(req.params.id, updates);
    res.json(updatedSponsor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update sponsor' });
  }
});

router.delete('/sponsors/:id', roleAuth(['admin']), async (req, res) => {
  try {
    await adminModel.deleteSponsor(req.params.id);
    res.json({ message: 'Sponsor deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete sponsor' });
  }
});

router.post('/sponsors/bulk-delete', roleAuth(['admin']), async (req, res) => {
  try {
    const { ids } = req.body;
    await adminModel.bulkDeleteSponsors(ids);
    res.json({ message: 'Sponsors deleted successfully' });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Failed to delete sponsors' });
  }
});

// Add these new routes
router.get('/mpin-status', authMiddleware, roleAuth(['admin']), async (req, res) => {
  try {
    // Replace db.one with db.query
    const result = await db.query('SELECT is_mpin_enabled FROM admin_users WHERE id = $1', [req.user.id]);
    const admin = result.rows[0];
    res.json({ isMpinEnabled: admin.is_mpin_enabled });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch MPIN status' });
  }
});

// Update the toggle-mpin route
router.post('/toggle-mpin', authMiddleware, roleAuth(['admin']), async (req, res) => {
  try {
    const { enabled, password } = req.body;
    
    // If disabling MPIN, verify password first
    if (!enabled) {
      // Replace db.one with db.query
      const adminResult = await db.query('SELECT password FROM admin_users WHERE id = $1', [req.user.id]);
      const admin = adminResult.rows[0];
      const isValidPassword = await bcrypt.compare(password, admin.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }
    
    // Replace db.one with db.query
    const result = await db.query(
      'UPDATE admin_users SET is_mpin_enabled = $1 WHERE id = $2 RETURNING is_mpin_enabled',
      [enabled, req.user.id]
    );
    
    res.json({ isMpinEnabled: result.rows[0].is_mpin_enabled });
  } catch (error) {
    console.error('Toggle MPIN error:', error);
    res.status(500).json({ error: 'Failed to toggle MPIN' });
  }
});

router.post('/set-mpin', authMiddleware, roleAuth(['admin']), async (req, res) => {
  try {
    const { mpin } = req.body;
    
    // Validate MPIN format
    if (!mpin || mpin.length !== 4 || !/^\d+$/.test(mpin)) {
      return res.status(400).json({ error: 'MPIN must be exactly 4 digits' });
    }
    
    // Hash the MPIN before storing
    const hashedMpin = await bcrypt.hash(mpin, 10);
    await db.query(
      'UPDATE admin_users SET mpin = $1 WHERE id = $2',
      [hashedMpin, req.user.id]
    );
    
    res.json({ message: 'MPIN updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update MPIN' });
  }
});

// Add new endpoint for items distributed statistics
router.get('/items-distributed-stats', async (req, res) => {
  try {
    // Replace db.any with db.query
    const results = await db.query(`
      WITH RECURSIVE months AS (
        SELECT 
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months') as month
        UNION ALL
        SELECT 
          DATE_TRUNC('month', month + INTERVAL '1 month')
        FROM months
        WHERE month < DATE_TRUNC('month', CURRENT_DATE)
      ),
      monthly_totals AS (
        SELECT 
          DATE_TRUNC('month', distributed_at) as month,
          SUM(quantity) as total
        FROM item_distributions
        GROUP BY DATE_TRUNC('month', distributed_at)
      )
      SELECT 
        TO_CHAR(m.month, 'Mon') as month_label,
        COALESCE(mt.total, 0) as amount
      FROM months m
      LEFT JOIN monthly_totals mt ON m.month = mt.month
      ORDER BY m.month ASC
    `);

    // Calculate totals and percentage change
    const currentMonthTotal = parseInt(results.rows[results.rows.length - 1].amount);
    const previousMonthTotal = parseInt(results.rows[results.rows.length - 2]?.amount || 0);
    const percentageChange = previousMonthTotal === 0 ? 0 :
      ((currentMonthTotal - previousMonthTotal) / previousMonthTotal * 100);

    res.json({
      labels: results.rows.map(r => r.month_label),
      data: results.rows.map(r => parseInt(r.amount)),
      total: currentMonthTotal,
      percentage_change: percentageChange.toFixed(2)
    });
  } catch (error) {
    console.error('Error getting items distributed stats:', error);
    res.status(500).json({ error: 'Failed to get items distributed statistics' });
  }
});

// Add new endpoints for feedback analytics
router.get('/feedback-analytics', authMiddleware, async (req, res) => {
  try {
    // Get overall statistics with proper type casting
    const overallStatsResult = await db.query(`
      SELECT 
        COALESCE(AVG(rating)::numeric, 0) as average_rating,
        COUNT(*) as total_feedback,
        COUNT(DISTINCT event_id) as events_with_feedback
      FROM event_feedback
    `);
    const overallStats = overallStatsResult.rows[0];
    
    // Convert string to number explicitly
    overallStats.average_rating = parseFloat(overallStats.average_rating) || 0;

    // Get word frequency
    const wordFrequencyResult = await db.query(`
      WITH words AS (
        SELECT regexp_split_to_table(lower(comment), '\\s+') as word
        FROM event_feedback
        WHERE comment IS NOT NULL
      )
      SELECT word, COUNT(*) as frequency
      FROM words
      WHERE length(word) > 3
      GROUP BY word
      ORDER BY frequency DESC
      LIMIT 50
    `);
    const wordFrequency = wordFrequencyResult.rows;

    // Get event statistics
    const eventStatsResult = await db.query(`
      SELECT 
        e.id,
        e.title,
        COALESCE(AVG(ef.rating)::numeric, 0) as average_rating,
        COUNT(ef.*) as feedback_count,
        COALESCE(json_agg(
          json_build_object(
            'rating', ef.rating,
            'comment', ef.comment,
            'created_at', ef.created_at,
            'user_name', u.name
          )
        ) FILTER (WHERE ef.id IS NOT NULL), '[]') as feedback_details
      FROM events e
      LEFT JOIN event_feedback ef ON e.id = ef.event_id
      LEFT JOIN users u ON ef.user_id = u.id
      GROUP BY e.id, e.title
      ORDER BY e.date DESC
    `);
    const eventStats = eventStatsResult.rows;

    // Convert average_rating to number for each event
    eventStats.forEach(event => {
      event.average_rating = parseFloat(event.average_rating) || 0;
    });

    // Get sentiment statistics
    const sentimentStatsResult = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE rating >= 4) as positive_feedback,
        COUNT(*) FILTER (WHERE rating = 3) as neutral_feedback,
        COUNT(*) FILTER (WHERE rating <= 2) as negative_feedback
      FROM event_feedback
    `);
    const sentimentStats = sentimentStatsResult.rows[0];

    const results = {
      overallStats,
      wordFrequency,
      eventStats,
      sentimentStats
    };

    res.json(results);
  } catch (error) {
    console.error('Error getting feedback analytics:', error);
    res.status(500).json({ error: 'Failed to get feedback analytics' });
  }
});

// Add these new endpoints for user counts
router.get('/new-sponsors-count', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role = 'sponsor'
      AND created_at >= NOW() - INTERVAL '30 days'
    `);
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error getting new sponsors count:', error);
    res.status(500).json({ error: 'Failed to get new sponsors count' });
  }
});

router.get('/new-volunteers-count', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role = 'volunteer'
      AND created_at >= NOW() - INTERVAL '30 days'
    `);
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error getting new volunteers count:', error);
    res.status(500).json({ error: 'Failed to get new volunteers count' });
  }
});

// Make sure to export the router
module.exports = router;
