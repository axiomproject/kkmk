const cron = require('node-cron');
const db = require('../config/db');
const emailService = require('./emailService');
const notificationModel = require('../models/notificationModel');

/**
 * Gets events that need reminders sent (1 week or 1 day before)
 */
async function getEventsNeedingReminders() {
  try {
    // Find events that occur in exactly 7 days or exactly 1 day
    const result = await db.query(`
      SELECT 
        e.id,
        e.title,
        e.date,
        e.location,
        e.start_time,
        e.status,
        CASE 
          WHEN e.date::date - CURRENT_DATE = 7 THEN 'week'
          WHEN e.date::date - CURRENT_DATE = 1 THEN 'day'
          ELSE NULL
        END as reminder_type
      FROM events e
      WHERE 
        e.status = 'OPEN' AND
        (e.date::date - CURRENT_DATE = 7 OR e.date::date - CURRENT_DATE = 1) AND
        e.date > CURRENT_DATE
    `);

    return result.rows;
  } catch (error) {
    console.error('Error finding events for reminders:', error);
    return [];
  }
}

/**
 * Gets active participants for an event
 */
async function getEventParticipants(eventId) {
  try {
    const result = await db.query(`
      SELECT 
        u.id,
        u.name,
        u.email
      FROM event_participants ep
      JOIN users u ON ep.user_id = u.id
      WHERE ep.event_id = $1 AND ep.status = 'ACTIVE'
    `, [eventId]);
    
    return result.rows;
  } catch (error) {
    console.error(`Error getting participants for event ${eventId}:`, error);
    return [];
  }
}

/**
 * Sends reminder emails and notifications for upcoming events
 */
async function sendEventReminders() {
  console.log('Running scheduled event reminder check...');
  
  try {
    const events = await getEventsNeedingReminders();
    console.log(`Found ${events.length} events needing reminders`);
    
    for (const event of events) {
      const reminderType = event.reminder_type;
      console.log(`Processing ${reminderType} reminder for event: ${event.id} - ${event.title}`);
      
      // Get all active participants for this event
      const participants = await getEventParticipants(event.id);
      console.log(`Found ${participants.length} participants to notify for event ${event.id}`);
      
      if (participants.length === 0) continue;
      
      try {
        // Use the bulk notification method for in-app notifications
        await notificationModel.createBulkEventReminders(
          participants,
          event.id,
          event.title,
          reminderType
        );
        console.log(`Created in-app notifications for all ${participants.length} participants of event ${event.id}`);
      } catch (notificationError) {
        console.error(`Failed to create bulk notifications for event ${event.id}:`, notificationError);
        // Continue to email notifications even if in-app notifications fail
      }
      
      // Send email notifications
      for (const participant of participants) {
        try {
          // Send email
          await emailService.sendEventReminderEmail(
            participant.email,
            participant.name,
            event.title,
            event.date,
            event.location,
            event.start_time,
            reminderType
          );
          
          console.log(`Sent ${reminderType} reminder email to ${participant.name} (${participant.email}) for event ${event.id}`);
        } catch (error) {
          console.error(`Failed to send reminder email to participant ${participant.id} for event ${event.id}:`, error);
          // Continue with other participants even if one fails
        }
      }
    }
    
    console.log('Finished processing event reminders');
  } catch (error) {
    console.error('Error in sendEventReminders:', error);
  }
}

/**
 * Initialize all scheduled tasks
 */
function initScheduledTasks() {
  // Run every day at 8:00 AM
  cron.schedule('0 8 * * *', sendEventReminders);
  
  // Check both environment variables
  const skipInitialReminders = process.env.SKIP_INITIAL_REMINDERS === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Only run initial check in development and if not explicitly skipped
  if (!isProduction && !skipInitialReminders) {
    console.log('Running initial event reminder check (development mode)');
    sendEventReminders();
  } else {
    console.log(`Skipping initial reminder check (Production: ${isProduction}, Skip: ${skipInitialReminders})`);
  }
  
  console.log('Scheduled tasks initialized');
}

// Fix the exports - make sure initScheduledTasks is explicitly exported
module.exports = {
  initScheduledTasks,
  sendEventReminders // Export for manual triggering if needed
};
