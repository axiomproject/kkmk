
const notificationUtils = require('../utils/notificationUtils');
const db = require('../config/db');

// Function to test the notification
async function testLocationNotification() {
  try {
    console.log('Starting test for scholar location notification...');
    
    // First, get a random scholar to use for the test
    const scholarResult = await db.query(`
      SELECT id, name FROM users 
      WHERE role = 'scholar' 
      LIMIT 1
    `);
    
    if (scholarResult.rows.length === 0) {
      console.error('No scholars found in the database');
      return;
    }
    
    const scholar = scholarResult.rows[0];
    console.log(`Using scholar for test: ID=${scholar.id}, name=${scholar.name}`);
    
    // Now send a test notification
    const result = await notificationUtils.notifyScholarLocationUpdate(
      scholar.id,
      scholar.name,
      `TEST: New location update from scholar ${scholar.name} requires verification 📍`
    );
    
    console.log('Notification result:', result);
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Close the database connection
    db.end();
  }
}

// Run the test
testLocationNotification();