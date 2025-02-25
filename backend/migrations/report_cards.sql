CREATE TABLE report_cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    front_image TEXT NOT NULL,
    back_image TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    verification_step INTEGER DEFAULT 1,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
