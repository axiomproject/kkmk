CREATE TABLE forum_posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER REFERENCES users(id),
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(20) DEFAULT 'discussion',
    likes INTEGER DEFAULT 0
);

CREATE TABLE forum_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES forum_posts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    likes INTEGER DEFAULT 0
);

CREATE TABLE forum_polls (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES forum_posts(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    total_votes INTEGER DEFAULT 0
);

CREATE TABLE forum_poll_options (
    id SERIAL PRIMARY KEY,
    poll_id INTEGER REFERENCES forum_polls(id) ON DELETE CASCADE,
    text VARCHAR(255) NOT NULL,
    votes INTEGER DEFAULT 0
);
