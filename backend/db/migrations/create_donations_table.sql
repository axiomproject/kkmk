CREATE TABLE IF NOT EXISTS donations (
    id SERIAL PRIMARY KEY,
    donor_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(100),
    purpose TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add some sample data
INSERT INTO donations (donor_name, amount, payment_method, purpose, status) VALUES
('John Doe', 1000.00, 'Credit Card', 'Scholarship Fund', 'completed'),
('Jane Smith', 500.00, 'Bank Transfer', 'General Fund', 'completed'),
('Mike Johnson', 2500.00, 'PayPal', 'Educational Programs', 'pending');
