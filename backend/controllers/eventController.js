const EventModel = require('../models/eventModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/events');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `event-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

const eventController = {
  async getEvents(req, res) {
    try {
      const events = await EventModel.getAllEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  },

  async getEvent(req, res) {
    try {
      const event = await EventModel.getEventById(req.params.id);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch event' });
    }
  },

  async createEvent(req, res) {
    try {
      upload.single('image')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }

        // Update the image path to include the full URL
        const imagePath = req.file 
          ? `/uploads/events/${req.file.filename}` 
          : null;

        const eventData = {
          ...req.body,
          imagePath
        };

        const event = await EventModel.createEvent(eventData);
        
        // Return the full image URL in the response
        res.status(201).json({
          ...event,
          image: imagePath
        });
      });
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  },

  async updateEvent(req, res) {
    try {
      upload.single('image')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }

        const eventId = parseInt(req.params.id); // Ensure ID is a number
        if (isNaN(eventId)) {
          return res.status(400).json({ error: 'Invalid event ID' });
        }

        const imagePath = req.file ? `/uploads/events/${req.file.filename}` : null;
        const eventData = {
          ...req.body,
          imagePath
        };

        // If updating with new image, delete old image
        if (imagePath) {
          const oldEvent = await EventModel.getEventById(eventId);
          if (oldEvent && oldEvent.image) {
            const oldImagePath = path.join(__dirname, '..', oldEvent.image);
            try {
              await fs.unlink(oldImagePath);
            } catch (error) {
              console.error('Failed to delete old image:', error);
            }
          }
        }

        const event = await EventModel.updateEvent(eventId, eventData);
        res.json(event);
      });
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  },

  async deleteEvent(req, res) {
    try {
      const result = await EventModel.deleteEvent(req.params.id);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }
      res.json({ message: 'Event deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete event' });
    }
  },

  async joinEvent(req, res) {
    try {
      const { eventId } = req.params;
      console.log('Join event request received:', {
        eventId,
        user: req.user,
        headers: req.headers
      });

      if (!req.user || !req.user.id) {
        console.log('User not found in request:', req.user);
        return res.status(401).json({ error: 'User ID not found in token' });
      }

      const updatedEvent = await EventModel.joinEvent(eventId, req.user.id);
      console.log('Event joined successfully:', updatedEvent);
      
      res.json({
        message: 'Successfully joined event',
        event: updatedEvent
      });
    } catch (error) {
      console.error('Join event error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  async unjoinEvent(req, res) {
    try {
      const { eventId } = req.params;
      console.log('Unjoin event request received:', {
        eventId,
        user: req.user,
      });

      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'User ID not found in token' });
      }

      const updatedEvent = await EventModel.unjoinEvent(eventId, req.user.id);
      res.json({
        message: 'Successfully unjoined event',
        event: updatedEvent
      });
    } catch (error) {
      console.error('Unjoin event error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  async getEventParticipants(req, res) {
    try {
      const { eventId } = req.params;
      const participants = await EventModel.getEventParticipants(eventId);
      res.json(participants);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch participants' });
    }
  },

  async checkParticipation(req, res) {
    try {
      const { eventId } = req.params;
      const userId = req.user.id;
      
      const hasJoined = await EventModel.hasUserJoined(eventId, userId);
      res.json({ hasJoined });
    } catch (error) {
      res.status(500).json({ error: 'Failed to check participation status' });
    }
  },

  async removeParticipant(req, res) {
    try {
      const { eventId, userId } = req.params;
      
      // Only allow admins to remove participants
      if (req.user.role !== 'admin' && req.user.role !== 'staff') {
        return res.status(403).json({ error: 'Not authorized to remove participants' });
      }

      const updatedEvent = await EventModel.removeParticipant(eventId, userId);
      res.json({
        message: 'Successfully removed participant',
        event: updatedEvent
      });
    } catch (error) {
      console.error('Remove participant error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  async addVolunteer(req, res) {
    try {
      const { eventId } = req.params;
      const { volunteerId } = req.body; // Change to expect volunteerId instead of name, email, phone

      // Check if requester is admin or staff
      if (req.user.role !== 'admin' && req.user.role !== 'staff') {
        return res.status(403).json({ error: 'Not authorized to add volunteers' });
      }

      const updatedEvent = await EventModel.addVolunteer(eventId, volunteerId);
      
      res.json({
        message: 'Successfully added volunteer',
        event: updatedEvent
      });
    } catch (error) {
      console.error('Add volunteer error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  async getVolunteers(req, res) {
    try {
      // Check if requester is admin or staff
      if (req.user.role !== 'admin' && req.user.role !== 'staff') {
        return res.status(403).json({ error: 'Not authorized to view volunteers list' });
      }

      const volunteers = await EventModel.getVolunteers();
      res.json(volunteers);
    } catch (error) {
      console.error('Get volunteers error:', error);
      res.status(500).json({ error: 'Failed to fetch volunteers' });
    }
  }
};

module.exports = eventController;