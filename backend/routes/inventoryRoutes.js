const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

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
        category,
        frequency,
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
        category,
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

// Add new regular donation
router.post('/regular', async (req, res) => {
  const { donatorName, email, contactNumber, item, quantity, category, frequency } = req.body;
  try {
    const result = await db.query(`
      INSERT INTO regular_donations (
        donator_name, email, contact_number, item, quantity, 
        category, frequency, last_updated, verification_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, 'pending')
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
        'regular' as type
    `, [donatorName, email, contactNumber, item, quantity, category, frequency]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding regular donation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new in-kind donation
router.post('/inkind', async (req, res) => {
  const { donatorName, email, contactNumber, item, quantity, category } = req.body;
  try {
    const result = await db.query(`
      INSERT INTO inkind_donations (
        donator_name, email, contact_number, item, quantity, 
        category, last_updated, verification_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, 'pending')
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
        'in-kind' as type
    `, [donatorName, email, contactNumber, item, quantity, category]);
    res.status(201).json(result.rows[0]);
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
  const { donatorName, email, contactNumber, item, quantity, category, frequency } = req.body;
  try {
    const result = await db.query(`
      UPDATE regular_donations 
      SET donator_name = $1, email = $2, contact_number = $3, 
          item = $4, quantity = $5, category = $6, frequency = $7,
          last_updated = CURRENT_TIMESTAMP
      WHERE id = $8 
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
        'regular' as type
    `, [donatorName, email, contactNumber, item, quantity, category, frequency, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating regular donation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update in-kind donation
router.put('/inkind/:id', async (req, res) => {
  const { id } = req.params;
  const { donatorName, email, contactNumber, item, quantity, category } = req.body;
  try {
    const result = await db.query(`
      UPDATE inkind_donations 
      SET donator_name = $1, email = $2, contact_number = $3,
          item = $4, quantity = $5, category = $6,
          last_updated = CURRENT_TIMESTAMP
      WHERE id = $7 
      RETURNING *, 'in-kind' as type
    `, [donatorName, email, contactNumber, item, quantity, category, id]);
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

// Update the distribution routes
router.post('/regular/:id/distribute', async (req, res) => {
  const { id } = req.params;
  const { quantity, recipientId, recipientType } = req.body;
  
  try {
    // Replace db.tx with client transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      const updatedItemResult = await client.query(`
        UPDATE regular_donations 
        SET quantity = quantity - $1, last_updated = CURRENT_TIMESTAMP
        WHERE id = $2 AND quantity >= $1 
        RETURNING *, 'regular' as type
      `, [quantity, id]);

      const updatedItem = updatedItemResult.rows[0];

      await client.query(`
        INSERT INTO item_distributions 
        (item_id, recipient_id, recipient_type, quantity, item_type)
        VALUES ($1, $2, $3, $4, 'regular')
        RETURNING id
      `, [id, recipientId, recipientType, quantity]);

      // Create notification if recipient is a scholar with placeholder image
      if (recipientType === 'scholar') {
        const notificationContent = `📦 You have received ${quantity} ${updatedItem.item}`;
        await client.query(`
          INSERT INTO notifications 
          (user_id, type, content, related_id)
          VALUES ($1, 'distribution', $2, $3)
        `, [recipientId, notificationContent, id]);
      }
      
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

router.post('/inkind/:id/distribute', async (req, res) => {
  const { id } = req.params;
  const { quantity, recipientId, recipientType } = req.body;
  
  try {
    // Replace db.tx with client transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      const updatedItemResult = await client.query(`
        UPDATE inkind_donations 
        SET quantity = quantity - $1, last_updated = CURRENT_TIMESTAMP
        WHERE id = $2 AND quantity >= $1 
        RETURNING *, 'in-kind' as type
      `, [quantity, id]);

      const updatedItem = updatedItemResult.rows[0];

      await client.query(`
        INSERT INTO item_distributions 
        (item_id, recipient_id, recipient_type, quantity, item_type)
        VALUES ($1, $2, $3, $4, 'in-kind')
        RETURNING id
      `, [id, recipientId, recipientType, quantity]);

      // Create notification if recipient is a scholar with placeholder image
      if (recipientType === 'scholar') {
        const notificationContent = `📦 You have received ${quantity} ${updatedItem.item}`;
        await client.query(`
          INSERT INTO notifications 
          (user_id, type, content, related_id)
          VALUES ($1, 'distribution', $2, $3)
        `, [recipientId, notificationContent, id]);
      }
      
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

// Verify regular donation
router.post('/regular/:id/verify', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const verifiedBy = req.user ? req.user.email : 'system'; // Add fallback
  
  try {
    // Replace db.one with db.query
    const result = await db.query(`
      UPDATE regular_donations 
      SET verification_status = 'verified',
          verified_at = CURRENT_TIMESTAMP,
          verified_by = $1
      WHERE id = $2 
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
        rejected_at as "rejectedAt",
        rejected_by as "rejectedBy",
        rejection_reason as "rejectionReason",
        'regular' as type
    `, [verifiedBy, id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error verifying regular donation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject regular donation
router.post('/regular/:id/reject', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const rejectedBy = req.user ? req.user.email : 'system'; // Add fallback
  
  try {
    // Replace db.one with db.query
    const result = await db.query(`
      UPDATE regular_donations 
      SET verification_status = 'rejected',
          rejected_at = CURRENT_TIMESTAMP,
          rejected_by = $1,
          rejection_reason = $2
      WHERE id = $3 
      RETURNING *, 'regular' as type
    `, [rejectedBy, reason, id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error rejecting regular donation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add similar routes for in-kind donations
router.post('/inkind/:id/verify', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const verifiedBy = req.user ? req.user.email : 'system';
  
  try {
    // Replace db.one with db.query
    const result = await db.query(`
      UPDATE inkind_donations 
      SET verification_status = 'verified',
          verified_at = CURRENT_TIMESTAMP,
          verified_by = $1
      WHERE id = $2 
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
        rejected_at as "rejectedAt",
        rejected_by as "rejectedBy",
        rejection_reason as "rejectionReason",
        'in-kind' as type
    `, [verifiedBy, id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error verifying in-kind donation:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/inkind/:id/reject', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const rejectedBy = req.user ? req.user.email : 'system';
  
  try {
    // Replace db.one with db.query
    const result = await db.query(`
      UPDATE inkind_donations 
      SET verification_status = 'rejected',
          rejected_at = CURRENT_TIMESTAMP,
          rejected_by = $1,
          rejection_reason = $2
      WHERE id = $3 
      RETURNING *, 'in-kind' as type
    `, [rejectedBy, reason, id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error rejecting in-kind donation:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
