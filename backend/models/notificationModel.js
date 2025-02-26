const db = require('../config/db');

const notificationModel = {
  async createNotification(data) {
    // Replace db.one with db.query
    const result = await db.query(`
      INSERT INTO notifications 
      (user_id, type, content, related_id, actor_id, actor_name, actor_avatar)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        data.userId,
        data.type,
        data.content,
        data.relatedId,
        data.actorId,
        data.actorName,
        data.actorAvatar
      ]
    );
    return result.rows[0];
  },

  async getUserNotifications(userId) {
    // Replace db.any with db.query
    const result = await db.query(`
      SELECT *
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20`,
      [userId]
    );
    return result.rows;
  },

  async markAsRead(notificationId) {
    // Replace db.none with db.query
    await db.query(`
      UPDATE notifications
      SET read = true
      WHERE id = $1`,
      [notificationId]
    );
  },

  async markAllAsRead(userId) {
    // Replace db.none with db.query
    await db.query(`
      UPDATE notifications
      SET read = true
      WHERE user_id = $1 AND read = false`,
      [userId]
    );
  },

  async createDistributionNotification(userId, itemName, quantity, distributionId) {
    // Replace db.one with db.query
    const result = await db.query(`
      INSERT INTO notifications 
      (user_id, type, content, related_id)
      VALUES ($1, 'distribution', $2, $3)
      RETURNING *`,
      [
        userId,
        `📦 You have received ${quantity} ${itemName}`,
        distributionId
      ]
    );
    return result.rows[0];
  },

  async createEventReminderNotification(data) {
    // Replace db.one with db.query
    const result = await db.query(`
      INSERT INTO notifications 
      (user_id, type, content, related_id, actor_id, actor_name, actor_avatar, requires_confirmation)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING *`,
      [
        data.userId,
        'event_reminder',
        data.content,
        data.relatedId,
        data.actorId,
        data.actorName,
        data.actorAvatar
      ]
    );
    return result.rows[0];
  },

  async handleEventResponse(notificationId, userId, eventId, confirmed) {
    // Replace db.task with client transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // First check if the participant exists
      const participantResult = await client.query(
        'SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
      );
      
      const participant = participantResult.rows[0];

      if (!participant) {
        throw new Error('Participant not found in event');
      }

      if (!confirmed) {
        // Remove participant if they decline
        await client.query(
          'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
          [eventId, userId]
        );
        
        // Update event's current_volunteers count
        await client.query(
          'UPDATE events SET current_volunteers = current_volunteers - 1 WHERE id = $1',
          [eventId]
        );
      } else {
        // Update status to ACTIVE if they confirm
        const updateResult = await client.query(
          'UPDATE event_participants SET status = $1 WHERE event_id = $2 AND user_id = $3 AND status = $4',
          ['ACTIVE', eventId, userId, 'PENDING']
        );
        
        if (updateResult.rowCount === 0) {
          // Check if already active
          const statusResult = await client.query(
            'SELECT status FROM event_participants WHERE event_id = $1 AND user_id = $2',
            [eventId, userId]
          );
          
          const currentStatus = statusResult.rows[0];
          
          if (currentStatus && currentStatus.status === 'ACTIVE') {
            // Participant already active - removed console.log
          } else {
            throw new Error('Failed to update participant status');
          }
        }
      }

      // Mark notification as read
      await client.query(
        'UPDATE notifications SET read = true WHERE id = $1',
        [notificationId]
      );

      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async createLocationVerificationNotification(userId, content) {
    // Replace db.one with db.query
    const result = await db.query(`
      INSERT INTO notifications 
      (user_id, type, content, actor_name, actor_avatar, related_id)
      VALUES ($1, 'location_verification', $2, 'System', '/images/notify-icon.png', $3)
      RETURNING *`,
      [userId, content, userId] // Using userId as related_id
    );
    return result.rows[0];
  },

  async createLocationRemarkNotification(userId, content) {
    // Replace db.one with db.query
    const result = await db.query(`
      INSERT INTO notifications 
      (user_id, type, content, actor_name, actor_avatar, related_id)
      VALUES ($1, 'location_remark', $2, 'System', '/images/notify-icon.png', $3)
      RETURNING *`,
      [userId, content, userId] // Using userId as related_id
    );
    return result.rows[0];
  }
};

module.exports = notificationModel;
