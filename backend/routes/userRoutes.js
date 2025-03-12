const express = require('express');
const router = express.Router();
const { updateUserLocation, archiveUser, deleteUser } = require('../models/userModel');
const authenticateToken = require('../middleware/authenticateToken');
const db = require('../config/db');

// ...existing routes...

// Update route to get past events for a volunteer
router.get('/admin/volunteers/:id/past-events', authenticateToken, async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const volunteerId = req.params.id;
    
    // Query to find past events for this volunteer where they had ACTIVE status
    const result = await db.query(`
      SELECT e.id, e.title, e.date, e.status
      FROM events e
      JOIN event_participants ep ON e.id = ep.event_id
      WHERE ep.user_id = $1
      AND ep.status = 'ACTIVE'
      AND (
        e.status = 'CLOSED'
        OR e.date < CURRENT_DATE
      )
      ORDER BY e.date DESC
    `, [volunteerId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching past events for volunteer:', error);
    next(error);
  }
});

// ...existing routes...

router.put('/user/location', authenticateToken, (req, res, next) => {
  try {
    const { userId, latitude, longitude } = req.body;
    
    if (!userId || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing coordinates' });
    }

    updateUserLocation(userId, latitude, longitude)
      .then(result => {
        if (!result) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({ 
          success: true, 
          location: {
            latitude: result.latitude,
            longitude: result.longitude
          }
        });
      })
      .catch(error => next(error));
  } catch (error) {
    next(error);
  }
});

router.put('/user/archive', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await archiveUser(userId);
    
    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/admin/scholars/:id', authenticateToken, async (req, res, next) => {
  try {
    const result = await deleteUser(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Scholar not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error in delete scholar route:', error);
    res.status(500).json({ 
      error: 'Failed to delete scholar', 
      details: error.message 
    });
  }
});

module.exports = router;
