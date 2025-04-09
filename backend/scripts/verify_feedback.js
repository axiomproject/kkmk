const db = require('../config/db');

async function verifyFeedbackData() {
    try {
        console.log('Checking event_feedback table...');
        
        // Check if event_feedback table exists
        const tableExists = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'event_feedback'
            );
        `);
        
        if (!tableExists.rows[0].exists) {
            console.error('ERROR: event_feedback table does not exist!');
            process.exit(1);
        }

        console.log('✅ event_feedback table exists');
        
        // Count total feedback entries
        const countResult = await db.query(`
            SELECT COUNT(*) FROM event_feedback;
        `);
        
        const totalFeedback = parseInt(countResult.rows[0].count);
        console.log(`Total feedback entries: ${totalFeedback}`);
        
        if (totalFeedback === 0) {
            console.error('ERROR: No feedback data found in the database!');
            process.exit(1);
        }

        // Get feedback by event
        const feedbackByEventResult = await db.query(`
            SELECT e.id, e.title, COUNT(ef.id) as feedback_count
            FROM events e
            LEFT JOIN event_feedback ef ON e.id = ef.event_id
            WHERE e.date < CURRENT_DATE
            GROUP BY e.id, e.title
            ORDER BY feedback_count DESC;
        `);
        
        console.log('\nFeedback counts by past event:');
        feedbackByEventResult.rows.forEach(row => {
            console.log(`- Event #${row.id} "${row.title}": ${row.feedback_count} feedback entries`);
        });
        
        // Get a sample of actual feedback entries
        const sampleFeedbackResult = await db.query(`
            SELECT 
                ef.id, ef.event_id, e.title as event_title,
                ef.user_id, u.name as user_name, u.role as user_role,
                ef.rating, ef.comment, ef.created_at
            FROM event_feedback ef
            JOIN events e ON ef.event_id = e.id
            JOIN users u ON ef.user_id = u.id
            ORDER BY ef.created_at DESC
            LIMIT 5;
        `);
        
        console.log('\nSample feedback entries:');
        sampleFeedbackResult.rows.forEach(row => {
            console.log(`\nFeedback #${row.id} for event "${row.event_title}" (ID: ${row.event_id})`);
            console.log(`- From: ${row.user_name} (${row.user_role})`);
            console.log(`- Rating: ${row.rating}/5`);
            console.log(`- Comment: "${row.comment}"`);
            console.log(`- Created: ${row.created_at}`);
        });
        
        console.log('\nVerification complete!');
    } catch (error) {
        console.error('Error verifying feedback data:', error);
    } finally {
        process.exit();
    }
}

verifyFeedbackData();
