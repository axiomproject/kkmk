const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/db');
const EventModel = require('../models/eventModel');
const notificationUtils = require('../utils/notificationUtils'); // Add this import correctly

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/events/'); // Store in events subdirectory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'event-' + uniqueSuffix + path.extname(file.originalname));
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
                end_time,
                requirements
            FROM events 
            ORDER BY date DESC
        `);
        
        // Add debugging to see what image paths and requirements are being sent
        const eventsWithProcessedImages = events.rows.map(event => {
            console.log(`Event ${event.id} has image path: ${event.image}`);
            console.log(`Event ${event.id} has requirements: ${event.requirements}`);
            return event;
        });
        
        res.json(eventsWithProcessedImages);
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
    const imagePath = req.file 
      ? `/uploads/events/${req.file.filename}` 
      : null;
      
    console.log('Saving event with image path:', imagePath);
    
    // Log all incoming data for debugging
    console.log('Received form data:', req.body);
    console.log('Requirements from form:', req.body.requirements);
    
    const eventData = {
      ...req.body,
      imagePath, // Use the correct path format
      latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
      longitude: req.body.longitude ? parseFloat(req.body.longitude) : null,
      requirements: req.body.requirements || '' // Make sure we pass requirements
    };
    
    console.log('Processing event data for save:', eventData);
    console.log('Requirements being saved:', eventData.requirements);
    
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
    // Log all incoming data for debugging
    console.log('Updating event. Received body:', req.body);
    console.log('Requirements from form:', req.body.requirements);
    
    const eventData = {
      ...req.body,
      imagePath: req.file ? `/uploads/events/${req.file.filename}` : undefined,
      latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
      longitude: req.body.longitude ? parseFloat(req.body.longitude) : null,
      requirements: req.body.requirements || '' // Make sure we pass requirements
    };
    
    console.log('Processing event data for update:', {
      id: req.params.id,
      ...eventData
    });
    console.log('Requirements being updated:', eventData.requirements);
    
    const event = await EventModel.updateEvent(req.params.id, eventData);
    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Update join event route to use auth middleware and check for previous rejections
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id; // Get user ID from auth middleware

    // Check if the rejection tracking table exists before querying it
    try {
      const tableExists = await db.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'event_rejected_users'
        );
      `);
      
      if (tableExists.rows[0].exists) {
        // Check if the user was previously rejected from this event
        const rejectionCheck = await db.query(
          'SELECT id FROM event_rejected_users WHERE event_id = $1 AND user_id = $2',
          [eventId, userId]
        );
        
        if (rejectionCheck.rows.length > 0) {
          return res.status(403).json({ 
            error: 'You cannot join this event because your previous request was declined.' 
          });
        }
      }
    } catch (checkError) {
      console.error('Error checking rejection status:', checkError);
      // Continue with the join process even if the check fails
    }

    // First, get event and user information for notification
    const eventResult = await db.query('SELECT title, date FROM events WHERE id = $1', [eventId]);
    const userResult = await db.query('SELECT name, profile_photo, email FROM users WHERE id = $1', [userId]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const eventTitle = eventResult.rows[0].title;
    const eventDate = eventResult.rows[0].date;
    const userName = userResult.rows[0]?.name || 'A user';
    const userPhoto = userResult.rows[0]?.profile_photo;
    const userEmail = userResult.rows[0]?.email;

    const event = await EventModel.joinEvent(eventId, userId);
    
    // Debugging logs
    console.log('Event joined successfully:', {
      eventId,
      eventTitle,
      userId,
      userName
    });
    
    // Send notification to admins after successful join
    try {
      console.log('Attempting to send admin notifications...');
      
      const adminIds = await notificationUtils.notifyAllAdmins(
        'event_participant',
        `${userName} has joined event: "${eventTitle}"`,
        eventId,
        {
          name: userName,
          profile_photo: userPhoto || '/images/event-icon.png'
        }
      );
      
      console.log(`Admin notification sent for user joining event: ${eventTitle}. Notified admins:`, adminIds);
    } catch (notificationError) {
      console.error('Failed to send admin notification:', notificationError);
      // Don't fail the request if notification sending fails
    }
    
    // Send email to participant about their pending status
    try {
      const emailService = require('../services/emailService');
      await emailService.sendParticipantPendingEmail(
        userEmail,
        userName,
        eventTitle,
        eventDate
      );
      console.log(`Pending participation email sent to ${userName} (${userEmail})`);
    } catch (emailError) {
      console.error('Failed to send pending participation email:', emailError);
      // Don't fail the request if email sending fails
    }
    
    res.json({ 
      message: 'Successfully joined event',
      event: event 
    });
  } catch (error) {
    console.error('Error joining event:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update unjoin event route to use auth middleware and add notifications
router.post('/:id/unjoin', authMiddleware, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id; // Get user ID from auth middleware

    // First, get event and user information for notification
    const eventResult = await db.query('SELECT title FROM events WHERE id = $1', [eventId]);
    const userResult = await db.query('SELECT name, profile_photo FROM users WHERE id = $1', [userId]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const eventTitle = eventResult.rows[0].title;
    const userName = userResult.rows[0]?.name || 'A user';
    const userPhoto = userResult.rows[0]?.profile_photo;

    const event = await EventModel.unjoinEvent(eventId, userId);
    
    // Debugging logs
    console.log('Event left successfully:', {
      eventId,
      eventTitle,
      userId,
      userName
    });
    
    // Send notification to admins after user leaves event
    try {
      console.log('Sending admin notification about user leaving event...');
      
      // Use notifyAllAdmins but with a different type
      const adminIds = await notificationUtils.notifyAllAdmins(
        'event_leave', // Different type from joining
        `${userName} has left event: "${eventTitle}"`,
        eventId,
        {
          name: userName,
          profile_photo: userPhoto || '/images/event-icon.png'
        }
      );
      
      console.log(`Admin notification sent for user leaving event: ${eventTitle}. Notified admins:`, adminIds);
    } catch (notificationError) {
      console.error('Failed to send admin notification for leaving event:', notificationError);
      // Don't fail the request if notification sending fails
    }
    
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

// Add new endpoint to check if a user has been rejected from an event
router.get('/:id/check-rejection', authMiddleware, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    // Check if the rejection tracking table exists
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'event_rejected_users'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      // Check if the user was previously rejected from this event
      const result = await db.query(
        'SELECT reason, created_at FROM event_rejected_users WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
      );
      
      if (result.rows.length > 0) {
        return res.json({
          isRejected: true,
          reason: result.rows[0].reason,
          rejectedAt: result.rows[0].created_at
        });
      }
    }
    
    // If no rejection found
    res.json({ isRejected: false });
  } catch (error) {
    console.error('Error checking rejection status:', error);
    res.status(500).json({ error: 'Failed to check rejection status' });
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

// Add new endpoint to approve a participant
router.put('/:id/participants/:userId/approve', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin or staff
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Not authorized to approve participants' });
    }

    const eventId = req.params.id;
    const userId = req.params.userId;

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

// Update reject participant endpoint to track rejections with better error handling
router.put('/:id/participants/:userId/reject', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin or staff
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Not authorized to reject participants' });
    }

    const eventId = req.params.id;
    const userId = req.params.userId;
    const { reason } = req.body; // Optional rejection reason
    const adminId = req.user.id; // Get admin ID for tracking

    // First, check if the participant exists
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

    // Try to record the rejection in the event_rejected_users table
    try {
      // First check if the table exists
      const tableExists = await db.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'event_rejected_users'
        );
      `);
      
      // If the table exists, insert the record
      if (tableExists.rows[0].exists) {
        await db.query(
          'INSERT INTO event_rejected_users (event_id, user_id, admin_id, reason) VALUES ($1, $2, $3, $4)',
          [eventId, userId, adminId, reason || 'No specific reason provided']
        );
      } else {
        console.warn('event_rejected_users table does not exist yet. Skipping rejection tracking.');
      }
    } catch (trackingError) {
      console.error('Failed to record rejection in database:', trackingError);
      // Continue with the rejection process even if tracking fails
    }

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

// Update the delete/remove participant endpoint
router.delete('/:id/participants/:userId', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin or staff
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Not authorized to remove participants' });
    }

    const eventId = req.params.id;
    const userId = req.params.userId;
    const { reason } = req.body; // Get optional removal reason from request body
    
    // Remove participant and get info for notifications
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

// Add new endpoint for bulk participant removal
router.delete('/:id/participants', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin or staff
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Not authorized to remove participants' });
    }

    const eventId = req.params.id;
    const { userIds, reason } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty userIds array' });
    }
    
    // Remove participants and get info for notifications
    const result = await EventModel.bulkRemoveParticipants(eventId, userIds, reason, {
      id: req.user.id,
      name: req.user.name,
      profile_photo: req.user.profile_photo
    });
    
    // Send email notifications
    try {
      const emailService = require('../services/emailService');
      await Promise.all(result.users.map(user => 
        emailService.sendParticipantRemovalEmail(
          user.email,
          user.name,
          result.eventTitle,
          reason || 'No specific reason provided'
        )
      ));
    } catch (emailError) {
      console.error('Failed to send some removal emails:', emailError);
      // Continue even if emails fail
    }
    
    // Create in-app notifications
    try {
      const notificationModel = require('../models/notificationModel');
      await Promise.all(result.users.map(user => 
        notificationModel.createParticipantRemovalNotification(
          user.id,
          eventId,
          result.eventTitle,
          reason,
          {
            id: req.user.id,
            name: req.user.name,
            profile_photo: req.user.profile_photo
          }
        )
      ));
    } catch (notificationError) {
      console.error('Failed to create some removal notifications:', notificationError);
      // Continue even if notifications fail
    }
    
    res.json({ 
      message: `Successfully removed ${result.removedCount} participants`,
      event: result.event
    });
  } catch (error) {
    console.error('Error removing participants:', error);
    res.status(500).json({ error: 'Failed to remove participants' });
  }
});

// Also ensure the route for fetching a single event includes requirements
router.get('/:id', async (req, res, next) => {
    const id = req.params.id;
    
    // If id is not a number, pass to the next middleware/route handler
    if (isNaN(parseInt(id))) {
      return next();
    }
    
    try {
        const result = await db.query(`
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
                end_time,
                requirements
            FROM events 
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const event = result.rows[0];
        console.log(`Sending event details for ID ${id}:`, event);
        console.log(`Requirements for event ${id}:`, event.requirements);
        
        res.json(event);
    } catch (error) {
        console.error('Error fetching event details:', error);
        res.status(500).json({ error: 'Failed to fetch event details' });
    }
});

// Update the getEventParticipants route to include skills and disability data
router.get('/:id/participants', async (req, res) => {
  try {
    const eventId = req.params.id;
    const includeDetails = req.query.includeDetails === 'true';
    
    // Use a different query based on whether we need detailed information
    let query;
    
    if (includeDetails) {
      query = `
        SELECT 
          u.id, 
          u.name, 
          u.email, 
          u.phone,
          u.profile_photo,
          ep.joined_at,
          ep.status,
          u.skills,
          u.disability
        FROM event_participants ep 
        JOIN users u ON ep.user_id = u.id 
        WHERE ep.event_id = $1 
        ORDER BY ep.joined_at DESC
      `;
    } else {
      query = `
        SELECT 
          u.id, 
          u.name, 
          u.email, 
          u.phone,
          u.profile_photo,
          ep.joined_at,
          ep.status
        FROM event_participants ep 
        JOIN users u ON ep.user_id = u.id 
        WHERE ep.event_id = $1 
        ORDER BY ep.joined_at DESC
      `;
    }
    
    const result = await db.query(query, [eventId]);
    
    // Process the results to parse JSON fields
    const participants = result.rows.map(participant => {
      // Parse skills JSON if it exists
      if (participant.skills && typeof participant.skills === 'string') {
        try {
          participant.skills = JSON.parse(participant.skills);
        } catch (e) {
          console.error('Error parsing skills JSON:', e);
          participant.skills = null;
        }
      }
      
      // Parse disability JSON if it exists
      if (participant.disability && typeof participant.disability === 'string') {
        try {
          participant.disability = JSON.parse(participant.disability);
        } catch (e) {
          console.error('Error parsing disability JSON:', e);
          participant.disability = null;
        }
      }
      
      return participant;
    });
    
    res.json(participants);
  } catch (error) {
    console.error('Error fetching event participants:', error);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

// Add new endpoint to get a user's joined events
router.get('/user/:userId/joined', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Ensure the user can only access their own events unless they're an admin
    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to user events' });
    }
    
    const result = await db.query(`
      SELECT 
        e.id,
        e.title,
        e.date,
        e.image,
        e.status,
        e.location,
        ep.status as participation_status,
        CASE
          WHEN e.date < CURRENT_DATE THEN true
          ELSE false
        END as is_past
      FROM events e
      JOIN event_participants ep ON e.id = ep.event_id
      WHERE ep.user_id = $1
      ORDER BY 
        e.date < CURRENT_DATE, -- false comes before true
        e.date ASC
    `, [userId]);
    
    // Process images to add full URLs if needed
    const events = result.rows.map(event => {
      // If image is a relative path, make it absolute
      if (event.image && !event.image.startsWith('http')) {
        event.image = `${process.env.API_BASE_URL || 'http://localhost:5175'}${event.image}`;
      }
      return event;
    });
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching user events:', error);
    res.status(500).json({ error: 'Failed to fetch user events' });
  }
});

module.exports = router;