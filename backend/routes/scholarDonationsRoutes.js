const express = require('express');
const router = express.Router();
const db = require('../config/db');
const emailService = require('../services/emailService');
const notificationModel = require('../models/notificationModel');
const { authenticateToken } = require('../middleware/authMiddleware');
const axios = require('axios');

// Send certificate for a donation
router.post('/send-certificate/:id', authenticateToken, async (req, res) => {
  const donationId = req.params.id;
  const adminId = req.user.id;
  
  try {
    // Get donation details
    const donationResult = await db.query(
      `SELECT 
        sd.*,
        CONCAT(s.first_name, ' ', s.last_name) as scholar_name,
        u.email as donor_email
      FROM scholar_donations sd
      LEFT JOIN scholars s ON sd.scholar_id = s.id
      LEFT JOIN users u ON sd.donor_id = u.id
      WHERE sd.id = $1`,
      [donationId]
    );
    
    if (donationResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }
    
    const donation = donationResult.rows[0];
    
    // Check if donation is verified
    if (donation.verification_status !== 'verified') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only verified donations can receive certificates' 
      });
    }
    
    // Check if donor email exists
    if (!donation.donor_email) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send certificate: Donor email is missing'
      });
    }
    
    // Send certificate email
    await emailService.sendDonationCertificateEmail(
      donation.donor_email,
      donation.donor_name,
      donation.scholar_name,
      donation.amount,
      donation.created_at,
      donation.id
    );
    
    // Update certificate_sent status in database
    await db.query(
      `UPDATE scholar_donations 
       SET certificate_sent = true, 
           certificate_sent_at = NOW(), 
           certificate_sent_by = $1
       WHERE id = $2`,
      [adminId, donationId]
    );
    
    // Notify donor if they have a user account
    if (donation.donor_id) {
      await notificationModel.createNotification({
        userId: donation.donor_id,
        type: 'donation_certificate',
        content: `Your donation certificate for ${donation.scholar_name} has been sent to your email.`,
        relatedId: donationId,
        actorId: null,
        actorName: 'KMFI Foundation',
        actorAvatar: '/images/certificate-icon.png'
      });
    }
    
    // Get admin users for notification
    const adminUsersResult = await db.query(
      `SELECT id FROM users WHERE role = 'admin'`
    );
    
    const adminIds = adminUsersResult.rows.map(row => row.id);
    
    // Notify admins
    await notificationModel.notifyAdmins(
      adminIds,
      'donation_certificate_sent',
      `Donation certificate sent to ${donation.donor_name} for donation #${donationId}`,
      donationId,
      { id: adminId, name: req.user.name }
    );
    
    return res.json({
      success: true,
      message: 'Certificate sent successfully'
    });
  } catch (error) {
    console.error('Error sending certificate:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send certificate',
      error: error.message
    });
  }
});

// Add other scholar donation routes here...

module.exports = router;
