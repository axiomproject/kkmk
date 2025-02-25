DROP TABLE IF EXISTS monetary_donations;

CREATE TABLE monetary_donations (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    contact_number VARCHAR(50) NOT NULL,
    amount NUMERIC(15,2) NOT NULL, -- Changed from DECIMAL(10,2) to NUMERIC(15,2)
    message TEXT,
    proof_of_payment VARCHAR(255),
    date DATE NOT NULL,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    verified_at TIMESTAMP,
    verified_by VARCHAR(255),
    rejected_at TIMESTAMP,
    rejected_by VARCHAR(255),
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
DROP INDEX IF EXISTS idx_monetary_donations_verification_status;
DROP INDEX IF EXISTS idx_monetary_donations_date;
DROP INDEX IF EXISTS idx_monetary_donations_email;

CREATE INDEX idx_monetary_donations_verification_status ON monetary_donations(verification_status);
CREATE INDEX idx_monetary_donations_date ON monetary_donations(date);
CREATE INDEX idx_monetary_donations_email ON monetary_donations(email);
