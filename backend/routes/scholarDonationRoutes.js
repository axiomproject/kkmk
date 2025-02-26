const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');

// Set up multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/scholardonations'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Add debug middleware before routes
router.use((req, res, next) => {
    console.log('Scholar Donation Request:', {
        body: req.body,
        file: req.file,
        path: req.path
    });
    next();
});

// Get all scholar donations
router.get('/', async (req, res) => {
    try {
        // Replace db.query with pool.query format
        const result = await db.query('SELECT * FROM scholar_donations ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching scholar donations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all scholar donations with scholar details
router.get('/all', async (req, res) => {
    try {
        // Replace db.query with pool.query format
        const result = await db.query(`
            SELECT 
                sd.*,
                s.first_name as scholar_first_name,
                s.last_name as scholar_last_name,
                u.name as donor_name,
                CASE 
                    WHEN sd.proof_image LIKE 'http%' THEN sd.proof_image
                    WHEN sd.proof_image IS NOT NULL THEN CONCAT('http://localhost:5175', sd.proof_image)
                    ELSE NULL
                END as proof_of_payment
            FROM scholar_donations sd
            JOIN scholars s ON sd.scholar_id = s.id
            LEFT JOIN users u ON sd.sponsor_id = u.id
            ORDER BY sd.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching scholar donations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get donations by sponsor ID
router.get('/sponsor/:sponsorId', async (req, res) => {
    try {
        // Replace db.query with pool.query format
        const result = await db.query(`
            SELECT 
                sd.*,
                s.first_name as scholar_first_name,
                s.last_name as scholar_last_name,
                s.image_url as scholar_image,
                s.current_amount,
                s.amount_needed,
                CAST(sd.amount AS INTEGER) as amount,
                CASE 
                    WHEN sd.proof_image LIKE 'http%' THEN sd.proof_image
                    WHEN sd.proof_image IS NOT NULL THEN CONCAT('http://localhost:5175', sd.proof_image)
                    ELSE NULL
                END as proof_of_payment
            FROM scholar_donations sd
            JOIN scholars s ON sd.scholar_id = s.id
            WHERE sd.sponsor_id = $1
            ORDER BY sd.created_at DESC
        `, [req.params.sponsorId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching sponsor donations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get donation history for a scholar
router.get('/history/:scholarId', async (req, res) => {
    try {
        // Replace db.query with pool.query format
        const result = await db.query(`
            SELECT 
                CAST(amount AS INTEGER) as amount,
                created_at
            FROM scholar_donations
            WHERE scholar_id = $1
            AND verification_status = 'verified'
            ORDER BY created_at DESC
        `, [req.params.scholarId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching donation history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new scholar donation
router.post('/', upload.single('proof_of_donation'), async (req, res) => {
    try {
        const { 
            scholar_id, 
            donor_name, 
            donor_email, 
            donor_phone, 
            amount,
            payment_method 
        } = req.body;
        const proof_image = req.file ? `/uploads/scholardonations/${req.file.filename}` : null;

        // Replace db.query with pool.query format
        const result = await db.query(
            'INSERT INTO scholar_donations (scholar_id, donor_name, donor_email, donor_phone, amount, payment_method, proof_image) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [
                scholar_id,
                donor_name || null,
                donor_email || null,
                donor_phone || null,
                amount,
                payment_method || null,
                proof_image
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating scholar donation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new scholar donation (alternative endpoint)
router.post('/submit', upload.single('proof'), async (req, res) => {
    try {
        const { 
            scholarId, // Changed from scholar_id to match frontend
            amount,
            name,      // Changed from donor_name to match frontend
            email,     // Changed from donor_email to match frontend
            phone,     // Changed from donor_phone to match frontend
            message,   // New field
            paymentMethod,  // Changed from payment_method to match frontend
            sponsorId  // Add this field
        } = req.body;
        const proof_image = req.file ? `/uploads/scholardonations/${req.file.filename}` : null;

        console.log('Processing donation with:', { 
            scholar_id: scholarId, 
            sponsor_id: sponsorId, // Log the sponsor ID
            donor_name: name, 
            donor_email: email, 
            donor_phone: phone, 
            amount, 
            payment_method: paymentMethod,
            proof_image,
            message 
        });

        // Replace db.query with pool.query format
        const result = await db.query(
            `INSERT INTO scholar_donations (
                scholar_id, sponsor_id, donor_name, donor_email, 
                donor_phone, amount, payment_method, proof_image, message
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [
                scholarId,
                sponsorId || null, // Include sponsor_id in the query
                name,
                email,
                phone,
                amount,
                paymentMethod,
                proof_image,
                message || null
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error submitting scholar donation:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Verify donation
router.post('/verify/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const verifier = 'admin@kkmk.org';

        // Use a transaction to ensure both updates succeed or fail together
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            
            // First get the donation details
            const donationResult = await client.query(
                'SELECT * FROM scholar_donations WHERE id = $1',
                [id]
            );
            const donation = donationResult.rows[0];

            if (!donation) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Donation not found' });
            }

            // Update the donation status
            const updatedDonationResult = await client.query(
                `UPDATE scholar_donations 
                 SET verification_status = 'verified',
                     verified_at = CURRENT_TIMESTAMP,
                     verified_by = $1
                 WHERE id = $2
                 RETURNING *`,
                [verifier, id]
            );

            // Update the scholar's current amount
            await client.query(
                `UPDATE scholars 
                 SET current_amount = current_amount + $1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2
                 RETURNING *`,
                [donation.amount, donation.scholar_id]
            );

            await client.query('COMMIT');
            res.json(updatedDonationResult.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error verifying donation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reject donation
router.post('/reject/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        // For now, use a generic admin value. You can update this later with proper user tracking
        const rejecter = 'admin@kkmk.org';

        // Replace db.query with pool.query format
        const result = await db.query(
            `UPDATE scholar_donations 
             SET verification_status = 'rejected',
                 rejected_at = CURRENT_TIMESTAMP,
                 rejected_by = $1,
                 rejection_reason = $2
             WHERE id = $3
             RETURNING *`,
            [rejecter, reason, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Donation not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error rejecting donation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
