const db = require('../config/db');

async function createTestNotification() {
  try {
    console.log('Creating test notification with long text...');
    
    // First get all admin IDs
    const adminResult = await db.query('SELECT id FROM admin_users');
    const adminIds = adminResult.rows.map(row => row.id);
    
    if (adminIds.length === 0) {
      console.log('No admin users found');
      return;
    }
    
    // Create a test notification with long text for the first admin
    const longText = `This is a test notification with very long text to demonstrate the expand/collapse functionality. 
    It contains multiple lines of text that would normally be truncated and shown with ellipsis.
    Now with the new expand/collapse functionality, users can click to see the full content without having to navigate away.
    This is especially useful for important notifications that contain detailed information that shouldn't be missed.
    This notification is created on ${new Date().toLocaleString()}.`;
    
    const result = await db.query(`
      INSERT INTO notifications 
      (user_id, type, content, actor_name, actor_avatar, read)
      VALUES ($1, 'test', $2, 'System Test', '/images/test-icon.png', false)
      RETURNING id
    `, [adminIds[0], longText]);
    
    console.log('Test notification created with ID:', result.rows[0].id);
  } catch (error) {
    console.error('Error creating test notification:', error);
  } finally {
    db.end();
  }
}

createTestNotification();
