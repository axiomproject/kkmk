const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/db');
const EventModel = require('../models/eventModel');

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Make sure this directory exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb('Error: Images only!');
    }
  }
});

const authMiddleware = require('../middleware/authMiddleware');  // Add this if you have auth

// Get all events (without locations)
router.get('/', async (req, res) => {
    try {
        // This is already using db.query correctly
        const events = await db.query(`
            SELECT 
                id,
                title,
                date,
                description,
                image,
                location,
                latitude,
                longitude,
                status,
                created_at,
                total_volunteers,
                current_volunteers,
                contact_phone,
                contact_email,
                start_time,
                end_time
            FROM events 
            ORDER BY date DESC
        `);
        res.json(events.rows);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all events with locations
router.get('/locations', async (req, res) => {
    try {
        // This is already using db.query correctly
        const result = await db.query(`
            SELECT 
                id,
                title as name,
                date,
                description,
                CASE 
                    WHEN image LIKE 'http%' THEN image
                    ELSE CONCAT('http://localhost:5175', image)
                END as image,
                location as address,
                latitude as lat,
                longitude as lng,
                status,
                created_at
            FROM events 
            WHERE latitude IS NOT NULL 
            AND longitude IS NOT NULL
            AND date >= CURRENT_DATE
            AND status = 'OPEN'
            ORDER BY date ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add new event location
router.post('/locations', async (req, res) => {
    try {
        const { event_id, lat, lng } = req.body;
        // Replace db.one with db.query
        const result = await db.query(
            'INSERT INTO event_locations (event_id, lat, lng) VALUES ($1, $2, $3) RETURNING *',
            [event_id, lat, lng]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding event location:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// In your create event route
router.post('/events', upload.single('image'), async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      imagePath: req.file ? `/uploads/${req.file.filename}` : null,
      latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
      longitude: req.body.longitude ? parseFloat(req.body.longitude) : null
    };
    
    const event = await EventModel.createEvent(eventData);
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// In your update event route
router.put('/events/:id', upload.single('image'), async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      imagePath: req.file ? `/uploads/${req.file.filename}` : undefined,
      latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
      longitude: req.body.longitude ? parseFloat(req.body.longitude) : null
    };
    
    const event = await EventModel.updateEvent(req.params.id, eventData);
    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Update join event route to use auth middleware
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id; // Get user ID from auth middleware

    const event = await EventModel.joinEvent(eventId, userId);
    res.json({ 
      message: 'Successfully joined event',
      event: event 
    });
  } catch (error) {
    console.error('Error joining event:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update unjoin event route to use auth middleware
router.post('/:id/unjoin', authMiddleware, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id; // Get user ID from auth middleware

    const event = await EventModel.unjoinEvent(eventId, userId);
    res.json({ 
      message: 'Successfully left event',
      event: event 
    });
  } catch (error) {
    console.error('Error leaving event:', error);
    res.status(400).json({ error: error.message });
  }
});

// Add check-participation endpoint
router.get('/:id/check-participation', authMiddleware, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    // Replace db.oneOrNone with db.query
    const result = await db.query(
      'SELECT status FROM event_participants WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );
    
    const participation = result.rows[0];

    res.json({
      hasJoined: !!participation,
      status: participation ? participation.status : null
    });
    
  } catch (error) {
    console.error('Error checking participation:', error);
    res.status(500).json({ error: 'Failed to check participation status' });
  }
});

// Update the pending feedback route to more efficiently check dismissed status
router.get('/pending-feedback', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    // This is already using db.query correctly
    const events = await db.query(`
      SELECT DISTINCT e.id, e.title, e.date
      FROM events e
      INNER JOIN event_participants ep ON e.id = ep.event_id
      WHERE ep.user_id = $1
      AND e.date < CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM event_feedback ef 
        WHERE ef.event_id = e.id AND ef.user_id = $1
      )
      AND NOT EXISTS (
        SELECT 1 FROM dismissed_feedback df 
        WHERE df.event_id = e.id AND df.user_id = $1
      )
      ORDER BY e.date DESC
    `, [userId]);
    
    res.json(events.rows);
  } catch (error) {
    console.error('Error fetching pending feedback:', error);
    res.status(500).json({ error: 'Failed to fetch pending feedback' });
  }
});

// Submit event feedback
router.post('/:id/feedback', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;
    const feedback = await EventModel.submitEventFeedback(userId, eventId, req.body);
    res.json(feedback);
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get all events
router.get('/events', async (req, res) => {
  try {
    const events = await EventModel.getAllEvents();
    console.log('Sending events:', events); // Debug log
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Add delete event route
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin or staff
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Not authorized to delete events' });
    }

    const eventId = req.params.id;
    const result = await EventModel.deleteEvent(eventId);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
