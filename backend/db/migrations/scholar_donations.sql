CREATE TABLE IF NOT EXISTS scholar_donations (
    id SERIAL PRIMARY KEY,
    scholar_id INTEGER REFERENCES scholars(id),
    amount DECIMAL(10,2) NOT NULL,
    donor_name VARCHAR(255) NOT NULL,
    donor_email VARCHAR(255) NOT NULL,
    donor_phone VARCHAR(50) NOT NULL,
    message TEXT,
    payment_method VARCHAR(50) NOT NULL,
    proof_of_payment VARCHAR(255),
    verification_status VARCHAR(20) DEFAULT 'pending',
    verified_by VARCHAR(255),
    verified_at TIMESTAMP,
    rejected_by VARCHAR(255),
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
