CREATE TABLE IF NOT EXISTS report_card_history (
    id SERIAL PRIMARY KEY,
    report_card_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    front_image TEXT NOT NULL,
    back_image TEXT NOT NULL,
    grade_level VARCHAR(50),
    status VARCHAR(20) NOT NULL,
    verification_step INTEGER DEFAULT 1,
    submitted_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    school_year VARCHAR(20),
    renewal_reason TEXT,
    archived_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (report_card_id) REFERENCES report_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add index for faster lookups by user_id
CREATE INDEX idx_report_card_history_user_id ON report_card_history(user_id);

-- Add index for faster lookups by report_card_id
CREATE INDEX idx_report_card_history_report_card_id ON report_card_history(report_card_id);
