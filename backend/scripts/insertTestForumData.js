const db = require('../config/db');

async function insertTestData() {
    try {
        // Insert post
        const post = await db.one(`
            INSERT INTO forum_posts (
                title, content, author_id, author_name, author_avatar, 
                category, type, created_at
            ) VALUES (
                'Welcome to our Community Forum!',
                'This is a test post to check if the forum is working correctly. Feel free to leave comments!',
                1,
                'Admin',
                'https://mui.com/static/images/avatar/1.jpg',
                'General',
                'discussion',
                CURRENT_TIMESTAMP
            ) RETURNING id
        `);

        console.log('Test post created with ID:', post.id);

        // Insert comment
        const comment = await db.one(`
            INSERT INTO forum_comments (
                post_id, content, author_id, created_at, likes
            ) VALUES (
                $1,
                'This is a test comment. Great to see the forum up and running!',
                1,
                CURRENT_TIMESTAMP,
                0
            ) RETURNING id
        `, [post.id]);

        console.log('Test comment created with ID:', comment.id);
        console.log('Test data inserted successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error inserting test data:', error);
        process.exit(1);
    }
}

insertTestData();
