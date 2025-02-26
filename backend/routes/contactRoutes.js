const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all contacts
router.get('/', async (req, res) => {
  try {
    // Replace db.any with db.query
    const result = await db.query(`
      SELECT * FROM contacts 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit new contact
router.post('/', async (req, res) => {
  try {
    console.log('Received contact submission:', req.body);
    const { firstName, lastName, email, phone, message } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !phone) {
      console.error('Missing required fields:', { firstName, lastName, email, phone });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('Inserting contact into database...');
    // Replace db.one with db.query
    const result = await db.query(
      `INSERT INTO contacts (
        first_name, last_name, email, phone, message, created_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) 
      RETURNING *`,
      [firstName, lastName, email, phone, message || '']
    );

    console.log('Contact saved successfully:', result.rows[0]);
    return res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      error: 'Failed to save contact',
      details: error.message
    });
  }
});

// Delete contact
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Replace db.none with db.query
    await db.query('DELETE FROM contacts WHERE id = $1', [id]);
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
