const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const db = require('../config/db');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/donations');
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get all donations
router.get('/', async (req, res) => {
  try {
    console.log('Fetching monetary donations...');
    // Replace db.any with db.query
    const result = await db.query(`
      SELECT * FROM monetary_donations 
      ORDER BY created_at DESC
    `);
    
    const donations = result.rows;

    // Add full URLs to proof_of_payment paths
    const donationsWithUrls = donations.map(donation => ({
      ...donation,
      proof_of_payment: donation.proof_of_payment 
        ? `/uploads/donations/${donation.proof_of_payment}`
        : null
    }));

    console.log('Sending donations with URLs:', donationsWithUrls);
    res.json(donationsWithUrls);
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit new donation
router.post('/', upload.single('proofOfPayment'), async (req, res) => {
  try {
    console.log('Received donation submission:', {
      body: req.body,
      file: req.file
    });

    const { fullName, email, contactNumber, amount, message, date } = req.body;
    
    // Validate required fields
    if (!fullName || !email || !contactNumber || !amount || !date) {
      throw new Error('Missing required fields');
    }

    const proofOfPayment = req.file ? req.file.filename : null;
    const amountValue = parseFloat(amount);
    
    // Validate amount
    if (isNaN(amountValue) || amountValue <= 0 || amountValue > 999999999.99) {
      throw new Error('Invalid amount. Amount must be between 0 and 999,999,999.99');
    }

    console.log('Processing donation with data:', {
      fullName, email, contactNumber, amountValue, message, date, proofOfPayment
    });

    console.log('Proof of payment file:', proofOfPayment);

    // Replace db.one with db.query
    const result = await db.query(
      `INSERT INTO monetary_donations (
        full_name, email, contact_number, amount, message, 
        proof_of_payment, date, verification_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *`,
      [
        fullName, 
        email, 
        contactNumber, 
        amountValue,
        message || null, // Handle null message properly
        proofOfPayment, 
        date,
        'pending'
      ]
    );

    console.log('Donation saved successfully:', result.rows[0]);
    
    const responseData = {
      ...result.rows[0],
      proof_of_payment: proofOfPayment ? `/uploads/donations/${proofOfPayment}` : null
    };

    console.log('Response with proof:', responseData);
    return res.status(201).json(responseData);

  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      error: 'Failed to save donation',
      details: error.message
    });
  }
});

// Verify donation
router.put('/:id/verify', async (req, res) => {
  try {
    console.log('Verifying donation:', req.params.id);
    // Replace db.one with db.query
    const result = await db.query(`
      UPDATE monetary_donations 
      SET 
        verification_status = 'verified', 
        verified_at = CURRENT_TIMESTAMP,
        verified_by = $1
      WHERE id = $2 
      RETURNING *
    `, ['Admin', req.params.id]);

    console.log('Verification result:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject donation
router.put('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    // Replace db.one with db.query
    const result = await db.query(
      `UPDATE monetary_donations 
       SET verification_status = 'rejected',
           rejected_at = NOW(),
           rejected_by = $1,
           rejection_reason = $2
       WHERE id = $3 RETURNING *`,
      ['Admin', reason, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete donation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Replace db.none with db.query
    await db.query('DELETE FROM monetary_donations WHERE id = $1', [id]);
    res.json({ message: 'Donation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
