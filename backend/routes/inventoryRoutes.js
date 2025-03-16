const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const notificationUtils = require('../utils/notificationUtils'); // Add this import

// Define standard categories to use across the system
const STANDARD_CATEGORIES = [
  'Food & Nutrition',
  'Clothing & Footwear',
  'School Supplies',
  'Medical Supplies',
  'Hygiene Supplies'
];

// Add validation middleware
const validateDonation = (req, res, next) => {
  const { donatorName, email, contactNumber, item, quantity, category, unit } = req.body;
  
  // Basic validation
  if (!donatorName || !email || !contactNumber || !item || !quantity || !category || !unit) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Updated email validation with more specific regex
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address (e.g., example@domain.com)' });
  }

  // Contact number validation (Philippine format)
  const cleanPhone = contactNumber.replace(/[\s-]/g, ''); // Remove spaces and dashes
  const phoneRegex = /^(\+?63|0)[0-9]{10}$/;
  if (!phoneRegex.test(cleanPhone)) {
    return res.status(400).json({ error: 'Invalid phone number format. Use +639XXXXXXXXX or 09XXXXXXXXX' });
  }

  // Quantity validation
  if (quantity <= 0 || !Number.isInteger(Number(quantity))) {
    return res.status(400).json({ error: 'Quantity must be a positive integer' });
  }

  // Validate expiration date for food and medical items
  if (['Food & Nutrition', 'Medical Supplies & Medicines'].includes(category)) {
    const { expirationDate } = req.body;
    if (!expirationDate) {
      return res.status(400).json({ error: 'Expiration date is required for food and medical items' });
    }
    
    const today = new Date();
    const expDate = new Date(expirationDate);
    if (expDate <= today) {
      return res.status(400).json({ error: 'Expiration date must be in the future' });
    }
  }

  next();
};

// Get all inventory items
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM inventory ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all regular donations
router.get('/regular', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id,
        donator_name as "donatorName",
        email,
        contact_number as "contactNumber",
        item,
        quantity,
        unit,
        category,
        frequency,
        expiration_date as "expirationDate",
        created_at,
        last_updated as "lastUpdated",
        verification_status as "verificationStatus",
        verified_at as "verifiedAt",
        verified_by as "verifiedBy",
        rejected_at as "rejectedAt",
        rejected_by as "rejectedBy",
        rejection_reason as "rejectionReason",
        'regular' as type 
      FROM regular_donations 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting regular donations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all in-kind donations
router.get('/inkind', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id,
        donator_name as "donatorName",
        email,
        contact_number as "contactNumber",
        item,
        quantity,
        unit,
        category,
        expiration_date as "expirationDate",
        created_at,
        last_updated as "lastUpdated",
        verification_status as "verificationStatus",
        verified_at as "verifiedAt",
        verified_by as "verifiedBy",
        rejected_at as "rejectedAt",
        rejected_by as "rejectedBy",
        rejection_reason as "rejectionReason",
        'in-kind' as type 
      FROM inkind_donations 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting in-kind donations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new inventory item
router.post('/', async (req, res) => {
  const { name, quantity, category, type } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO inventory (name, quantity, category, type, last_updated) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *',
      [name, quantity, category, type]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding inventory item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new regular donation with notification
router.post('/regular', validateDonation, async (req, res) => {
  const { donatorName, email, contactNumber, item, quantity, category, frequency, unit, expirationDate } = req.body;
  try {
    const result = await db.query(`
      INSERT INTO regular_donations (
        donator_name, email, contact_number, item, quantity, 
        category, frequency, unit, expiration_date, last_updated, verification_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, 'pending')
      RETURNING *
    `, [donatorName, email, contactNumber, item, quantity, category, frequency, unit, expirationDate]);
    
    const newDonation = result.rows[0];

    // Send notification to admins
    try {
      await notificationUtils.notifyAllAdmins(
        'donation',
        `New regular donation: ${quantity} ${unit} of ${item} from ${donatorName} is waiting for verification.`,
        newDonation.id,
        {
          name: donatorName,
          profile_photo: '/images/donate-icon.png'
        }
      );
      console.log('Admin notification sent for new regular donation');
    } catch (notificationError) {
      console.error('Failed to send admin notification:', notificationError);
      // Don't fail the request if notification sending fails
    }
    
    res.status(201).json(newDonation);
  } catch (error) {
    console.error('Error adding regular donation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new in-kind donation with notification
router.post('/inkind', validateDonation, async (req, res) => {
  const { donatorName, email, contactNumber, item, quantity, category, unit, expirationDate } = req.body;
  try {
    const result = await db.query(`
      INSERT INTO inkind_donations (
        donator_name, email, contact_number, item, quantity, 
        category, unit, expiration_date, last_updated, verification_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, 'pending')
      RETURNING *
    `, [donatorName, email, contactNumber, item, quantity, category, unit, expirationDate]);
    
    const newDonation = result.rows[0];
    
    // Send notification to admins
    try {
      await notificationUtils.notifyAllAdmins(
        'donation',
        `New in-kind donation: ${quantity} ${unit} of ${item} from ${donatorName} is waiting for verification.`,
        newDonation.id,
        {
          name: donatorName,
          profile_photo: '/images/donate-icon.png'
        }
      );
      console.log('Admin notification sent for new in-kind donation');
    } catch (notificationError) {
      console.error('Failed to send admin notification:', notificationError);
      // Don't fail the request if notification sending fails
    }
    
    res.status(201).json(newDonation);
  } catch (error) {
    console.error('Error adding in-kind donation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update inventory item
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, quantity, category, type } = req.body;
  try {
    const result = await db.query(
      'UPDATE inventory SET name = $1, quantity = $2, category = $3, type = $4, last_updated = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [name, quantity, category, type, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update regular donation
router.put('/regular/:id', async (req, res) => {
  const { id } = req.params;
  const { donatorName, email, contactNumber, item, quantity, category, frequency, unit, expirationDate } = req.body;
  try {
    const result = await db.query(`
      UPDATE regular_donations 
      SET donator_name = $1, 
          email = $2, 
          contact_number = $3, 
          item = $4, 
          quantity = $5, 
          category = $6, 
          frequency = $7,
          unit = $8,
          expiration_date = $9,
          last_updated = CURRENT_TIMESTAMP
      WHERE id = $10 
      RETURNING 
        id,
        donator_name as "donatorName",
        email,
        contact_number as "contactNumber",
        item,
        quantity,
        category,
        frequency,
        unit,
        expiration_date as "expirationDate",
        verification_status as "verificationStatus",
        last_updated as "lastUpdated",
        'regular' as type
    `, [donatorName, email, contactNumber, item, quantity, category, frequency, unit, expirationDate, id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating regular donation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update in-kind donation
router.put('/inkind/:id', async (req, res) => {
  const { id } = req.params;
  const { donatorName, email, contactNumber, item, quantity, category, unit, expirationDate } = req.body;
  try {
    const result = await db.query(`
      UPDATE inkind_donations 
      SET donator_name = $1, 
          email = $2, 
          contact_number = $3,
          item = $4, 
          quantity = $5, 
          category = $6,
          unit = $7,
          expiration_date = $8,
          last_updated = CURRENT_TIMESTAMP
      WHERE id = $9 
      RETURNING 
        id,
        donator_name as "donatorName",
        email,
        contact_number as "contactNumber",
        item,
        quantity,
        category,
        unit,
        expiration_date as "expirationDate",
        verification_status as "verificationStatus",
        last_updated as "lastUpdated",
        'in-kind' as type
    `, [donatorName, email, contactNumber, item, quantity, category, unit, expirationDate, id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating in-kind donation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete regular donation
router.delete('/regular/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM regular_donations WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ message: 'Regular donation deleted successfully' });
  } catch (error) {
    console.error('Error deleting regular donation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete in-kind donation
router.delete('/inkind/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM inkind_donations WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ message: 'In-kind donation deleted successfully' });
  } catch (error) {
    console.error('Error deleting in-kind donation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Distribute inventory item
router.post('/:id/distribute', async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  try {
    const result = await db.query(
      'UPDATE inventory SET quantity = quantity - $1, last_updated = CURRENT_TIMESTAMP WHERE id = $2 AND quantity >= $1 RETURNING *',
      [quantity, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error distributing inventory item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add validation for distribution
const validateDistribution = (req, res, next) => {
  const { quantity, recipientId, recipientType } = req.body;

  if (!quantity || !recipientId || !recipientType) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (quantity <= 0 || !Number.isInteger(Number(quantity))) {
    return res.status(400).json({ error: 'Quantity must be a positive integer' });
  }

  if (!['scholar', 'volunteer', 'sponsor'].includes(recipientType)) {
    return res.status(400).json({ error: 'Invalid recipient type' });
  }

  next();
};

// Update the distribution routes
router.post('/regular/:id/distribute', validateDistribution, async (req, res) => {
  const { id } = req.params;
  const { quantity, recipientId, recipientType, unit } = req.body;
  
  try {
    // Replace db.tx with client transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // First fetch the item details before updating it
      const itemResult = await client.query(`
        SELECT item, quantity, unit 
        FROM regular_donations 
        WHERE id = $1
      `, [id]);
      
      if (itemResult.rows.length === 0) {
        throw new Error('Item not found');
      }
      
      const itemDetails = itemResult.rows[0];
      
      // Now update the quantity
      const updatedItemResult = await client.query(`
        UPDATE regular_donations 
        SET quantity = quantity - $1, last_updated = CURRENT_TIMESTAMP
        WHERE id = $2 AND quantity >= $1 
        RETURNING *, 'regular' as type
      `, [quantity, id]);

      const updatedItem = updatedItemResult.rows[0];
      
      if (!updatedItem) {
        throw new Error('Insufficient quantity');
      }

      // Add distribution record
      const distributionResult = await client.query(`
        INSERT INTO item_distributions 
        (item_id, recipient_id, recipient_type, quantity, unit, item_type)
        VALUES ($1, $2, $3, $4, $5, 'regular')
        RETURNING id
      `, [id, recipientId, recipientType, quantity, unit || itemDetails.unit]);
      
      const distributionId = distributionResult.rows[0].id;

      // Get recipient information for notification
      const recipientResult = await client.query(`
        SELECT name, email FROM users WHERE id = $1
      `, [recipientId]);
      
      const recipient = recipientResult.rows[0] || { name: 'Unknown Recipient', email: null };

      // Create notification if recipient is a scholar
      if (recipientType === 'scholar') {
        const notificationContent = `📦 You have received ${quantity} ${unit || itemDetails.unit} of ${itemDetails.item}`;
        await client.query(`
          INSERT INTO notifications 
          (user_id, type, content, related_id)
          VALUES ($1, 'distribution', $2, $3)
        `, [recipientId, notificationContent, distributionId]);
      }
      
      // Send notification to admins about the distribution
      await notificationUtils.notifyAllAdmins(
        'distribution',
        `${quantity} ${unit || itemDetails.unit} of ${itemDetails.item} has been distributed to ${recipient.name} (${recipientType})`,
        distributionId,
        {
          name: req.user ? req.user.name : 'System',
          profile_photo: '/images/inventory-icon.png'
        }
      );
      
      await client.query('COMMIT');
      res.json(updatedItem);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error distributing regular donation:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/inkind/:id/distribute', validateDistribution, async (req, res) => {
  const { id } = req.params;
  const { quantity, recipientId, recipientType, unit } = req.body;
  
  try {
    // Replace db.tx with client transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // First fetch the item details before updating it
      const itemResult = await client.query(`
        SELECT item, quantity, unit 
        FROM inkind_donations 
        WHERE id = $1
      `, [id]);
      
      if (itemResult.rows.length === 0) {
        throw new Error('Item not found');
      }
      
      const itemDetails = itemResult.rows[0];
      
      // Now update the quantity
      const updatedItemResult = await client.query(`
        UPDATE inkind_donations 
        SET quantity = quantity - $1, last_updated = CURRENT_TIMESTAMP
        WHERE id = $2 AND quantity >= $1 
        RETURNING *, 'in-kind' as type
      `, [quantity, id]);

      const updatedItem = updatedItemResult.rows[0];
      
      if (!updatedItem) {
        throw new Error('Insufficient quantity');
      }

      // Add distribution record
      const distributionResult = await client.query(`
        INSERT INTO item_distributions 
        (item_id, recipient_id, recipient_type, quantity, unit, item_type)
        VALUES ($1, $2, $3, $4, $5, 'in-kind')
        RETURNING id
      `, [id, recipientId, recipientType, quantity, unit || itemDetails.unit]);
      
      const distributionId = distributionResult.rows[0].id;

      // Get recipient information for notification
      const recipientResult = await client.query(`
        SELECT name, email FROM users WHERE id = $1
      `, [recipientId]);
      
      const recipient = recipientResult.rows[0] || { name: 'Unknown Recipient', email: null };

      // Create notification if recipient is a scholar
      if (recipientType === 'scholar') {
        const notificationContent = `📦 You have received ${quantity} ${unit || itemDetails.unit} of ${itemDetails.item}`;
        await client.query(`
          INSERT INTO notifications 
          (user_id, type, content, related_id)
          VALUES ($1, 'distribution', $2, $3)
        `, [recipientId, notificationContent, distributionId]);
      }
      
      // Send notification to admins about the distribution
      await notificationUtils.notifyAllAdmins(
        'distribution',
        `${quantity} ${unit || itemDetails.unit} of ${itemDetails.item} has been distributed to ${recipient.name} (${recipientType})`,
        distributionId,
        {
          name: req.user ? req.user.name : 'System',
          profile_photo: '/images/inventory-icon.png'
        }
      );
      
      await client.query('COMMIT');
      res.json(updatedItem);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error distributing in-kind donation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update get distributions route
router.get('/distributions', async (req, res) => {
  try {
    // Replace db.any with db.query
    const result = await db.query(`
      SELECT 
        d.id,
        d.quantity,
        d.distributed_at as "distributedAt",
        d.item_type as "itemType",
        d.recipient_type as "recipientType",
        d.status,  /* Added status field */
        d.verification_date as "verificationDate",  /* Added verification date */
        d.verification_message as "verificationMessage",  /* Added verification message */
        u.name as "recipientName",
        u.email as "recipientEmail",
        CASE 
          WHEN d.item_type = 'regular' THEN rd.item
          ELSE id.item
        END as "itemName"
      FROM item_distributions d
      JOIN users u ON d.recipient_id = u.id
      LEFT JOIN regular_donations rd ON d.item_id = rd.id AND d.item_type = 'regular'
      LEFT JOIN inkind_donations id ON d.item_id = id.id AND d.item_type = 'in-kind'
      ORDER BY d.distributed_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting distributions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this new route to handle distribution verification
router.put('/distributions/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { scholarId, status, message } = req.body;

    // Validate status
    if (!['received', 'not_received'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get scholar details for notification
    const scholarResult = await db.query(
      'SELECT name, email FROM users WHERE id = $1',
      [scholarId]
    );
    
    const scholar = scholarResult.rows[0];

    // Get all admin users
    const adminResult = await db.query(
      'SELECT id FROM users WHERE role = $1',
      ['admin']
    );

    // Get distribution details
    const distributionResult = await db.query(`
      SELECT d.*, 
        CASE 
          WHEN d.item_type = 'regular' THEN rd.item
          ELSE id.item
        END as item_name
      FROM item_distributions d
      LEFT JOIN regular_donations rd ON d.item_id = rd.id AND d.item_type = 'regular'
      LEFT JOIN inkind_donations id ON d.item_id = id.id AND d.item_type = 'in-kind'
      WHERE d.id = $1
    `, [id]);

    const distribution = distributionResult.rows[0];

    // Update the distribution status
    const result = await db.query(
      `UPDATE item_distributions 
       SET status = $1,
           verification_date = CURRENT_TIMESTAMP,
           verification_message = $2
       WHERE id = $3 
       RETURNING *`,
      [status, message || null, id]
    );

    // Create notifications for all admins
    for (const admin of adminResult.rows) {
      await db.query(`
        INSERT INTO notifications 
        (user_id, type, content, related_id, is_read, actor_name, actor_avatar)
        VALUES ($1, 'distribution_verification', $2, $3, false, $4, $5)
      `, [
        admin.id,
        `Scholar ${scholar.name} has ${status === 'received' ? 'verified receipt of' : 'reported an issue with'} ${distribution.quantity} ${distribution.unit} of ${distribution.item_name}${message ? `. Message: ${message}` : ''}`,
        id,
        scholar.name,
        '/images/verification-icon.png'
      ]);
    }

    // Send email to admins
    try {
      await emailService.sendDistributionVerificationEmail(
        process.env.ADMIN_EMAIL,
        scholar.name,
        status,
        message,
        id,
        {
          itemName: distribution.item_name,
          quantity: distribution.quantity,
          unit: distribution.unit
        }
      );
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
    }

    res.json({
      success: true,
      message: 'Distribution verification updated',
      distribution: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error verifying distribution:', error);
    res.status(500).json({ error: 'Failed to verify distribution' });
  }
});

// Add this new route to get distributions with location data
router.get('/distributions-with-location', async (req, res) => {
  try {
    // Replace db.any with db.query
    const result = await db.query(`
      SELECT 
        d.id,
        d.recipient_id as "recipientId",
        d.quantity,
        d.distributed_at as "distributedAt",
        d.item_type as "itemType",
        u.name as "recipientName",
        u.latitude as "recipientLatitude",
        u.longitude as "recipientLongitude",
        CASE 
          WHEN d.item_type = 'regular' THEN rd.item
          ELSE id.item
        END as "itemName",
        CASE 
          WHEN d.item_type = 'regular' THEN rd.category
          ELSE id.category
        END as "category"
      FROM item_distributions d
      JOIN users u ON d.recipient_id = u.id
      LEFT JOIN regular_donations rd ON d.item_id = rd.id AND d.item_type = 'regular'
      LEFT JOIN inkind_donations id ON d.item_id = id.id AND d.item_type = 'in-kind'
      WHERE u.latitude IS NOT NULL 
      AND u.longitude IS NOT NULL
      ORDER BY d.distributed_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting distributions with location:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update the distributions-by-sector endpoint
router.get('/distributions-by-sector', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        d.id,
        d.quantity,
        d.distributed_at,
        d.item_type,
        u.latitude,
        u.longitude,
        CASE 
          WHEN d.item_type = 'regular' THEN rd.item
          ELSE id.item
        END as item_name,
        CASE 
          WHEN d.item_type = 'regular' THEN rd.category
          ELSE id.category
        END as category
      FROM item_distributions d
      JOIN users u ON d.recipient_id = u.id
      LEFT JOIN regular_donations rd ON d.item_id = rd.id AND d.item_type = 'regular'
      LEFT JOIN inkind_donations id ON d.item_id = id.id AND d.item_type = 'in-kind'
      WHERE u.latitude IS NOT NULL 
        AND u.longitude IS NOT NULL
      ORDER BY d.distributed_at DESC
    `);

    res.json(result.rows.map(row => ({
      id: row.id,
      quantity: parseInt(row.quantity),
      distributedAt: row.distributed_at,
      itemType: row.item_type,
      itemName: row.item_name,
      category: row.category,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude)
    })));
  } catch (error) {
    console.error('Error fetching sector distributions:', error);
    res.status(500).json({ error: 'Failed to fetch distribution data' });
  }
});

// Verify regular donation with notification
router.post('/regular/:id/verify', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { expirationDate } = req.body;
  const verifiedBy = req.user ? req.user.email : 'system';
  
  try {
    // Get donation details before verification
    const donationDetails = await db.query(
      'SELECT item, quantity, unit, donator_name FROM regular_donations WHERE id = $1',
      [id]
    );
    
    if (donationDetails.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    
    const donation = donationDetails.rows[0];
    
    const result = await db.query(`
      UPDATE regular_donations 
      SET verification_status = 'verified',
          verified_at = CURRENT_TIMESTAMP,
          verified_by = $1,
          expiration_date = $2
      WHERE id = $3 
      RETURNING 
        id,
        donator_name as "donatorName",
        email,
        contact_number as "contactNumber",
        item,
        quantity,
        category,
        frequency,
        last_updated as "lastUpdated",
        verification_status as "verificationStatus",
        verified_at as "verifiedAt",
        verified_by as "verifiedBy",
        expiration_date as "expirationDate",
        rejected_at as "rejectedAt",
        rejected_by as "rejectedBy",
        rejection_reason as "rejectionReason",
        'regular' as type
    `, [verifiedBy, expirationDate, id]);
    
    // Send notification about verified donation
    try {
      await notificationUtils.notifyAllAdmins(
        'donation_verified',
        `Regular donation of ${donation.quantity} ${donation.unit} ${donation.item} from ${donation.donator_name} has been verified.`,
        id,
        {
          name: verifiedBy,
          profile_photo: '/images/success-icon.png'
        }
      );
    } catch (notificationError) {
      console.error('Failed to send verification notification:', notificationError);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error verifying regular donation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject regular donation with notification
router.post('/regular/:id/reject', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const rejectedBy = req.user ? req.user.email : 'system';
  
  try {
    // Get donation details before rejection
    const donationDetails = await db.query(
      'SELECT item, quantity, unit, donator_name FROM regular_donations WHERE id = $1',
      [id]
    );
    
    if (donationDetails.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    
    const donation = donationDetails.rows[0];
    
    const result = await db.query(`
      UPDATE regular_donations 
      SET verification_status = 'rejected',
          rejected_at = CURRENT_TIMESTAMP,
          rejected_by = $1,
          rejection_reason = $2
      WHERE id = $3 
      RETURNING *, 'regular' as type
    `, [rejectedBy, reason, id]);
    
    // Send notification about rejected donation
    try {
      await notificationUtils.notifyAllAdmins(
        'donation_rejected',
        `Regular donation of ${donation.quantity} ${donation.unit} ${donation.item} from ${donation.donator_name} has been rejected. Reason: ${reason || 'Not specified'}`,
        id,
        {
          name: rejectedBy,
          profile_photo: '/images/error-icon.png'
        }
      );
    } catch (notificationError) {
      console.error('Failed to send rejection notification:', notificationError);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error rejecting regular donation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify in-kind donation with notification
router.post('/inkind/:id/verify', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { expirationDate } = req.body;
  const verifiedBy = req.user ? req.user.email : 'system';
  
  try {
    // Get donation details before verification
    const donationDetails = await db.query(
      'SELECT item, quantity, unit, donator_name FROM inkind_donations WHERE id = $1',
      [id]
    );
    
    if (donationDetails.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    
    const donation = donationDetails.rows[0];
    
    const result = await db.query(`
      UPDATE inkind_donations 
      SET verification_status = 'verified',
          verified_at = CURRENT_TIMESTAMP,
          verified_by = $1,
          expiration_date = $2
      WHERE id = $3 
      RETURNING 
        id,
        donator_name as "donatorName",
        email,
        contact_number as "contactNumber",
        item,
        quantity,
        category,
        last_updated as "lastUpdated",
        verification_status as "verificationStatus",
        verified_at as "verifiedAt",
        verified_by as "verifiedBy",
        expiration_date as "expirationDate",
        rejected_at as "rejectedAt",
        rejected_by as "rejectedBy",
        rejection_reason as "rejectionReason",
        'in-kind' as type
    `, [verifiedBy, expirationDate, id]);
    
    // Send notification about verified donation
    try {
      await notificationUtils.notifyAllAdmins(
        'donation_verified',
        `In-kind donation of ${donation.quantity} ${donation.unit} ${donation.item} from ${donation.donator_name} has been verified.`,
        id,
        {
          name: verifiedBy,
          profile_photo: '/images/success-icon.png'
        }
      );
    } catch (notificationError) {
      console.error('Failed to send verification notification:', notificationError);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error verifying in-kind donation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject in-kind donation with notification
router.post('/inkind/:id/reject', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const rejectedBy = req.user ? req.user.email : 'system';
  
  try {
    // Get donation details before rejection
    const donationDetails = await db.query(
      'SELECT item, quantity, unit, donator_name FROM inkind_donations WHERE id = $1',
      [id]
    );
    
    if (donationDetails.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    
    const donation = donationDetails.rows[0];
    
    const result = await db.query(`
      UPDATE inkind_donations 
      SET verification_status = 'rejected',
          rejected_at = CURRENT_TIMESTAMP,
          rejected_by = $1,
          rejection_reason = $2
      WHERE id = $3 
      RETURNING *, 'in-kind' as type
    `, [rejectedBy, reason, id]);
    
    // Send notification about rejected donation
    try {
      await notificationUtils.notifyAllAdmins(
        'donation_rejected',
        `In-kind donation of ${donation.quantity} ${donation.unit} ${donation.item} from ${donation.donator_name} has been rejected. Reason: ${reason || 'Not specified'}`,
        id,
        {
          name: rejectedBy,
          profile_photo: '/images/error-icon.png'
        }
      );
    } catch (notificationError) {
      console.error('Failed to send rejection notification:', notificationError);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error rejecting in-kind donation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this new endpoint to get scholar distributions
router.get('/scholar-distributions', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        d.id,
        d.quantity,
        d.distributed_at,
        d.item_type,
        u.latitude,
        u.longitude,
        CASE 
          WHEN d.item_type = 'regular' THEN rd.item
          ELSE id.item
        END as item_name,
        CASE 
          WHEN d.item_type = 'regular' THEN rd.category
          ELSE id.category
        END as category
      FROM item_distributions d
      JOIN users u ON d.recipient_id = u.id
      LEFT JOIN regular_donations rd ON d.item_id = rd.id AND d.item_type = 'regular'
      LEFT JOIN inkind_donations id ON d.item_id = id.id AND d.item_type = 'in-kind'
      WHERE d.recipient_type = 'scholar'
      AND u.latitude IS NOT NULL 
      AND u.longitude IS NOT NULL
      ORDER BY d.distributed_at DESC
    `);

    res.json(result.rows.map(row => ({
      id: row.id,
      quantity: parseInt(row.quantity),
      distributedAt: row.distributed_at,
      itemType: row.item_type,
      itemName: row.item_name,
      category: row.category,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude)
    })));
  } catch (error) {
    console.error('Error fetching scholar distributions:', error);
    res.status(500).json({ error: 'Failed to fetch scholar distribution data' });
  }
});

// Fix the distribution-stats endpoint
router.get('/distribution-stats', async (req, res) => {
  try {
    console.log('Received request for inventory stats:', req.query);
    const { category, timeRange } = req.query;
    
    // Query that combines data from regular_donations and inkind_donations tables
    // Fixed the JSON aggregation syntax error
    const query = `
      WITH combined_items AS (
        -- Regular donations
        SELECT 
          id,
          item as item_name,
          category,
          quantity,
          unit,
          'regular' as source,
          created_at as donation_date
        FROM regular_donations
        WHERE verification_status = 'verified'
        ${category && category !== 'all' ? "AND category = $1" : ""}
        ${timeRange && timeRange !== 'all' ? `
          AND created_at >= CASE 
            WHEN $2 = 'today' THEN CURRENT_DATE
            WHEN $2 = 'week' THEN CURRENT_DATE - INTERVAL '7 days'
            WHEN $2 = 'month' THEN CURRENT_DATE - INTERVAL '30 days'
            WHEN $2 = 'year' THEN CURRENT_DATE - INTERVAL '1 year'
          END
        ` : ""}
        
        UNION ALL
        
        -- In-kind donations
        SELECT 
          id,
          item as item_name,
          category,
          quantity,
          unit,
          'inkind' as source,
          created_at as donation_date
        FROM inkind_donations
        WHERE verification_status = 'verified'
        ${category && category !== 'all' ? "AND category = $1" : ""}
        ${timeRange && timeRange !== 'all' ? `
          AND created_at >= CASE 
            WHEN $2 = 'today' THEN CURRENT_DATE
            WHEN $2 = 'week' THEN CURRENT_DATE - INTERVAL '7 days'
            WHEN $2 = 'month' THEN CURRENT_DATE - INTERVAL '30 days'
            WHEN $2 = 'year' THEN CURRENT_DATE - INTERVAL '1 year'
          END
        ` : ""}
      )
      SELECT 
        item_name as item,
        category,
        SUM(quantity) as quantity,
        unit,
        source,
        COUNT(*) as distribution_count,
        MAX(donation_date) as last_distributed,
        (SELECT json_agg(
          json_build_object(
            'scholar_name', 'Donor',
            'quantity', ci.quantity,
            'distributed_at', ci.donation_date
          )
        ) FROM (
          SELECT quantity, donation_date
          FROM combined_items ci2
          WHERE ci2.item_name = combined_items.item_name
            AND ci2.category = combined_items.category
            AND ci2.unit = combined_items.unit
            AND ci2.source = combined_items.source
          ORDER BY donation_date DESC
          LIMIT 3
        ) ci) as distributions,
        SUM(quantity) as total_distributed
      FROM combined_items
      GROUP BY item_name, category, unit, source
      ORDER BY category, item_name
    `;

    const params = [];
    if (category && category !== 'all') params.push(category);
    if (timeRange && timeRange !== 'all') params.push(timeRange);
    
    console.log('Executing query:', { query, params });
    
    const result = await db.query(query, params);
    
    // Transform the data for frontend
    const transformedData = result.rows.map(item => ({
      id: `${item.category}-${item.item}`.replace(/\s+/g, '-').toLowerCase(),
      item: item.item,
      category: item.category,
      quantity: parseInt(item.quantity),
      unit: item.unit,
      source: item.source,
      distributionCount: parseInt(item.distribution_count),
      totalDistributed: parseInt(item.total_distributed),
      lastDistributed: item.last_distributed,
      distributions: item.distributions || []
    }));

    console.log('Sending inventory stats:', transformedData);
    res.json(transformedData);
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this new endpoint to get distributions for a specific recipient
router.get('/recipient-distributions/:recipientId', async (req, res) => {
  const { recipientId } = req.params;
  
  // Input validation
  if (!recipientId || isNaN(parseInt(recipientId))) {
    return res.status(400).json({ error: 'Invalid recipient ID' });
  }
  
  try {
    console.log('Fetching distributions for recipient ID:', recipientId);
    
    // First check if recipient exists
    const userCheck = await db.query(
      'SELECT id, role FROM users WHERE id = $1',
      [recipientId]
    );
    
    if (userCheck.rows.length === 0) {
      console.log('Recipient not found:', recipientId);
      return res.status(404).json({ error: 'Recipient not found' });
    }
    
    console.log('Recipient exists:', userCheck.rows[0]);
    
    // Fixed the query by explicitly passing the recipientId parameter
    const result = await db.query(`
      SELECT 
        d.id,
        d.quantity,
        d.unit,
        d.distributed_at as "distributedAt",
        d.item_type as "itemType",
        d.status,
        d.verification_date as "verificationDate",
        d.verification_message as "message",
        CASE 
          WHEN d.item_type = 'regular' THEN rd.item
          ELSE id.item
        END as "itemName",
        CASE 
          WHEN d.item_type = 'regular' THEN rd.category
          ELSE id.category
        END as "category"
      FROM item_distributions d
      LEFT JOIN regular_donations rd ON d.item_id = rd.id AND d.item_type = 'regular'
      LEFT JOIN inkind_donations id ON d.item_id = id.id AND d.item_type = 'in-kind'
      WHERE d.recipient_id = $1
      ORDER BY d.distributed_at DESC
    `, [recipientId]); // Added the parameter here, which was missing
    
    console.log(`Found ${result.rows.length} distributions for recipient ${recipientId}`);
    
    // Return the distributions (empty array if none found)
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recipient distributions:', error);
    // Just log the error but return empty array to avoid breaking the UI
    res.json([]);
  }
});

// Add a test endpoint to create a distribution
router.post('/create-test-distribution/:recipientId', async (req, res) => {
  const { recipientId } = req.params;
  
  // Only allow this in development mode
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  
  try {
    // First check if user exists
    const userCheck = await db.query('SELECT id, role FROM users WHERE id = $1', [recipientId]);
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userCheck.rows[0];
    
    // Create a test distribution record directly (for testing UI without real donations)
    // This simulates what happens when an admin distributes an item to a scholar
    const result = await db.query(`
      INSERT INTO item_distributions
        (item_id, recipient_id, recipient_type, quantity, unit, item_type, distributed_at)
      VALUES
        (1, $1, $2, 5, 'pcs', 'regular', CURRENT_TIMESTAMP)
      RETURNING id
    `, [recipientId, user.role.toLowerCase()]);
    
    res.json({ 
      success: true, 
      message: 'Test distribution created',
      id: result.rows[0].id
    });
  } catch (error) {
    console.error('Error creating test distribution:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
