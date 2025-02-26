const db = require('../config/db');

const notificationModel = {
  async createNotification(data) {
    return db.one(`
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
  },

  async getUserNotifications(userId) {
    return db.any(`
      SELECT *
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20`,
      [userId]
    );
  },

  async markAsRead(notificationId) {
    return db.none(`
      UPDATE notifications
      SET read = true
      WHERE id = $1`,
      [notificationId]
    );
  },

  async markAllAsRead(userId) {
    return db.none(`
      UPDATE notifications
      SET read = true
      WHERE user_id = $1 AND read = false`,
      [userId]
    );
  },

  async createDistributionNotification(userId, itemName, quantity, distributionId) {
    return db.one(`
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
  },

  async createEventReminderNotification(data) {
    return db.one(`
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
  },

  async handleEventResponse(notificationId, userId, eventId, confirmed) {
    return db.task(async t => {
      try {
        // First check if the participant exists
        const participant = await t.oneOrNone(
          'SELECT * FROM event_participants WHERE event_id = $1 AND user_id = $2',
          [eventId, userId]
        );

        if (!participant) {
          throw new Error('Participant not found in event');
        }

        if (!confirmed) {
          // Remove participant if they decline
          await t.none(
            'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
            [eventId, userId]
          );
          
          // Update event's current_volunteers count
          await t.none(
            'UPDATE events SET current_volunteers = current_volunteers - 1 WHERE id = $1',
            [eventId]
          );
        } else {
          // Update status to ACTIVE if they confirm
          const result = await t.result(
            'UPDATE event_participants SET status = $1 WHERE event_id = $2 AND user_id = $3 AND status = $4',
            ['ACTIVE', eventId, userId, 'PENDING']
          );
          
          if (result.rowCount === 0) {
            // Check if already active
            const currentStatus = await t.oneOrNone(
              'SELECT status FROM event_participants WHERE event_id = $1 AND user_id = $2',
              [eventId, userId]
            );
            
            if (currentStatus && currentStatus.status === 'ACTIVE') {
              // Participant already active - removed console.log
            } else {
              throw new Error('Failed to update participant status');
            }
          }
        }
  
        // Mark notification as read
        await t.none(
          'UPDATE notifications SET read = true WHERE id = $1',
          [notificationId]
        );
  
        return { success: true };
      } catch (error) {
        // Removed console.error
        throw error;
      }
    });
  },

  async createLocationVerificationNotification(userId, content) {
    return db.one(`
      INSERT INTO notifications 
      (user_id, type, content, actor_name, actor_avatar, related_id)
      VALUES ($1, 'location_verification', $2, 'System', '/images/notify-icon.png', $3)
      RETURNING *`,
      [userId, content, userId] // Using userId as related_id
    );
  },

  async createLocationRemarkNotification(userId, content) {
    return db.one(`
      INSERT INTO notifications 
      (user_id, type, content, actor_name, actor_avatar, related_id)
      VALUES ($1, 'location_remark', $2, 'System', '/images/notify-icon.png', $3)
      RETURNING *`,
      [userId, content, userId] // Using userId as related_id
    );
  }
};

module.exports = notificationModel;
