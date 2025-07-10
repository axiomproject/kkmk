const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { sendDonationConfirmation, sendDonationVerificationEmail, sendDonationRejectionEmail, sendDonationCertificateEmail } = require('../services/emailService');
const notificationUtils = require('../utils/notificationUtils');
const { uploadToCloudinary, uploads } = require('../config/cloudinaryConfig');

// File upload endpoint
router.post('/upload-signature', uploads.donations.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to Cloudinary using the existing configuration
    const result = await uploadToCloudinary(req.file, 'donations');
    
    res.json({ url: result.url });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all donations
router.get('/', async (req, res) => {
  try {
    console.log('Fetching monetary donations...');
    const result = await db.query(`
      SELECT * FROM monetary_donations 
      ORDER BY created_at DESC
    `);
    
    const donations = result.rows;
    res.json(donations);
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit new donation
router.post('/', async (req, res) => {
  try {
    console.log('Received donation submission:', {
      body: req.body
    });

    const { fullName, email, contactNumber, amount, message, date, paymentMethod, proofOfPayment } = req.body;
    
    // Map payment methods to allowed values in the database
    let mappedPaymentMethod = paymentMethod;
    if (paymentMethod === 'bank_transfer') {
      mappedPaymentMethod = 'gcash'; // temporarily map to an allowed value
    }
    
    // Validate required fields
    if (!fullName || !email || !contactNumber || !amount || !date) {
      throw new Error('Missing required fields');
    }

    const amountValue = parseFloat(amount);
    
    // Validate amount
    if (isNaN(amountValue) || amountValue <= 0 || amountValue > 999999999.99) {
      throw new Error('Invalid amount. Amount must be between 0 and 999,999,999.99');
    }

    // If there's a proof of payment URL from Cloudinary
    let proofOfPaymentUrl = proofOfPayment || null;

    console.log('Processing donation with data:', {
      fullName, email, contactNumber, amountValue, message, date, proofOfPaymentUrl, paymentMethod
    });

    // Replace db.one with db.query
    const result = await db.query(
      `INSERT INTO monetary_donations (
        full_name, email, contact_number, amount, message, 
        proof_of_payment, payment_method, date, verification_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *`,
      [
        fullName, 
        email, 
        contactNumber, 
        amountValue,
        message || null, // Handle null message properly
        proofOfPaymentUrl, 
        mappedPaymentMethod, // Use the mapped value
        date,
        'pending'
      ]
    );

    const newDonation = result.rows[0];
    console.log('Donation saved successfully:', newDonation);
    
    // Format amount for notification
    const formattedAmount = new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amountValue);

    // Send confirmation email to donor
    try {
      await sendDonationConfirmation(
        email,
        fullName,
        amountValue,
        mappedPaymentMethod
      );
      console.log('Confirmation email sent to donor:', email);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the request if email sending fails
    }

    // Send notification to admins about new donation
    try {
      await notificationUtils.notifyAllAdmins(
        'donation',
        `New donation of ${formattedAmount} from ${fullName} is waiting for verification.`,
        newDonation.id,
        {
          name: fullName,
          profile_photo: '/images/donate-icon.png'
        }
      );
      console.log('Admin notification sent for new donation');
    } catch (notificationError) {
      console.error('Failed to send admin notification:', notificationError);
      // Don't fail the request if notification sending fails
    }

    return res.status(201).json(newDonation);

  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      error: 'Failed to save donation',
      details: error.message
    });
  }
});

// Verify donation with email notification
router.put('/:id/verify', async (req, res) => {
  try {
    console.log('Verifying donation:', req.params.id);
    
    // First, get the donation details to have the email
    const donationResult = await db.query(
      'SELECT * FROM monetary_donations WHERE id = $1',
      [req.params.id]
    );
    
    const donation = donationResult.rows[0];
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    
    // Then update the donation status
    const result = await db.query(`
      UPDATE monetary_donations 
      SET 
        verification_status = 'verified', 
        verified_at = CURRENT_TIMESTAMP,
        verified_by = $1
      WHERE id = $2 
      RETURNING *
    `, ['Admin', req.params.id]);

    const verifiedDonation = result.rows[0];
    console.log('Verification result:', verifiedDonation);
    
    // Send verification email
    try {
      await sendDonationVerificationEmail(
        donation.email, 
        donation.full_name, 
        donation.amount,
        donation.payment_method
      );
      console.log('Verification email sent to', donation.email);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Don't fail the request if email sending fails
    }
    
    // Format amount for notification
    const formattedAmount = new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(donation.amount);

    // Send notification to admins about verified donation
    try {
      await notificationUtils.notifyAllAdmins(
        'donation_verified',
        `Donation of ${formattedAmount} from ${donation.full_name} has been verified.`,
        donation.id,
        {
          name: 'System',
          profile_photo: '/images/success-icon.png'
        }
      );
      console.log('Admin notification sent for verified donation');
    } catch (notificationError) {
      console.error('Failed to send admin notification:', notificationError);
      // Don't fail the request if notification sending fails
    }
    
    res.json(verifiedDonation);
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject donation with email notification
router.put('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // First, get the donation details to have the email
    const donationResult = await db.query(
      'SELECT * FROM monetary_donations WHERE id = $1',
      [id]
    );
    
    const donation = donationResult.rows[0];
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    
    // Then update the donation status
    const result = await db.query(
      `UPDATE monetary_donations 
       SET verification_status = 'rejected',
           rejected_at = NOW(),
           rejected_by = $1,
           rejection_reason = $2
       WHERE id = $3 RETURNING *`,
      ['Admin', reason, id]
    );
    
    const rejectedDonation = result.rows[0];
    
    // Send rejection email
    try {
      await sendDonationRejectionEmail(
        donation.email, 
        donation.full_name, 
        donation.amount,
        reason,
        donation.payment_method
      );
      console.log('Rejection email sent to', donation.email);
    } catch (emailError) {
      console.error('Error sending rejection email:', emailError);
      // Don't fail the request if email sending fails
    }
    
    // Format amount for notification
    const formattedAmount = new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(donation.amount);

    // Send notification to admins about rejected donation
    try {
      await notificationUtils.notifyAllAdmins(
        'donation_rejected',
        `Donation of ${formattedAmount} from ${donation.full_name} has been rejected. Reason: ${reason || 'Not specified'}`,
        donation.id,
        {
          name: 'System',
          profile_photo: '/images/error-icon.png'
        }
      );
      console.log('Admin notification sent for rejected donation');
    } catch (notificationError) {
      console.error('Failed to send admin notification:', notificationError);
      // Don't fail the request if notification sending fails
    }
    
    res.json(rejectedDonation);
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

// Endpoint for monetary donations
router.post('/monetary', async (req, res) => {
  try {
    const {
      fullName,
      email,
      contactNumber,
      amount,
      message,
      paymentMethod,
      proofOfPayment
    } = req.body;

    const result = await db.query(`
      INSERT INTO monetary_donations (
        full_name,
        email,
        contact_number,
        amount,
        message,
        proof_of_payment,
        date,
        payment_method
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7)
      RETURNING *
    `, [
      fullName,
      email,
      contactNumber,
      amount,
      message,
      proofOfPayment, // Use the Cloudinary URL directly
      paymentMethod
    ]);

    const newDonation = result.rows[0];
    
    // Format amount for notification
    const formattedAmount = new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);

    // Send notification to admins about new donation
    try {
      await notificationUtils.notifyAllAdmins(
        'donation',
        `New donation of ${formattedAmount} from ${fullName} is waiting for verification.`,
        newDonation.id,
        {
          name: fullName,
          profile_photo: '/images/donate-icon.png'
        }
      );
      console.log('Admin notification sent for new donation');
    } catch (notificationError) {
      console.error('Failed to send admin notification:', notificationError);
      // Don't fail the request if notification sending fails
    }

    res.status(201).json(newDonation);
  } catch (error) {
    console.error('Error creating monetary donation:', error);
    res.status(500).json({ error: 'Failed to create monetary donation' });
  }
});

// New endpoint to send donation certificate
router.post('/:id/send-certificate', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First, get the donation details
    const donationResult = await db.query(
      'SELECT * FROM monetary_donations WHERE id = $1',
      [id]
    );
    
    const donation = donationResult.rows[0];
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    
    // Check if donation is verified
    if (donation.verification_status !== 'verified') {
      return res.status(400).json({ 
        success: false,
        message: 'Only verified donations can receive certificates' 
      });
    }
    
    // Check if donor email exists
    if (!donation.email) {
      return res.status(400).json({ 
        success: false,
        message: 'Donor email is missing' 
      });
    }
    
    // Send certificate email - pass true for isGeneralDonation to use the generic template
    await sendDonationCertificateEmail(
      donation.email,
      donation.full_name,
      'KKMK Scholar', // Still pass the scholar name but it won't be used in the template
      donation.amount,
      donation.date || donation.created_at,
      donation.id,
      true // Set isGeneralDonation flag to true for monetary donations
    );
    
    // Try to update the certificate_sent status if the columns exist
    try {
      // First check if columns exist
      const columnsExist = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'monetary_donations' 
        AND column_name IN ('certificate_sent', 'certificate_sent_at')
      `);
      
      // Only attempt to update if both columns exist
      if (columnsExist.rows.length === 2) {
        await db.query(
          `UPDATE monetary_donations 
           SET certificate_sent = true,
               certificate_sent_at = NOW()
           WHERE id = $1`,
          [id]
        );
        console.log('Updated certificate_sent status in database');
      } else {
        console.warn('Certificate columns do not exist in the database yet.');
        // You could create the columns here if they don't exist yet:
        await db.query(`
          ALTER TABLE monetary_donations 
          ADD COLUMN IF NOT EXISTS certificate_sent BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS certificate_sent_at TIMESTAMP
        `);
        
        // Then update the record
        await db.query(
          `UPDATE monetary_donations 
           SET certificate_sent = true,
               certificate_sent_at = NOW()
           WHERE id = $1`,
          [id]
        );
        console.log('Created certificate columns and updated status');
      }
    } catch (dbError) {
      // Log the error but don't fail the request
      console.error('Error updating certificate status in database:', dbError);
      // The certificate was still sent, so we'll return success
    }
    
    // Return success regardless of database update
    res.json({ 
      success: true,
      message: 'Certificate sent successfully' 
    });
    
  } catch (error) {
    console.error('Error sending certificate:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to send certificate',
      error: error.message 
    });
  }
});

module.exports = router;