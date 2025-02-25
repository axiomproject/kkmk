-- Insert a test post
INSERT INTO forum_posts (
    title,
    content,
    author_id,
    author_name,
    author_avatar,
    category,
    type,
    created_at
) VALUES (
    'Welcome to our Community Forum!',
    'This is a test post to check if the forum is working correctly. Feel free to leave comments!',
    1, -- assuming you have a user with ID 1
    'Admin',
    'https://mui.com/static/images/avatar/1.jpg',
    'General',
    'discussion',
    CURRENT_TIMESTAMP
) RETURNING id;

-- Insert a test comment (make sure to replace {POST_ID} with the ID returned from the above query)
INSERT INTO forum_comments (
    post_id,
    content,
    author_id,
    created_at,
    likes
) VALUES (
    1, -- replace with actual post_id from above
    'This is a test comment. Great to see the forum up and running!',
    1, -- assuming same user
    CURRENT_TIMESTAMP,
    0
);
