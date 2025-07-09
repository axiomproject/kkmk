const EventModel = require('../models/eventModel');
const { uploads } = require('../config/cloudinaryConfig');
const uploadEventImage = uploads.events.single('image');

const eventController = {
  async getEvents(req, res) {
    try {
      const events = await EventModel.getAllEvents();
      
      // Add debug logging for requirements field
      console.log('Sending events with requirements data:', 
        events.map(e => ({ id: e.id, requirements: e.requirements }))
      );
      
      res.json(events);
    } catch (error) {
      console.error('Error fetching events:', error);
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
      uploadEventImage(req, res, async (err) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }

        // Get the Cloudinary URL from the uploaded file
        const imagePath = req.file ? req.file.path : null;

        const eventData = {
          ...req.body,
          imagePath
        };

        const event = await EventModel.createEvent(eventData);
        
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
      uploadEventImage(req, res, async (err) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }

        const eventId = parseInt(req.params.id);
        if (isNaN(eventId)) {
          return res.status(400).json({ error: 'Invalid event ID' });
        }

        const imagePath = req.file ? req.file.path : undefined;
        const eventData = {
          ...req.body
        };

        // Only update image if a new one was uploaded
        if (imagePath) {
          eventData.imagePath = imagePath;
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
      const { volunteerId } = req.body;

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
      const { eventId } = req.params;
      const volunteers = await EventModel.getEventVolunteers(eventId);
      res.json(volunteers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch volunteers' });
    }
  }
};

module.exports = eventController;