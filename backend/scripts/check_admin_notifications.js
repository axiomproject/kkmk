const db = require('../config/db');
const notificationUtils = require('../utils/notificationUtils');
const notificationModel = require('../models/notificationModel');

async function checkAdminNotificationsSystem() {
  try {
    console.log("Checking Admin Notifications System");
    console.log("==================================");
    
    // 1. Check if there are admin users
    console.log("\n1. Checking for admin users...");
    const adminResult = await db.query('SELECT id, name, email FROM admin_users');
    
    if (adminResult.rows.length === 0) {
      console.log("ERROR: No admin users found in the database");
      console.log("Please create at least one admin user");
      return;
    }
    
    console.log(`Found ${adminResult.rows.length} admin users:`);
    adminResult.rows.forEach(admin => {
      console.log(`- Admin ID: ${admin.id}, Name: ${admin.name}, Email: ${admin.email}`);
    });
    
    // 2. Check if there are event participants
    console.log("\n2. Checking for event participants...");
    const participantsResult = await db.query(`
      SELECT ep.*, e.title as event_title, u.name as user_name 
      FROM event_participants ep
      JOIN events e ON ep.event_id = e.id
      JOIN users u ON ep.user_id = u.id
      ORDER BY ep.joined_at DESC
      LIMIT 5
    `);
    
    if (participantsResult.rows.length === 0) {
      console.log("No recent event participants found");
    } else {
      console.log(`Found ${participantsResult.rows.length} recent event participants:`);
      participantsResult.rows.forEach(p => {
        console.log(`- User: ${p.user_name}, Event: ${p.event_title}, Status: ${p.status}`);
      });
    }
    
    // 3. Check for existing event participant notifications
    console.log("\n3. Checking for existing event participant notifications...");
    const notifResult = await db.query(`
      SELECT n.*
      FROM notifications n
      WHERE n.type = 'event_participant'
      ORDER BY n.created_at DESC
      LIMIT 5
    `);
    
    if (notifResult.rows.length === 0) {
      console.log("No event participant notifications found");
    } else {
      console.log(`Found ${notifResult.rows.length} event participant notifications:`);
      notifResult.rows.forEach(n => {
        console.log(`- ID: ${n.id}, Content: ${n.content}, Created: ${n.created_at}`);
      });
    }
    
    // 4. Test creating a test notification
    console.log("\n4. Testing notification creation...");
    
    try {
      const adminIds = adminResult.rows.map(admin => admin.id);
      console.log(`Sending test notification to ${adminIds.length} admins...`);
      
      const testNotifs = await notificationModel.createEventParticipantNotification(adminIds, {
        content: "TEST NOTIFICATION - Please ignore",
        eventId: 1,
        userId: 1,
        userName: "Test User",
        userAvatar: "/images/event-icon.png"
      });
      
      if (testNotifs && testNotifs.length > 0) {
        console.log(`SUCCESS: Created ${testNotifs.length} test notifications`);
      } else {
        console.log("WARNING: No notifications created");
      }
    } catch (error) {
      console.error("ERROR creating test notification:", error);
    }
    
    console.log("\nNotification system check complete!");
  } catch (error) {
    console.error("Error during admin notifications check:", error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

// Run the check
checkAdminNotificationsSystem();
