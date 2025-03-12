const notificationModel = require('../models/notificationModel');
const db = require('../config/db'); // Add this import

/**
 * Utility functions for sending notifications
 */
const notificationUtils = {
  /**
   * Send a notification to all admin users
   * 
   * @param {string} type - The notification type
   * @param {string} content - The notification content
   * @param {string|number} relatedId - Optional related ID (e.g., user ID, event ID)
   * @param {Object} actor - Optional actor object with id, name, profile_photo
   * @returns {Promise<Array>} - Array of created notifications
   */
  async notifyAllAdmins(type, content, relatedId = null, actor = null) {
    try {
      console.log(`Notifying all admins: ${type} - ${content}`);
      const adminIds = await notificationModel.getAllAdminIds();
      console.log(`Found ${adminIds.length} admins to notify`);
      
      if (adminIds.length === 0) {
        console.log('No admins found to notify');
        return [];
      }
      
      const notifications = await notificationModel.notifyAdmins(adminIds, type, content, relatedId, actor);
      console.log(`Created ${notifications.length} notifications for admins`);
      return adminIds; // Return the admin IDs for debugging
    } catch (error) {
      console.error('Failed to notify admins:', error);
      throw error;
    }
  },

  /**
   * Send a notification to specific admin users
   * 
   * @param {Array<string|number>} adminIds - Array of admin IDs to notify
   * @param {string} type - The notification type
   * @param {string} content - The notification content
   * @param {string|number} relatedId - Optional related ID (e.g., user ID, event ID)
   * @param {Object} actor - Optional actor object with id, name, profile_photo
   * @returns {Promise<Array>} - Array of created notifications
   */
  async notifySpecificAdmins(adminIds, type, content, relatedId = null, actor = null) {
    try {
      return await notificationModel.notifyAdmins(adminIds, type, content, relatedId, actor);
    } catch (error) {
      console.error('Failed to notify specific admins:', error);
      throw error;
    }
  },

  /**
   * Send a notification about an event participant to all admin users
   * 
   * @param {string|number} eventId - The event ID
   * @param {string|number} userId - The user ID
   * @param {string} userName - The user name
   * @param {string} eventTitle - The event title
   * @returns {Promise<Array>} - Array of created notifications
   */
  async notifyEventParticipant(eventId, userId, userName, eventTitle) {
    try {
      console.log(`Notifying about event participant: ${userName} joined ${eventTitle}`);
      
      // Get all admin IDs
      const adminIds = await notificationModel.getAllAdminIds();
      console.log(`Found ${adminIds.length} admins to notify about event participant`);
      
      if (adminIds.length === 0) {
        console.log('No admins found to notify about event participant');
        return [];
      }
      
      // Create the notification content
      const content = `${userName} has joined event: "${eventTitle}"`;
      
      // Get user photo if available
      let userPhoto = '/images/event-icon.png';
      try {
        const userResult = await db.query('SELECT profile_photo FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length > 0 && userResult.rows[0].profile_photo) {
          userPhoto = userResult.rows[0].profile_photo;
        }
      } catch (error) {
        console.error('Error fetching user photo:', error);
        // Continue with default photo
      }
      
      // Notify all admins
      const notifications = await notificationModel.createEventParticipantNotification(adminIds, {
        content,
        eventId,
        userId,
        userName,
        userAvatar: userPhoto
      });
      
      console.log(`Created ${notifications.length} event participant notifications`);
      return notifications;
    } catch (error) {
      console.error('Failed to notify about event participant:', error);
      throw error;
    }
  },
  
  /**
   * Send a notification about a participant leaving an event to all admin users
   * 
   * @param {string|number} eventId - The event ID
   * @param {string|number} userId - The user ID
   * @param {string} userName - The user name
   * @param {string} eventTitle - The event title
   * @returns {Promise<Array>} - Array of created notifications
   */
  async notifyEventLeave(eventId, userId, userName, eventTitle) {
    try {
      console.log(`Notifying about event leave: ${userName} left ${eventTitle}`);
      
      // Get all admin IDs
      const adminIds = await notificationModel.getAllAdminIds();
      console.log(`Found ${adminIds.length} admins to notify about event leave`);
      
      if (adminIds.length === 0) {
        console.log('No admins found to notify about event leave');
        return [];
      }
      
      // Create the notification content
      const content = `${userName} has left event: "${eventTitle}"`;
      
      // Get user photo if available
      let userPhoto = '/images/event-leave-icon.png';
      try {
        const userResult = await db.query('SELECT profile_photo FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length > 0 && userResult.rows[0].profile_photo) {
          userPhoto = userResult.rows[0].profile_photo;
        }
      } catch (error) {
        console.error('Error fetching user photo:', error);
        // Continue with default photo
      }
      
      // Notify all admins
      const notifications = await notificationModel.createEventLeaveNotification(adminIds, {
        content,
        eventId,
        userId,
        userName,
        userAvatar: userPhoto
      });
      
      console.log(`Created ${notifications.length} event leave notifications`);
      return notifications;
    } catch (error) {
      console.error('Failed to notify about event leave:', error);
      throw error;
    }
  },

  /**
   * Send a notification about a scholar location update to all admin users
   * 
   * @param {string|number} scholarId - The scholar ID
   * @param {string} scholarName - The scholar name
   * @param {string} content - The notification content
   * @returns {Promise<Array>} - Array of created notifications
   */
  async notifyScholarLocationUpdate(scholarId, scholarName, content) {
    try {
      console.log(`Starting notification process for scholar location update: ${scholarName} (ID: ${scholarId})`);
      console.log(`Content: "${content}"`);
      
      // Get all admin IDs
      const adminIds = await notificationModel.getAllAdminIds();
      console.log(`Found ${adminIds.length} admins to notify about location update:`, adminIds);
      
      if (!Array.isArray(adminIds) || adminIds.length === 0) {
        console.warn('No admin IDs found to notify about location update. Aborting.');
        return [];
      }
      
      // Get scholar photo if available
      let scholarPhoto = '/images/location-icon.png';
      try {
        const scholarResult = await db.query('SELECT profile_photo FROM users WHERE id = $1', [scholarId]);
        if (scholarResult.rows.length > 0 && scholarResult.rows[0].profile_photo) {
          scholarPhoto = scholarResult.rows[0].profile_photo;
          console.log(`Using scholar profile photo: ${scholarPhoto}`);
        } else {
          console.log('No profile photo found for scholar, using default icon');
        }
      } catch (error) {
        console.error('Error fetching scholar photo:', error);
        // Continue with default photo
      }
      
      // Notify all admins
      console.log(`Creating location update notifications for ${adminIds.length} admins...`);
      
      const notifications = await notificationModel.createLocationUpdateNotification(adminIds, {
        content,
        scholarId,
        scholarName,
        scholarAvatar: scholarPhoto
      });
      
      console.log(`Successfully created ${notifications.length} location update notifications`);
      return notifications;
    } catch (error) {
      console.error('Failed to notify about scholar location update:', error);
      console.error('Error details:', error.stack);
      throw error;
    }
  },

  /**
   * Send a notification about a report card submission or status change to all admin users
   * 
   * @param {string|number} reportCardId - The report card ID
   * @param {string|number} scholarId - The scholar ID
   * @param {string} scholarName - The scholar name
   * @param {string} content - The notification content
   * @param {string} status - The report card status
   * @returns {Promise<Array>} - Array of created notifications
   */
  async notifyReportCardUpdate(reportCardId, scholarId, scholarName, content, status) {
    try {
      console.log(`Notifying about report card update: ${scholarName} (ID: ${scholarId}) - Status: ${status}`);
      console.log(`Content: "${content}"`);
      
      // Get all admin IDs
      const adminIds = await notificationModel.getAllAdminIds();
      console.log(`Found ${adminIds.length} admins to notify about report card update:`, adminIds);
      
      if (!Array.isArray(adminIds) || adminIds.length === 0) {
        console.warn('No admin IDs found to notify about report card update. Aborting.');
        return [];
      }
      
      // Get scholar photo if available
      let scholarPhoto = '/images/report-card-icon.png';
      try {
        const scholarResult = await db.query('SELECT profile_photo FROM users WHERE id = $1', [scholarId]);
        if (scholarResult.rows.length > 0 && scholarResult.rows[0].profile_photo) {
          scholarPhoto = scholarResult.rows[0].profile_photo;
          console.log(`Using scholar profile photo: ${scholarPhoto}`);
        } else {
          console.log('No profile photo found for scholar, using default icon');
        }
      } catch (error) {
        console.error('Error fetching scholar photo:', error);
        // Continue with default photo
      }
      
      // Notify all admins
      console.log(`Creating report card update notifications for ${adminIds.length} admins...`);
      
      const notifications = await notificationModel.createReportCardAdminNotification(adminIds, {
        content,
        reportCardId,
        scholarId,
        scholarName,
        scholarAvatar: scholarPhoto,
        status
      });
      
      console.log(`Successfully created ${notifications.length} report card update notifications`);
      return notifications;
    } catch (error) {
      console.error('Failed to notify about report card update:', error);
      console.error('Error details:', error.stack);
      throw error;
    }
  },

  /**
   * Send a notification about an inventory distribution to all admin users
   * 
   * @param {string|number} distributionId - The distribution ID
   * @param {string} itemName - The item name that was distributed
   * @param {number} quantity - The quantity distributed
   * @param {string} unit - The unit of measurement
   * @param {string} recipientName - The recipient name
   * @param {string} recipientType - The recipient type (scholar, volunteer, etc.)
   * @returns {Promise<Array>} - Array of created notifications
   */
  async notifyDistribution(distributionId, itemName, quantity, unit, recipientName, recipientType) {
    try {
      console.log('notifyDistribution called with parameters:');
      console.log({
        distributionId,
        itemName,
        quantity,
        unit,
        recipientName,
        recipientType
      });
      
      if (!itemName) {
        console.error('Error: Item name is undefined or null');
        itemName = 'Unknown Item'; // Provide a default name
      }
      
      // Get all admin IDs
      const adminIds = await notificationModel.getAllAdminIds();
      console.log(`Found ${adminIds.length} admins to notify about distribution`);
      
      if (adminIds.length === 0) {
        console.log('No admins found to notify about distribution');
        return [];
      }
      
      // Create the notification content
      const content = `${quantity} ${unit} of ${itemName} has been distributed to ${recipientName} (${recipientType})`;
      console.log(`Notification content: "${content}"`);
      
      // Notify all admins
      const notifications = await notificationModel.createDistributionAdminNotification(adminIds, {
        content,
        distributionId,
        itemName,
        recipientName,
        quantity,
        unit
      });
      
      console.log(`Created ${notifications.length} distribution notifications`);
      return notifications;
    } catch (error) {
      console.error('Failed to notify about distribution:', error);
      throw error;
    }
  },

  /**
   * Send a notification about a scholar donation to all admin users
   * 
   * @param {string|number} donationId - The donation ID
   * @param {string|number} scholarId - The scholar ID
   * @param {string} scholarName - The scholar name
   * @param {string|number} donorId - The donor/sponsor ID (optional)
   * @param {string} donorName - The donor name
   * @param {number} amount - The donation amount
   * @returns {Promise<Array>} - Array of created notifications
   */
  async notifyScholarDonation(donationId, scholarId, scholarName, donorId, donorName, amount) {
    try {
      console.log(`📣 Starting notification process for scholar donation...`);
      console.log(`   Donation ID: ${donationId}`);
      console.log(`   Scholar: ${scholarName} (ID: ${scholarId})`);
      console.log(`   Donor: ${donorName} (ID: ${donorId || 'Anonymous'})`);
      console.log(`   Amount: ${amount}`);
      
      // Get all admin IDs with enhanced error handling
      let adminIds;
      try {
        adminIds = await notificationModel.getAllAdminIds();
        console.log(`Found ${adminIds?.length || 0} admins to notify:`, adminIds);
      } catch (adminError) {
        console.error('Failed to fetch admin IDs:', adminError);
        return [];
      }
      
      if (!Array.isArray(adminIds) || adminIds.length === 0) {
        console.warn('No admins found to notify about scholar donation');
        return [];
      }
      
      // Format amount for better readability
      const formattedAmount = typeof amount === 'number' 
        ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
        : amount;
      
      // Create the notification content
      const content = `New scholar donation: ${formattedAmount} for ${scholarName} from ${donorName || 'Anonymous'} is waiting for verification.`;
      
      // Use the specialized function for scholar donations with detailed logging
      console.log(`Creating ${adminIds.length} notifications with content: "${content}"`);
      
      const notifications = [];
      for (const adminId of adminIds) {
        try {
          const notification = await notificationModel.createAdminNotification({
            userId: adminId,
            type: 'scholar_donation',
            content,
            relatedId: donationId,
            actorId: donorId || null,
            actorName: donorName || 'Anonymous',
            actorAvatar: '/images/donate-icon.png'
          });
          
          console.log(`✅ Successfully created notification for admin ${adminId}`);
          notifications.push(notification);
        } catch (error) {
          console.error(`❌ Error creating notification for admin ${adminId}:`, error);
        }
      }
      
      console.log(`✅ Created ${notifications.length}/${adminIds.length} scholar donation notifications`);
      return notifications;
    } catch (error) {
      console.error('❌ Failed to notify about scholar donation:', error);
      console.error('Stack trace:', error.stack);
      return [];
    }
  }
};

module.exports = notificationUtils;
