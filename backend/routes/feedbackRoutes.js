const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get feedback for past events - endpoint similar to EventFeedbackAnalytics
router.get('/event/:eventId', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    
    // Query feedback directly from database - modeled after EventFeedbackAnalytics
    const result = await db.query(`
      SELECT 
        ef.id,
        ef.event_id,
        u.name as user_name,
        ef.rating,
        ef.comment,
        ef.created_at,
        ef.user_type
      FROM event_feedback ef
      JOIN users u ON ef.user_id = u.id
      WHERE ef.event_id = $1
      ORDER BY ef.created_at DESC
    `, [eventId]);
    
    console.log(`Fetched ${result.rows.length} feedback items for event ${eventId}`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching event feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

module.exports = router;
