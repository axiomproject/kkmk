const express = require('express');
const router = express.Router();
const { updateUserLocation, archiveUser, deleteUser } = require('../models/userModel');
const authenticateToken = require('../middleware/authenticateToken');

// ...existing routes...

// Fix the route handler syntax
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
