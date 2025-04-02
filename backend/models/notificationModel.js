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
  },

  async createEventApprovalNotification(userId, eventId, eventTitle, actor) {
    // Create a notification with a more specific format for event approvals
    const result = await db.query(`
      INSERT INTO notifications 
      (user_id, type, content, related_id, actor_id, actor_name, actor_avatar, read)
      VALUES ($1, $2, $3, $4, $5, $6, $7, false)
      RETURNING *`,
      [
        userId,
        'event_approval',
        `Your participation in "${eventTitle}" has been approved!`,
        eventId,
        actor?.id || null,
        actor?.name || 'Admin',
        actor?.profile_photo || '/images/notify-icon.png'
      ]
    );
    return result.rows[0];
  },
  
  async createParticipantRemovalNotification(userId, eventId, eventTitle, reason, actor) {
    const content = `You have been removed from "${eventTitle}"${reason ? `. Reason: ${reason}` : '.'}`;
    
    const result = await db.query(`
      INSERT INTO notifications 
      (user_id, type, content, related_id, actor_id, actor_name, actor_avatar, read)
      VALUES ($1, $2, $3, $4, $5, $6, $7, false)
      RETURNING *`,
      [
        userId,
        'event_removal',
        content,
        eventId,
        actor?.id || null,
        actor?.name || 'Admin',
        actor?.profile_photo || '/images/notify-icon.png'
      ]
    );
    return result.rows[0];
  },

  async createEventReminderNotification(userId, eventId, eventTitle, reminderType) {
    const content = reminderType === 'week' 
      ? `Reminder: "${eventTitle}" is coming up in one week!`
      : `Reminder: "${eventTitle}" is tomorrow!`;
    
    const result = await db.query(`
      INSERT INTO notifications 
      (user_id, type, content, related_id, actor_id, actor_name, actor_avatar, read)
      VALUES ($1, $2, $3, $4, $5, $6, $7, false)
      RETURNING *`,
      [
        userId,
        'event_reminder',
        content,
        eventId,
        null, // System notification, no actor
        'System',
        '/images/notify-icon.png'
      ]
    );
    return result.rows[0];
  },
  
  // Helper method specifically for automated reminders
  async createAutomatedEventReminder(userId, eventId, eventTitle, reminderType) {
    try {
      const content = reminderType === 'week' 
        ? `Reminder: "${eventTitle}" is coming up in one week!`
        : `Reminder: "${eventTitle}" is tomorrow!`;
      
      const result = await db.query(`
        INSERT INTO notifications 
        (user_id, type, content, related_id, actor_id, actor_name, actor_avatar, read)
        VALUES ($1, $2, $3, $4, $5, $6, $7, false)
        RETURNING *`,
        [
          userId,
          'event_reminder',
          content,
          eventId,
          null, // System notification, no actor
          'System',
          '/images/calendar-icon.png'
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error(`Failed to create reminder notification for user ${userId}, event ${eventId}:`, error);
      throw error;
    }
  },
  
  // Bulk create notifications for event reminders
  async createBulkEventReminders(participants, eventId, eventTitle, reminderType) {
    try {
      // Prepare base notification content
      const content = reminderType === 'week' 
        ? `Reminder: "${eventTitle}" is coming up in one week!`
        : `Reminder: "${eventTitle}" is tomorrow!`;
      
      // Create array of value sets for bulk insert
      const values = participants.map(p => {
        return [
          p.id, // user_id
          'event_reminder', // type
          content, // content
          eventId, // related_id
          null, // actor_id (system)
          'System', // actor_name
          '/images/calendar-icon.png', // actor_avatar
          false // read
        ];
      });
      
      // Generate placeholders for parameterized query
      let placeholderCounter = 1;
      const valueStrings = values.map((_, index) => {
        const start = placeholderCounter;
        placeholderCounter += 8; // 8 fields per row
        return `($${start}, $${start+1}, $${start+2}, $${start+3}, $${start+4}, $${start+5}, $${start+6}, $${start+7})`;
      });
      
      // Flatten the values array
      const flatValues = values.reduce((acc, val) => acc.concat(val), []);
      
      // Execute bulk insert if there are participants
      if (valueStrings.length > 0) {
        const result = await db.query(`
          INSERT INTO notifications 
          (user_id, type, content, related_id, actor_id, actor_name, actor_avatar, read)
          VALUES ${valueStrings.join(', ')}
          RETURNING *
        `, flatValues);
        
        return result.rows;
      }
      
      return [];
    } catch (error) {
      console.error(`Failed to create bulk reminder notifications for event ${eventId}:`, error);
      throw error;
    }
  },

  async createReportCardStatusNotification(userId, status, reason = null) {
    let content = '';
    let icon = '/images/notify-icon.png';
    
    switch(status) {
      case 'pending':
        content = 'Your report card has been submitted and is pending review.';
        icon = '/images/pending-icon.png';
        break;
      case 'in_review':
        content = 'Your report card is now being reviewed by our team.';
        icon = '/images/review-icon.png'; // Add a custom icon if you have one
        break;
      case 'verified':
        content = 'Congratulations! Your report card has been verified.';
        icon = '/images/success-icon.png'; // Add a custom icon if you have one
        break;
      case 'rejected':
        content = `Your report card has been rejected${reason ? `: ${reason}` : '.'}`;
        icon = '/images/error-icon.png'; // Add a custom icon if you have one
        break;
      default:
        content = `Your report card status has been updated to: ${status}`;
    }
    
    const result = await db.query(`
      INSERT INTO notifications 
      (user_id, type, content, actor_name, actor_avatar, related_id)
      VALUES ($1, 'report_card_status', $2, 'System', $3, $4)
      RETURNING *`,
      [userId, content, icon, userId]
    );
    return result.rows[0];
  },

  // Add admin notification methods
  async getAdminNotifications(userId) {
    // Similar to getUserNotifications but with admin-specific logic
    const result = await db.query(`
      SELECT *
      FROM notifications
      WHERE user_id = $1 AND (
        type LIKE 'admin_%' OR 
        type IN ('new_user', 'user_updated', 'donation', 'donation_verified', 'donation_rejected', 
                'distribution', 'student_application', 'scholar_donation', 'contact_form',
                'event_participant', 'event_leave', 'scholar_location', 'report_card')
      )
      ORDER BY created_at DESC
      LIMIT 50`,
      [userId]
    );
    return result.rows;
  },

  async markAllAdminAsRead(userId) {
    await db.query(`
      UPDATE notifications
      SET read = true
      WHERE user_id = $1 AND read = false AND (
        type LIKE 'admin_%' OR 
        type IN ('new_user', 'user_updated', 'donation', 'donation_verified', 'donation_rejected', 
                'distribution', 'student_application', 'scholar_donation', 'contact_form',
                'event_participant', 'event_leave', 'scholar_location', 'report_card')
      )`,
      [userId]
    );
  },

  async createAdminNotification(data) {
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
        data.actorName || 'System',
        data.actorAvatar || '/images/admin-icon.png'
      ]
    );
    return result.rows[0];
  },

  // Add a dedicated method for contact form notifications
  async createContactFormNotification(adminIds, contactData) {
    try {
      // Create notifications for each admin
      const notifications = await Promise.all(
        adminIds.map(adminId =>
          this.createAdminNotification({
            userId: adminId,
            type: 'contact_form',
            content: `New contact from ${contactData.firstName} ${contactData.lastName} (${contactData.email})`,
            relatedId: contactData.id,
            actorName: `${contactData.firstName} ${contactData.lastName}`,
            actorAvatar: '/images/contact-icon.png'
          })
        )
      );
      
      return notifications;
    } catch (error) {
      console.error('Error creating contact form notifications:', error);
      throw error;
    }
  },

  // Create notifications specifically for admin users
  async notifyAdmins(adminIds, type, content, relatedId = null, actor = null) {
    try {
      // Create notifications for each admin
      const notifications = await Promise.all(
        adminIds.map(adminId =>
          this.createAdminNotification({
            userId: adminId,
            type,
            content,
            relatedId,
            actorId: actor?.id || null,
            actorName: actor?.name || 'System',
            actorAvatar: actor?.profile_photo || '/images/admin-icon.png'
          })
        )
      );
      
      return notifications;
    } catch (error) {
      console.error('Error notifying admins:', error);
      throw error;
    }
  },

  // Helper to get all admin IDs (useful for system-wide notifications)
  async getAllAdminIds() {
    try {
      // Check if admin_users table exists first
      const tableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'admin_users'
        )
      `);
      
      if (tableCheck.rows[0].exists) {
        // Use admin_users table if it exists
        console.log('Using admin_users table to fetch admin IDs');
        const result = await db.query('SELECT id FROM admin_users');
        return result.rows.map(row => row.id);
      } else {
        // Fallback to users table with admin role
        console.log('admin_users table not found, using users table with admin role');
        const result = await db.query('SELECT id FROM users WHERE role = $1', ['admin']);
        return result.rows.map(row => row.id);
      }
    } catch (error) {
      console.error('Error fetching admin IDs:', error);
      console.error('Stack trace:', error.stack);
      // Return empty array rather than throwing
      return [];
    }
  },

  // Create a special notification specifically for scholar donations
  async createScholarDonationNotification(adminIds, data) {
    try {
      // Create notifications for each admin
      const notifications = await Promise.all(
        adminIds.map(adminId =>
          this.createAdminNotification({
            userId: adminId,
            type: 'scholar_donation',
            content: data.content,
            relatedId: data.donationId,
            actorId: data.donorId || null,
            actorName: data.donorName || 'Anonymous Donor',
            actorAvatar: data.donorAvatar || '/images/donate-icon.png'
          })
        )
      );
      
      return notifications;
    } catch (error) {
      console.error('Error creating scholar donation notifications:', error);
      throw error;
    }
  },

  // Create a special notification for event participants
  async createEventParticipantNotification(adminIds, data) {
    try {
      console.log(`Creating event participant notifications for ${adminIds.length} admins`);
      
      if (!Array.isArray(adminIds) || adminIds.length === 0) {
        console.log('No admin IDs provided for event participant notification');
        return [];
      }
      
      // Create notifications for each admin
      const notifications = await Promise.all(
        adminIds.map(adminId => {
          console.log(`Creating notification for admin ${adminId}`);
          return this.createAdminNotification({
            userId: adminId,
            type: 'event_participant',
            content: data.content,
            relatedId: data.eventId,
            actorId: data.userId || null,
            actorName: data.userName || 'Anonymous User',
            actorAvatar: data.userAvatar || '/images/event-icon.png'
          });
        })
      );
      
      console.log(`Successfully created ${notifications.length} event participant notifications`);
      return notifications;
    } catch (error) {
      console.error('Error creating event participant notifications:', error);
      throw error;
    }
  },

  // Add a helper method for event leave notifications
  async createEventLeaveNotification(adminIds, data) {
    try {
      console.log(`Creating event leave notifications for ${adminIds.length} admins`);
      
      if (!Array.isArray(adminIds) || adminIds.length === 0) {
        console.log('No admin IDs provided for event leave notification');
        return [];
      }
      
      // Create notifications for each admin
      const notifications = await Promise.all(
        adminIds.map(adminId => {
          console.log(`Creating leave notification for admin ${adminId}`);
          return this.createAdminNotification({
            userId: adminId,
            type: 'event_leave',
            content: data.content,
            relatedId: data.eventId,
            actorId: data.userId || null,
            actorName: data.userName || 'Anonymous User',
            actorAvatar: data.userAvatar || '/images/event-icon.png'
          });
        })
      );
      
      console.log(`Successfully created ${notifications.length} event leave notifications`);
      return notifications;
    } catch (error) {
      console.error('Error creating event leave notifications:', error);
      throw error;
    }
  },

  // Add method for report card notifications
  async createReportCardAdminNotification(adminIds, data) {
    try {
      console.log(`Creating report card notifications for ${adminIds.length} admins`);
      
      if (!Array.isArray(adminIds) || adminIds.length === 0) {
        console.warn('No admin IDs provided for report card notification');
        return [];
      }
      
      // Create notifications for each admin
      const notifications = [];
      for (const adminId of adminIds) {
        try {
          console.log(`Creating report card notification for admin ${adminId}`);
          const notification = await this.createAdminNotification({
            userId: adminId,
            type: 'report_card',
            content: data.content,
            relatedId: data.reportCardId,
            actorId: data.scholarId || null,
            actorName: data.scholarName || 'Scholar',
            actorAvatar: data.scholarAvatar || '/images/report-card-icon.png'
          });
          
          console.log(`Successfully created report card notification for admin ${adminId}: ID=${notification.id}`);
          notifications.push(notification);
        } catch (error) {
          console.error(`Error creating report card notification for admin ${adminId}:`, error);
          // Continue with next admin
        }
      }
      
      console.log(`Successfully created ${notifications.length} report card notifications`);
      return notifications;
    } catch (error) {
      console.error('Error creating report card notifications:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  },

  // Add method for location update notifications
  async createLocationUpdateNotification(adminIds, data) {
    try {
      console.log(`Starting to create location update notifications for ${adminIds.length} admins`);
      console.log('Notification data:', JSON.stringify({
        content: data.content,
        scholarId: data.scholarId,
        scholarName: data.scholarName,
        scholarAvatarType: data.scholarAvatar ? typeof data.scholarAvatar : 'undefined'
      }, null, 2));
      
      if (!Array.isArray(adminIds) || adminIds.length === 0) {
        console.warn('No admin IDs provided for location update notification');
        return [];
      }
      
      // Create notifications for each admin
      console.log(`Creating individual notifications for ${adminIds.length} admins...`);
      
      const notifications = [];
      for (const adminId of adminIds) {
        try {
          console.log(`Creating location notification for admin ${adminId}`);
          const notification = await this.createAdminNotification({
            userId: adminId,
            type: 'scholar_location',
            content: data.content,
            relatedId: data.scholarId,
            actorId: data.scholarId || null,
            actorName: data.scholarName || 'Scholar',
            actorAvatar: data.scholarAvatar || '/images/location-icon.png'
          });
          
          console.log(`Successfully created notification for admin ${adminId}: ID=${notification.id}`);
          notifications.push(notification);
        } catch (error) {
          console.error(`Error creating notification for admin ${adminId}:`, error);
          // Continue with next admin
        }
      }
      
      console.log(`Successfully created ${notifications.length} location update notifications`);
      return notifications;
    } catch (error) {
      console.error('Error creating location update notifications:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  },

  // Add method for distribution notifications
  async createDistributionAdminNotification(adminIds, data) {
    try {
      console.log(`Creating distribution notifications for ${adminIds.length} admins`);
      
      if (!Array.isArray(adminIds) || adminIds.length === 0) {
        console.warn('No admin IDs provided for distribution notification');
        return [];
      }
      
      // Create notifications for each admin
      const notifications = [];
      for (const adminId of adminIds) {
        try {
          console.log(`Creating distribution notification for admin ${adminId}`);
          const notification = await this.createAdminNotification({
            userId: adminId,
            type: 'distribution',
            content: data.content,
            relatedId: data.distributionId,
            actorId: null,
            actorName: 'System',
            actorAvatar: '/images/package-icon.png'
          });
          
          console.log(`Successfully created notification for admin ${adminId}: ID=${notification.id}`);
          notifications.push(notification);
        } catch (error) {
          console.error(`Error creating notification for admin ${adminId}:`, error);
          // Continue with next admin
        }
      }
      
      console.log(`Successfully created ${notifications.length} distribution notifications`);
      return notifications;
    } catch (error) {
      console.error('Error creating distribution notifications:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  },

  // Create a special notification for donation certificates
  async createDonationCertificateNotification(userId, data) {
    try {
      const result = await db.query(`
        INSERT INTO notifications 
        (user_id, type, content, related_id, actor_id, actor_name, actor_avatar)
        VALUES ($1, 'donation_certificate', $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          userId,
          data.content,
          data.donationId,
          data.actorId || null,
          data.actorName || 'KMFI Foundation',
          data.actorAvatar || '/images/certificate-icon.png'
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating donation certificate notification:', error);
      throw error;
    }
  },
};

module.exports = notificationModel;
