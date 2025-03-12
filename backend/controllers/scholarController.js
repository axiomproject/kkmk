const adminModel = require('../models/adminModel');
const bcrypt = require('bcryptjs');

const scholarController = {
  async getScholars(req, res) {
    try {
      const scholars = await adminModel.getScholars();
      res.json(scholars);
    } catch (error) {
      console.error('Error fetching scholars:', error);
      res.status(500).json({ error: 'Failed to fetch scholars' });
    }
  },

  async getScholarById(req, res) {
    try {
      const scholar = await adminModel.getScholarById(req.params.id);
      if (!scholar) {
        return res.status(404).json({ error: 'Scholar not found' });
      }
      res.json(scholar);
    } catch (error) {
      console.error('Error fetching scholar:', error);
      res.status(500).json({ error: 'Failed to fetch scholar' });
    }
  },

  async createScholar(req, res) {
    try {
      const { password, ...scholarData } = req.body;
      
      // Check for required fields
      if (!scholarData.username) {
        return res.status(400).json({ 
          error: 'Username is required',
          field: 'username',
          detail: 'Please provide a username'
        });
      }
      
      // Validate status length
      if (scholarData.status && scholarData.status.length > 20) {
        return res.status(400).json({
          error: 'Status value too long',
          field: 'status',
          detail: 'Status must be 20 characters or less'
        });
      }

      // Generate a default email if one is not provided
      if (!scholarData.email) {
        scholarData.email = `${scholarData.username}@placeholder.com`;
      }
      
      // Check if first_name and last_name are provided, if not, build from name
      if (!scholarData.first_name && scholarData.name) {
        const nameParts = scholarData.name.trim().split(' ');
        scholarData.first_name = nameParts[0];
        scholarData.last_name = nameParts.length > 1 ? nameParts.pop() : '';
        if (nameParts.length > 1) {
          scholarData.middle_name = nameParts.slice(1).join(' ');
        }
      }
      
      // Process monetary values
      if (typeof scholarData.current_amount === 'string') {
        scholarData.current_amount = parseFloat(scholarData.current_amount) || 0;
      }
      
      if (typeof scholarData.amount_needed === 'string') {
        scholarData.amount_needed = parseFloat(scholarData.amount_needed) || 0;
      }
      
      // If the scholar is verified, status in scholars table should default to "inactive"
      // This is now handled in the model, but we log it here for clarity
      if (scholarData.is_verified) {
        console.log('Scholar is verified, status in scholars table will be set to "inactive"');
      }
      
      console.log('Creating scholar with data:', {
        ...scholarData,
        password: '********' // Hide password in logs
      });
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const scholar = await adminModel.createScholar({
        ...scholarData,
        password: hashedPassword
      });
      
      res.status(201).json(scholar);
    } catch (error) {
      console.error('Error creating scholar:', error);
      
      // Check for specific error messages from PostgreSQL
      if (error.code === '22001') {
        // Value too long for type error
        return res.status(400).json({ 
          error: 'Value too long for database field',
          field: 'general',
          detail: 'One or more fields exceed maximum allowed length.'
        });
      }
      
      // Check for duplicate username or email errors
      if (error.message && error.message.includes('duplicate key') && error.message.includes('users_username_key')) {
        return res.status(409).json({ 
          error: 'Username already in use',
          field: 'username',
          detail: 'This username is already taken. Please choose another one.'
        });
      }
      
      if (error.message && error.message.includes('duplicate key') && error.message.includes('users_email_key')) {
        return res.status(409).json({ 
          error: 'Email already in use',
          field: 'email',
          detail: 'This email is already registered. Please use another email.'
        });
      }
      
      res.status(500).json({ error: 'Failed to create scholar', details: error.message });
    }
  },

  async updateScholar(req, res) {
    try {
      const updates = { ...req.body };
      
      // Handle numeric values
      if (typeof updates.current_amount === 'string') {
        updates.current_amount = parseFloat(updates.current_amount) || 0;
      }
      
      if (typeof updates.amount_needed === 'string') {
        updates.amount_needed = parseFloat(updates.amount_needed) || 0;
      }
      
      // If password is provided, hash it
      if (updates.password) {
        if (typeof updates.password === 'string' && updates.password.trim() !== '') {
          updates.password = await bcrypt.hash(updates.password, 10);
        } else {
          delete updates.password;
        }
      }
      
      const scholar = await adminModel.updateScholar(req.params.id, updates);
      
      if (!scholar) {
        return res.status(404).json({ error: 'Scholar not found' });
      }
      
      res.json(scholar);
    } catch (error) {
      console.error('Error updating scholar:', error);
      res.status(500).json({ 
        error: 'Failed to update scholar',
        details: error.message 
      });
    }
  },

  async deleteScholar(req, res) {
    try {
      await adminModel.deleteScholar(req.params.id);
      res.json({ message: 'Scholar deleted successfully' });
    } catch (error) {
      console.error('Error deleting scholar:', error);
      res.status(500).json({ error: 'Failed to delete scholar' });
    }
  },

  async bulkDeleteScholars(req, res) {
    try {
      const { ids } = req.body;
      await adminModel.bulkDeleteScholars(ids);
      res.json({ message: 'Scholars deleted successfully' });
    } catch (error) {
      console.error('Error performing bulk delete:', error);
      res.status(500).json({ error: 'Failed to delete scholars' });
    }
  }
};

module.exports = scholarController;
