const db = require('../config/db');

async function addTestFeedback() {
  try {
    console.log('Starting test feedback creation script...');
    
    // 1. Get all past events
    const pastEventsResult = await db.query(`
      SELECT id, title FROM events 
      WHERE date < CURRENT_DATE
      ORDER BY date DESC
    `);
    
    if (pastEventsResult.rows.length === 0) {
      console.log('No past events found to add feedback to');
      process.exit(0);
    }
    
    console.log(`Found ${pastEventsResult.rows.length} past events`);
    
    // 2. Get some volunteer users
    const usersResult = await db.query(`
      SELECT id, name, role FROM users
      WHERE role IN ('volunteer', 'scholar')
      LIMIT 5
    `);
    
    if (usersResult.rows.length === 0) {
      console.log('No users found to create feedback with');
      process.exit(0);
    }
    
    console.log(`Found ${usersResult.rows.length} users for feedback creation`);
    
    // 3. For each past event, add some test feedback
    for (const event of pastEventsResult.rows) {
      console.log(`Adding feedback for event: ${event.title} (ID: ${event.id})`);
      
      for (const user of usersResult.rows) {
        // Check if user already provided feedback for this event
        const existingFeedbackResult = await db.query(`
          SELECT id FROM event_feedback
          WHERE event_id = $1 AND user_id = $2
        `, [event.id, user.id]);
        
        if (existingFeedbackResult.rows.length > 0) {
          console.log(`User ${user.name} (${user.id}) already left feedback for this event`);
          continue;
        }
        
        // Generate random rating between 3 and 5
        const rating = Math.floor(Math.random() * 3) + 3;
        
        // Create a comment based on rating
        let comment;
        if (rating === 5) {
          comment = `Great event! I really enjoyed volunteering and helping the scholars. The organization was excellent and I felt my skills were put to good use.`;
        } else if (rating === 4) {
          comment = `Good event overall. The scholars were engaged and I felt like I made a difference. Could be a bit better organized next time.`;
        } else {
          comment = `It was an okay experience. Some parts could have been better organized, but I'm glad I was able to help.`;
        }
        
        // Add the feedback
        await db.query(`
          INSERT INTO event_feedback (user_id, event_id, rating, comment, created_at)
          VALUES ($1, $2, $3, $4, NOW() - (random() * interval '10 days'))
        `, [user.id, event.id, rating, comment]);
        
        console.log(`Added ${rating}-star feedback from ${user.name} (${user.role}) for event ${event.id}`);
      }
    }
    
    console.log('Test feedback creation completed successfully!');
  } catch (error) {
    console.error('Error adding test feedback:', error);
  } finally {
    process.exit();
  }
}

addTestFeedback();
