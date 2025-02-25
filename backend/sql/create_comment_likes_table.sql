CREATE TABLE forum_comment_likes (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER REFERENCES forum_comments(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comment_id, user_id)
);
