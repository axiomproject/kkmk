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
      const hashedPassword = await bcrypt.hash(password, 10);
      const scholar = await adminModel.createScholar({
        ...scholarData,
        password: hashedPassword
      });
      res.status(201).json(scholar);
    } catch (error) {
      console.error('Error creating scholar:', error);
      res.status(500).json({ error: 'Failed to create scholar' });
    }
  },

  async updateScholar(req, res) {
    try {
      const updates = { ...req.body };
      if (updates.password) {
        if (typeof updates.password === 'string' && updates.password.trim() !== '') {
          updates.password = await bcrypt.hash(updates.password, 10);
        } else {
          delete updates.password;
        }
      }
      const scholar = await adminModel.updateScholar(req.params.id, updates);
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
