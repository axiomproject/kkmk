const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all churches
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM churches ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching churches:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add new church
router.post('/', async (req, res) => {
    try {
        const { name, lat, lng, address } = req.body;
        const result = await db.query(
            'INSERT INTO churches (name, lat, lng, address) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, lat, lng, address]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding church:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
