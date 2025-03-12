const notificationUtils = require('../utils/notificationUtils');
const db = require('../config/db');

// Function to test the notification
async function testDistributionNotification() {
  try {
    console.log('Starting test for distribution notification...');
    
    // Generate a random distribution ID for testing
    const distributionId = Math.floor(Math.random() * 10000);
    
    // Example distribution details - ensuring we pass all needed parameters
    const itemName = "School Supplies";
    const quantity = 5;
    const unit = "pcs";
    const recipientName = "John Doe";
    const recipientType = "scholar";
    
    console.log(`Creating test distribution notification with ID: ${distributionId}`);
    console.log(`Item: ${itemName}, Quantity: ${quantity} ${unit}, Recipient: ${recipientName}`);
    
    // Call the notification utility
    const result = await notificationUtils.notifyDistribution(
      distributionId,
      itemName,
      quantity,
      unit,
      recipientName,
      recipientType
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
testDistributionNotification();