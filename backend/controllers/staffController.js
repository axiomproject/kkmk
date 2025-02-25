const StaffModel = require('../models/staffModel');
const db = require('../config/db');
const bcrypt = require('bcryptjs');

const staffController = {
  async getDashboardData(req, res) {
    try {
      const dashboardData = {
        // Add dashboard data as needed
        totalVolunteers: await db.one('SELECT COUNT(*) FROM users WHERE role = $1', ['volunteer']),
        recentEvents: await db.any('SELECT * FROM events ORDER BY created_at DESC LIMIT 5'),
        // Add more dashboard statistics as needed
      };
      res.json(dashboardData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  },

  async getProfile(req, res) {
    try {
      const staffId = req.user.userId;
      const profile = await StaffModel.getProfile(staffId);
      if (!profile) {
        return res.status(404).json({ error: 'Staff profile not found' });
      }
      res.json(profile);
    } catch (error) {
      console.error('Error fetching staff profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  },

  async updateProfile(req, res) {
    try {
      const { name, email, currentPassword, newPassword } = req.body;
      const staffId = req.user.userId; // Change this line to use userId from token

      console.log('Updating profile for staff:', {
        staffId,
        userObject: req.user,
        requestBody: { name, email, hasNewPassword: !!newPassword }
      });

      if (!staffId) {
        return res.status(400).json({ error: 'Staff ID not found' });
      }

      // Get current staff data
      const staff = await db.one('SELECT * FROM staff_users WHERE id = $1', [staffId]);
      console.log('Found staff user:', { id: staff.id, name: staff.name });

      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, staff.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Prepare update query
      let updateQuery = `
        UPDATE staff_users
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
                      RETURNING id, name, email, profile_photo, role, department`;
      queryParams.push(staffId);

      console.log('Executing update query:', {
        query: updateQuery,
        params: queryParams.map((p, i) => i === 2 && newPassword ? '[HASHED]' : p)
      });

      const result = await db.one(updateQuery, queryParams);
      console.log('Profile update result:', result);
      
      res.json({ user: result });
    } catch (error) {
      console.error('Profile update error:', error);
      console.error('Full error details:', {
        user: req.user,
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ error: 'Failed to update profile' });
    }
  },

  async getVolunteers(req, res) {
    try {
      const volunteers = await StaffModel.getVolunteers();
      res.json(volunteers);
    } catch (error) {
      console.error('Error fetching volunteers:', error);
      res.status(500).json({ error: 'Failed to fetch volunteers' });
    }
  },

  async getVolunteerById(req, res) {
    try {
      const { id } = req.params;
      const volunteer = await StaffModel.getVolunteerById(id);
      if (!volunteer) {
        return res.status(404).json({ error: 'Volunteer not found' });
      }
      res.json(volunteer);
    } catch (error) {
      console.error('Error fetching volunteer:', error);
      res.status(500).json({ error: 'Failed to fetch volunteer details' });
    }
  },

  async updateVolunteer(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedVolunteer = await StaffModel.updateVolunteer(id, updates);
      res.json(updatedVolunteer);
    } catch (error) {
      console.error('Error updating volunteer:', error);
      res.status(500).json({ error: 'Failed to update volunteer' });
    }
  },

  async getEvents(req, res) {
    try {
      const events = await db.any('SELECT * FROM events ORDER BY created_at DESC');
      res.json(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  },

  async createEvent(req, res) {
    try {
      const { title, description, date, location } = req.body;
      const newEvent = await db.one(
        'INSERT INTO events (title, description, date, location, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [title, description, date, location, req.user.userId]
      );
      res.status(201).json(newEvent);
    } catch (error) {
      console.error('Error creating event:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  },

  async updateEvent(req, res) {
    try {
      const { id } = req.params;
      const { title, description, date, location } = req.body;
      const updatedEvent = await db.one(
        'UPDATE events SET title = $1, description = $2, date = $3, location = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
        [title, description, date, location, id]
      );
      res.json(updatedEvent);
    } catch (error) {
      console.error('Error updating event:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }
};

module.exports = staffController;
