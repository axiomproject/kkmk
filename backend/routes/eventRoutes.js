const express = require('express');
const router = express.Router();
const EventModel = require('../models/eventModel');
const eventController = require('../controllers/eventController');
const notificationUtils = require('../utils/notificationUtils');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes - no authentication required
router.get('/events', eventController.getEvents); // GET /api/events
router.get('/events/:id', eventController.getEvent); // GET /api/events/:id

// Protected routes - require authentication
router.post('/events', authMiddleware, eventController.createEvent);
router.put('/events/:id', authMiddleware, eventController.updateEvent);
router.delete('/events/:id', authMiddleware, eventController.deleteEvent);

// Event participation routes - require authentication
router.post('/events/:eventId/join', authMiddleware, eventController.joinEvent);
router.post('/events/:eventId/unjoin', authMiddleware, eventController.unjoinEvent);
router.get('/events/:eventId/participants', authMiddleware, eventController.getEventParticipants);
router.get('/events/:eventId/participation', authMiddleware, eventController.checkParticipation);
router.delete('/events/:eventId/participants/:userId', authMiddleware, eventController.removeParticipant);

module.exports = router;